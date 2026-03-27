import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../../src/utils/theme';

export default function KYCIntroScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={styles.glowTop} />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Icon */}
                <View style={styles.iconBg}>
                    <Text style={styles.iconEmoji}>🛡️</Text>
                </View>

                <Text style={styles.title}>Verify Your Identity</Text>
                <Text style={styles.subtitle}>
                    Sakhi is a women-only platform. To protect all our riders, we require a one-time
                    identity verification before you can book rides.
                </Text>

                {/* Options */}
                <View style={styles.optionsContainer}>
                    <Text style={styles.optionsLabel}>Choose Verification Method</Text>

                    <TouchableOpacity
                        style={styles.optionCard}
                        onPress={() => router.push('/(kyc)/aadhaar')}
                        activeOpacity={0.85}
                    >
                        <View style={styles.optionIconBg}>
                            <Text style={{ fontSize: 28 }}>🪪</Text>
                        </View>
                        <View style={styles.optionBody}>
                            <Text style={styles.optionTitle}>Aadhaar Card</Text>
                            <Text style={styles.optionDesc}>Upload front & back photos of your Aadhaar card</Text>
                        </View>
                        <Text style={styles.optionArrow}>→</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.optionCard}
                        onPress={() => router.push('/(kyc)/face')}
                        activeOpacity={0.85}
                    >
                        <View style={styles.optionIconBg}>
                            <Text style={{ fontSize: 28 }}>🤳</Text>
                        </View>
                        <View style={styles.optionBody}>
                            <Text style={styles.optionTitle}>Selfie Verification</Text>
                            <Text style={styles.optionDesc}>Take a clear selfie matched against your Aadhaar</Text>
                        </View>
                        <Text style={styles.optionArrow}>→</Text>
                    </TouchableOpacity>
                </View>

                {/* Trust badges */}
                <View style={styles.trustRow}>
                    {[
                        { icon: '🔒', label: '256-bit Encryption' },
                        { icon: '✅', label: 'DPDP Compliant' },
                        { icon: '🗑️', label: 'Auto-deleted after verification' },
                    ].map((item, i) => (
                        <View key={i} style={styles.trustBadge}>
                            <Text style={styles.trustIcon}>{item.icon}</Text>
                            <Text style={styles.trustLabel}>{item.label}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0FF' },
    glowTop: {
        position: 'absolute', top: -60, left: -60,
        width: 200, height: 200, borderRadius: 100,
        backgroundColor: 'rgba(124,58,237,0.07)',
    },
    content: {
        paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40, alignItems: 'center',
    },
    iconBg: {
        width: 88, height: 88, borderRadius: 28,
        backgroundColor: Colors.primaryFixed,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 24, ...Shadows.editorial,
    },
    iconEmoji: { fontSize: 40 },
    title: {
        ...Typography.headlineMedium, color: Colors.onBackground,
        textAlign: 'center', marginBottom: 12,
    },
    subtitle: {
        ...Typography.bodyLarge, color: Colors.onSurfaceVariant,
        textAlign: 'center', lineHeight: 24, marginBottom: 32,
    },
    optionsContainer: { width: '100%', marginBottom: 28 },
    optionsLabel: {
        fontSize: 12, fontWeight: '600',
        color: Colors.onSurfaceVariant, textTransform: 'uppercase',
        letterSpacing: 0.8, marginBottom: 12,
    },
    optionCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 16, padding: 16, marginBottom: 10,
        ...Shadows.card,
    },
    optionIconBg: {
        width: 52, height: 52, borderRadius: 16,
        backgroundColor: Colors.primaryFixed,
        alignItems: 'center', justifyContent: 'center',
    },
    optionBody: { flex: 1 },
    optionTitle: { ...Typography.titleSmall, color: Colors.onBackground, marginBottom: 2 },
    optionDesc: { ...Typography.bodySmall, color: Colors.onSurfaceVariant, lineHeight: 16 },
    optionArrow: {
        fontSize: 18, color: Colors.primaryContainer, fontWeight: '700',
    },
    trustRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
    trustBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: Colors.surfaceContainer,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 10, paddingVertical: 6,
    },
    trustIcon: { fontSize: 12 },
    trustLabel: { fontSize: 11, color: Colors.onSurfaceVariant, fontWeight: '500' },
});
