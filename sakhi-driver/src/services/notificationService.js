import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { updateDriverFcmToken } from '../api/endpoints';

const FCM_TOKEN_KEY = 'driver_fcm_token';

// ── Foreground notification handler ──────────────────────────────────────────
// RIDE_REQUEST notifications are intercepted before they show as banners.
// The SocketContext's PUSH_RIDE_REQUEST bridge handles displaying them as
// the full in-app overlay (same UI as the socket-delivered ride request).
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const type = notification.request.content.data?.type;
    // For ride requests shown in-app: suppress the system banner,
    // the overlay handles it. For all other types: show normally.
    if (type === 'RIDE_REQUEST') {
      return {
        shouldShowAlert:  false,
        shouldPlaySound:  false,
        shouldSetBadge:   false,
      };
    }
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge:  true,
    };
  },
});

// ── Android notification channels ─────────────────────────────────────────────
// Must be created BEFORE requesting push tokens so the OS knows about them.
async function createNotificationChannels() {
  if (Device.OS !== 'android') return;   // channels are Android-only

  // ── Channel 1: ride_requests — MAX importance, HEADS_UP ──────────────────
  // This is the channel targeted by the backend's sendRideRequest FCM call.
  // It guarantees the notification pops up as a full-screen heads-up alert
  // exactly like Rapido/Uber, even when the driver is in another app or the
  // phone is locked.
  await Notifications.setNotificationChannelAsync('ride_requests', {
    name:                    'Ride Requests',
    description:             'Incoming ride request alerts',
    importance:              Notifications.AndroidImportance.MAX,
    vibrationPattern:        [0, 300, 150, 300, 150, 300],   // strong triple buzz
    lightColor:              '#BEA3D8',
    enableLights:            true,
    enableVibrate:           true,
    showBadge:               true,
    lockscreenVisibility:    Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd:               true,   // override Do-Not-Disturb for ride alerts
    sound:                   'default',
  });

  // ── Channel 2: default — standard importance ──────────────────────────────
  // Used for earnings, KYC, and all other general notifications.
  await Notifications.setNotificationChannelAsync('default', {
    name:             'Sakhi Notifications',
    importance:       Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor:       '#BEA3D8',
    sound:            'default',
  });
}

/**
 * Request notification permissions, create Android channels, get the device
 * FCM push token, and register it with the backend.
 * Safe to call multiple times — deduplicates via SecureStore.
 */
export async function registerForPushAsync() {
  if (!Device.isDevice) {
    console.warn('[FCM] Push not supported on simulator');
    return null;
  }

  // Create channels FIRST (required before token registration on Android 8+)
  await createNotificationChannels();

  // Request permissions
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

  try {
    // getDevicePushTokenAsync gives the raw FCM token (works with firebase-admin)
    const tokenResult = await Notifications.getDevicePushTokenAsync();
    const fcmToken    = tokenResult.data;

    // Deduplicate: skip backend call if token hasn't changed
    const stored = await SecureStore.getItemAsync(FCM_TOKEN_KEY).catch(() => null);
    if (stored === fcmToken) {
      console.log('[FCM] Token unchanged, skipping registration');
      return fcmToken;
    }

    // Register with backend
    await updateDriverFcmToken(fcmToken);
    await SecureStore.setItemAsync(FCM_TOKEN_KEY, fcmToken).catch(() => {});
    console.log('[FCM] Driver FCM token registered:', fcmToken.slice(0, 20) + '...');
    return fcmToken;
  } catch (err) {
    console.error('[FCM] registerForPushAsync error:', err?.message || err);
    return null;
  }
}

/**
 * Set up listener for notifications received while app is in foreground.
 * Returns a cleanup function — call it on component unmount.
 */
export function setupForegroundHandler() {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data || {};
    const type = data.type;

    console.log('[FCM] Foreground notification type:', type);

    // RIDE_REQUEST: the SocketContext bridge will show the overlay via
    // DeviceEventEmitter. Nothing extra needed here.
    // All other types: setNotificationHandler will show the system alert.
  });
  return () => subscription.remove();
}

/**
 * Set up listener for notification tap responses (background / killed state).
 * Pass a callback — it receives the notification data payload.
 */
export function setupNotificationTapHandler(onTap) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data || {};
    console.log('[FCM] Notification tapped, type:', data.type);
    if (onTap) onTap(data);
  });
  return () => subscription.remove();
}

/**
 * Fetch the notification that launched the app from a killed state.
 * Returns `null` if the app wasn't opened via a notification.
 */
export async function getInitialNotificationDataAsync() {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    return response?.notification?.request?.content?.data ?? null;
  } catch (e) {
    console.warn('[FCM] getInitialNotificationDataAsync error:', e?.message || e);
    return null;
  }
}
