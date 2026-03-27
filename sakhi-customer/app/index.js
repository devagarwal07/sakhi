import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/utils/theme';

// Root index — acts as the routing guard
export default function Index() {
    const router = useRouter();
    const { isAuthenticated, isLoading, user } = useAuth();

    useEffect(() => {
        if (isLoading) return;

        if (!isAuthenticated) {
            router.replace('/(auth)/login');
            return;
        }

        // Route based on KYC status
        const status = user?.verification_status;
        if (!status || status === 'not_submitted' || status === 'rejected') {
            router.replace('/(kyc)/intro');
        } else if (status === 'pending') {
            router.replace('/(kyc)/pending');
        } else {
            router.replace('/(tabs)');
        }
    }, [isAuthenticated, isLoading, user]);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={Colors.primaryContainer} />
        </View>
    );
}
