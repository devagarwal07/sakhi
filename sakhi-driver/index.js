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

    // no-op interval — keeps the JS event loop active so Android doesn't
    // treat the service as idle and terminate it.
    const keepalive = setInterval(() => {}, 25_000);
    global.__sakhiKeepalive = keepalive;

    // The promise never resolves — service stays alive until
    // notifee.stopForegroundService() is called (when driver goes offline).
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFEE BACKGROUND EVENT HANDLER
//
// Handles action-button presses when the app is in the background or killed.
// ─────────────────────────────────────────────────────────────────────────────
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;
  const data = notification?.data || {};

  if (type === EventType.ACTION_PRESS && pressAction?.id === 'accept') {
    // Emit accept — SocketContext picks this up and calls acceptRide()
    DeviceEventEmitter.emit('PUSH_RIDE_REQUEST', { ...data, _action: 'accept' });
    await notifee.cancelNotification(notification.id);
    return;
  }

  if (type === EventType.ACTION_PRESS && pressAction?.id === 'decline') {
    // Just dismiss
    await notifee.cancelNotification(notification.id);
    return;
  }

  if (type === EventType.PRESS) {
    // Body tap → bring app to front, show the overlay
    DeviceEventEmitter.emit('PUSH_RIDE_REQUEST', data);
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
