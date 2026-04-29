import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { updateCustomerFcmToken } from '../api/endpoints';

const FCM_TOKEN_KEY = 'customer_fcm_token';

// expo-notifications remote push support was removed from Expo Go in SDK 53.
// Guard all notification code so it is a no-op in Expo Go and only runs in
// development builds / production builds where native modules are available.
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

// Configure foreground notification display (skipped silently in Expo Go)
if (!IS_EXPO_GO) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Request permissions, get FCM device token, and register with backend.
 * Calls PATCH /notifications/users/fcm-token on the apps backend.
 * Returns null silently when running inside Expo Go.
 */
export async function registerForPushAsync() {
  if (IS_EXPO_GO) {
    console.log('[FCM] Skipped in Expo Go — use a dev/production build to test push notifications.');
    return null;
  }

  if (!Device.isDevice) {
    console.warn('[FCM] Push not supported on simulator');
    return null;
  }

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

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Sakhi Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#BEA3D8',
    });
  }

  try {
    const tokenResult = await Notifications.getDevicePushTokenAsync();
    const fcmToken = tokenResult.data;

    const stored = await SecureStore.getItemAsync(FCM_TOKEN_KEY).catch(() => null);
    if (stored === fcmToken) {
      console.log('[FCM] Token unchanged, skipping registration');
      return fcmToken;
    }

    await updateCustomerFcmToken(fcmToken);
    await SecureStore.setItemAsync(FCM_TOKEN_KEY, fcmToken).catch(() => {});
    console.log('[FCM] Customer FCM token registered');
    return fcmToken;
  } catch (err) {
    console.error('[FCM] registerForPushAsync error:', err?.message || err);
    return null;
  }
}

export function setupForegroundHandler() {
  if (IS_EXPO_GO || !Notifications) return () => {};

  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const { title, body } = notification.request.content;
    console.log('[FCM] Foreground notification:', title, body);
  });
  return () => subscription.remove();
}

export function setupNotificationTapHandler(onTap) {
  if (IS_EXPO_GO || !Notifications) return () => {};

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data || {};
    console.log('[FCM] Notification tapped:', data);
    if (onTap) onTap(data);
  });
  return () => subscription.remove();
}
