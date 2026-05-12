import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { updateDriverFcmToken } from '../api/endpoints';

const FCM_TOKEN_KEY = 'driver_fcm_token';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions, get the device FCM push token,
 * and register it with the backend via PATCH /notifications/drivers/fcm-token.
 * Safe to call multiple times — deduplicates via SecureStore.
 */
export async function registerForPushAsync() {
  if (!Device.isDevice) {
    // Simulators don't support push notifications
    console.warn('[FCM] Push not supported on simulator');
    return null;
  }

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

  // Android notification channel (required)
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Sakhi Notifications',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#BEA3D8',
  });

  try {
    // getDevicePushTokenAsync gives the raw FCM token (works with firebase-admin)
    const tokenResult = await Notifications.getDevicePushTokenAsync();
    const fcmToken = tokenResult.data;

    // Check if token already registered to avoid redundant calls
    const stored = await SecureStore.getItemAsync(FCM_TOKEN_KEY).catch(() => null);
    if (stored === fcmToken) {
      console.log('[FCM] Token unchanged, skipping registration');
      return fcmToken;
    }

    // Register with backend
    await updateDriverFcmToken(fcmToken);
    await SecureStore.setItemAsync(FCM_TOKEN_KEY, fcmToken).catch(() => { });
    console.log('[FCM] Driver FCM token registered');
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
    const { title, body } = notification.request.content;
    console.log('[FCM] Foreground notification:', title, body);
    // The setNotificationHandler above will show the alert automatically
  });
  return () => subscription.remove();
}

/**
 * Set up listener for notification tap responses.
 * Pass a navigation ref or callback to navigate on tap.
 */
export function setupNotificationTapHandler(onTap) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data || {};
    console.log('[FCM] Notification tapped, data:', data);
    if (onTap) onTap(data);
  });
  return () => subscription.remove();
}

/**
 * Fetch the notification payload that launched/opened the app (cold start).
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
