/**
 * Android utilities — cross-platform helpers
 * Import from here instead of computing Platform values inline.
 */
import { Platform, StatusBar } from 'react-native';

/**
 * Height of the Android status bar, 0 on iOS (SafeAreaView handles it).
 * Use this to add correct top padding on screens that DON'T use SafeAreaView.
 */
export const ANDROID_STATUS_BAR_HEIGHT = Platform.OS === 'android'
    ? (StatusBar.currentHeight ?? 24)
    : 0;

/**
 * Standard header top padding that works on both platforms.
 * iOS: 0 (SafeAreaView / paddingTop: 56 already accounts for notch)
 * Android: StatusBar.currentHeight so content isn't hidden under the bar
 */
export const HEADER_TOP_PADDING = Platform.select({
    android: StatusBar.currentHeight ?? 24,
    ios: 0,
    default: 0,
});

/**
 * KeyboardAvoidingView behavior that works on Android.
 * We keep 'height' on Android and 'padding' on iOS for predictable
 * layout shifts in this app's current screen stack.
 */
export const KEYBOARD_BEHAVIOR = Platform.OS === 'ios' ? 'padding' : 'height';
