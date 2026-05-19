import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function BengaluruOnlyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const headerPaddingTop = Platform.OS === 'ios'
        ? Math.max(insets.top + 12, 52)
        : Math.max(insets.top + 12, 24);
    const footerPaddingBottom = Math.max(insets.bottom, 24);

    return (
        <View style={styles.container}>
            <View style={styles.glowTopRight} />
            <View style={styles.glowBottomLeft} />

            <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
                >
                    <Feather name="arrow-left" size={20} color="#BEA3D8" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Service Area</Text>
                <View style={{ width: 32 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.card}>
                    <View style={styles.iconCircle}>
                        <Feather name="map-pin" size={22} color="#BEA3D8" />
                    </View>
                    <Text style={styles.title}>Bengaluru Only</Text>
                    <Text style={styles.subtitle}>
                        Ride booking is currently available only in Bengaluru (Bangalore).
                        We will expand to more cities soon.
                    </Text>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.replace('/(tabs)')}
                        activeOpacity={0.9}
                    >
                        <Text style={styles.primaryButtonText}>Back to Home</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => router.push('/support-chat')}
                        activeOpacity={0.9}
                    >
                        <Text style={styles.secondaryButtonText}>Contact Support</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ height: footerPaddingBottom }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0FF',
    },
    glowTopRight: {
        position: 'absolute',
        right: -40,
        top: -80,
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: 'rgba(190, 163, 216, 0.25)',
    },
    glowBottomLeft: {
        position: 'absolute',
        left: -60,
        bottom: 40,
        width: 320,
        height: 320,
        borderRadius: 160,
        backgroundColor: 'rgba(190, 163, 216, 0.2)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
        backgroundColor: 'rgba(245, 240, 255, 0.85)',
    },
    backBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E1B2E',
        letterSpacing: -0.3,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    card: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingHorizontal: 24,
        paddingVertical: 28,
        alignItems: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.12,
        shadowRadius: 32,
        elevation: 6,
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(190, 163, 216, 0.2)',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1E1B2E',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 20,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 24,
    },
    primaryButton: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#BEA3D8',
        alignItems: 'center',
        marginBottom: 12,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryButton: {
        width: '100%',
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: '#F5F0FF',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(190, 163, 216, 0.6)',
    },
    secondaryButtonText: {
        color: '#BEA3D8',
        fontSize: 14,
        fontWeight: '600',
    },
});
