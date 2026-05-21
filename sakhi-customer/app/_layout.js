import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { SocketProvider } from '../src/context/SocketContext';
import { RideProvider } from '../src/context/RideContext';

// Keep the native splash visible until auth state is resolved
SplashScreen.preventAutoHideAsync();

// Inner component — has access to AuthContext
function AppNavigator() {
    const { isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading) {
            SplashScreen.hideAsync();
        }
    }, [isLoading]);

    return (
        <>
            {/* Android status bar — styled to match app theme */}
            <StatusBar
                barStyle="dark-content"
                backgroundColor="#F5F0FF"
                translucent={false}
            />
            <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(kyc)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
                name="sidebar"
                options={{ presentation: 'transparentModal', animation: 'none' }}
            />
            <Stack.Screen
                name="location-search"
                options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
            />
            <Stack.Screen
                name="ride-estimate"
                options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
                name="active-ride"
                options={{ animation: 'slide_from_right', gestureEnabled: false }}
            />
            <Stack.Screen
                name="notifications"
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="add-contact"
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="complaint"
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="subscription-payment"
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="subscription-details"
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="ride-details"
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="edit-profile"
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="saved-places"
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="about"
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="terms"
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
                name="change-phone"
                options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen name="wallet" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="ride-history" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="payment" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="payment-success" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="emergency-contacts" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="sos-settings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="sos-warning" options={{ animation: 'fade' }} />
            <Stack.Screen name="sos-active" options={{ animation: 'none', presentation: 'fullScreenModal' }} />
            <Stack.Screen name="ride-finding" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="driver-arrived" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
            <Stack.Screen name="ride-summary" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
            <Stack.Screen name="subscription-plans" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="subscription-ride" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="city-not-available" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="bengaluru-only" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="referrals" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="support-chat" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="help-support" options={{ animation: 'slide_from_right' }} />
        </Stack>
        </>
    );
}

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <AuthProvider>
                    <SocketProvider>
                        <RideProvider>
                            <AppNavigator />
                        </RideProvider>
                    </SocketProvider>
                </AuthProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
