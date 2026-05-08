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

    // Customer onboarding: face-liveness only.
    const status = user?.verification_status;
    const faceReviewRequired = !!user?.face_review_required;

    if (status === 'approved') {
        return <Redirect href="/(tabs)" />;
    }

    // "pending" is the DB default for riders; only show this screen when manual review is required.
    if (faceReviewRequired) {
        return <Redirect href="/(kyc)/pending" />;
    }

    return <Redirect href="/(kyc)/face" />;
}
