import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, Animated, Platform, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Sakhi brand tokens ────────────────────────────────────────────────────────
const PRIMARY   = '#BEA3D8';
const BG        = '#F5F0FF';
const DARK      = '#1E1B2E';
const MUTED     = '#64748B';
const WHITE     = '#FFFFFF';
const SURFACE   = '#FFFFFF';
const DIM       = '#EDE9FA';

export default function CityNotAvailableScreen() {
    const insets = useSafeAreaInsets();

    // Subtle floating animation for the illustration
    const floatAnim = useRef(new Animated.Value(0)).current;
    // Pulse ring
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -12, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
                Animated.timing(floatAnim, { toValue: 0,   duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 1600, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
                Animated.timing(pulseAnim, { toValue: 0, duration: 1600, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
            ])
        ).start();
    }, []);

    const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
    const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

    const topPad = Platform.OS === 'ios' ? Math.max(insets.top, 44) : Math.max(insets.top, 24);
    const botPad = Math.max(insets.bottom, 32);

    return (
        <View style={[styles.root, { paddingTop: topPad, paddingBottom: botPad }]}>

            {/* Decorative background blobs */}
            <View style={styles.blobTR} />
            <View style={styles.blobBL} />

            {/* ── Illustration area ─────────────────────────── */}
            <View style={styles.illustrationArea}>

                {/* Soft lavender disc behind character */}
                <Animated.View
                    style={[
                        styles.pulseRingInner,
                        { transform: [{ scale: pulseScale }], opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] }) },
                    ]}
                />

                {/* Character floating freely — transparent PNG */}
                <Animated.Image
                    source={require('../assets/sorry_illustration.png')}
                    style={[styles.illustration, { transform: [{ translateY: floatAnim }] }]}
                    resizeMode="contain"
                />
            </View>

            {/* ── Content card ──────────────────────────────── */}
            <View style={styles.card}>

                {/* Pill tag */}
                <View style={styles.pill}>
                    <Text style={styles.pillText}>Currently Unavailable</Text>
                </View>

                <Text style={styles.heading}>
                    Not available{'\n'}in your city yet
                </Text>
                <Text style={styles.subheading}>
                    Sakhi is currently operating exclusively in{' '}
                    <Text style={styles.cityHighlight}>Bengaluru</Text>.
                    {'\n\n'}We're working hard to bring safe, verified rides to more cities soon. Stay tuned!
                </Text>

                {/* City tag row */}
                <View style={styles.cityRow}>
                    <View style={styles.cityChip}>
                        <View style={styles.cityDot} />
                        <Text style={styles.cityChipText}>Bengaluru</Text>
                        <View style={styles.cityBadge}>
                            <Text style={styles.cityBadgeText}>Live Now</Text>
                        </View>
                    </View>
                    <View style={[styles.cityChip, styles.cityChipDim]}>
                        <View style={[styles.cityDot, styles.cityDotDim]} />
                        <Text style={[styles.cityChipText, { color: MUTED }]}>More cities</Text>
                        <View style={[styles.cityBadge, styles.cityBadgeSoon]}>
                            <Text style={[styles.cityBadgeText, { color: MUTED }]}>Coming Soon</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* ── Footer note ───────────────────────────────── */}
            <Text style={styles.footer}>
                💜  Sakhi — Safe rides for women
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BG,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
    },

    // Background blobs
    blobTR: {
        position: 'absolute', top: -80, right: -60,
        width: 280, height: 280, borderRadius: 140,
        backgroundColor: 'rgba(190,163,216,0.18)',
    },
    blobBL: {
        position: 'absolute', bottom: 0, left: -80,
        width: 320, height: 320, borderRadius: 160,
        backgroundColor: 'rgba(190,163,216,0.12)',
    },

    // Illustration
    illustrationArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
    },
    pulseRingOuter: {
        position: 'absolute',
        width: 260, height: 260, borderRadius: 130,
        borderWidth: 1.5,
        borderColor: PRIMARY,
        opacity: 0.4,
    },
    pulseRingInner: {
        position: 'absolute',
        width: 220, height: 220, borderRadius: 110,
        backgroundColor: 'rgba(190,163,216,0.10)',
    },
    illustration: {
        width: 290,
        height: 290,
    },

    // Content card
    card: {
        width: '100%',
        backgroundColor: WHITE,
        borderRadius: 28,
        paddingHorizontal: 24,
        paddingVertical: 28,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: 'rgba(124,58,237,1)',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.10,
        shadowRadius: 32,
        elevation: 8,
    },
    pill: {
        backgroundColor: DIM,
        borderRadius: 9999,
        paddingHorizontal: 14,
        paddingVertical: 5,
        marginBottom: 16,
    },
    pillText: {
        fontSize: 11,
        fontWeight: '700',
        color: PRIMARY,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    heading: {
        fontSize: 28,
        fontWeight: '800',
        color: DARK,
        textAlign: 'center',
        letterSpacing: -0.8,
        lineHeight: 36,
        marginBottom: 14,
    },
    subheading: {
        fontSize: 14,
        lineHeight: 22,
        color: MUTED,
        textAlign: 'center',
        marginBottom: 24,
    },
    cityHighlight: {
        color: DARK,
        fontWeight: '700',
    },

    // City chips
    cityRow: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
    },
    cityChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F0FF',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 10,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(190,163,216,0.4)',
    },
    cityChipDim: {
        backgroundColor: '#FAFAFA',
        borderColor: '#E5E7EB',
    },
    cityDot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: '#22C55E',
    },
    cityDotDim: {
        backgroundColor: '#CBD5E1',
    },
    cityChipText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '700',
        color: DARK,
    },
    cityBadge: {
        backgroundColor: 'rgba(34,197,94,0.12)',
        borderRadius: 9999,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    cityBadgeSoon: {
        backgroundColor: '#F1F5F9',
    },
    cityBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#16A34A',
        letterSpacing: 0.3,
    },

    // Footer
    footer: {
        fontSize: 13,
        color: MUTED,
        textAlign: 'center',
        marginBottom: 8,
        fontWeight: '500',
    },
});
