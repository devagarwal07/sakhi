import React from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    Linking, TouchableOpacity, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, Shadows } from '../src/utils/theme';

export default function AboutScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backArrow}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>About Sakhi</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Brand hero */}
                <View style={styles.brandHero}>
                    <View style={styles.logoCircle}>
                        <Text style={{ fontSize: 44 }}>🛺</Text>
                    </View>
                    <Text style={styles.brandName}>Sakhi</Text>
                    <Text style={styles.brandTagline}>India's First Women-Only Ride Platform</Text>
                    <View style={styles.versionBadge}>
                        <Text style={styles.versionText}>Version 1.0.0</Text>
                    </View>
                </View>

                {/* Mission */}
                <View style={styles.missionCard}>
                    <Text style={styles.missionTitle}>Our Mission</Text>
                    <Text style={styles.missionText}>
                        Sakhi exists to make every woman's journey safe, comfortable, and dignified. We connect
                        women passengers exclusively with verified women drivers — creating a community of trust
                        on every road.
                    </Text>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    {[
                        { num: '50K+', label: 'Rides Completed' },
                        { num: '5K+', label: 'Verified Drivers' },
                        { num: '4.9⭐', label: 'Avg Rating' },
                    ].map((s, i) => (
                        <View key={i} style={styles.statCard}>
                            <Text style={styles.statNum}>{s.num}</Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Safety */}
                <View style={styles.safetyCard}>
                    <Text style={styles.safetyTitle}>🛡️ Safety First</Text>
                    <Text style={styles.safetyText}>
                        All drivers undergo rigorous Aadhaar + facial verification and background checks.
                        Our real-time SOS system connects you to emergency contacts instantly.
                    </Text>
                </View>

                {/* Links */}
                <View style={styles.linksCard}>
                    {[
                        { label: 'Privacy Policy', url: 'https://sakhirides.in/privacy' },
                        { label: 'Terms of Service', url: 'https://sakhirides.in/terms' },
                        { label: 'Support', url: 'mailto:support@sakhirides.in' },
                        { label: 'Website', url: 'https://sakhirides.in' },
                    ].map((link, i) => (
                        <React.Fragment key={link.label}>
                            <TouchableOpacity
                                style={styles.linkRow}
                                onPress={() => Linking.openURL(link.url)}
                            >
                                <Text style={styles.linkText}>{link.label}</Text>
                                <Text style={styles.linkChevron}>›</Text>
                            </TouchableOpacity>
                            {i < 3 && <View style={styles.linkDivider} />}
                        </React.Fragment>
                    ))}
                </View>

                <Text style={styles.copyright}>© 2025 Sakhi Technologies Pvt. Ltd.</Text>
                <Text style={styles.madeWithLove}>Made with ❤️ for women, by women.</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0FF' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.surfaceContainer, alignItems: 'center', justifyContent: 'center',
    },
    backArrow: { fontSize: 20, color: Colors.primaryContainer, fontWeight: '700' },
    headerTitle: { ...Typography.titleMedium, color: Colors.onBackground },
    content: { paddingHorizontal: 20, paddingBottom: 48, gap: 16, alignItems: 'center' },
    brandHero: { alignItems: 'center', gap: 8, marginBottom: 8 },
    logoCircle: {
        width: 96, height: 96, borderRadius: 28,
        backgroundColor: Colors.primaryFixed,
        alignItems: 'center', justifyContent: 'center',
        ...Shadows.editorial,
    },
    brandName: { fontSize: 28, fontWeight: '800', color: Colors.primaryContainer, letterSpacing: -1 },
    brandTagline: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center' },
    versionBadge: {
        backgroundColor: Colors.surfaceContainerLow, borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 4,
    },
    versionText: { fontSize: 12, color: Colors.outline, fontWeight: '500' },
    missionCard: {
        width: '100%', backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 16, padding: 18, ...Shadows.card,
    },
    missionTitle: { ...Typography.titleSmall, color: Colors.primaryContainer, marginBottom: 8 },
    missionText: { fontSize: 14, color: Colors.onSurfaceVariant, lineHeight: 22 },
    statsRow: { flexDirection: 'row', gap: 10, width: '100%' },
    statCard: {
        flex: 1, backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 14, padding: 14, alignItems: 'center', ...Shadows.card,
    },
    statNum: { fontSize: 18, fontWeight: '800', color: Colors.primaryContainer, marginBottom: 2 },
    statLabel: { fontSize: 10, color: Colors.onSurfaceVariant, fontWeight: '500', textAlign: 'center' },
    safetyCard: {
        width: '100%', backgroundColor: Colors.primaryFixed,
        borderRadius: 16, padding: 18, ...Shadows.card,
    },
    safetyTitle: { fontSize: 16, fontWeight: '700', color: Colors.primaryContainer, marginBottom: 8 },
    safetyText: { fontSize: 13, color: Colors.onPrimaryFixed, lineHeight: 20 },
    linksCard: {
        width: '100%', backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 16, overflow: 'hidden', ...Shadows.card,
    },
    linkRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 18, paddingVertical: 16,
    },
    linkText: { fontSize: 14, color: Colors.onSurface, fontWeight: '500' },
    linkChevron: { fontSize: 20, color: Colors.outline },
    linkDivider: { height: 1, backgroundColor: Colors.outlineVariant },
    copyright: { fontSize: 11, color: Colors.outline, textAlign: 'center' },
    madeWithLove: { fontSize: 12, color: Colors.onSurfaceVariant, fontWeight: '500', textAlign: 'center' },
});
