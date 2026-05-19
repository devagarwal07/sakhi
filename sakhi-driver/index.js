import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import { DeviceEventEmitter } from 'react-native';
import './global.css';

// ⚠️ Location background task MUST be imported at the top level before App mounts.
import './src/services/locationTask';

// Import the shared notification helper — keeps the ride notification logic
// in one place (notificationService.js) and avoids duplication.
import { showCustomRideNotification } from './src/services/notificationService';

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFEE FOREGROUND SERVICE
//
// Keeps the JS thread alive while the driver is online so FCM data messages
// are received even when the app is in the background.
//
// FIX FOR APP SHUTDOWN: The keepalive interval prevents Android's battery
// optimizer from killing the service due to an "idle" JS event loop.
// ─────────────────────────────────────────────────────────────────────────────
notifee.registerForegroundService((notification) => {
  return new Promise(() => {
    console.log('[Notifee] Foreground service started:', notification.id);

    // Keepalive interval: fires every 5 s to keep the JS event loop active.
    // 25 s was too long — Android's battery optimizer marked the service idle
    // and terminated it, causing the app to stop receiving ride notifications.
    const keepalive = setInterval(() => { /* no-op keepalive */ }, 5_000);
    global.__sakhiKeepalive = keepalive;

    // The promise never resolves — service stays alive until
    // notifee.stopForegroundService() is called (when driver goes offline).
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFEE BACKGROUND EVENT HANDLER
//
// ⚠️  IMPORTANT: This runs in a HEADLESS JS context when the app is backgrounded.
//     DeviceEventEmitter.emit() here does NOT reach the main app's event listeners.
//     Therefore: we call the REST API directly for Accept/Decline, instead of
//     trying to relay through DeviceEventEmitter.
// ─────────────────────────────────────────────────────────────────────────────
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;
  const data = notification?.data || {};
  const rideId = data.ride_id || data.rideId;

  if (type === EventType.ACTION_PRESS && pressAction?.id === 'accept' && rideId) {
    console.log('[Notifee BG] Accept pressed for ride:', rideId);
    try {
      // Call REST API directly — the only reliable way from a headless context.
      // The auth token is stored in SecureStore by AuthContext on login.
      const SecureStore = require('expo-secure-store');
      const token = await SecureStore.getItemAsync('driver_access_token');
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://sakhi-backend-pwej.onrender.com';
      const res = await fetch(`${API_URL}/rides/${rideId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json().catch(() => ({}));
      console.log('[Notifee BG] Accept API response:', res.status, json?.message || '');
    } catch (e) {
      console.error('[Notifee BG] Accept API call failed:', e?.message);
    }
    await notifee.cancelNotification(notification.id);
    return;
  }

  if (type === EventType.ACTION_PRESS && pressAction?.id === 'decline') {
    console.log('[Notifee BG] Decline pressed for ride:', rideId);
    // Just dismiss — matching engine will timeout and move to next driver
    await notifee.cancelNotification(notification.id);
    return;
  }

  if (type === EventType.PRESS) {
    // Body tap → notification dismissed, app brought to foreground.
    // IncomingRideActivity or the bridge hook will show the in-app overlay.
    await notifee.cancelNotification(notification.id);
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE BACKGROUND MESSAGE HANDLER
//
// This fires when:
//   1. App is BACKGROUNDED and the JS foreground service is alive (most reliable)
//   2. App is KILLED — FCM spins up a headless JS task for ~10 seconds
//
// ⚠️  CRITICAL: The backend MUST send DATA-ONLY messages (no `notification` key).
//     If `notification:{}` is present, Android FCM SDK intercepts the message
//     and shows a plain banner BEFORE this handler executes, bypassing our
//     custom fullScreenAction entirely.
//
// Correct backend payload:
//   { to: FCM_TOKEN, priority: "high", data: { type: "RIDE_REQUEST", ... } }
//
// The backend's sendRideRequest() in fcmService.js already does this ✅
// ─────────────────────────────────────────────────────────────────────────────
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[FCM] Background message:', remoteMessage?.data?.type);

  const payload = remoteMessage.data || {};

  if (payload.type === 'RIDE_REQUEST') {
    // 1. Show the custom Notifee notification with fullScreenAction
    //    → wakes screen / shows HUD banner / opens app on tap
    await showCustomRideNotification(payload);

    // 2. If the foreground service is running (JS thread alive in background),
    //    also emit directly so the IncomingRideRequestScreen can appear
    //    without the user needing to tap the notification.
    DeviceEventEmitter.emit('PUSH_RIDE_REQUEST', payload);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App)
registerRootComponent(App);
