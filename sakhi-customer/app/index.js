import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import SplashScreenView from '../src/screens/SplashScreenView';

// Root index — acts as the routing guard
export default function Index() {
    const { isAuthenticated, isLoading, user } = useAuth();

    // Show branded JS splash while auth state is being determined
    if (isLoading) {
        return <SplashScreenView />;
    }

    // Not logged in → login screen
    if (!isAuthenticated) {
        return <Redirect href="/(auth)/login" />;
    }

    // Verified → go to main app (but force details entry if name is missing)
    if (user?.verification_status === 'approved') {
        if (!user?.name) {
            return <Redirect href="/edit-profile" />;
        }
        return <Redirect href="/(tabs)" />;
    }

    // Not yet verified → face liveness check (no Aadhaar)
    return <Redirect href="/(kyc)/face" />;
}
