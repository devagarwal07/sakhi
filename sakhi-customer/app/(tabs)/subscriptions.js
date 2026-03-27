import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';
import { getSubscriptions } from '../src/api/endpoints';
import { format, parseISO } from 'date-fns';

export default function SubscriptionsScreen() {
    const router = useRouter();
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSubscriptions()
            .then(({ data }) => setSubs(data.subscriptions || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Subscriptions</Text>
                <TouchableOpacity
                    style={styles.newBtn}
                    onPress={() => router.push('/subscription-setup')}
                >
                    <Text style={styles.newBtnText}>+ New</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primaryContainer} />
                </View>
            ) : subs.length === 0 ? (
                <ScrollView contentContainerStyle={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>🔄</Text>
                    <Text style={styles.emptyTitle}>No Active Subscriptions</Text>
                    <Text style={styles.emptySubtitle}>
                        Save money with daily subscription rides to your office or college.
                    </Text>
                    <View style={styles.perksCard}>
                        {[
                            { icon: '💸', text: 'Up to 20% cheaper than individual bookings' },
                            { icon: '📅', text: 'Book 7, 14, 21, or 30-day packages' },
                            { icon: '👩‍✈️', text: 'Same verified driver assigned daily' },
                            { icon: '🔔', text: 'Automatic ride scheduling' },
                        ].map((p, i) => (
                            <View key={i} style={styles.perkRow}>
                                <Text style={styles.perkIcon}>{p.icon}</Text>
                                <Text style={styles.perkText}>{p.text}</Text>
                            </View>
                        ))}
                    </View>
                    <TouchableOpacity
                        style={styles.ctaBtn}
                        onPress={() => router.push('/subscription-setup')}
                    >
                        <Text style={styles.ctaBtnText}>Set Up Subscription</Text>
                    </TouchableOpacity>
                </ScrollView>
            ) : (
                <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                    {subs.map((sub) => {
                        const progress = (sub.rides_used || 0) / (sub.rides_total || 1);
                        const endDate = sub.end_date ? format(parseISO(sub.end_date), 'dd MMM yyyy') : '—';
                        return (
                            <TouchableOpacity
                                key={sub.id}
                                style={styles.subCard}
                                onPress={() => router.push({ pathname: '/subscription-details', params: { id: sub.id } })}
                                activeOpacity={0.85}
                            >
                                <View style={styles.subCardHeader}>
                                    <View>
                                        <Text style={styles.subRoute} numberOfLines={1}>
                                            {sub.pickup_address} → {sub.dropoff_address}
                                        </Text>
                                        <Text style={styles.subPlan}>{sub.plan_days}-Day Plan  •  Ends {endDate}</Text>
                                    </View>
                                    <View style={[
                                        styles.subStatus,
                                        { backgroundColor: sub.status === 'active' ? '#dcfce7' : '#f3f4f6' }
                                    ]}>
                                        <Text style={[
                                            styles.subStatusText,
                                            { color: sub.status === 'active' ? Colors.success : Colors.outline }
                                        ]}>
                                            {sub.status === 'active' ? '● Active' : sub.status}
                                        </Text>
                                    </View>
                                </View>

                                {/* Progress bar */}
                                <View style={styles.progressTrack}>
                                    <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
                                </View>
                                <Text style={styles.progressText}>
                                    {sub.rides_used || 0} / {sub.rides_total || 0} rides used
                                </Text>

                                {/* Days */}
                                <View style={styles.daysRow}>
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.dayPill,
                                                (sub.days || []).includes(day) && styles.dayPillActive,
                                            ]}
                                        >
                                            <Text style={[
                                                styles.dayPillText,
                                                (sub.days || []).includes(day) && styles.dayPillTextActive,
                                            ]}>
                                                {day.slice(0, 1)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0FF' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
        backgroundColor: 'rgba(245,240,255,0.95)',
    },
    headerTitle: { ...Typography.titleLarge, color: Colors.onBackground },
    newBtn: {
        backgroundColor: Colors.primaryContainer, borderRadius: BorderRadius.full,
        paddingHorizontal: 14, paddingVertical: 7, ...Shadows.editorial,
    },
    newBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 13 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyState: { flexGrow: 1, alignItems: 'center', padding: 24, paddingTop: 36 },
    emptyEmoji: { fontSize: 64, marginBottom: 16 },
    emptyTitle: { ...Typography.headlineSmall, color: Colors.onBackground, marginBottom: 8 },
    emptySubtitle: {
        ...Typography.bodyMedium, color: Colors.onSurfaceVariant,
        textAlign: 'center', marginBottom: 24, lineHeight: 22,
    },
    perksCard: {
        width: '100%', backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 16, padding: 20, gap: 12, marginBottom: 24, ...Shadows.card,
    },
    perkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    perkIcon: { fontSize: 18, width: 24, textAlign: 'center' },
    perkText: { flex: 1, fontSize: 14, color: Colors.onSurfaceVariant, lineHeight: 20 },
    ctaBtn: {
        width: '100%', backgroundColor: Colors.primaryContainer,
        borderRadius: BorderRadius.md, paddingVertical: 14,
        alignItems: 'center', ...Shadows.editorial,
    },
    ctaBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 15 },
    list: { padding: 20, paddingBottom: 40, gap: 12 },
    subCard: {
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 16, padding: 16, ...Shadows.card,
    },
    subCardHeader: {
        flexDirection: 'row', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 12,
    },
    subRoute: { fontSize: 14, fontWeight: '700', color: Colors.onBackground, flex: 1, maxWidth: '80%' },
    subPlan: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 2 },
    subStatus: { borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
    subStatusText: { fontSize: 11, fontWeight: '600' },
    progressTrack: {
        height: 5, backgroundColor: Colors.outlineVariant,
        borderRadius: 3, overflow: 'hidden', marginBottom: 4,
    },
    progressBar: { height: '100%', backgroundColor: Colors.primaryContainer, borderRadius: 3 },
    progressText: { fontSize: 11, color: Colors.outline, marginBottom: 10 },
    daysRow: { flexDirection: 'row', gap: 4 },
    dayPill: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: Colors.surfaceContainerLow,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Colors.outlineVariant,
    },
    dayPillActive: {
        backgroundColor: Colors.primaryFixed, borderColor: Colors.primaryContainer,
    },
    dayPillText: { fontSize: 11, color: Colors.outline, fontWeight: '600' },
    dayPillTextActive: { color: Colors.primaryContainer },
});
