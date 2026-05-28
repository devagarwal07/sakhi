import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { updateCustomerFcmToken } from '../api/endpoints';

const FCM_TOKEN_KEY = 'customer_fcm_token';

// expo-notifications remote push support was removed from Expo Go in SDK 53.
// Guard all notification code so it is a no-op in Expo Go and only runs in
// development builds / production builds where native modules are available.
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

let _notificationsModule = null;
async function getNotifications() {
  if (IS_EXPO_GO) return null;
  if (_notificationsModule) return _notificationsModule;
  try {
    // Lazy import to avoid Expo Go runtime crash.
    _notificationsModule = await import('expo-notifications');
    return _notificationsModule;
  } catch (e) {
    console.warn('[FCM] expo-notifications unavailable:', e?.message || e);
    return null;
  }
}

/**
 * Request permissions, get FCM device token, and register with backend.
 * Calls PATCH /notifications/users/fcm-token on the apps backend.
 * Returns null silently when running inside Expo Go.
 */
export async function registerForPushAsync() {
  if (IS_EXPO_GO) {
    return null;
  }

  const Notifications = await getNotifications();
  if (!Notifications) return null;

  // Configure foreground notification display
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      // Parse notification type from the payload data
      const type = notification.request.content.data?.type || 'general';
      
      // Load user preferences
      let showAlert = true;
      try {
        const saved = await AsyncStorage.getItem('@sakhi_notification_prefs');
        if (saved) {
          const prefs = JSON.parse(saved);
          
          // Map backend notification types to preference toggles
          // Assuming the backend sends types like 'driverAssigned', 'tripStarted', etc.
          // Fallback to true if the specific type isn't found in preferences
          if (prefs.hasOwnProperty(type)) {
            showAlert = prefs[type];
          } else if (type === 'general') {
            // Let general app updates or default pushes through if unmapped, or maybe block them
            // We'll default to true for unmapped types just in case
            showAlert = true; 
          }
        }
      } catch (e) {
        console.warn('Failed to read notification preferences in handler', e);
      }

      return {
        shouldShowAlert: showAlert,
        shouldPlaySound: showAlert,
        shouldSetBadge: showAlert,
      };
    },
  });

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
      return fcmToken;
    }

    await updateCustomerFcmToken(fcmToken);
    await SecureStore.setItemAsync(FCM_TOKEN_KEY, fcmToken).catch(() => { });
    return fcmToken;
  } catch (err) {
    console.error('[FCM] registerForPushAsync error:', err?.message || err);
    return null;
  }
}

export function setupForegroundHandler() {
  // This project currently calls only registerForPushAsync().
  // Keep this as a safe no-op unless notifications are explicitly loaded.
  if (IS_EXPO_GO || !_notificationsModule) return () => { };
  const Notifications = _notificationsModule;

  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const { title, body } = notification.request.content;
  });
  return () => subscription.remove();
}

export function setupNotificationTapHandler(onTap) {
  if (IS_EXPO_GO || !_notificationsModule) return () => { };
  const Notifications = _notificationsModule;

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data || {};
    if (onTap) onTap(data);
  });
  return () => subscription.remove();
}
