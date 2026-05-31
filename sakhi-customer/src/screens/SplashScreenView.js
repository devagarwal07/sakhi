import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    Animated,
    StatusBar,
    ActivityIndicator,
    Platform,
} from 'react-native';

/**
 * SplashScreenView — shown while auth token check runs.
 * The loading bar animates from 0% → 100% over ~2s.
 * Once the bar completes AND auth is resolved, onReady() is called.
 *
 * Props:
 *   onReady — callback fired when bar animation finishes (if auth also done)
 *   authReady — boolean: true when auth state has resolved
 */
export default function SplashScreenView({ onReady, authReady }) {
    // ── Entrance animations ──────────────────────────────────────────────
    const logoScale = useRef(new Animated.Value(0.82)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const taglineY = useRef(new Animated.Value(10)).current;
    const taglineOp = useRef(new Animated.Value(0)).current;
    const bottomOp = useRef(new Animated.Value(0)).current;

    // Progress bar: 0 → 1 (0% → 100%)
    const progressAnim = useRef(new Animated.Value(0)).current;

    // Track whether both the bar AND auth are ready
    const barDone = useRef(false);
    const authDone = useRef(false);

    const tryOpen = () => {
        if (barDone.current && authDone.current && onReady) {
            onReady();
        }
    };

    // When auth resolves externally, record it and try to open
    useEffect(() => {
        if (authReady) {
            authDone.current = true;
            tryOpen();
        }
    }, [authReady]);

    useEffect(() => {
        if (Platform.OS === 'android') {
            StatusBar.setBackgroundColor('#F5F0FF', false);
            StatusBar.setBarStyle('dark-content', false);
        }

        // Sequence: logo pops in → tagline slides up → bottom fades in → bar fills
        Animated.sequence([
            Animated.parallel([
                Animated.spring(logoScale, {
                    toValue: 1,
                    friction: 7,
                    tension: 90,
                    useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 450,
                    useNativeDriver: true,
                }),
            ]),
            Animated.parallel([
                Animated.timing(taglineOp, {
                    toValue: 1,
                    duration: 380,
                    useNativeDriver: true,
                }),
                Animated.timing(taglineY, {
                    toValue: 0,
                    duration: 380,
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(bottomOp, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            // Bar fills from 0% → 100% in 1.8s, then triggers open
            Animated.timing(progressAnim, {
                toValue: 1,
                duration: 1800,
                useNativeDriver: false,
            }),
        ]).start(() => {
            // Bar animation complete
            barDone.current = true;
            tryOpen();
        });
    }, []);

    const barWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={styles.root}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor="#F5F0FF"
                translucent={false}
            />

            {/* ── Gradient background (simulated: #F5F0FF → #EDE9FE) ── */}
            <View style={StyleSheet.absoluteFill}>
                <View style={styles.gradBg} />
                <View style={styles.gradOverlay} />
            </View>

            {/* ── Decorative luminous glow — top-left ── */}
            <View style={styles.glowTopLeft} />

            {/* ── Decorative luminous glow — bottom-right ── */}
            <View style={styles.glowBottomRight} />

            {/* ══ CENTER BRAND CLUSTER ══ */}
            <Animated.View
                style={[
                    styles.brandCluster,
                    {
                        opacity: logoOpacity,
                        transform: [{ scale: logoScale }],
                    },
                ]}
            >
                <Image
                    source={require('../../assets/sakhi.jpeg')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </Animated.View>

            {/* Identity text: "Safe Rides, Every Time" */}
            <Animated.Text
                style={[
                    styles.tagline,
                    {
                        opacity: taglineOp,
                        transform: [{ translateY: taglineY }],
                    },
                ]}
            >
                Safe Rides, Every Time
            </Animated.Text>

            {/* ══ BOTTOM SECTION: dots + progress bar ══ */}
            <Animated.View style={[styles.bottomSection, { opacity: bottomOp }]}>
                {/* Abstract 3-dot pattern */}
                <View style={styles.dotsRow}>
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                </View>

                {/* Loading bar: animates 0% → 100% once */}
                <View style={styles.loadingWrapper}>
                    <View style={styles.trackBg}>
                        <Animated.View style={[styles.trackFill, { width: barWidth }]} />
                    </View>
                    <Text style={styles.empoweringText}>EMPOWERING WOMEN</Text>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 96,
        paddingBottom: 96,
        paddingHorizontal: 32,
        backgroundColor: '#F5F0FF',
        overflow: 'hidden',
    },
    gradBg: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#F5F0FF',
    },
    gradOverlay: {
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        height: '55%',
        backgroundColor: '#EDE9FE',
        opacity: 0.55,
    },
    glowTopLeft: {
        position: 'absolute',
        left: '-10%',
        top: '-10%',
        width: '56%',
        height: '19%',
        borderRadius: 9999,
        backgroundColor: 'rgba(99, 14, 212, 0.05)',
    },
    glowBottomRight: {
        position: 'absolute',
        right: '-10%',
        bottom: '5%',
        width: '72%',
        height: '36%',
        borderRadius: 9999,
        backgroundColor: 'rgba(103, 75, 181, 0.10)',
    },
    brandCluster: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        width: 204,
    },
    logo: {
        width: 169,
        height: 118,
    },
    tagline: {
        fontWeight: '300',
        fontSize: 18,
        lineHeight: 28,
        letterSpacing: 0.45,
        color: '#C0A6D6',
        textAlign: 'center',
        width: 204,
        marginBottom: 48,
    },
    bottomSection: {
        width: 200,
        alignItems: 'center',
        gap: 16,
    },
    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        opacity: 0.2,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 9999,
        backgroundColor: '#C0A6D6',
    },
    loadingWrapper: {
        width: 200,
        alignItems: 'center',
        gap: 16,
    },
    trackBg: {
        width: 200,
        height: 4,
        backgroundColor: '#E5E0EF',
        borderRadius: 9999,
        overflow: 'hidden',
    },
    trackFill: {
        height: 4,
        backgroundColor: '#C0A6D6',
        borderRadius: 9999,
    },
    empoweringText: {
        fontSize: 10,
        lineHeight: 15,
        fontWeight: '400',
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: '#7B7487',
        textAlign: 'center',
    },
});
