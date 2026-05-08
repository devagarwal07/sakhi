import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function VerificationPendingScreen() {
    const router = useRouter();
    const { checkAuth } = useAuth();
    const insets = useSafeAreaInsets();
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const mainContentPaddingTop = Math.max(insets.top + 36, 60);
    const footerPaddingBottom = Math.max(insets.bottom + 6, 24);

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
            <Animated.ScrollView
                style={{ flex: 1, opacity: fadeAnim }}
                contentContainerStyle={[styles.mainContent, { paddingTop: mainContentPaddingTop }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Animated Icon Group */}
                <View style={styles.iconSection}>
                    <Animated.View style={[styles.iconGlow, { transform: [{ scale: pulseAnim }] }]} />
                    <View style={styles.iconCircle}>
                        <Text style={styles.checkIcon}>⏳</Text>
                    </View>
                </View>

                {/* Typography Stack */}
                <View style={styles.textStack}>
                    <Text style={styles.title}>Verification{"\n"}Under Review</Text>
                    <Text style={styles.subtitle}>
                        We couldn't auto-verify your face with high confidence. Our team will review it shortly.
                    </Text>
                </View>

                {/* Illustration */}
                <View style={styles.illustrationSection}>
                    <View style={styles.illustrationCard}>
                        <View style={styles.illustrationGradient} />
                        <View style={styles.personPlaceholder}>
                            <Text style={styles.personIcon}>👩</Text>
                        </View>
                    </View>

                    <View style={styles.accentCircle}>
                        <Text style={styles.accentIcon}>✿</Text>
                    </View>

                    <View style={styles.accentSquare}>
                        <Text style={styles.accentHeart}>♥</Text>
                    </View>
                </View>
            </Animated.ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>
                <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={async () => {
                        await checkAuth();
                        router.replace('/');
                    }}
                    activeOpacity={0.88}
                >
                    <Text style={styles.ctaButtonText}>Refresh Status</Text>
                    <Text style={styles.ctaArrow}> →</Text>
                </TouchableOpacity>

                <Text style={styles.secondaryText}>We’ll notify you once approved.</Text>
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
        flexGrow: 1,
        alignItems: 'center',
        paddingBottom: 24,
    },

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

    textStack: {
        paddingHorizontal: 32,
        alignItems: 'center',
        gap: 16,
    },
    title: {
        fontSize: 30,
        fontWeight: '800',
        color: '#1E1B2E',
        letterSpacing: -0.75,
        lineHeight: 38,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '400',
        color: '#64748B',
        lineHeight: 26,
        textAlign: 'center',
        paddingHorizontal: 8,
    },

    illustrationSection: {
        paddingHorizontal: 55,
        paddingTop: 32,
        alignItems: 'center',
    },
    illustrationCard: {
        width: '100%',
        maxWidth: 280,
        aspectRatio: 1,
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

    footer: {
        paddingHorizontal: 24,
        paddingTop: 24,
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

    secondaryText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#64748B',
        lineHeight: 20,
        textAlign: 'center',
        opacity: 0.6,
    },
});
