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

    // Verified → go to main app
    if (user?.verification_status === 'approved') {
        return <Redirect href="/(tabs)" />;
    }

    // Not yet verified → face liveness check (no Aadhaar)
    return <Redirect href="/(kyc)/face" />;
}
