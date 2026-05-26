import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    View, Text, StyleSheet, ScrollView, Pressable,
    ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';
import { getSubscriptionDetails } from '../src/api/endpoints';
import { format, parseISO, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import apiClient from '../src/api/client';
import SakhiModal from '../src/components/SakhiModal';
import { Feather } from '@expo/vector-icons';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SubscriptionDetailsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [sub, setSub] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [modal, setModal] = useState(null);

    useEffect(() => {
        if (!id) { setLoading(false); return; }
        getSubscriptionDetails(id)
            .then(({ data }) => setSub(data.subscription || data))
            .catch(() => setModal({
                icon: '⚠️',
                title: 'Error',
                message: 'Could not load subscription details.',
                buttons: [{ text: 'OK', onPress: () => setModal(null) }]
            }))
            .finally(() => setLoading(false));
    }, [id]);

    const handleCancel = () => {
        setModal({
            icon: '⚠️',
            title: 'Cancel Subscription',
            message: 'Are you sure? Unused rides will not be refunded automatically.',
            buttons: [
                { text: 'Keep Subscription', style: 'cancel', onPress: () => setModal(null) },
                {
                    text: 'Cancel Subscription',
                    style: 'destructive',
                    onPress: async () => {
                        setModal(null);
                        setCancelling(true);
                        try {
                            await apiClient.patch(`/subscriptions/${id}/cancel`);
                            setSub((s) => ({ ...s, status: 'cancelled' }));
                            setModal({
                                icon: '✅',
                                title: 'Cancelled',
                                message: 'Your subscription has been cancelled.',
                                buttons: [{ text: 'OK', onPress: () => setModal(null) }]
                            });
                        } catch (err) {
                            setModal({
                                icon: '⚠️',
                                title: 'Error',
                                message: err?.response?.data?.message || 'Could not cancel. Contact support.',
                                buttons: [{ text: 'OK', onPress: () => setModal(null) }]
                            });
                        } finally {
                            setCancelling(false);
                        }
                    },
                },
            ],
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={Colors.primaryContainer} />
            </SafeAreaView>
        );
    }

    if (!sub) {
        return (
            <SafeAreaView style={[styles.container, styles.centered]}>
                <Text style={styles.emptyText}>Subscription not found.</Text>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.smallBack}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                        <Feather name="arrow-left" size={14} color="#BEA3D8" />
                        <Text style={styles.smallBackText}>Go Back</Text>
                    </View>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const progress = (sub.rides_used || 0) / (sub.rides_total || 1);
    const startDate = sub.start_date ? format(parseISO(sub.start_date), 'dd MMM yyyy') : '—';
    const endDate = sub.end_date ? format(parseISO(sub.end_date), 'dd MMM yyyy') : '—';
    const isActive = sub.status === 'active';

    // Build upcoming rides for this week
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const intToDay = {
        1: 'Mon',
        2: 'Tue',
        3: 'Wed',
        4: 'Thu',
        5: 'Fri',
        6: 'Sat',
        0: 'Sun'
    };
    const scheduledDays = sub.days || (sub.days_of_week ? sub.days_of_week.map(d => intToDay[d]).filter(Boolean) : []);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
                    <Feather name="arrow-left" size={20} color="#BEA3D8" />
                </Pressable>
                <Text style={styles.headerTitle}>Subscription</Text>
                <View style={[styles.statusBadge, { backgroundColor: isActive ? '#dcfce7' : '#f3f4f6' }]}>
                    <Text style={[styles.statusText, { color: isActive ? Colors.success : Colors.outline }]}>
                        {isActive ? '● Active' : sub.status}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Route card */}
                <View style={styles.routeCard}>
                    <View style={styles.routeRow}>
                        <View style={[styles.routeDot, { backgroundColor: '#16a34a' }]} />
                        <View style={styles.routeInfo}>
                            <Text style={styles.routeLabel}>Pickup</Text>
                            <Text style={styles.routeAddr}>{sub.pickup_address || '—'}</Text>
                        </View>
                    </View>
                    <View style={styles.routeVertLine} />
                    <View style={styles.routeRow}>
                        <View style={[styles.routeDot, { backgroundColor: Colors.primaryContainer }]} />
                        <View style={styles.routeInfo}>
                            <Text style={styles.routeLabel}>Drop-off</Text>
                            <Text style={styles.routeAddr}>{sub.dropoff_address || '—'}</Text>
                        </View>
                    </View>
                </View>

                {/* Plan stats row */}
                <View style={styles.statsRow}>
                    {[
                        { icon: 'calendar', label: 'Plan', value: `${sub.plan_days || '—'} days` },
                        { icon: 'truck', label: 'Vehicle', value: sub.vehicle_type === 'auto' ? 'Auto' : 'Cab' },
                        { icon: 'refresh-cw', label: 'Type', value: sub.is_two_way ? 'Two-Way' : 'One-Way' },
                    ].map((s, i) => (
                        <View key={i} style={styles.statCard}>
                            <Feather name={s.icon} size={20} color="#1E1B2E" style={{ marginBottom: 4 }} />
                            <Text style={styles.statLabel}>{s.label}</Text>
                            <Text style={styles.statValue}>{s.value}</Text>
                        </View>
                    ))}
                </View>

                {/* Rides progress */}
                <View style={styles.progressCard}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressTitle}>Rides Progress</Text>
                        <Text style={styles.progressCount}>
                            {sub.rides_used || 0} / {sub.rides_total || 0} used
                        </Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressBar, { width: `${Math.min(progress * 100, 100)}%` }]} />
                    </View>
                    <Text style={styles.progressRemaining}>
                        {(sub.rides_total || 0) - (sub.rides_used || 0)} rides remaining
                    </Text>
                </View>

                {/* Date range */}
                <View style={styles.datesCard}>
                    <View style={styles.dateRow}>
                        <Text style={styles.dateLabel}>Start Date</Text>
                        <Text style={styles.dateValue}>{startDate}</Text>
                    </View>
                    <View style={styles.dateDivider} />
                    <View style={styles.dateRow}>
                        <Text style={styles.dateLabel}>End Date</Text>
                        <Text style={styles.dateValue}>{endDate}</Text>
                    </View>
                    <View style={styles.dateDivider} />
                    <View style={styles.dateRow}>
                        <Text style={styles.dateLabel}>Amount Paid</Text>
                        <Text style={[styles.dateValue, { color: Colors.primaryContainer, fontWeight: '800' }]}>
                            ₹{sub.amount_paid?.toFixed(2) || '—'}
                        </Text>
                    </View>
                </View>

                {/* Scheduled days */}
                <Text style={styles.sectionLabel}>Scheduled Days</Text>
                <View style={styles.daysRow}>
                    {DAYS.map((day) => {
                        const active = scheduledDays.includes(day);
                        return (
                            <View key={day} style={[styles.dayChip, active && styles.dayChipActive]}>
                                <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{day}</Text>
                            </View>
                        );
                    })}
                </View>

                {/* This week's calendar */}
                <Text style={styles.sectionLabel}>This Week</Text>
                <View style={styles.weekCalendar}>
                    {weekDays.map((day) => {
                        const dayName = format(day, 'EEE'); // Mon, Tue, etc.
                        const isToday = isSameDay(day, today);
                        const isScheduled = scheduledDays.includes(dayName);
                        const isPast = day < today && !isToday;
                        return (
                            <View
                                key={day.toISOString()}
                                style={[
                                    styles.calDay,
                                    isScheduled && styles.calDayScheduled,
                                    isToday && styles.calDayToday,
                                ]}
                            >
                                <Text style={[styles.calDayName, isScheduled && styles.calDayNameScheduled]}>
                                    {dayName.slice(0, 1)}
                                </Text>
                                <Text style={[styles.calDayNum, isToday && styles.calDayNumToday]}>
                                    {format(day, 'd')}
                                </Text>
                                {isScheduled && (
                                    <View style={[styles.calDot, isPast && styles.calDotDone]} />
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Timing */}
                {(sub.pickup_time || sub.return_time) && (
                    <>
                        <Text style={styles.sectionLabel}>Pickup Times</Text>
                        <View style={styles.timingCard}>
                            {sub.pickup_time && (
                                <View style={styles.timingRow}>
                                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                                        <Feather name="sunrise" size={14} color="#BEA3D8" />
                                        <Text style={styles.timingLabel}>Morning Pickup</Text>
                                    </View>
                                    <View style={styles.timePill}>
                                        <Text style={styles.timePillText}>{sub.pickup_time}</Text>
                                    </View>
                                </View>
                            )}
                            {sub.return_time && (
                                <>
                                    <View style={styles.timingDivider} />
                                    <View style={styles.timingRow}>
                                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                                            <Feather name="sunset" size={14} color="#BEA3D8" />
                                            <Text style={styles.timingLabel}>Evening Return</Text>
                                        </View>
                                        <View style={styles.timePill}>
                                            <Text style={styles.timePillText}>{sub.return_time}</Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>
                    </>
                )}

                {/* Cancel button — only if active */}
                {isActive && (
                    <TouchableOpacity
                        style={[styles.cancelBtn, cancelling && { opacity: 0.6 }]}
                        onPress={handleCancel}
                        disabled={cancelling}
                    >
                        {cancelling
                            ? <ActivityIndicator color="#dc2626" />
                            : <Text style={styles.cancelBtnText}>Cancel Subscription</Text>
                        }
                    </TouchableOpacity>
                )}
            </ScrollView>

            <SakhiModal config={modal} onClose={() => setModal(null)} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        height: 64,
        backgroundColor: '#F5F0FF', 
        zIndex: 10
    },
    iconBtn: { 
        width: 32, 
        height: 32, 
        justifyContent: 'center', 
        alignItems: 'flex-start',
        backgroundColor: 'transparent'
    },
    headerIcon: { 
        fontSize: 24, 
        color: '#BEA3D8', 
        fontWeight: 'bold' 
    },
    headerTitle: { 
        fontSize: 20, 
        fontWeight: '700', 
        color: '#1E1B2E', 
        letterSpacing: -0.5,
        marginLeft: 16
    },
    container: { flex: 1, backgroundColor: '#F5F0FF' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { ...Typography.bodyLarge, color: Colors.onSurfaceVariant, marginBottom: 16 },
    smallBack: { padding: 10 },
    smallBackText: { color: Colors.primaryContainer, fontWeight: '600', fontSize: 14 },
    
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.surfaceContainer, alignItems: 'center', justifyContent: 'center',
    },
    backArrow: { fontSize: 20, color: Colors.primaryContainer, fontWeight: '700' },
    
    statusBadge: {
        borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 5,
    },
    statusText: { fontSize: 12, fontWeight: '700' },
    content: { paddingHorizontal: 20, paddingBottom: 48, gap: 14 },
    routeCard: {
        backgroundColor: Colors.surfaceContainerLowest, borderRadius: 16, padding: 16, ...Shadows.card,
    },
    routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    routeDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
    routeVertLine: {
        width: 2, height: 18, backgroundColor: Colors.outlineVariant,
        marginLeft: 5, marginVertical: 4,
    },
    routeInfo: { flex: 1 },
    routeLabel: { fontSize: 10, fontWeight: '700', color: Colors.outline, textTransform: 'uppercase', letterSpacing: 0.5 },
    routeAddr: { fontSize: 14, fontWeight: '600', color: Colors.onSurface, marginTop: 2 },
    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: {
        flex: 1, backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 14, padding: 12, alignItems: 'center', gap: 4, ...Shadows.card,
    },
    statIcon: { fontSize: 20 },
    statLabel: { fontSize: 10, color: Colors.onSurfaceVariant, fontWeight: '600', textTransform: 'uppercase' },
    statValue: { fontSize: 13, fontWeight: '700', color: Colors.onBackground },
    progressCard: {
        backgroundColor: Colors.surfaceContainerLowest, borderRadius: 16, padding: 16, ...Shadows.card,
    },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    progressTitle: { fontSize: 13, fontWeight: '700', color: Colors.onBackground },
    progressCount: { fontSize: 13, fontWeight: '600', color: Colors.primaryContainer },
    progressTrack: {
        height: 8, backgroundColor: Colors.outlineVariant,
        borderRadius: 4, overflow: 'hidden', marginBottom: 6,
    },
    progressBar: { height: '100%', backgroundColor: Colors.primaryContainer, borderRadius: 4 },
    progressRemaining: { fontSize: 12, color: Colors.onSurfaceVariant },
    datesCard: {
        backgroundColor: Colors.surfaceContainerLowest, borderRadius: 16, overflow: 'hidden', ...Shadows.card,
    },
    dateRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 13,
    },
    dateLabel: { fontSize: 13, color: Colors.onSurfaceVariant },
    dateValue: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
    dateDivider: { height: 1, backgroundColor: Colors.outlineVariant },
    sectionLabel: {
        fontSize: 11, fontWeight: '700', color: Colors.onSurfaceVariant,
        textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4,
    },
    daysRow: { flexDirection: 'row', gap: 6 },
    dayChip: {
        flex: 1, paddingVertical: 8, borderRadius: 10,
        backgroundColor: Colors.surfaceContainerLowest,
        alignItems: 'center',
        borderWidth: 1.5, borderColor: Colors.outlineVariant,
    },
    dayChipActive: { backgroundColor: Colors.primaryFixed, borderColor: Colors.primaryContainer },
    dayChipText: { fontSize: 11, fontWeight: '600', color: Colors.outline },
    dayChipTextActive: { color: Colors.primaryContainer },
    weekCalendar: {
        flexDirection: 'row', gap: 4,
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 16, padding: 12, ...Shadows.card,
    },
    calDay: {
        flex: 1, alignItems: 'center', paddingVertical: 8,
        borderRadius: 10, gap: 3,
    },
    calDayScheduled: { backgroundColor: Colors.primaryFixed },
    calDayToday: { borderWidth: 1.5, borderColor: Colors.primaryContainer },
    calDayName: { fontSize: 10, color: Colors.outline, fontWeight: '600' },
    calDayNameScheduled: { color: Colors.primaryContainer },
    calDayNum: { fontSize: 13, fontWeight: '700', color: Colors.onSurface },
    calDayNumToday: { color: Colors.primaryContainer },
    calDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primaryContainer },
    calDotDone: { backgroundColor: Colors.outline },
    timingCard: {
        backgroundColor: Colors.surfaceContainerLowest, borderRadius: 14, overflow: 'hidden', ...Shadows.card,
    },
    timingRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 13,
    },
    timingLabel: { fontSize: 14, fontWeight: '500', color: Colors.onSurface },
    timePill: {
        backgroundColor: Colors.primaryFixed, borderRadius: BorderRadius.full,
        paddingHorizontal: 14, paddingVertical: 5,
    },
    timePillText: { fontSize: 13, fontWeight: '700', color: Colors.primaryContainer },
    timingDivider: { height: 1, backgroundColor: Colors.outlineVariant },
    cancelBtn: {
        borderWidth: 1.5, borderColor: '#fca5a5',
        borderRadius: BorderRadius.md, paddingVertical: 14,
        alignItems: 'center', marginTop: 8,
    },
    cancelBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
});
