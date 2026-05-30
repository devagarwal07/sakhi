import React, { useCallback } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import SplashScreenView from '../src/screens/SplashScreenView';

// Root index — acts as the routing guard
export default function Index() {
    const { isAuthenticated, isLoading, user } = useAuth();
    const router = useRouter();

    // Called when the bar animation finishes AND auth is resolved
    const handleSplashReady = useCallback(() => {
        if (!isAuthenticated) {
            router.replace('/(auth)/login');
        } else if (user?.verification_status === 'approved') {
            if (!user?.name) {
                router.replace('/edit-profile');
            } else {
                router.replace('/(tabs)');
            }
        } else {
            router.replace('/(kyc)/face');
        }
    }, [isAuthenticated, user]);

    // Always show the splash — it controls its own exit via onReady
    return (
        <SplashScreenView
            authReady={!isLoading}
            onReady={handleSplashReady}
        />
    );
}
