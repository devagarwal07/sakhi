import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRide } from '../../src/context/RideContext';
import SakhiModal from '../../src/components/SakhiModal';
import { cancelSubscription, toggleSubscriptionPause } from '../../src/api/endpoints';
import { Feather } from '@expo/vector-icons';
import { ANDROID_STATUS_BAR_HEIGHT } from '../../src/utils/androidUtils';

// ── Calendar helpers ──────────────────────────────────────────────────────────
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
];

function buildCalendarGrid(year, month) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
}

function MiniCalendar({ year, month, rideDates, today, selectedDate, onSelect }) {
    const cells = useMemo(() => buildCalendarGrid(year, month), [year, month]);
    const todayDate  = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear  = today.getFullYear();

    return (
        <View style={cal.wrap}>
            <Text style={cal.monthLabel}>{MONTH_NAMES[month]} {year}</Text>
            <View style={cal.row}>
                {DAY_LABELS.map(d => (
                    <Text key={d} style={cal.dayHeader}>{d}</Text>
                ))}
            </View>
            {Array.from({ length: Math.ceil(cells.length / 7) }, (_, ri) => {
                const slice = cells.slice(ri * 7, ri * 7 + 7);
                const pad   = 7 - slice.length;
                return (
                    <View key={ri} style={cal.row}>
                        {slice.map((day, ci) => {
                            if (!day) return <View key={`e-${ci}`} style={cal.cell} />;
                            const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                            const isToday    = day === todayDate && month === todayMonth && year === todayYear;
                            const hasRide    = rideDates.has(dateStr);
                            const isSelected = selectedDate === dateStr;
                            const isPast     = new Date(year, month, day) < today && !isToday;
                            return (
                                <TouchableOpacity
                                    key={`d-${ci}`}
                                    style={[cal.cell, isSelected && cal.cellSelected]}
                                    onPress={() => hasRide && onSelect(isSelected ? null : dateStr)}
                                    activeOpacity={hasRide ? 0.75 : 1}
                                >
                                    <Text style={[
                                        cal.dayNum,
                                        isToday && cal.dayNumToday,
                                        isSelected && cal.dayNumSelected,
                                        isPast && !isToday && cal.dayNumPast,
                                    ]}>{day}</Text>
                                    {hasRide && <View style={[cal.dot, isSelected && cal.dotSelected]} />}
                                </TouchableOpacity>
                            );
                        })}
                        {Array.from({ length: pad }, (_, i) => <View key={`p-${i}`} style={cal.cell} />)}
                    </View>
                );
            })}
        </View>
    );
}

const cal = StyleSheet.create({
    wrap: { paddingVertical: 8 },
    monthLabel: { fontSize: 15, fontWeight: '700', color: '#1E1B2E', marginBottom: 14, letterSpacing: -0.3 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    dayHeader: { width: 36, textAlign: 'center', fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 },
    cell: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center', gap: 2 },
    cellSelected: { backgroundColor: '#BEA3D8', borderRadius: 12 },
    dayNum: { fontSize: 13, fontWeight: '500', color: '#1E1B2E' },
    dayNumToday: { fontWeight: '800', color: '#7C3AED' },
    dayNumSelected: { color: '#FFFFFF', fontWeight: '800' },
    dayNumPast: { color: '#CBD5E1' },
    dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#BEA3D8' },
    dotSelected: { backgroundColor: '#FFFFFF' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function SubscriptionsDashboard() {
    const router = useRouter();
    const { showBack } = useLocalSearchParams();
    const { ride } = useRide();

    // ── Support multiple subscriptions ────────────────────────────────────────
    const allSubs = useMemo(() => {
        if (ride?.subscriptions?.length) return ride.subscriptions;
        if (ride?.subscription?.id)      return [ride.subscription];
        return [{}];
    }, [ride]);
    const [activeSubIdx, setActiveSubIdx] = useState(0);
    const sub = allSubs[activeSubIdx] || {};

    const [isPaused, setIsPaused] = useState(false);
    const [modal, setModal] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [calMonthOffset, setCalMonthOffset] = useState(0);

    // Reset calendar state when switching subscription
    const switchSub = (idx) => {
        setActiveSubIdx(idx);
        setSelectedDate(null);
        setCalMonthOffset(0);
        setIsPaused(false);
    };

    const insets = useSafeAreaInsets();
    const topInset = Platform.OS === 'ios' ? insets.top : ANDROID_STATUS_BAR_HEIGHT;
    const topNavPaddingTop = topInset + (Platform.OS === 'ios' ? 0 : 8);
    const topNavHeight = topInset + 60;
    const scrollTopPadding = topNavHeight + (Platform.OS === 'ios' ? 16 : 8);

    // ── Computed values from the selected sub ─────────────────────────────────
    const pickupTime     = sub.morningTime || '8:30 AM';
    const ridesTotal     = sub.rides_total ?? sub.plan ?? sub.total_rides ?? 30;
    const ridesUsed      = sub.rides_used  ?? sub.used  ?? 0;
    const ridesRemaining = Math.max(0, ridesTotal - ridesUsed);
    const progressPct    = ridesTotal > 0 ? (ridesRemaining / ridesTotal) * 100 : 0;
    // Each sub carries its own pickup/dropoff; fall back to ride-level for legacy
    const pickupName  = sub.pickup?.address?.split(',')[0]  || ride?.pickup?.address?.split(',')[0]  || 'Pickup location';
    const dropoffName = sub.dropoff?.address?.split(',')[0] || ride?.dropoff?.address?.split(',')[0] || 'Dropoff location';
    const daysRange   = sub.days?.length > 3
        ? `${sub.days[0]}–${sub.days[sub.days.length - 1]}`
        : (sub.days?.join(', ') || 'Mon–Fri');

    const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

    // ── Build ride date set for selected sub ──────────────────────────────────
    const rideDates = useMemo(() => {
        const set = new Set();
        if (sub.scheduled_dates?.length) {
            sub.scheduled_dates.forEach(d => set.add(d.slice(0, 10)));
        } else {
            const cur = new Date(today);
            for (let i = 0; i < 90 && set.size < ridesRemaining; i++) {
                cur.setDate(cur.getDate() + 1);
                const dow = cur.getDay();
                if (dow !== 0 && dow !== 6) set.add(cur.toISOString().slice(0, 10));
            }
        }
        return set;
    }, [sub.scheduled_dates, sub.id, today, ridesRemaining]);

    const selectedRide = selectedDate ? {
        date: selectedDate, time: pickupTime, from: pickupName, to: dropoffName,
    } : null;

    // ── Active calendar month (navigable) ─────────────────────────────────────
    const calMonth = useMemo(() => {
        const base = new Date(today.getFullYear(), today.getMonth() + calMonthOffset, 1);
        return { year: base.getFullYear(), month: base.getMonth() };
    }, [today, calMonthOffset]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handlePause = () => {
        if (!sub.id) return;
        setModal({
            icon: isPaused ? '▶️' : '⏸️',
            title: isPaused ? 'Resume Subscription' : 'Pause Subscription',
            message: isPaused
                ? 'Your subscription rides will resume from tomorrow.'
                : 'Your upcoming rides will be paused until you resume.',
            buttons: [
                { text: 'Cancel', style: 'cancel', onPress: () => setModal(null) },
                { text: isPaused ? 'Resume' : 'Pause', onPress: async () => {
                    setModal(null);
                    try { await toggleSubscriptionPause(sub.id, !isPaused); setIsPaused(!isPaused); }
                    catch { setTimeout(() => setModal({ icon: '🔄', title: 'Error', message: 'Could not update subscription.', buttons: [{ text: 'OK', onPress: () => setModal(null) }] }), 500); }
                }},
            ],
        });
    };

    const handleCancel = () => {
        if (!sub.id) return;
        setModal({
            icon: '⚠️',
            title: 'Cancel Subscription?',
            message: 'This will permanently cancel your current plan. Any unused rides will be forfeited.',
            buttons: [
                { text: 'Keep Plan', style: 'cancel', onPress: () => setModal(null) },
                { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
                    setModal(null);
                    try {
                        await cancelSubscription(sub.id);
                        setTimeout(() => setModal({ icon: '✅', title: 'Subscription Cancelled', message: 'Your plan has been cancelled successfully.', buttons: [{ text: 'OK', onPress: () => { setModal(null); router.replace('/(tabs)/'); } }] }), 500);
                    } catch {
                        setTimeout(() => setModal({ icon: '🔄', title: 'Error', message: 'Could not cancel subscription.', buttons: [{ text: 'OK', onPress: () => setModal(null) }] }), 500);
                    }
                }},
            ],
        });
    };

    return (
        <View style={s.container}>
            {/* Top Nav */}
            <View style={[s.topNav, { height: topNavHeight, paddingTop: topNavPaddingTop }]}>
                <View style={s.headerLeft}>
                    {(router.canGoBack() || showBack) && (
                        <TouchableOpacity style={s.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
                            <Feather name="arrow-left" size={24} color="#BEA3D8" />
                        </TouchableOpacity>
                    )}
                    <Text style={s.title}>My Subscription</Text>
                </View>
                <TouchableOpacity style={s.menuBtn} onPress={() => router.push('/subscription-plans')}>
                    <Feather name="plus" size={22} color="#BEA3D8" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={[s.scrollContent, { paddingTop: scrollTopPadding }]} showsVerticalScrollIndicator={false}>

                {/* Subscription Tabs — shown only when there are multiple subs */}
                {allSubs.length > 1 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsContent}>
                        {allSubs.map((item, idx) => {
                            const pName = item.pickup?.address?.split(',')[0] || `Plan ${idx + 1}`;
                            const dName = item.dropoff?.address?.split(',')[0] || '';
                            const isActive = idx === activeSubIdx;
                            return (
                                <TouchableOpacity
                                    key={item.id || idx}
                                    style={[s.tab, isActive && s.tabActive]}
                                    onPress={() => switchSub(idx)}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[s.tabRoute, isActive && s.tabRouteActive]} numberOfLines={1}>
                                        {pName} → {dName}
                                    </Text>
                                    <Text style={[s.tabTime, isActive && s.tabTimeActive]}>{item.morningTime || '—'}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                )}
                <View style={s.activeCard}>
                    <View style={s.cardHeader}>
                        <View style={s.routeCol}>
                            <Text style={s.routeTitle} numberOfLines={1}>{pickupName} → {dropoffName}</Text>
                            <Text style={s.routeSub}>{pickupTime} pickup · {daysRange}</Text>
                        </View>
                        <View style={[s.statusBadge, isPaused && s.statusBadgePaused]}>
                            <View style={[s.statusDot, isPaused && s.statusDotPaused]} />
                            <Text style={[s.statusText, isPaused && s.statusTextPaused]}>{isPaused ? 'Paused' : 'Active'}</Text>
                        </View>
                    </View>

                    <View style={s.progressSection}>
                        <View style={s.progressRow}>
                            <Text style={s.progressNumbers}>{ridesRemaining}<Text style={s.progressTotal}> / {ridesTotal}</Text></Text>
                            <Text style={s.progressLabel}>RIDES REMAINING</Text>
                        </View>
                        <View style={s.progressTrack}>
                            <View style={[s.progressBar, { width: `${progressPct}%` }]} />
                        </View>
                    </View>

                    <View style={s.paymentBadge}>
                        <Text style={s.paymentBadgeText}><Feather name="credit-card" size={12} color="#BEA3D8" />  Paid via UPI · Single rides are Cash only</Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={s.actionsRow}>
                    <TouchableOpacity style={[s.actionBtn, s.pauseBtn]} onPress={handlePause} activeOpacity={0.8}>
                        <Text style={s.pauseText}>{isPaused ? 'Resume' : 'Pause'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, s.modifyBtn]} onPress={() => router.push('/subscription-ride')} activeOpacity={0.8}>
                        <Text style={s.modifyText}>Modify</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, s.cancelBtn]} onPress={handleCancel} activeOpacity={0.8}>
                        <Text style={s.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>

                {/* Calendar Card */}
                <View style={s.calendarCard}>
                    {/* Calendar header with month navigation */}
                    <View style={s.calendarHeader}>
                        <Text style={s.calendarTitle}><Feather name="calendar" size={15} color="#1E1B2E" />  Upcoming Rides</Text>
                        <View style={s.calNavRow}>
                            <TouchableOpacity
                                style={[s.calNavBtn, calMonthOffset === 0 && s.calNavBtnDisabled]}
                                onPress={() => {
                                    if (calMonthOffset > 0) {
                                        setCalMonthOffset(o => o - 1);
                                        setSelectedDate(null);
                                    }
                                }}
                                activeOpacity={calMonthOffset === 0 ? 1 : 0.7}
                            >
                                <Feather name="chevron-left" size={20} color={calMonthOffset === 0 ? '#CBD5E1' : '#7C3AED'} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={s.calNavBtn}
                                onPress={() => {
                                    setCalMonthOffset(o => o + 1);
                                    setSelectedDate(null);
                                }}
                                activeOpacity={0.7}
                            >
                                <Feather name="chevron-right" size={20} color="#7C3AED" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={s.legendRow}>
                        <View style={s.legendDot} />
                        <Text style={s.legendText}>Scheduled ride</Text>
                    </View>

                    <View style={{ marginTop: 12 }}>
                        <MiniCalendar
                            year={calMonth.year} month={calMonth.month}
                            rideDates={rideDates} today={today}
                            selectedDate={selectedDate} onSelect={setSelectedDate}
                        />
                    </View>

                    {selectedRide ? (
                        <View style={s.rideDetail}>
                            <View style={s.rideDetailHeader}>
                                <Text style={s.rideDetailDate}>
                                    {new Date(selectedRide.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </Text>
                                <View style={s.scheduledPill}><Text style={s.scheduledPillText}>SCHEDULED</Text></View>
                            </View>
                            <View style={s.rideDetailRow}>
                                <View style={s.dotGreen} />
                                <View style={s.rideDetailInfo}>
                                    <Text style={s.rideDetailLabel}>PICKUP · {selectedRide.time}</Text>
                                    <Text style={s.rideDetailAddr}>{selectedRide.from}</Text>
                                </View>
                            </View>
                            <View style={s.rideDetailDivLine} />
                            <View style={s.rideDetailRow}>
                                <View style={s.dotPurple} />
                                <View style={s.rideDetailInfo}>
                                    <Text style={s.rideDetailLabel}>DROP</Text>
                                    <Text style={s.rideDetailAddr}>{selectedRide.to}</Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <Text style={s.calHint}>Tap a purple dot to see ride details</Text>
                    )}
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>
            {modal && <SakhiModal config={modal} onClose={() => setModal(null)} />}
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0FF' },

    topNav: {
        position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 24,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#F5F0FF', zIndex: 10,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    backBtn: { width: 32, height: 32, justifyContent: 'center' },
    backIcon: { fontSize: 24, color: '#BEA3D8' },
    title: { fontSize: 20, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.5 },
    menuBtn: { width: 32, height: 32, alignItems: 'flex-end', justifyContent: 'center' },
    menuIcon: { fontSize: 22, color: '#BEA3D8', fontWeight: '700' },

    scrollContent: { paddingHorizontal: 24 },

    // ── Subscription tabs ─────────────────────────────────────────────────────
    tabsScroll: { marginBottom: 16 },
    tabsContent: { paddingHorizontal: 24, gap: 10 },
    tab: {
        paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(190,163,216,0.35)',
        backgroundColor: '#FFFFFF', minWidth: 150,
        shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    tabActive: {
        backgroundColor: '#BEA3D8', borderColor: '#BEA3D8',
    },
    tabRoute: { fontSize: 13, fontWeight: '700', color: '#1E1B2E', marginBottom: 2 },
    tabRouteActive: { color: '#FFFFFF' },
    tabTime: { fontSize: 11, fontWeight: '500', color: '#94A3B8' },
    tabTimeActive: { color: 'rgba(255,255,255,0.8)' },

    // Active card
    activeCard: {
        backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24,
        shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 5,
        marginBottom: 16,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    routeCol: { flex: 1, gap: 4, paddingRight: 12 },
    routeTitle: { fontSize: 15, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.3 },
    routeSub: { fontSize: 12, color: '#64748B' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999, borderWidth: 1, borderColor: '#BBF7D0' },
    statusBadgePaused: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
    statusDotPaused: { backgroundColor: '#F59E0B' },
    statusText: { fontSize: 11, fontWeight: '700', color: '#15803D' },
    statusTextPaused: { color: '#B45309' },

    progressSection: { gap: 10 },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressNumbers: { fontSize: 28, fontWeight: '900', color: '#1E1B2E', letterSpacing: -1 },
    progressTotal: { fontSize: 16, fontWeight: '500', color: '#94A3B8' },
    progressLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase' },
    progressTrack: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 9999, overflow: 'hidden' },
    progressBar: { height: 8, backgroundColor: '#BEA3D8', borderRadius: 9999 },

    paymentBadge: { marginTop: 14, backgroundColor: '#F5F0FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
    paymentBadgeText: { fontSize: 12, fontWeight: '600', color: '#BEA3D8' },

    // Actions
    actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    actionBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    pauseBtn: { backgroundColor: '#DDD6FE' },
    modifyBtn: { backgroundColor: '#BEA3D8' },
    cancelBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
    pauseText:  { fontSize: 13, fontWeight: '700', color: '#5B21B6' },
    modifyText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
    cancelText: { fontSize: 13, fontWeight: '700', color: '#EF4444' },

    // Calendar card
    calendarCard: {
        backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
        shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.07, shadowRadius: 24, elevation: 5,
        marginBottom: 16,
    },
    calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    calendarTitle: { fontSize: 15, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.3 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#BEA3D8' },
    legendText: { fontSize: 11, fontWeight: '500', color: '#64748B' },
    calDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },

    // Month navigation arrows
    calNavRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    calNavBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#EDE9FE',
        alignItems: 'center', justifyContent: 'center',
    },
    calNavBtnDisabled: { backgroundColor: '#F8FAFC' },
    calNavIcon: { fontSize: 20, fontWeight: '700', color: '#7C3AED', lineHeight: 24 },
    calNavIconDisabled: { color: '#CBD5E1' },

    calHint: { fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingTop: 12 },

    // Ride detail
    rideDetail: {
        backgroundColor: '#F5F0FF', borderRadius: 14, padding: 16, marginTop: 16, gap: 10,
        borderWidth: 1, borderColor: 'rgba(190,163,216,0.3)',
    },
    rideDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    rideDetailDate: { fontSize: 13, fontWeight: '700', color: '#1E1B2E' },
    scheduledPill: { backgroundColor: '#BEA3D8', borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 3 },
    scheduledPillText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
    rideDetailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    dotGreen:   { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', marginTop: 4 },
    dotPurple:  { width: 10, height: 10, borderRadius: 5, backgroundColor: '#BEA3D8', marginTop: 4 },
    rideDetailInfo: { flex: 1, gap: 2 },
    rideDetailLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase' },
    rideDetailAddr: { fontSize: 13, fontWeight: '600', color: '#1E1B2E' },
    rideDetailDivLine: { height: 1, backgroundColor: 'rgba(190,163,216,0.25)', marginLeft: 22 },
});
