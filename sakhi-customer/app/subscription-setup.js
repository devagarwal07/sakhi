import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Pressable, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';
import { saveAddress } from '../src/api/endpoints';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PLANS = [
    { days: 7, label: '7 Days', discount: '5%' },
    { days: 14, label: '14 Days', discount: '10%' },
    { days: 21, label: '21 Days', discount: '15%' },
    { days: 30, label: '30 Days', discount: '20%', badge: 'BEST VALUE' },
];

export default function SubscriptionSetupScreen() {
    const router = useRouter();
    const [selectedDays, setSelectedDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    const [selectedPlan, setSelectedPlan] = useState(30);
    const [isTwoWay, setIsTwoWay] = useState(false);
    const [pickupTime, setPickupTime] = useState('09:00 AM');
    const [returnTime, setReturnTime] = useState('06:00 PM');

    const toggleDay = (day) => {
        setSelectedDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backArrow}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Book a Subscription</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Route section */}
                <Text style={styles.sectionLabel}>Your Route</Text>
                <View style={styles.routeCard}>
                    <Pressable style={styles.routeRow} onPress={() => router.push('/location-search?mode=pickup')}>
                        <View style={[styles.routeDot, { backgroundColor: '#16a34a' }]} />
                        <View style={styles.routeInputBody}>
                            <Text style={styles.routeInputLabel}>Pickup Location</Text>
                            <Text style={styles.routeInputHint}>Home / Office</Text>
                        </View>
                        <Text style={styles.routeChevron}>›</Text>
                    </Pressable>
                    <View style={styles.routeVertLine} />
                    <Pressable style={styles.routeRow} onPress={() => router.push('/location-search?mode=dropoff')}>
                        <View style={[styles.routeDot, { backgroundColor: Colors.primaryContainer }]} />
                        <View style={styles.routeInputBody}>
                            <Text style={styles.routeInputLabel}>Drop-off Location</Text>
                            <Text style={styles.routeInputHint}>Office / College</Text>
                        </View>
                        <Text style={styles.routeChevron}>›</Text>
                    </Pressable>
                </View>

                {/* Days */}
                <Text style={styles.sectionLabel}>Select Days</Text>
                <View style={styles.daysRow}>
                    {DAYS.map((day) => (
                        <TouchableOpacity
                            key={day}
                            style={[styles.dayBtn, selectedDays.includes(day) && styles.dayBtnSelected]}
                            onPress={() => toggleDay(day)}
                        >
                            <Text style={[styles.dayBtnText, selectedDays.includes(day) && styles.dayBtnTextSelected]}>
                                {day}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* One-way / Two-way toggle */}
                <Text style={styles.sectionLabel}>Trip Type</Text>
                <View style={styles.toggleCard}>
                    <View style={styles.toggleBody}>
                        <Text style={styles.toggleIcon}>🔄</Text>
                        <View>
                            <Text style={styles.toggleLabel}>Two-Way</Text>
                            <Text style={styles.toggleSubtitle}>Include return trip each day</Text>
                        </View>
                    </View>
                    <Switch
                        value={isTwoWay}
                        onValueChange={setIsTwoWay}
                        trackColor={{ false: Colors.outlineVariant, true: Colors.primaryFixed }}
                        thumbColor={isTwoWay ? Colors.primaryContainer : Colors.surfaceContainerHighest}
                    />
                </View>

                {/* Timing */}
                <Text style={styles.sectionLabel}>Pickup Times</Text>
                <View style={styles.timingCard}>
                    <View style={styles.timingRow}>
                        <Text style={styles.timingLabel}>🌅  Morning Pickup</Text>
                        <TouchableOpacity style={styles.timePicker}>
                            <Text style={styles.timePickerText}>{pickupTime}</Text>
                            <Text style={styles.timePickerChevron}>›</Text>
                        </TouchableOpacity>
                    </View>
                    {isTwoWay && (
                        <>
                            <View style={styles.timingDivider} />
                            <View style={styles.timingRow}>
                                <Text style={styles.timingLabel}>🌆  Evening Return</Text>
                                <TouchableOpacity style={styles.timePicker}>
                                    <Text style={styles.timePickerText}>{returnTime}</Text>
                                    <Text style={styles.timePickerChevron}>›</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>

                {/* Plan selection */}
                <Text style={styles.sectionLabel}>Choose Plan</Text>
                <View style={styles.plansGrid}>
                    {PLANS.map((plan) => (
                        <TouchableOpacity
                            key={plan.days}
                            style={[styles.planCard, selectedPlan === plan.days && styles.planCardSelected]}
                            onPress={() => setSelectedPlan(plan.days)}
                            activeOpacity={0.85}
                        >
                            {plan.badge && (
                                <View style={styles.planBadge}>
                                    <Text style={styles.planBadgeText}>{plan.badge}</Text>
                                </View>
                            )}
                            <Text style={[styles.planDays, selectedPlan === plan.days && styles.planDaysSelected]}>
                                {plan.label}
                            </Text>
                            <Text style={[styles.planDiscount, selectedPlan === plan.days && styles.planDiscountSelected]}>
                                Save {plan.discount}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* CTA */}
                <TouchableOpacity
                    style={styles.ctaBtn}
                    onPress={() => router.push('/subscription-payment')}
                    activeOpacity={0.88}
                >
                    <Text style={styles.ctaBtnText}>
                        Continue to Payment  →
                    </Text>
                </TouchableOpacity>
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
    content: { paddingHorizontal: 20, paddingBottom: 48, gap: 12 },
    sectionLabel: {
        fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant,
        textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 6,
    },
    routeCard: {
        backgroundColor: Colors.surfaceContainerLowest, borderRadius: 16,
        padding: 16, ...Shadows.card,
    },
    routeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    routeDot: { width: 12, height: 12, borderRadius: 6 },
    routeVertLine: {
        width: 2, height: 16, backgroundColor: Colors.outlineVariant,
        marginLeft: 5, marginVertical: 4,
    },
    routeInputBody: { flex: 1 },
    routeInputLabel: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
    routeInputHint: { fontSize: 11, color: Colors.outline },
    routeChevron: { fontSize: 20, color: Colors.outline },
    daysRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    dayBtn: {
        flex: 1, minWidth: 40, paddingVertical: 10,
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 10, alignItems: 'center',
        borderWidth: 1.5, borderColor: Colors.outlineVariant,
    },
    dayBtnSelected: {
        backgroundColor: Colors.primaryFixed, borderColor: Colors.primaryContainer,
    },
    dayBtnText: { fontSize: 12, fontWeight: '600', color: Colors.outline },
    dayBtnTextSelected: { color: Colors.primaryContainer },
    toggleCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 14, padding: 14, ...Shadows.card,
    },
    toggleBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    toggleIcon: { fontSize: 20 },
    toggleLabel: { fontSize: 15, fontWeight: '600', color: Colors.onSurface },
    toggleSubtitle: { fontSize: 11, color: Colors.onSurfaceVariant },
    timingCard: {
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 14, overflow: 'hidden', ...Shadows.card,
    },
    timingRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
    },
    timingLabel: { fontSize: 14, fontWeight: '500', color: Colors.onSurface },
    timePicker: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: Colors.primaryFixed, borderRadius: BorderRadius.full,
        paddingHorizontal: 14, paddingVertical: 6,
    },
    timePickerText: { fontSize: 13, fontWeight: '600', color: Colors.primaryContainer },
    timePickerChevron: { fontSize: 14, color: Colors.primaryContainer },
    timingDivider: { height: 1, backgroundColor: Colors.outlineVariant, marginHorizontal: 16 },
    plansGrid: { flexDirection: 'row', gap: 10 },
    planCard: {
        flex: 1, backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 14, padding: 12, alignItems: 'center',
        borderWidth: 2, borderColor: 'transparent',
        position: 'relative', ...Shadows.card,
    },
    planCardSelected: {
        borderColor: Colors.primaryContainer, backgroundColor: Colors.primaryFixed,
    },
    planBadge: {
        position: 'absolute', top: -8,
        backgroundColor: Colors.primaryContainer, borderRadius: BorderRadius.full,
        paddingHorizontal: 6, paddingVertical: 2,
    },
    planBadgeText: { fontSize: 7, fontWeight: '700', color: '#fff' },
    planDays: { fontSize: 13, fontWeight: '700', color: Colors.onSurface, marginBottom: 2 },
    planDaysSelected: { color: Colors.primaryContainer },
    planDiscount: { fontSize: 10, color: Colors.outline, fontWeight: '500' },
    planDiscountSelected: { color: Colors.secondary },
    ctaBtn: {
        backgroundColor: Colors.primaryContainer, borderRadius: BorderRadius.md,
        paddingVertical: 17, alignItems: 'center', marginTop: 8, ...Shadows.editorial,
    },
    ctaBtnText: { color: Colors.onPrimary, fontSize: 16, fontWeight: '700' },
});
