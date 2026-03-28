import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';

export default function VerificationPendingScreen() {
    const router = useRouter();
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Pulse glow
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ]),
        ).start();

        // Fade in content
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
                {/* Animated Icon Group */}
                <View style={styles.iconSection}>
                    {/* Glow effect */}
                    <Animated.View
                        style={[styles.iconGlow, { transform: [{ scale: pulseAnim }] }]}
                    />
                    {/* Icon circle */}
                    <View style={styles.iconCircle}>
                        <Text style={styles.checkIcon}>✓</Text>
                    </View>
                </View>

                {/* Typography Stack */}
                <View style={styles.textStack}>
                    <Text style={styles.title}>
                        Verification{'\n'}Successful!
                    </Text>
                    <Text style={styles.subtitle}>
                        Your identity has been verified. You're all set to start your safe journey with Sakhi.
                    </Text>
                </View>

                {/* Celebratory Illustration */}
                <View style={styles.illustrationSection}>
                    <View style={styles.illustrationCard}>
                        {/* Gradient overlay */}
                        <View style={styles.illustrationGradient} />

                        {/* Placeholder person silhouette */}
                        <View style={styles.personPlaceholder}>
                            <Text style={styles.personIcon}>👩</Text>
                        </View>
                    </View>

                    {/* Decorative accent — top right circle */}
                    <View style={styles.accentCircle}>
                        <Text style={styles.accentIcon}>✿</Text>
                    </View>

                    {/* Decorative accent — bottom left rotated square */}
                    <View style={styles.accentSquare}>
                        <Text style={styles.accentHeart}>♥</Text>
                    </View>
                </View>
            </Animated.View>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={() => router.replace('/(tabs)')}
                    activeOpacity={0.88}
                >
                    <Text style={styles.ctaButtonText}>Complete Profile Setup</Text>
                    <Text style={styles.ctaArrow}> →</Text>
                </TouchableOpacity>

                <Text style={styles.secondaryText}>Step 1 of 2 Complete</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0FF',
    },

    mainContent: {
        flex: 1,
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 80 : 60,
    },

    // Animated icon group — 96×96
    iconSection: {
        width: 96,
        height: 96,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    iconGlow: {
        position: 'absolute',
        width: 96,
        height: 96,
        borderRadius: 9999,
        backgroundColor: 'rgba(124, 58, 237, 0.2)',
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 9999,
        backgroundColor: '#EADDFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.12,
        shadowRadius: 32,
        elevation: 8,
    },
    checkIcon: {
        fontSize: 40,
        color: '#BEA3D8',
        fontWeight: '700',
    },

    // Typography stack
    textStack: {
        paddingHorizontal: 32,
        alignItems: 'center',
        gap: 16,
    },
    title: {
        fontSize: 30,
        fontWeight: '800',
        color: '#1C1A25',
        letterSpacing: -0.75,
        lineHeight: 38,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '400',
        color: '#4A4455',
        lineHeight: 26,
        textAlign: 'center',
        paddingHorizontal: 8,
    },

    // Celebratory illustration
    illustrationSection: {
        paddingHorizontal: 55,
        paddingTop: 32,
        alignItems: 'center',
    },
    illustrationCard: {
        width: 280,
        height: 280,
        borderRadius: 24,
        backgroundColor: '#EDE9FE',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.08,
        shadowRadius: 40,
        elevation: 6,
    },
    illustrationGradient: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(246, 241, 255, 0.3)',
    },
    personPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    personIcon: {
        fontSize: 120,
    },

    // Decorative accent — top right purple circle 48×48
    accentCircle: {
        position: 'absolute',
        right: 32,
        top: 16,
        width: 48,
        height: 48,
        borderRadius: 9999,
        backgroundColor: '#AB8FFE',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 4,
    },
    accentIcon: {
        fontSize: 20,
        color: '#FFFFFF',
    },

    // Decorative accent — bottom left rotated square 32×32
    accentSquare: {
        position: 'absolute',
        left: 32,
        bottom: -5,
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#BEA3D8',
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '12deg' }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 4,
    },
    accentHeart: {
        fontSize: 14,
        color: '#FFFFFF',
    },

    // Footer
    footer: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        gap: 16,
        alignItems: 'center',
    },
    ctaButton: {
        width: '100%',
        height: 56,
        backgroundColor: '#BEA3D8',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 8,
    },
    ctaButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        lineHeight: 24,
    },
    ctaArrow: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '600',
    },

    // Secondary text — opacity 0.6
    secondaryText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4A4455',
        lineHeight: 20,
        textAlign: 'center',
        opacity: 0.6,
    },
});
