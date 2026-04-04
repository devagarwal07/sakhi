import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    Animated,
    Dimensions,
    StatusBar,
} from 'react-native';

const { width, height } = Dimensions.get('window');

/**
 * JavaScript splash screen — shown during the auth token-check phase.
 * Works in Expo Go (native splash is Expo Go branded, this replaces it).
 */
export default function SplashScreenView() {
    const logoScale = useRef(new Animated.Value(0.75)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const taglineOpacity = useRef(new Animated.Value(0)).current;
    const dotsOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Logo fade + scale in
        Animated.parallel([
            Animated.spring(logoScale, {
                toValue: 1,
                friction: 6,
                tension: 80,
                useNativeDriver: true,
            }),
            Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // Tagline fades in after logo
            Animated.timing(taglineOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start(() => {
                // Loading dots appear last
                Animated.timing(dotsOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            });
        });
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F5F0FF" />

            {/* Decorative background glows */}
            <View style={styles.glowTopRight} />
            <View style={styles.glowBottomLeft} />

            {/* Logo + icon */}
            <Animated.View
                style={[
                    styles.logoContainer,
                    { opacity: logoOpacity, transform: [{ scale: logoScale }] },
                ]}
            >
                <View style={styles.iconCircle}>
                    <Image
                        source={require('../../assets/splash-icon.png')}
                        style={styles.iconImage}
                        resizeMode="contain"
                    />
                </View>
                <Text style={styles.brandName}>sakhi</Text>
            </Animated.View>

            {/* Tagline */}
            <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
                Safe rides for every woman
            </Animated.Text>

            {/* Loading indicator dots */}
            <Animated.View style={[styles.dotsRow, { opacity: dotsOpacity }]}>
                <PulseDot delay={0} />
                <PulseDot delay={200} />
                <PulseDot delay={400} />
            </Animated.View>
        </View>
    );
}

function PulseDot({ delay }) {
    const scale = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.timing(scale, { toValue: 0.6, duration: 400, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    return (
        <Animated.View style={[styles.dot, { transform: [{ scale }] }]} />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0FF',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Decorative blobs
    glowTopRight: {
        position: 'absolute',
        right: -60,
        top: -60,
        width: 300,
        height: 300,
        borderRadius: 999,
        backgroundColor: 'rgba(190, 163, 216, 0.15)',
    },
    glowBottomLeft: {
        position: 'absolute',
        left: -80,
        bottom: 60,
        width: 360,
        height: 360,
        borderRadius: 999,
        backgroundColor: 'rgba(124, 58, 237, 0.06)',
    },

    // Logo block
    logoContainer: {
        alignItems: 'center',
        gap: 20,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 32,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.14,
        shadowRadius: 32,
        elevation: 10,
    },
    iconImage: {
        width: 64,
        height: 64,
    },
    brandName: {
        fontSize: 48,
        fontWeight: '800',
        color: '#BEA3D8',
        letterSpacing: -2,
    },

    // Tagline
    tagline: {
        marginTop: 16,
        fontSize: 15,
        fontWeight: '500',
        color: '#6B7280',
        letterSpacing: 0.2,
    },

    // Loading dots
    dotsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 56,
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#BEA3D8',
    },
});
