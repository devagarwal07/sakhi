import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import 'react-native-url-polyfill/auto';

// Create a custom storage adapter using Expo SecureStore for native persistence
const ExpoSecureStoreAdapter = {
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => {
        const strValue = typeof value === 'string' ? value : JSON.stringify(value);
        return SecureStore.setItemAsync(key, strValue);
    },
    removeItem: (key) => {
        return SecureStore.deleteItemAsync(key);
    },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
