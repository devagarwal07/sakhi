import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography } from '../../utils/theme';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
    const router = useRouter();
    const progressAnim = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.7)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const subtitleOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            // Logo entrance
            Animated.parallel([
                Animated.spring(logoScale, {
                    toValue: 1,
                    tension: 60,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]),
            // Text fade-in
            Animated.timing(textOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            // Subtitle fade-in
            Animated.timing(subtitleOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // Progress bar
        Animated.timing(progressAnim, {
            toValue: 1,
            duration: 2800,
            useNativeDriver: false,
        }).start();

        // Navigate after splash
        const timer = setTimeout(() => {
            router.replace('/(auth)/login');
        }, 3200);

        return () => clearTimeout(timer);
    }, []);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={styles.container}>
            {/* Background glow circles */}
            <View style={styles.glowTopLeft} />
            <View style={styles.glowBottomRight} />

            {/* Brand cluster */}
            <View style={styles.brandCluster}>
                {/* Logo */}
                <Animated.View
                    style={[
                        styles.logoWrapper,
                        { transform: [{ scale: logoScale }], opacity: logoOpacity },
                    ]}
                >
                    <View style={styles.logoBg}>
                        <View style={styles.logoGlow} />
                        <View style={styles.logoPolygon}>
                            <Text style={styles.logoLetter}>S</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Brand name */}
                <Animated.View style={{ opacity: textOpacity, alignItems: 'center', marginTop: 24 }}>
                    <Text style={styles.brandName}>Sakhi</Text>
                    <Animated.Text style={[styles.tagline, { opacity: subtitleOpacity }]}>
                        Safe Rides, Every Time
                    </Animated.Text>
                </Animated.View>
            </View>

            {/* Progress indicator */}
            <View style={styles.footer}>
                <View style={styles.dotsRow}>
                    {[0, 1, 2].map((i) => (
                        <View key={i} style={styles.dot} />
                    ))}
                </View>
                <View style={styles.progressTrack}>
                    <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
                </View>
                <Text style={styles.empoweringText}>EMPOWERING WOMEN</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0FF',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 96,
        overflow: 'hidden',
    },
    glowTopLeft: {
        position: 'absolute',
        top: -80,
        left: -80,
        width: 256,
        height: 256,
        borderRadius: 128,
        backgroundColor: 'rgba(99, 14, 212, 0.05)',
        // blur simulated via large radius
    },
    glowBottomRight: {
        position: 'absolute',
        bottom: 20,
        right: -100,
        width: 320,
        height: 320,
        borderRadius: 160,
        backgroundColor: 'rgba(103, 75, 181, 0.08)',
    },
    brandCluster: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoBg: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoGlow: {
        position: 'absolute',
        width: 128,
        height: 128,
        borderRadius: 64,
        backgroundColor: 'rgba(124, 58, 237, 0.2)',
        transform: [{ translateY: 16 }],
    },
    logoPolygon: {
        width: 128,
        height: 128,
        backgroundColor: Colors.primaryContainer,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.primaryContainer,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.3,
        shadowRadius: 32,
        elevation: 20,
        // Polygon shape approximated with borderRadius
        borderTopLeftRadius: 48,
        borderTopRightRadius: 16,
        borderBottomRightRadius: 48,
        borderBottomLeftRadius: 16,
    },
    logoLetter: {
        fontSize: 72,
        fontWeight: '700',
        color: Colors.onPrimary,
        lineHeight: 82,
    },
    brandName: {
        fontSize: 52,
        fontWeight: '700',
        color: Colors.onBackground,
        letterSpacing: -2,
    },
    tagline: {
        fontSize: 16,
        fontWeight: '300',
        color: Colors.secondary,
        letterSpacing: 1,
        marginTop: 8,
    },
    footer: {
        alignItems: 'center',
        width: '100%',
        maxWidth: 200,
        gap: 16,
    },
    dotsRow: {
        flexDirection: 'row',
        gap: 6,
        opacity: 0.25,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.primary,
    },
    progressTrack: {
        width: '100%',
        height: 4,
        backgroundColor: Colors.surfaceContainerHighest,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: Colors.secondary,
        borderRadius: 2,
    },
    empoweringText: {
        fontSize: 10,
        fontWeight: '500',
        color: Colors.outline,
        letterSpacing: 3,
        textTransform: 'uppercase',
    },
});
