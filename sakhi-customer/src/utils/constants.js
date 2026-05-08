import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

function getDevMachineHost() {
    const hostUri =
        Constants?.expoConfig?.hostUri ||
        Constants?.expoConfig?.extra?.expoClient?.hostUri ||
        Constants?.manifest2?.extra?.expoClient?.hostUri ||
        Constants?.manifest?.debuggerHost;

    if (!hostUri || typeof hostUri !== 'string') return null;
    const host = hostUri.split(':')[0] || null;

    // Only accept a LAN IPv4 address (avoids tunnel hosts like *.exp.direct).
    const isIPv4 = typeof host === 'string' && /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
    return isIPv4 ? host : null;
}

const FALLBACK_BASE_URL = 'http://localhost:3000';
const ANDROID_EMULATOR_BASE_URL = 'http://10.0.2.2:3000';

const DEV_MACHINE_HOST = getDevMachineHost();
const DEV_BASE_URL = DEV_MACHINE_HOST
    ? `http://${DEV_MACHINE_HOST}:3000`
    : Platform.OS === 'android' && Constants?.isDevice === false
        ? ANDROID_EMULATOR_BASE_URL
        : FALLBACK_BASE_URL;

const ENV_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const isLocalEnvUrl =
    typeof ENV_BASE_URL === 'string' &&
    (ENV_BASE_URL.includes('localhost') || ENV_BASE_URL.includes('127.0.0.1'));

// On a physical device, localhost/127.0.0.1 points to the phone, not your PC.
// In that case, prefer the Expo LAN host-derived URL.
export const API_BASE_URL =
    ENV_BASE_URL && !(Device.isDevice && Platform.OS !== 'web' && isLocalEnvUrl)
        ? ENV_BASE_URL
        : (__DEV__ ? DEV_BASE_URL : FALLBACK_BASE_URL);

// Liveness WebView requires HTTPS for camera access (getUserMedia secure context).
// Use the dedicated HTTPS URL (e.g. ngrok) if provided, otherwise fall back to API_BASE_URL.
export const LIVENESS_BASE_URL =
    process.env.EXPO_PUBLIC_LIVENESS_URL || API_BASE_URL;

export const STORAGE_KEYS = {
    ACCESS_TOKEN: 'sakhi_access_token',
    REFRESH_TOKEN: 'sakhi_refresh_token',
    USER_DATA: 'sakhi_user_data',
};

export const RIDE_STATUSES = {
    SEARCHING: 'searching',
    ASSIGNED: 'assigned',
    EN_ROUTE: 'driver_en_route',
    ARRIVED: 'arrived',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

export const VERIFICATION_STATUSES = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    NOT_SUBMITTED: 'not_submitted',
};

export const VEHICLE_TYPES = {
    AUTO: 'auto',
    CAB: 'cab',
};

export const SUBSCRIPTION_PLANS = [7, 14, 21, 30];
