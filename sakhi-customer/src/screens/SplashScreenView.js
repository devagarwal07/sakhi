import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    Animated,
    StatusBar,
    Platform,
} from 'react-native';

/**
 * SplashScreenView — shown while auth token check runs (~50–200ms).
 * Built from the Figma design specs (CSS export + SVG logo).
 *
 * Layout (390×884 Figma frame):
 *   - Full-screen lavender gradient (#F5F0FF → #EDE9FE)
 *   - Two decorative blur glows (top-left, bottom-right)
 *   - CENTER: Sakhi logo (169×118) + "Safe Rides, Every Time" tagline
 *   - BOTTOM: 3 dots (opacity 0.2) + animated progress bar + "EMPOWERING WOMEN"
 */
export default function SplashScreenView() {
    // ── Entrance animations ──────────────────────────────────────────────
    const logoScale   = useRef(new Animated.Value(0.82)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const taglineY    = useRef(new Animated.Value(10)).current;
    const taglineOp   = useRef(new Animated.Value(0)).current;
    const bottomOp    = useRef(new Animated.Value(0)).current;

    // Animated loading bar (0 → 80%, then resets, loops)
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (Platform.OS === 'android') {
            StatusBar.setBackgroundColor('#F5F0FF', false);
            StatusBar.setBarStyle('dark-content', false);
        }

        // Sequence: logo pops in → tagline slides up → bottom section fades in
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
        ]).start();

        // Loading bar loop: fill to 80% in 1.8s, snap back, repeat
        const barLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(progressAnim, {
                    toValue: 0.8,
                    duration: 1800,
                    useNativeDriver: false,
                }),
                Animated.timing(progressAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: false,
                }),
            ])
        );
        barLoop.start();
        return () => barLoop.stop();
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

            {/* ── Decorative luminous glow — top-left (#630ED4, 5% opacity) ── */}
            <View style={styles.glowTopLeft} />

            {/* ── Decorative luminous glow — bottom-right (#674BB5, 10% opacity) ── */}
            <View style={styles.glowBottomRight} />

            {/* ══ CENTER BRAND CLUSTER ══════════════════════════════════════
                Figma: 203.16px wide, flex-grow: 1, centered vertically      */}
            <Animated.View
                style={[
                    styles.brandCluster,
                    {
                        opacity: logoOpacity,
                        transform: [{ scale: logoScale }],
                    },
                ]}
            >
                {/* Sakhi logo — 169×118px (Figma spec) */}
                <Image
                    source={require('../../assets/sakhi.jpeg')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </Animated.View>

            {/* Identity text: "Safe Rides, Every Time"
                Figma: Inter Light 18px, #C0A6D6, letter-spacing 0.45px     */}
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

            {/* ══ EDITORIAL SPACING LAYER (bottom) ═════════════════════════
                Figma: 200px wide, flex-col, gap 16px between dot row & bar  */}
            <Animated.View style={[styles.bottomSection, { opacity: bottomOp }]}>
                {/* Abstract 3-dot pattern — opacity 0.2, #C0A6D6, 6px circles */}
                <View style={styles.dotsRow}>
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                </View>

                {/* Loading indicator: 200×4px track + animated fill + label */}
                <View style={styles.loadingWrapper}>
                    <View style={styles.trackBg}>
                        <Animated.View style={[styles.trackFill, { width: barWidth }]} />
                    </View>

                    {/* "EMPOWERING WOMEN" — 10px Inter, letter-spacing 2px, #7B7487 */}
                    <Text style={styles.empoweringText}>EMPOWERING WOMEN</Text>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    /* ── Root container ──────────────────────────────────────────── */
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

    /* ── Gradient layers ─────────────────────────────────────────── */
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

    /* ── Decorative blurs ────────────────────────────────────────── */
    // Figma: left: -10%, right: 44.36%, top: -10%, bottom: 81.04%
    glowTopLeft: {
        position: 'absolute',
        left: '-10%',
        top: '-10%',
        width: '56%',
        height: '19%',
        borderRadius: 9999,
        backgroundColor: 'rgba(99, 14, 212, 0.05)',
    },
    // Figma: left: 27.95%, right: -10%, top: 58.8%, bottom: 5%
    glowBottomRight: {
        position: 'absolute',
        right: '-10%',
        bottom: '5%',
        width: '72%',
        height: '36%',
        borderRadius: 9999,
        backgroundColor: 'rgba(103, 75, 181, 0.10)',
    },

    /* ── Brand cluster ───────────────────────────────────────────── */
    brandCluster: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        width: 204,
    },
    // Figma: 169×118px
    logo: {
        width: 169,
        height: 118,
    },

    /* ── Tagline ─────────────────────────────────────────────────── */
    // Figma: Inter Light 18px, line-height 28px, letter-spacing 0.45px, #C0A6D6
    tagline: {
        fontWeight: '300',
        fontSize: 18,
        lineHeight: 28,
        letterSpacing: 0.45,
        color: '#C0A6D6',
        textAlign: 'center',
        width: 204,
        marginBottom: 48,     // space above bottom section
    },

    /* ── Bottom editorial section ────────────────────────────────── */
    bottomSection: {
        width: 200,
        alignItems: 'center',
        gap: 16,
    },

    // 3 dots — Figma: 6px circles, gap 8px, opacity 0.2, #C0A6D6
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

    // Loading indicator — Figma: 200×4px track, fill in #C0A6D6, track in #E5E0EF
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

    // "EMPOWERING WOMEN" — Figma: 10px, letter-spacing 2px, uppercase, #7B7487
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
