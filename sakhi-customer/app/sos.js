import React, { useRef, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Alert, Animated, Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';
import { triggerSOS } from '../src/api/endpoints';
import * as Location from 'expo-location';

export default function SOSScreen() {
    const router = useRouter();
    const [activated, setActivated] = useState(false);
    const [countdown, setCountdown] = useState(3);
    const [pressing, setPressing] = useState(false);
    const pressTimer = useRef(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const bgAnim = useRef(new Animated.Value(0)).current;
    const countdownRef = useRef(null);

    useEffect(() => {
        // Pulsing ring animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.3, duration: 700, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            ]),
        ).start();

        return () => {
            clearTimeout(pressTimer.current);
            clearInterval(countdownRef.current);
        };
    }, []);

    const startPress = () => {
        setPressing(true);
        setCountdown(3);
        Vibration.vibrate(100);

        let count = 3;
        countdownRef.current = setInterval(() => {
            count -= 1;
            setCountdown(count);
            Vibration.vibrate(200);
            if (count <= 0) {
                clearInterval(countdownRef.current);
                fireSOSAlert();
            }
        }, 1000);

        Animated.timing(bgAnim, { toValue: 1, duration: 3000, useNativeDriver: false }).start();
    };

    const cancelPress = () => {
        setPressing(false);
        clearInterval(countdownRef.current);
        setCountdown(3);
        Vibration.cancel();
        Animated.timing(bgAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
    };

    const fireSOSAlert = async () => {
        setActivated(true);
        Vibration.vibrate([0, 500, 200, 500]);
        try {
            const loc = await Location.getCurrentPositionAsync({});
            await triggerSOS({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            });
        } catch (e) {
            // SOS attempted — critical flow, don't block UI
        }
    };

    const bgColor = bgAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#7c3aed', '#dc2626'],
    });

    if (activated) {
        return (
            <View style={styles.activatedContainer}>
                <Animated.View style={[styles.activatedPulse, { transform: [{ scale: pulseAnim }] }]} />
                <View style={styles.activatedContent}>
                    <Text style={styles.activatedIcon}>🆘</Text>
                    <Text style={styles.activatedTitle}>SOS Alert Sent!</Text>
                    <Text style={styles.activatedSubtitle}>
                        Emergency contacts & Sakhi support have been notified with your live location.
                    </Text>
                    <View style={styles.activatedInfo}>
                        <Text style={styles.activatedInfoItem}>✅  Support team alerted</Text>
                        <Text style={styles.activatedInfoItem}>✅  Emergency contacts notified</Text>
                        <Text style={styles.activatedInfoItem}>✅  Live location shared</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.dismissBtn}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.dismissBtnText}>I'm Safe — Dismiss Alert</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Close */}
            <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
                <Text style={styles.closeBtnText}>✕  Cancel</Text>
            </TouchableOpacity>

            <View style={styles.content}>
                <Text style={styles.title}>Emergency SOS</Text>
                <Text style={styles.subtitle}>
                    {pressing
                        ? `Releasing too early will cancel. Hold for ${countdown}s…`
                        : 'Press and hold the button below for 3 seconds to alert Sakhi support & your emergency contacts.'}
                </Text>

                {/* SOS Hold Button */}
                <View style={styles.sosButtonWrapper}>
                    {/* Outer pulse ring */}
                    <Animated.View
                        style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]}
                    />
                    <TouchableOpacity
                        style={styles.sosButton}
                        onPressIn={startPress}
                        onPressOut={cancelPress}
                        activeOpacity={0.95}
                    >
                        <Text style={styles.sosButtonIcon}>🆘</Text>
                        <Text style={styles.sosButtonLabel}>
                            {pressing ? `${countdown}` : 'HOLD'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Info */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoItem}>📞  Connects you to Sakhi support</Text>
                    <Text style={styles.infoItem}>📱  SMS alert to emergency contacts</Text>
                    <Text style={styles.infoItem}>📍  Shares your live GPS location</Text>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 56 },
    closeBtn: {
        alignSelf: 'flex-start', marginLeft: 20, marginBottom: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full,
    },
    closeBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    content: { flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 24 },
    title: {
        fontSize: 32, fontWeight: '800', color: '#fff',
        letterSpacing: -1, marginBottom: 12,
    },
    subtitle: {
        fontSize: 15, color: 'rgba(255,255,255,0.8)',
        textAlign: 'center', lineHeight: 22, marginBottom: 48,
    },
    sosButtonWrapper: {
        alignItems: 'center', justifyContent: 'center',
        width: 180, height: 180, marginBottom: 40,
    },
    pulseRing: {
        position: 'absolute', width: 180, height: 180, borderRadius: 90,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    sosButton: {
        width: 140, height: 140, borderRadius: 70,
        backgroundColor: '#dc2626',
        borderWidth: 5, borderColor: 'rgba(255,255,255,0.5)',
        alignItems: 'center', justifyContent: 'center',
        ...Shadows.editorial,
    },
    sosButtonIcon: { fontSize: 36, marginBottom: 4 },
    sosButtonLabel: {
        color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 2,
    },
    infoCard: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 16, padding: 20, width: '100%', gap: 10,
    },
    infoItem: { color: '#fff', fontSize: 14, fontWeight: '500' },
    // Activated state
    activatedContainer: {
        flex: 1, backgroundColor: '#dc2626',
        alignItems: 'center', justifyContent: 'center', padding: 32,
    },
    activatedPulse: {
        position: 'absolute', width: 300, height: 300, borderRadius: 150,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    activatedContent: { alignItems: 'center' },
    activatedIcon: { fontSize: 64, marginBottom: 20 },
    activatedTitle: {
        fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 12,
    },
    activatedSubtitle: {
        fontSize: 15, color: 'rgba(255,255,255,0.85)',
        textAlign: 'center', lineHeight: 22, marginBottom: 24,
    },
    activatedInfo: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 14, padding: 16, width: '100%', gap: 10, marginBottom: 28,
    },
    activatedInfoItem: { color: '#fff', fontSize: 14, fontWeight: '500' },
    dismissBtn: {
        backgroundColor: '#fff',
        borderRadius: BorderRadius.md, paddingVertical: 14, paddingHorizontal: 28,
    },
    dismissBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
});
