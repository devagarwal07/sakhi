import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import { DeviceEventEmitter } from 'react-native';
import './global.css';

// ⚠️ Location background task MUST be imported at the top level before App mounts.
import './src/services/locationTask';

// Fallback-only notification helper (used only when the native overlay cannot be shown)
import { showFallbackRideNotification } from './src/services/notificationService';

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFEE FOREGROUND SERVICE
//
// Keeps the JS thread alive while the driver is online so FCM data messages
// are received even when the app is in the background.
// ─────────────────────────────────────────────────────────────────────────────
notifee.registerForegroundService((notification) => {
  return new Promise(() => {
    console.log('[Notifee] Foreground service started:', notification.id);
    // Keepalive: prevents Android's battery optimizer from marking the service
    // as idle and killing it. 5 s is short enough to stay alive on all OEMs.
    const keepalive = setInterval(() => { /* no-op keepalive */ }, 5_000);
    global.__sakhiKeepalive = keepalive;
    // Promise intentionally never resolves — service stays alive until
    // notifee.stopForegroundService() is called (driver goes offline).
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFEE BACKGROUND EVENT HANDLER
//
// Simplified — we no longer have Accept / Decline action buttons in the
// notification (those are in the native overlay). We just cancel any
// fallback notification that was shown.
// ─────────────────────────────────────────────────────────────────────────────
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (detail.notification?.id) {
    await notifee.cancelNotification(detail.notification.id);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE BACKGROUND MESSAGE HANDLER
//
// Fires when:
//   1. App is KILLED   — FCM spins up a headless JS task (~10 s window)
//   2. App is BACKGROUNDED — fires in the headless context alongside the
//      Notifee foreground service (they are separate JS engine instances)
//
// PRIMARY PATH:
//   → RideRequestBridge.showOverlay() starts RideOverlayService which draws
//     a native WindowManager bottom-sheet OVER the current app (Rapido style).
//
// FALLBACK PATH (if overlay permission not granted or service fails):
//   → showFallbackRideNotification() shows a minimal notification banner.
//     Tapping it opens MainActivity; the JS bridge hook then shows the overlay.
//
// NOTE: DeviceEventEmitter.emit() in THIS headless context does NOT reach the
// main React Native JS thread. The native overlay is the only reliable path
// for killed / backgrounded state.
// ─────────────────────────────────────────────────────────────────────────────
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[FCM] Background message type:', remoteMessage?.data?.type);

  const payload = remoteMessage.data || {};

  if (payload.type === 'RIDE_REQUEST') {
    const overlayStarted = await tryStartNativeOverlay(payload);

    if (!overlayStarted) {
      // Fallback: show a silent banner notification so the driver is at
      // least informed. Tapping it opens the app.
      console.log('[FCM] Native overlay unavailable — showing fallback notification');
      await showFallbackRideNotification(payload).catch((e) =>
        console.warn('[FCM] Fallback notification also failed:', e?.message)
      );
    }
  }
});

/**
 * tryStartNativeOverlay
 *
 * Reads the auth token from SecureStore (available in headless JS context),
 * then calls RideRequestBridge.showOverlay() to start RideOverlayService.
 *
 * Returns true if the service was started successfully, false otherwise.
 */
async function tryStartNativeOverlay(payload) {
  try {
    const SecureStore   = require('expo-secure-store');
    const { NativeModules } = require('react-native');

    if (!NativeModules.RideRequestBridge?.showOverlay) {
      console.warn('[FCM] RideRequestBridge.showOverlay not available');
      return false;
    }

    const token  = await SecureStore.getItemAsync('sakhi_driver_access_token').catch(() => '') || '';
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://sakhi-backend-pwej.onrender.com';

    await NativeModules.RideRequestBridge.showOverlay(
      JSON.stringify(payload),
      token,
      apiUrl,
    );

    console.log('[FCM] ✅ RideOverlayService started — native overlay will appear');
    return true;
  } catch (e) {
    console.warn('[FCM] showOverlay failed:', e?.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App)
registerRootComponent(App);
