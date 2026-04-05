import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, ScrollView, Platform, ActivityIndicator, Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRide } from '../src/context/RideContext';
import { useAuth } from '../src/context/AuthContext';
import SakhiModal from '../src/components/SakhiModal';
import { createSubscriptionOrder, verifyPayment } from '../src/api/endpoints';
import { ANDROID_STATUS_BAR_HEIGHT } from '../src/utils/androidUtils';

const { width } = Dimensions.get('window');
const RAZORPAY_KEY = process.env.EXPO_PUBLIC_RAZORPAY_KEY || '';

export default function SubscriptionPaymentScreen() {
    const router = useRouter();
    const { ride } = useRide();
    const { user } = useAuth();
    const sub = ride.subscription || {};

    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState(null);

    const pickupName = ride?.pickup?.address?.split(',')[0] || 'Pickup';
    const dropoffName = ride?.dropoff?.address?.split(',')[0] || 'Drop';

    const daysRange = sub.days?.length > 3
        ? `${sub.days[0]}–${sub.days[sub.days.length - 1]}`
        : (sub.days?.join(', ') || 'Mon–Fri');

    const handlePay = async () => {
        setLoading(true);
        try {
            // Step 1: Create Razorpay order on backend
            const { data } = await createSubscriptionOrder({
                amount: (sub.price || 364) * 100,  // paise
                currency: 'INR',
                plan: sub.plan,
            });

            const orderId = data?.order_id;
            if (!orderId) throw new Error('Order creation failed');

            // Step 2: Build Razorpay hosted checkout URL
            // When Razorpay key is available, this opens the real payment page.
            // The Razorpay key will be injected via env once provided by the client.
            if (!RAZORPAY_KEY || !RAZORPAY_KEY.startsWith('rzp_')) {
                setModal({
                    icon: '⚠️',
                    title: 'Payment Unavailable',
                    message: 'Razorpay API key is pending. Payment will be enabled once the client provides the key.',
                    buttons: [{ text: 'OK', onPress: () => setModal(null) }],
                });
                return;
            }

            // Open Razorpay standard checkout in external browser
            const checkoutUrl =
                `https://api.razorpay.com/v1/checkout/embedded` +
                `?key_id=${RAZORPAY_KEY}` +
                `&order_id=${orderId}` +
                `&name=Sakhi` +
                `&description=Ride+Subscription` +
                `&prefill[name]=${encodeURIComponent(user?.name || '')}` +
                `&prefill[email]=${encodeURIComponent(user?.email || '')}` +
                `&prefill[contact]=${encodeURIComponent(user?.phone || '')}` +
                `&theme[color]=%23BEA3D8` +
                `&callback_url=sakhiapp://payment-success` +
                `&cancel_url=sakhiapp://payment-cancel`;

            await Linking.openURL(checkoutUrl);

        } catch (err) {
            const msg = err?.response?.data?.error?.message || err.message || 'Payment initiation failed.';
            setModal({
                icon: '❌',
                title: 'Payment Failed',
                message: msg,
                buttons: [{ text: 'OK', onPress: () => setModal(null) }],
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Top Navigation Bar */}
            <View style={styles.topNav}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>

                <View style={styles.headerTitles}>
                    <Text style={styles.title}>Complete Payment</Text>
                </View>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
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
                    <Text style={styles.policyIcon}>ⓘ</Text>
                    <Text style={styles.policyText}>
                        Subscriptions cannot be cancelled within 7 days of starting your plan.
                    </Text>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Footer Action Button */}
            <View style={styles.footerOverlay}>
                <TouchableOpacity
                    style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                    onPress={handlePay}
                    disabled={loading}
                    activeOpacity={0.88}
                >
                    {loading
                        ? <ActivityIndicator color="#FFFFFF" />
                        : <Text style={styles.submitText}>Proceed to Pay ₹{sub.price || 364}</Text>
                    }
                </TouchableOpacity>
            </View>

            <SakhiModal config={modal} onClose={() => setModal(null)} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0FF' },

    topNav: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: Platform.OS === 'ios' ? 108 : ANDROID_STATUS_BAR_HEIGHT + 56,
        paddingTop: Platform.OS === 'ios' ? 44 : ANDROID_STATUS_BAR_HEIGHT + 8,
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
        paddingTop: Platform.OS === 'ios' ? 124 : ANDROID_STATUS_BAR_HEIGHT + 64,
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
        height: Platform.OS === 'ios' ? 120 : 104,
        paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 24,
        paddingTop: 16,
        backgroundColor: 'rgba(245, 240, 255, 0.8)',
        justifyContent: 'flex-end',
    },
    submitBtn: {
        width: '100%', height: 56, backgroundColor: '#BEA3D8', borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 32, elevation: 8,
    },
    submitText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
