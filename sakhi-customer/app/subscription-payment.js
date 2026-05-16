import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, ScrollView, Platform, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRide } from '../src/context/RideContext';
import { useAuth } from '../src/context/AuthContext';
import SakhiModal from '../src/components/SakhiModal';
import { createSubscriptionOrder, verifyPayment } from '../src/api/endpoints';
import { ANDROID_STATUS_BAR_HEIGHT } from '../src/utils/androidUtils';
import RazorpayCheckout from 'react-native-razorpay';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const RAZORPAY_KEY = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || process.env.EXPO_PUBLIC_RAZORPAY_KEY || '';

export default function SubscriptionPaymentScreen() {
    const router = useRouter();
    const { ride } = useRide();
    const { user } = useAuth();
    const sub = ride.subscription || {};

    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState(null);

    const insets = useSafeAreaInsets();

    const topInset = Platform.OS === 'ios' ? insets.top : ANDROID_STATUS_BAR_HEIGHT;
    const topNavPaddingTop = topInset + (Platform.OS === 'ios' ? 0 : 8);
    const topNavHeight = topInset + (Platform.OS === 'ios' ? 64 : 56);
    const scrollTopPadding = topNavHeight + (Platform.OS === 'ios' ? 16 : 8);

    const footerPaddingBottom = Math.max(insets.bottom, 24) + (Platform.OS === 'ios' ? 10 : 0);
    const footerSpacerHeight = 56 + 16 + footerPaddingBottom + 64 + 24; // taller footer with UPI strip

    const pickupName = ride?.pickup?.address?.split(',')[0] || 'Pickup';
    const dropoffName = ride?.dropoff?.address?.split(',')[0] || 'Drop';

    const daysRange = sub.days?.length > 3
        ? `${sub.days[0]}–${sub.days[sub.days.length - 1]}`
        : (sub.days?.join(', ') || 'Mon–Fri');

    const handlePay = async () => {
        if (!RAZORPAY_KEY || !RAZORPAY_KEY.startsWith('rzp_')) {
            setModal({
                icon: '⚠️',
                title: 'Payment Unavailable',
                message: 'Razorpay API key is pending. Payment will be enabled once the client provides the key.',
                buttons: [{ text: 'OK', onPress: () => setModal(null) }],
            });
            return;
        }

        setLoading(true);
        try {
            // Step 1: Create order on backend
            const { data } = await createSubscriptionOrder({
                amount: (sub.price || 364) * 100, // paise
                currency: 'INR',
                plan: sub.plan,
            });

            const orderId = data?.order_id;
            if (!orderId) throw new Error('Order creation failed');

            // Step 2: Open native Razorpay in-app checkout
            // Shows UPI QR scanner, UPI apps (GPay/PhonePe/Paytm), UPI ID, cards, etc.
            const options = {
                description: 'Sakhi Subscription',
                image: 'https://i.ibb.co/your-logo', // replace with Sakhi logo URL
                currency: 'INR',
                key: RAZORPAY_KEY,
                amount: String((sub.price || 364) * 100),
                order_id: orderId,
                name: 'Sakhi',
                prefill: {
                    email: user?.email || '',
                    contact: user?.phone || '',
                    name: user?.name || '',
                    // Pre-select UPI method to open scanner/UPI directly
                    method: 'upi',
                },
                theme: { color: '#BEA3D8' },
                modal: {
                    ondismiss: () => {
                        setLoading(false);
                    },
                    // Show UPI apps and scanner prominently
                    animation: true,
                },
                // UPI-specific: show scanner + collect
                config: {
                    display: {
                        // Prioritise UPI options
                        preferences: { show_default_blocks: true },
                        blocks: {
                            utib: {
                                name: 'Pay using UPI',
                                instruments: [
                                    { method: 'upi', flows: ['qr', 'collect', 'intent'] },
                                ],
                            },
                        },
                        sequence: ['block.utib'],
                    },
                },
            };

            const paymentData = await RazorpayCheckout.open(options);

            // Step 3: Verify payment signature on backend
            setLoading(true);
            await verifyPayment({
                razorpay_order_id:    paymentData.razorpay_order_id,
                razorpay_payment_id:  paymentData.razorpay_payment_id,
                razorpay_signature:   paymentData.razorpay_signature,
                plan:                 sub.plan,
                subscription_id:      sub.subscriptionId,
            });

            // Step 4: Navigate to success screen
            router.replace('/payment-success');

        } catch (err) {
            // User pressed back / cancelled — Razorpay throws a specific code
            if (err?.code === 0 || err?.description === 'Payment cancelled') {
                // Silent — user dismissed, don't show error
                return;
            }
            const msg = err?.response?.data?.error?.message
                || err?.description
                || err?.message
                || 'Payment initiation failed.';
            setModal({
                icon: '🔄',
                title: 'Payment Failed',
                message: msg,
                buttons: [{ text: 'Try Again', onPress: () => setModal(null) }],
            });
        } finally {
            setLoading(false);
        }
    };


    return (
        <View style={styles.container}>
            {/* Top Navigation Bar */}
            <View style={[styles.topNav, { height: topNavHeight, paddingTop: topNavPaddingTop }]}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn}>
                    <Feather name="arrow-left" size={24} color="#1E1B2E" />
                </TouchableOpacity>

                <View style={styles.headerTitles}>
                    <Text style={styles.title}>Complete Payment</Text>
                </View>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingTop: scrollTopPadding }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Order Summary Card */}
                <View style={styles.orderCard}>
                    {/* Route Timeline */}
                    <View style={styles.routeRow}>
                        <View style={styles.timelineCol}>
                            <View style={styles.dotSolid} />
                            <View style={styles.verticalDivider} />
                            <View style={styles.dotOutline} />
                        </View>
                        <View style={styles.routeTextCol}>
                            <Text style={styles.routeLabel} numberOfLines={1}>{pickupName}</Text>
                            <Text style={styles.routeLabel} numberOfLines={1}>{dropoffName}</Text>
                        </View>
                    </View>

                    {/* Meta Specs */}
                    <View style={styles.specsRow}>
                        <View style={styles.specBox}>
                            <Text style={styles.specTitle}>PLAN</Text>
                            <Text style={styles.specValue}>{sub.plan || 7} Rides · {daysRange}</Text>
                        </View>
                        <View style={styles.specBox}>
                            <Text style={styles.specTitle}>START DATE</Text>
                            <Text style={styles.specValue}>{sub.startDate || '—'}</Text>
                        </View>
                    </View>

                    <View style={styles.timingsRow}>
                        <Text style={styles.specTitle}>TIMINGS</Text>
                        <Text style={styles.specValue}>
                            Morning: {sub.morningTime || '8:30 AM'}
                            {sub.isTwoWay ? `  |  Return: ${sub.returnTime || '6:00 PM'}` : ''}
                        </Text>
                    </View>

                    <View style={styles.dividerLight} />

                    {/* Total */}
                    <View style={styles.totalRow}>
                        <View style={styles.totalTextCol}>
                            <Text style={styles.totalSub}>Total Amount</Text>
                            <Text style={styles.totalGst}>GST included</Text>
                        </View>
                        <Text style={styles.totalAmt}>₹{sub.price || 364}</Text>
                    </View>
                </View>

                {/* Policy Note */}
                <View style={styles.policyNote}>
                    <Feather name="info" size={16} color="#BEA3D8" style={{ marginTop: 2 }} />
                    <Text style={styles.policyText}>
                        Subscriptions cannot be cancelled within 7 days of starting your plan.
                    </Text>
                </View>

                <View style={{ height: footerSpacerHeight }} />
            </ScrollView>

            {/* Footer: UPI + Pay Button */}
            <View style={[styles.footerOverlay, { paddingBottom: footerPaddingBottom }]}>

                {/* UPI Apps Strip */}
                <View style={styles.upiStrip}>
                    <Text style={styles.upiStripLabel}>Pay directly using</Text>
                    <View style={styles.upiAppRow}>
                        {[
                            { label: 'GPay', icon: 'smartphone' },
                            { label: 'PhonePe', icon: 'smartphone' },
                            { label: 'Paytm', icon: 'smartphone' },
                            { label: 'BHIM', icon: 'smartphone' },
                            { label: 'UPI QR', icon: 'camera' },
                        ].map((app) => (
                            <TouchableOpacity
                                key={app.label}
                                style={styles.upiAppBtn}
                                onPress={handlePay}
                                disabled={loading}
                                activeOpacity={0.75}
                            >
                                <Feather name={app.icon} size={20} color="#BEA3D8" style={{ marginBottom: 2 }} />
                                <Text style={styles.upiAppLabel}>{app.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Main Pay Button */}
                <TouchableOpacity
                    style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                    onPress={handlePay}
                    disabled={loading}
                    activeOpacity={0.88}
                >
                    {loading
                        ? <ActivityIndicator color="#FFFFFF" />
                        : <Text style={styles.submitText}>Pay ₹{sub.price || 364} — Open Payment</Text>
                    }
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 4 }}>
                    <Feather name="lock" size={11} color="#94A3B8" />
                    <Text style={[styles.securedNote, { paddingBottom: 0 }]}>Secured by Razorpay · 256-bit encryption</Text>
                </View>
            </View>

            <SakhiModal config={modal} onClose={() => setModal(null)} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0FF' },

    topNav: {
        position: 'absolute', top: 0, left: 0, right: 0,
        paddingHorizontal: 24,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: 'rgba(245, 240, 255, 0.8)',
        zIndex: 10,
    },
    backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
    backIcon: { fontSize: 24, color: '#1E1B2E', fontWeight: '500' },
    headerTitles: { alignItems: 'flex-start' },
    title: { fontSize: 18, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.45 },

    scrollContent: {
        paddingHorizontal: 20,
    },

    orderCard: {
        backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, marginBottom: 32,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 6,
    },

    routeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    timelineCol: { alignItems: 'center', gap: 4 },
    dotSolid: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#BEA3D8' },
    verticalDivider: { width: 1, height: 24, backgroundColor: '#E5E0EF' },
    dotOutline: { width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: '#BEA3D8', backgroundColor: '#FFF' },
    routeTextCol: { gap: 28 },
    routeLabel: { fontSize: 14, fontWeight: '600', color: '#1E1B2E' },

    specsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    specBox: { flex: 1 },
    specTitle: { fontSize: 10, fontWeight: '500', color: '#6B7280', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
    specValue: { fontSize: 14, fontWeight: '600', color: '#1E1B2E' },

    timingsRow: { marginBottom: 24 },
    dividerLight: { height: 1, backgroundColor: '#F5F0FF', marginBottom: 20 },

    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    totalTextCol: { gap: 2 },
    totalSub: { fontSize: 12, fontWeight: '400', color: '#6B7280' },
    totalGst: { fontSize: 10, fontWeight: '400', color: '#6B7280' },
    totalAmt: { fontSize: 24, fontWeight: '700', color: '#BEA3D8' },

    policyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#EDE9FE', borderRadius: 12, padding: 16 },
    policyIcon: { fontSize: 16, color: '#BEA3D8', marginTop: 2 },
    policyText: { flex: 1, fontSize: 12, fontWeight: '400', color: '#6B7280', lineHeight: 20 },

    footerOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 24,
        paddingTop: 16,
        backgroundColor: 'rgba(245, 240, 255, 0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(190, 163, 216, 0.2)',
        gap: 12,
    },

    // UPI app strip
    upiStrip: {
        alignItems: 'center',
        gap: 8,
    },
    upiStripLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    upiAppRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    upiAppBtn: {
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 6,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        minWidth: 52,
        shadowColor: '#BEA3D8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    upiAppEmoji: { fontSize: 20 },
    upiAppLabel: { fontSize: 9, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },

    submitBtn: {
        width: '100%', height: 56, backgroundColor: '#BEA3D8', borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 32, elevation: 8,
    },
    submitText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

    securedNote: {
        textAlign: 'center',
        fontSize: 11,
        fontWeight: '500',
        color: '#94A3B8',
        paddingBottom: 4,
    },
});
