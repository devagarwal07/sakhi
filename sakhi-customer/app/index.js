import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/utils/theme';

// Root index — acts as the routing guard
export default function Index() {
    const { isAuthenticated, isLoading, user } = useAuth();

    // Show loading spinner while auth state is being determined
    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={Colors.primaryContainer} />
            </View>
        );
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
