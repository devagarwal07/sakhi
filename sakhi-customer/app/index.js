import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import SplashScreenView from '../src/screens/SplashScreenView';

// Root index — acts as the routing guard
export default function Index() {
    const { isAuthenticated, isLoading, user } = useAuth();

    // Show branded JS splash while auth state is being determined
    // (works in Expo Go — native splash is Expo Go branded)
    if (isLoading) {
        return <SplashScreenView />;
    }

    // Not logged in → login screen
    if (!isAuthenticated) {
        return <Redirect href="/(auth)/login" />;
    }

    // Route based on KYC status
    const status = user?.verification_status;
    if (!status || status === 'not_submitted' || status === 'rejected') {
        return <Redirect href="/(kyc)/intro" />;
    }
    if (status === 'pending') {
        return <Redirect href="/(kyc)/pending" />;
    }

    return <Redirect href="/(tabs)" />;
}
