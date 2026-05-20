import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Animated, Platform, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';

// ─── Sakhi brand tokens ────────────────────────────────────────────────────────
const PRIMARY   = '#BEA3D8';
const BG        = '#F5F0FF';
const DARK      = '#1E1B2E';
const MUTED     = '#64748B';
const WHITE     = '#FFFFFF';
const DIM       = '#EDE9FA';
const WARN_BG   = '#FFF7ED';
const WARN_LINE = '#FDBA74';

export default function BengaluruOnlyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Shake animation for the map pin on mount
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        // Pop in
        Animated.spring(scaleAnim, {
            toValue: 1, tension: 80, friction: 8, useNativeDriver: true,
        }).start();

        // Shake once
        Animated.sequence([
            Animated.delay(400),
            Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8,   duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8,  duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
        ]).start();
    }, []);

    const topPad = Platform.OS === 'ios' ? Math.max(insets.top + 12, 52) : Math.max(insets.top + 12, 24);
    const botPad = Math.max(insets.bottom, 24);

    return (
        <View style={[styles.root, { paddingBottom: botPad }]}>

            {/* Decorative blobs */}
            <View style={styles.blobTR} />
            <View style={styles.blobBL} />

            {/* ── Header ──────────────────────────────────── */}
            <View style={[styles.header, { paddingTop: topPad }]}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
                    activeOpacity={0.75}
                >
                    <Feather name="arrow-left" size={18} color={DARK} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Drop-off Location</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* ── Illustration ─────────────────────────────── */}
            <View style={styles.illustrationArea}>
                <Animated.View
                    style={[
                        styles.illustrationCard,
                        { transform: [{ scale: scaleAnim }, { translateX: shakeAnim }] }
                    ]}
                >
                    {/* Map with boundary */}
                    <Svg width={100} height={100} viewBox="0 0 100 100" fill="none">
                        {/* Map card background */}
                        <Path d="M10 20 Q10 10 20 10 L80 10 Q90 10 90 20 L90 80 Q90 90 80 90 L20 90 Q10 90 10 80 Z"
                            fill={DIM} />
                        {/* Boundary circle */}
                        <Circle cx="50" cy="50" r="28"
                            stroke={PRIMARY} strokeWidth="2.5" strokeDasharray="6 4" fill="rgba(190,163,216,0.12)" />
                        {/* Inside pin (green = valid) */}
                        <Circle cx="50" cy="44" r="5" fill="#22C55E" />
                        <Path d="M50 49 L50 56" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" />
                        {/* Outside location X marker */}
                        <Circle cx="76" cy="28" r="9" fill="#FEE2E2" stroke="#F87171" strokeWidth="1.5" />
                        <Path d="M73 25 L79 31 M79 25 L73 31" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
                        {/* Arrow from outside to inside */}
                        <Path d="M69 34 Q60 42 58 44" stroke={MUTED} strokeWidth="1.5"
                            strokeDasharray="3 3" strokeLinecap="round"
                            markerEnd="url(#arrow)" />
                    </Svg>
                </Animated.View>
            </View>

            {/* ── Content ──────────────────────────────────── */}
            <View style={styles.content}>
                {/* Warning banner */}
                <View style={styles.warnBanner}>
                    <Feather name="alert-triangle" size={15} color="#D97706" />
                    <Text style={styles.warnText}>Drop-off outside service area</Text>
                </View>

                {/* Main card */}
                <View style={styles.card}>
                    <Text style={styles.heading}>Bengaluru{'\n'}Destinations Only</Text>
                    <Text style={styles.subheading}>
                        Sakhi rides are available{' '}
                        <Text style={styles.bold}>within Bengaluru</Text>{' '}
                        only. The drop-off you selected is outside our service boundary.
                    </Text>

                    {/* Tip box */}
                    <View style={styles.tipBox}>
                        <Feather name="info" size={13} color={PRIMARY} style={{ marginTop: 2 }} />
                        <Text style={styles.tipText}>
                            Please select a drop-off location inside Bengaluru to continue booking.
                        </Text>
                    </View>

                    {/* CTA */}
                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={() => (router.canGoBack() ? router.back() : router.replace('/location-search'))}
                        activeOpacity={0.88}
                    >
                        <Feather name="map-pin" size={15} color={WHITE} style={{ marginRight: 8 }} />
                        <Text style={styles.primaryBtnText}>Choose a Different Location</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => router.replace('/(tabs)')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.secondaryBtnText}>Go to Home</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BG,
    },

    // Blobs
    blobTR: {
        position: 'absolute', top: -60, right: -50,
        width: 220, height: 220, borderRadius: 110,
        backgroundColor: 'rgba(190,163,216,0.18)',
    },
    blobBL: {
        position: 'absolute', bottom: 40, left: -70,
        width: 280, height: 280, borderRadius: 140,
        backgroundColor: 'rgba(190,163,216,0.12)',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 8,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: WHITE,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: 'rgba(124,58,237,1)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: DARK,
        letterSpacing: -0.3,
    },

    // Illustration
    illustrationArea: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
    },
    illustrationCard: {
        width: 160, height: 160, borderRadius: 28,
        backgroundColor: WHITE,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: 'rgba(124,58,237,1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.12,
        shadowRadius: 36,
        elevation: 10,
    },

    // Content
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    warnBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: WARN_BG,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 16,
        borderLeftWidth: 3,
        borderLeftColor: WARN_LINE,
    },
    warnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#92400E',
    },
    card: {
        backgroundColor: WHITE,
        borderRadius: 24,
        paddingHorizontal: 22,
        paddingVertical: 24,
        shadowColor: 'rgba(124,58,237,1)',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.09,
        shadowRadius: 28,
        elevation: 7,
    },
    heading: {
        fontSize: 26,
        fontWeight: '800',
        color: DARK,
        letterSpacing: -0.7,
        lineHeight: 34,
        marginBottom: 10,
    },
    subheading: {
        fontSize: 14,
        lineHeight: 22,
        color: MUTED,
        marginBottom: 16,
    },
    bold: {
        color: DARK,
        fontWeight: '700',
    },
    tipBox: {
        flexDirection: 'row',
        gap: 8,
        backgroundColor: DIM,
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
    },
    tipText: {
        flex: 1,
        fontSize: 13,
        color: MUTED,
        lineHeight: 19,
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: PRIMARY,
        borderRadius: 14,
        paddingVertical: 15,
        marginBottom: 10,
        shadowColor: 'rgba(190,163,216,1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 5,
    },
    primaryBtnText: {
        color: WHITE,
        fontSize: 15,
        fontWeight: '700',
    },
    secondaryBtn: {
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: BG,
        borderWidth: 1,
        borderColor: 'rgba(190,163,216,0.5)',
    },
    secondaryBtnText: {
        color: MUTED,
        fontSize: 14,
        fontWeight: '600',
    },
});
