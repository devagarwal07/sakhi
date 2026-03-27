import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../../utils/theme';

export default function VerificationPendingScreen() {
    const router = useRouter();
    const pulseAnim = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            ]),
        ).start();
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.glowCenter} />

            <View style={styles.content}>
                {/* Animated icon */}
                <View style={styles.iconWrapper}>
                    <Animated.View style={[styles.iconRing, { transform: [{ scale: pulseAnim }] }]} />
                    <View style={styles.iconBg}>
                        <Text style={styles.iconEmoji}>⏳</Text>
                    </View>
                </View>

                <Text style={styles.title}>Verification in Progress</Text>
                <Text style={styles.subtitle}>
                    We're reviewing your Aadhaar documents. This usually takes{' '}
                    <Text style={styles.highlight}>2–4 hours</Text>. We'll notify you once it's approved.
                </Text>

                {/* Status steps */}
                <View style={styles.stepsCard}>
                    {[
                        { icon: '✅', label: 'Documents submitted', done: true },
                        { icon: '🔍', label: 'Under review by Sakhi team', done: false, active: true },
                        { icon: '🎉', label: 'Approval & account activation', done: false },
                    ].map((step, i) => (
                        <View key={i} style={styles.step}>
                            <Text style={styles.stepIcon}>{step.icon}</Text>
                            <Text
                                style={[
                                    styles.stepLabel,
                                    step.active && styles.stepLabelActive,
                                    step.done && styles.stepLabelDone,
                                ]}
                            >
                                {step.label}
                            </Text>
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={() => router.replace('/(auth)/login')}
                    activeOpacity={0.88}
                >
                    <Text style={styles.ctaButtonText}>Back to Login</Text>
                </TouchableOpacity>

                <Text style={styles.helpText}>
                    Need help? Contact{' '}
                    <Text style={styles.helpLink}>support@sakhirides.in</Text>
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0FF',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    glowCenter: {
        position: 'absolute',
        top: '25%',
        alignSelf: 'center',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(124, 58, 237, 0.06)',
    },
    content: { alignItems: 'center', width: '100%' },
    iconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 120,
        height: 120,
        marginBottom: 28,
    },
    iconRing: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(124, 58, 237, 0.12)',
    },
    iconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primaryFixed,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.editorial,
    },
    iconEmoji: { fontSize: 36 },
    title: {
        ...Typography.headlineSmall,
        color: Colors.onBackground,
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        ...Typography.bodyLarge,
        color: Colors.onSurfaceVariant,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 28,
    },
    highlight: { color: Colors.primary, fontWeight: '700' },
    stepsCard: {
        width: '100%',
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 16,
        padding: 20,
        gap: 16,
        marginBottom: 28,
        ...Shadows.card,
    },
    step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepIcon: { fontSize: 18, width: 24, textAlign: 'center' },
    stepLabel: {
        ...Typography.bodyMedium,
        color: Colors.outline,
        flex: 1,
    },
    stepLabelDone: { color: Colors.success },
    stepLabelActive: { color: Colors.primaryContainer, fontWeight: '600' },
    ctaButton: {
        width: '100%',
        backgroundColor: Colors.primaryContainer,
        borderRadius: BorderRadius.md,
        paddingVertical: 16,
        alignItems: 'center',
        ...Shadows.editorial,
        marginBottom: 16,
    },
    ctaButtonText: {
        color: Colors.onPrimary,
        fontSize: 16,
        fontWeight: '700',
    },
    helpText: {
        fontSize: 12,
        color: Colors.outline,
        textAlign: 'center',
    },
    helpLink: {
        color: Colors.primary,
        fontWeight: '600',
    },
});
