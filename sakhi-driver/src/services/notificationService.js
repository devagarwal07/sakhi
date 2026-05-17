import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { updateDriverFcmToken } from '../api/endpoints';
import notifee, {
  AndroidImportance,
  AndroidVisibility,
  AndroidCategory,
  AndroidStyle,
  EventType,
} from '@notifee/react-native';
import { DeviceEventEmitter, Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FCM_TOKEN_KEY = 'driver_fcm_token';

// ─────────────────────────────────────────────────────────────────────────────
// FOREGROUND NOTIFICATION SUPPRESSOR
// When app is in foreground, RIDE_REQUEST is handled by the in-app overlay.
// All other notifications (earnings, KYC, etc.) show as normal banners.
// ─────────────────────────────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const type = notification.request.content.data?.type;
    if (type === 'RIDE_REQUEST') {
      // Suppress system banner — the IncomingRideRequestScreen overlay handles it
      return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
    }
    return { shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// SHOW CUSTOM RIDE REQUEST NOTIFICATION (called from background / killed state)
// Shows a high-priority Notifee notification with:
//   - fullScreenAction  → wakes screen / opens app as full-screen overlay
//   - CALL category     → highest Android priority, bypasses DND
//   - BIGTEXT style     → expanded pickup/drop details
//   - Accept / Decline  → quick-action buttons
// ─────────────────────────────────────────────────────────────────────────────
export async function showCustomRideNotification(payload = {}) {
  try {
  const channelId = await notifee.createChannel({
    id:         'ride_requests_full_screen',
    name:       'Ride Requests',
    importance: AndroidImportance.MAX,       // MAX required for fullScreenAction
    visibility: AndroidVisibility.PUBLIC,
    sound:      'default',
    vibration:  true,
    bypassDnd:  true,
  });

  const fare         = payload.fare || payload.estimated_fare || '';
  const distToPickup = payload.distance_to_pickup_km || payload.distanceToPickupKm || '';
  const pickup       = payload.pickup_address  || payload.pickupAddress  || 'Pickup location';
  const drop         = payload.drop_address    || payload.dropoff_address
                    || payload.dropAddress     || payload.dropoffAddress || 'Drop location';
  const riderName    = payload.rider_name      || payload.riderName      || 'Rider';
  const fareStr      = fare ? ` • ₹${fare}` : '';
  const distStr      = distToPickup ? `📍 ${distToPickup} km away` : '';
  const summaryLine  = [distStr, `🟢 ${pickup}`, `🔴 ${drop}`].filter(Boolean).join('\n');

  await notifee.displayNotification({
    id:    'ride_request',
    title: `🚗 New Ride${fareStr}`,
    body:  `${riderName}  ${distStr}`,
    data:  Object.fromEntries(
      Object.entries(payload).map(([k, v]) => [k, String(v ?? '')])
    ),
    android: {
      channelId,

      // ── CALL category: system treats this like an incoming phone call ──────
      // This is the only reliable way to get a full-screen intent on Android 12+
      // even when another app is in front or the screen is on.
      category:   AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,

      autoCancel: false,
      ongoing:    false,

      // ── FULL SCREEN INTENT ────────────────────────────────────────────────
      // Screen OFF / Locked → launches MainActivity as a full-screen activity.
      // Screen ON           → shows a HUD banner at the top.
      // Tapping either brings the app to foreground.
      fullScreenAction: {
        id:             'default',
        launchActivity: 'default',
      },
      pressAction: {
        id:             'default',
        launchActivity: 'default',
      },

      // ── EXPANDED NOTIFICATION CONTENT ────────────────────────────────────
      style: {
        type: AndroidStyle.BIGTEXT,
        text: summaryLine,
      },

      // ── QUICK ACTION BUTTONS ──────────────────────────────────────────────
      actions: [
        {
          title:       '✅ Accept',
          pressAction: { id: 'accept', launchActivity: 'default' },
        },
        {
          title:       '❌ Decline',
          pressAction: { id: 'decline' },
        },
      ],

      vibrationPattern: [0, 400, 200, 400, 200, 400],
      lights:           ['#BEA3D8', 500, 500],
      color:            '#BEA3D8',
      smallIcon:        'notification_icon',   // drawable confirmed in android/res/
    },
  });

  console.log('[Notifee] Custom ride request notification displayed');
  } catch (err) {
    console.error('[Notifee] showCustomRideNotification FAILED:', err?.message || err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST FULL SCREEN INTENT PERMISSION (Android 14+)
// On Android 14+, USE_FULL_SCREEN_INTENT requires an explicit user grant.
// Call this once after the driver logs in / goes online.
// ─────────────────────────────────────────────────────────────────────────────
export async function requestFullScreenIntentPermission() {
  if (Platform.OS !== 'android') return;
  try {
    const settings = await notifee.getNotificationSettings();
    if (settings.android?.fullScreenIntent === false) {
      // Open the app's battery/permission settings for the user to grant
      await notifee.openNotificationSettings();
    }
  } catch (e) {
    // Older Notifee versions may not have this API — safe to ignore
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST OVERLAY ("DISPLAY OVER OTHER APPS") PERMISSION
//
// On Android, this allows the ride request screen to appear even when the
// driver is using another app — exactly like Uber/Ola incoming ride popups.
//
// We show a branded Alert explaining why, then deep-link to the OS settings.
// We only ask ONCE (stored in AsyncStorage) and skip if already granted.
// ─────────────────────────────────────────────────────────────────────────────
const OVERLAY_ASKED_KEY = 'sakhi_overlay_permission_asked';
const APP_PACKAGE       = 'com.sakhi.partner.driver';

export async function requestOverlayPermission() {
  if (Platform.OS !== 'android') return;

  // Only ask once per install
  const alreadyAsked = await AsyncStorage.getItem(OVERLAY_ASKED_KEY).catch(() => null);
  if (alreadyAsked === 'true') return;

  await AsyncStorage.setItem(OVERLAY_ASKED_KEY, 'true').catch(() => {});

  Alert.alert(
    '🚗 Show Ride Requests Anywhere',
    'Allow Sakhi Driver to display incoming ride requests over other apps — so you never miss a ride, even when your screen is on.',
    [
      {
        text: 'Not Now',
        style: 'cancel',
      },
      {
        text: 'Allow',
        style: 'default',
        onPress: () => {
          // Opens Android's "Display over other apps" settings for this app
          Linking.sendIntent(
            'android.settings.action.MANAGE_OVERLAY_PERMISSION',
            [{ key: 'package', value: APP_PACKAGE }],
          ).catch(() => {
            // Fallback: open general overlay settings if deep-link fails
            Linking.openSettings();
          });
        },
      },
    ],
    { cancelable: true },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANDROID NOTIFICATION CHANNELS (must exist before first notification)
// ─────────────────────────────────────────────────────────────────────────────
async function createNotificationChannels() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('ride_requests', {
    name:                 'Ride Requests',
    description:          'Incoming ride request alerts',
    importance:           Notifications.AndroidImportance.MAX,
    vibrationPattern:     [0, 300, 150, 300, 150, 300],
    lightColor:           '#BEA3D8',
    enableLights:         true,
    enableVibrate:        true,
    showBadge:            true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd:            true,
    sound:                'default',
  });

  await Notifications.setNotificationChannelAsync('default', {
    name:             'Sakhi Notifications',
    importance:       Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor:       '#BEA3D8',
    sound:            'default',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER FOR PUSH NOTIFICATIONS
// Requests permissions, creates channels, gets FCM token, registers with backend.
// ─────────────────────────────────────────────────────────────────────────────
export async function registerForPushAsync() {
  if (!Device.isDevice) {
    console.warn('[FCM] Push not supported on simulator');
    return null;
  }

  await createNotificationChannels();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[FCM] Push notification permission denied');
    return null;
  }

  // Also request full-screen intent (Android 14+)
  await requestFullScreenIntentPermission();

  try {
    const tokenResult = await Notifications.getDevicePushTokenAsync();
    const fcmToken    = tokenResult.data;

    const stored = await SecureStore.getItemAsync(FCM_TOKEN_KEY).catch(() => null);
    if (stored === fcmToken) {
      console.log('[FCM] Token unchanged, skipping registration');
      return fcmToken;
    }

    await updateDriverFcmToken(fcmToken);
    await SecureStore.setItemAsync(FCM_TOKEN_KEY, fcmToken).catch(() => {});
    console.log('[FCM] Driver FCM token registered:', fcmToken.slice(0, 20) + '...');
    return fcmToken;
  } catch (err) {
    console.error('[FCM] registerForPushAsync error:', err?.message || err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FOREGROUND FCM HANDLER
// Listens for Expo-delivered notifications while app is in foreground.
// RIDE_REQUEST notifications are suppressed (handled by the overlay).
// ─────────────────────────────────────────────────────────────────────────────
export function setupForegroundHandler() {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data || {};
    console.log('[FCM] Foreground notification type:', data.type);
    // RIDE_REQUEST already suppressed by setNotificationHandler above.
    // SocketContext handles it via DeviceEventEmitter for the in-app overlay.
  });
  return () => subscription.remove();
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION TAP HANDLER
// Fires when user taps a notification while app is in background/killed.
// ─────────────────────────────────────────────────────────────────────────────
export function setupNotificationTapHandler(onTap) {
  // Expo notifications tap handler
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data || {};
    console.log('[FCM] Expo Notification tapped, type:', data.type);
    if (onTap) onTap(data);
  });

  // Notifee foreground event handler (taps + action button presses)
  const notifeeUnsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
    const data = detail.notification?.data || {};

    if (type === EventType.PRESS) {
      console.log('[Notifee] Notification tapped, type:', data.type);
      if (onTap) onTap(data);
      notifee.cancelNotification(detail.notification?.id).catch(() => {});
      return;
    }

    if (type === EventType.ACTION_PRESS) {
      const actionId = detail.pressAction?.id;
      console.log('[Notifee] Action pressed:', actionId, 'type:', data.type);

      if (actionId === 'accept') {
        DeviceEventEmitter.emit('PUSH_RIDE_REQUEST', { ...data, _action: 'accept' });
      } else if (actionId === 'decline') {
        // Just dismiss — no need to navigate
      } else {
        if (onTap) onTap(data);
      }
      notifee.cancelNotification(detail.notification?.id).catch(() => {});
    }
  });

  return () => {
    subscription.remove();
    notifeeUnsubscribe();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET INITIAL NOTIFICATION DATA (killed-state launch)
// Returns data from the notification that launched the app, or null.
// ─────────────────────────────────────────────────────────────────────────────
export async function getInitialNotificationDataAsync() {
  try {
    // Try Notifee first (covers our custom ride request notifications).
    // This fires when the app was KILLED and the user tapped the notification.
    const initialNotification = await notifee.getInitialNotification();
    if (initialNotification?.notification?.data?.type) {
      console.log('[FCM] App launched by Notifee notification:', initialNotification.notification.data.type);
      // Cancel the notification so it doesn't re-trigger on next app open
      await notifee.cancelNotification(initialNotification.notification.id).catch(() => {});
      return initialNotification.notification.data;
    }

    // Fallback: Expo notifications (covers general push notifications)
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response?.notification?.request?.content?.data?.type) {
      return response.notification.request.content.data;
    }

    return null;
  } catch (e) {
    console.warn('[FCM] getInitialNotificationDataAsync error:', e?.message || e);
    return null;
  }
}

