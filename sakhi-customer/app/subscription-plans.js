import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, ScrollView, Platform, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useRide } from '../src/context/RideContext';
import SakhiModal from '../src/components/SakhiModal';
import { ANDROID_STATUS_BAR_HEIGHT } from '../src/utils/androidUtils';
import { PRICING } from '../src/utils/fareCalculator';
import { estimateFare } from '../src/api/endpoints';

const SUBSCRIPTION_DISCOUNTS = PRICING.SUBSCRIPTION_DISCOUNTS;

const { width } = Dimensions.get('window');

export default function SubscriptionPlansScreen() {
    const router = useRouter();
    const { ride, updateSubscription } = useRide();
    const sub = ride.subscription || {};
    const [modal, setModal] = useState(null);
    const [baseRidePrice, setBaseRidePrice] = useState(70);
    const [isLoadingFare, setIsLoadingFare] = useState(true);

    useEffect(() => {
        const fetchFare = async () => {
            if (!ride?.pickup || !ride?.dropoff) {
                setIsLoadingFare(false);
                return;
            }
            try {
                const { data } = await estimateFare(ride.pickup, ride.dropoff);
                if (data?.estimated_fare) {
                    // Base the subscription on the normal single ride price
                    setBaseRidePrice(data.estimated_fare);
                }
            } catch (err) {
                console.warn('Failed to estimate fare for subscription:', err);
            } finally {
                setIsLoadingFare(false);
            }
        };
        fetchFare();
    }, [ride?.pickup, ride?.dropoff]);

    const insets = useSafeAreaInsets();

    const topInset = Platform.OS === 'ios' ? insets.top : ANDROID_STATUS_BAR_HEIGHT;
    const topNavPaddingTop = topInset + (Platform.OS === 'ios' ? 0 : 8);
    const topNavHeight = topInset + (Platform.OS === 'ios' ? 72 : 56);
    const scrollTopPadding = topNavHeight + (Platform.OS === 'ios' ? 14 : 8);

    const footerPaddingBottom = Math.max(insets.bottom, 24) + (Platform.OS === 'ios' ? 10 : 0);
    const footerSpacerHeight = 56 + 16 + footerPaddingBottom + 24;

    // Actual per-ride price = estimated fare from backend (base + distance + etc.)
    // If fetching fails, we use a reasonable default of ₹70/ride
    const BASE_RIDE_PRICE = baseRidePrice;

    // Multiplier for two-way rides
    const multiplier = sub.isTwoWay ? 2 : 1;

    const plans = [
        { days: 7,  rides: 7,  label: '7 Rides',  desc: '1 week · Mon–Fri' },
        { days: 14, rides: 14, label: '14 Rides', desc: '2 weeks · Mon–Fri' },
        { days: 30, rides: 30, label: '30 Rides', desc: '1 month · Mon–Fri' },
    ].map(p => {
        const fullPrice = p.rides * BASE_RIDE_PRICE * multiplier;
        const discount  = SUBSCRIPTION_DISCOUNTS[p.days];
        const rawSaving = parseFloat(((fullPrice * discount.pct) / 100).toFixed(0));
        const saving    = Math.min(rawSaving, discount.max_saving);
        const finalPrice = Math.round(Math.max(0, fullPrice - saving));
        const perRide   = Math.round(finalPrice / (p.rides * multiplier));
        return { ...p, fullPrice, saving, finalPrice, perRide, pct: discount.pct };
    });

    const handleSelectPlan = (plan, price) => {
        updateSubscription({ plan, price });
    };

    const handleProceed = () => {
        if (!sub.plan) {
            return setModal({
                icon: '🛒',
                title: 'Select a Plan',
                message: 'Please choose a subscription plan package before proceeding to payment.',
                buttons: [{ text: 'OK', onPress: () => setModal(null) }]
            });
        }

        // ── Next-day-only validation ────────────────────────────────────────
        // Subscriptions must start from the next day, not today.
        if (sub.startDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Parse startDate (expected format: 'DD MMM YYYY' or ISO string)
            const selectedDate = new Date(sub.startDate);
            selectedDate.setHours(0, 0, 0, 0);

            if (selectedDate < tomorrow) {
                return setModal({
                    icon: '📅',
                    title: 'Start Date Must Be Tomorrow or Later',
                    message: 'Subscriptions can only be booked starting from the next day. Please select tomorrow or a future date.',
                    buttons: [{ text: 'OK', onPress: () => setModal(null) }]
                });
            }
        }

        router.push('/subscription-payment');
    };

    const pickupName  = ride?.pickup?.address?.split(',')[0]  || 'Pickup';
    const dropoffName = ride?.dropoff?.address?.split(',')[0] || 'Drop';

    return (
        <View style={styles.container}>
            {/* Top Navigation Bar */}
            <View style={[styles.topNav, { height: topNavHeight, paddingTop: topNavPaddingTop }]}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn}>
                    <Feather name="arrow-left" size={24} color="#1E1B2E" />
                </TouchableOpacity>
                <View style={styles.headerTitles}>
                    <Text style={styles.title}>Choose Your Plan</Text>
                </View>
                <View style={{ width: 32 }} />
            </View>

            {/* Sakhi Validation Modal */}
            <SakhiModal config={modal} onClose={() => setModal(null)} />

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingTop: scrollTopPadding }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Route Pill */}
                <View style={styles.routePillWrapper}>
                    <View style={styles.routePill}>
                        <View style={styles.dotGreen} />
                        <Feather name="arrow-right" size={12} color="#BEA3D8" />
                        <View style={styles.pinPurple}><View style={styles.pinHole} /></View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 }}>
                            <Text style={styles.routeText} numberOfLines={1}>{pickupName}</Text>
                            <Feather name="arrow-right" size={13} color="#BEA3D8" />
                            <Text style={styles.routeText} numberOfLines={1}>{dropoffName}</Text>
                        </View>
                    </View>
                </View>

                {/* Pricing Note */}
                <View style={styles.pricingNote}>
                    <Text style={styles.pricingNoteText}>
                        ✦ Based on ₹{BASE_RIDE_PRICE}/ride (your route) · Sakhi Premium included
                    </Text>
                </View>

                {/* 30-min Notification Info Banner */}
                <View style={styles.notifyBanner}>
                    <Feather name="bell" size={16} color="#1E40AF" style={{ marginTop: 1 }} />
                    <Text style={styles.notifyBannerText}>
                        We will notify you <Text style={styles.notifyBannerBold}>30 minutes before</Text> your first ride if no driver is available, so you can book an on-demand ride instead.
                    </Text>
                </View>

                {isLoadingFare ? (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#BEA3D8" />
                        <Text style={{ marginTop: 12, color: '#6B7280', fontSize: 14 }}>Calculating your best price...</Text>
                    </View>
                ) : (
                <View style={styles.plansStack}>
                    {plans.map((plan, idx) => {
                        const isSelected = sub.plan === plan.days;
                        const isBest     = idx === plans.length - 1;
                        return (
                            <TouchableOpacity
                                key={plan.days}
                                style={isSelected ? styles.planCardActive : styles.planCard}
                                onPress={() => handleSelectPlan(plan.days, plan.finalPrice)}
                                activeOpacity={0.8}
                            >
                                {/* Best Value Badge */}
                                {isBest && (
                                    <View style={styles.bestValueBadge}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Text style={styles.bestValueText}>BEST VALUE</Text>
                                            <Feather name="tag" size={10} color="#FFFFFF" />
                                        </View>
                                    </View>
                                )}

                                <View style={styles.planColLeft}>
                                    <Text style={styles.planTitle}>{plan.label}</Text>
                                    <Text style={styles.planDesc}>{plan.desc}</Text>
                                    {/* Savings badge */}
                                    <View style={styles.savingsBadge}>
                                        <Text style={styles.savingsBadgeText}>
                                            Save ₹{plan.saving} ({plan.pct}% off)
                                        </Text>
                                    </View>
                                </View>

                                <View style={isSelected ? styles.planColRightActive : styles.planColRight}>
                                    <View style={styles.priceCol}>
                                        <Text style={styles.planSubPrice}>₹{plan.perRide}/ride</Text>
                                        <Text style={styles.planFullPrice}>₹{plan.fullPrice}</Text>
                                        <Text style={styles.planTotalPrice}>₹{plan.finalPrice} total</Text>
                                    </View>
                                    {isSelected && (
                                        <View style={styles.checkCircle}>
                                            <Feather name="check" size={12} color="#FFFFFF" style={{ fontWeight: 'bold' }} />
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                )}

                {/* Bottom Padding for Footer */}
                <View style={{ height: footerSpacerHeight }} />
            </ScrollView>

            {/* Footer Action Button */}
            <View style={[styles.footerOverlay, { paddingBottom: footerPaddingBottom }]}>
                <TouchableOpacity 
                    style={[styles.submitBtn, isLoadingFare && { opacity: 0.7 }]} 
                    onPress={handleProceed} 
                    activeOpacity={0.8}
                    disabled={isLoadingFare}
                >
                    <Text style={styles.submitText}>Proceed to Payment</Text>
                </TouchableOpacity>
            </View>

        </View>
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

    // Top Navigation
    topNav: {
        position: 'absolute', top: 0, left: 0, right: 0,
        paddingHorizontal: 24,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: 'rgba(245, 240, 255, 0.8)',
        zIndex: 10,
    },
    backBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
    backIcon: { fontSize: 24, color: '#1E1B2E', fontWeight: '500' },
    headerTitles: { alignItems: 'flex-start' },
    title: { fontSize: 18, fontWeight: '600', color: '#1E1B2E', letterSpacing: -0.45 },

    scrollContent: {
        paddingHorizontal: 24,
    },

    // Route Pill
    routePillWrapper: { alignItems: 'center', marginBottom: 24 },
    routePill: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FFFFFF', paddingVertical: 8, paddingHorizontal: 16,
        borderRadius: 9999,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 6,
    },
    dotGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E' },
    arrowSmall: { fontSize: 12, color: '#BEA3D8' },
    pinPurple: { 
        width: 12, height: 15, backgroundColor: '#BEA3D8',
        borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
        alignItems: 'center', paddingTop: 3
    },
    pinHole: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' },
    routeText: { fontSize: 14, fontWeight: '500', color: '#1E1B2E', marginLeft: 4 },

    // Plans Stack
    plansStack: { gap: 16 },
    
    planCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 19, paddingHorizontal: 20,
        backgroundColor: '#FFFFFF', borderRadius: 12,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
    },
    planCardActive: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 19, paddingHorizontal: 20,
        backgroundColor: '#EDE9FE', borderRadius: 12, borderWidth: 2, borderColor: '#BEA3D8',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
    },

    bestValueBadge: {
        position: 'absolute', right: 18, top: -10,
        backgroundColor: '#BEA3D8', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999,
        zIndex: 2
    },
    bestValueText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },

    planColLeft: { gap: 4 },
    planTitle: { fontSize: 18, fontWeight: '700', color: '#1E1B2E', lineHeight: 22 },
    planDesc: { fontSize: 14, fontWeight: '400', color: '#6B7280' },

    // Savings badge under plan title
    savingsBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#ECFDF5',
        borderRadius: 9999,
        paddingHorizontal: 10,
        paddingVertical: 3,
        marginTop: 4,
        borderWidth: 1,
        borderColor: 'rgba(16,185,129,0.2)',
    },
    savingsBadgeText: { fontSize: 11, fontWeight: '700', color: '#059669' },

    planColRight: { alignItems: 'flex-end', gap: 2 },
    planSubPrice: { fontSize: 14, fontWeight: '600', color: '#BEA3D8' },
    planFullPrice: { fontSize: 11, fontWeight: '400', color: '#94A3B8', textDecorationLine: 'line-through' },
    planTotalPrice: { fontSize: 15, fontWeight: '700', color: '#1E1B2E' },

    planColRightActive: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    priceCol: { alignItems: 'flex-end', gap: 2 },
    planSubPriceActive: { fontSize: 14, fontWeight: '600', color: '#BEA3D8' },

    checkCircle: {
        width: 20, height: 20, borderRadius: 10, backgroundColor: '#BEA3D8',
        alignItems: 'center', justifyContent: 'center'
    },
    checkIcon: { fontSize: 12, color: '#FFFFFF', fontWeight: 'bold' },

    // Pricing note
    pricingNote: {
        backgroundColor: '#EDE9FE',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 8,
    },
    pricingNoteText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#7C3AED',
        lineHeight: 16,
    },

    // Footer overlay
    footerOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 24,
        paddingTop: 16,
        backgroundColor: 'rgba(245, 240, 255, 0.95)',
        justifyContent: 'flex-end',
    },
    submitBtn: {
        width: '100%', height: 56, backgroundColor: '#BEA3D8', borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8,
    },
    submitText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

    // 30-min notification banner
    notifyBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#BFDBFE',
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 20,
    },
    notifyBannerIcon: { fontSize: 16, marginTop: 1 },
    notifyBannerText: { flex: 1, fontSize: 12, fontWeight: '400', color: '#1E40AF', lineHeight: 20 },
    notifyBannerBold: { fontWeight: '700' },

});
