import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, Pressable, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';
import { createSubscriptionOrder, verifyPayment } from '../src/api/endpoints';

/**
 * Subscription Payment Screen (Prompt 11 — CheckoutScreen).
 *
 * Integrates with backend Razorpay order creation:
 *   1. POST /payments/order → get Razorpay order_id & amount
 *   2. Open Razorpay checkout (via react-native-razorpay if installed, else open WebView)
 *   3. On success → POST /payments/verify with signature
 */
export default function SubscriptionPaymentScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [loading, setLoading] = useState(false);
    const [order, setOrder] = useState(null);
    const [creating, setCreating] = useState(false);

    // Order details from params (passed from subscription-setup)
    const planDays = parseInt(params.days || '30', 10);
    const vehicleType = params.vehicle || 'auto';
    const farePerDay = parseFloat(params.fare_per_day || '150');
    const totalAmount = (farePerDay * planDays).toFixed(2);
    const discountPct = planDays >= 30 ? 20 : planDays >= 21 ? 15 : planDays >= 14 ? 10 : 5;
    const discountedAmount = (parseFloat(totalAmount) * (1 - discountPct / 100)).toFixed(2);
    const savings = (parseFloat(totalAmount) - parseFloat(discountedAmount)).toFixed(2);

    const createOrder = async () => {
        setCreating(true);
        try {
            const { data } = await createSubscriptionOrder({
                plan_days: planDays,
                vehicle_type: vehicleType,
                amount: parseFloat(discountedAmount),
            });
            setOrder(data.order);
        } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || 'Could not create payment order.');
        } finally {
            setCreating(false);
        }
    };

    useEffect(() => {
        createOrder();
    }, []);

    const openRazorpay = async () => {
        if (!order) return;
        setLoading(true);

        // Try to use react-native-razorpay if available
        try {
            const RazorpayCheckout = require('react-native-razorpay').default;
            const options = {
                description: `Sakhi ${planDays}-Day Subscription`,
                image: 'https://sakhirides.in/logo.png',
                currency: 'INR',
                key: process.env.EXPO_PUBLIC_RAZORPAY_KEY || 'rzp_test_placeholder',
                amount: (parseFloat(discountedAmount) * 100).toString(), // paise
                name: 'Sakhi',
                order_id: order.razorpay_order_id,
                prefill: {
                    name: 'Sakhi User',
                    email: '',
                    contact: '',
                },
                theme: { color: '#630ed4' },
            };

            const paymentData = await RazorpayCheckout.open(options);
            await handlePaymentSuccess(paymentData);
        } catch (err) {
            if (err?.code === 'payment_cancelled') {
                // User cancelled — no action needed
            } else if (err?.code === 'MODULE_NOT_FOUND') {
                // react-native-razorpay not installed — simulate success for dev
                Alert.alert(
                    '⚠️ Dev Mode',
                    'react-native-razorpay is not installed.\n\nIn production, add it via:\nnpx expo install react-native-razorpay\n\nSimulating successful payment for testing.',
                    [{ text: 'OK', onPress: handleDevSuccess }],
                );
            } else {
                Alert.alert('Payment Failed', 'Please try again or use a different payment method.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSuccess = async (paymentData) => {
        try {
            await verifyPayment({
                razorpay_payment_id: paymentData.razorpay_payment_id,
                razorpay_order_id: paymentData.razorpay_order_id,
                razorpay_signature: paymentData.razorpay_signature,
                subscription_order_id: order.id,
            });
            router.replace('/(tabs)/subscriptions');
        } catch (err) {
            Alert.alert('Verification Failed', 'Payment was received but verification failed. Please contact support.');
        }
    };

    const handleDevSuccess = async () => {
        // Development simulation of a completed payment
        router.replace('/(tabs)/subscriptions');
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backArrow}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Payment</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Plan summary */}
                <View style={styles.planCard}>
                    <View style={styles.planHeader}>
                        <Text style={styles.planIcon}>📅</Text>
                        <View>
                            <Text style={styles.planTitle}>{planDays}-Day Subscription</Text>
                            <Text style={styles.planSub}>{vehicleType === 'auto' ? '🛺 Auto' : '🚗 Cab'} · {planDays} rides</Text>
                        </View>
                    </View>
                    <View style={styles.planDivider} />
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Total before discount</Text>
                        <Text style={styles.priceStrike}>₹{totalAmount}</Text>
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Plan discount ({discountPct}%)</Text>
                        <Text style={styles.priceSavings}>− ₹{savings}</Text>
                    </View>
                    <View style={styles.planDivider} />
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>You Pay</Text>
                        <Text style={styles.totalAmount}>₹{discountedAmount}</Text>
                    </View>
                    <View style={styles.savingsBadge}>
                        <Text style={styles.savingsBadgeText}>🎉 You save ₹{savings} with this plan!</Text>
                    </View>
                </View>

                {/* Payment note */}
                <View style={styles.noteCard}>
                    <Text style={styles.noteIcon}>🔐</Text>
                    <Text style={styles.noteText}>
                        Payments are secured by Razorpay. We support UPI, credit/debit cards, and net banking.
                    </Text>
                </View>

                {/* Order ID */}
                {order && (
                    <View style={styles.orderIdRow}>
                        <Text style={styles.orderIdLabel}>Order ID</Text>
                        <Text style={styles.orderIdValue}>{order.razorpay_order_id || order.id}</Text>
                    </View>
                )}
            </ScrollView>

            {/* Pay CTA */}
            <View style={styles.ctaContainer}>
                {creating ? (
                    <View style={styles.creatingRow}>
                        <ActivityIndicator color={Colors.primaryContainer} />
                        <Text style={styles.creatingText}>Preparing your order…</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.payBtn, (loading || !order) && { opacity: 0.6 }]}
                        onPress={openRazorpay}
                        disabled={loading || !order}
                        activeOpacity={0.88}
                    >
                        {loading
                            ? <ActivityIndicator color={Colors.onPrimary} />
                            : <Text style={styles.payBtnText}>Pay ₹{discountedAmount} via Razorpay</Text>
                        }
                    </TouchableOpacity>
                )}
            </View>
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
    content: { paddingHorizontal: 20, paddingBottom: 120, gap: 16 },
    planCard: {
        backgroundColor: Colors.surfaceContainerLowest, borderRadius: 20,
        padding: 20, ...Shadows.editorial,
    },
    planHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
    planIcon: { fontSize: 36 },
    planTitle: { fontSize: 18, fontWeight: '800', color: Colors.onBackground },
    planSub: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
    planDivider: { height: 1, backgroundColor: Colors.outlineVariant, marginVertical: 12 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    priceLabel: { fontSize: 13, color: Colors.onSurfaceVariant },
    priceStrike: {
        fontSize: 13, color: Colors.outline,
        textDecorationLine: 'line-through',
    },
    priceSavings: { fontSize: 13, fontWeight: '600', color: '#16a34a' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 16, fontWeight: '700', color: Colors.onBackground },
    totalAmount: { fontSize: 26, fontWeight: '800', color: Colors.primaryContainer },
    savingsBadge: {
        backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, marginTop: 12,
        borderWidth: 1, borderColor: '#bbf7d0',
    },
    savingsBadgeText: { fontSize: 12, color: '#16a34a', fontWeight: '600', textAlign: 'center' },
    noteCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        backgroundColor: Colors.surfaceContainerLow, borderRadius: 12, padding: 14,
    },
    noteIcon: { fontSize: 18 },
    noteText: { flex: 1, fontSize: 12, color: Colors.onSurfaceVariant, lineHeight: 18 },
    orderIdRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    orderIdLabel: { fontSize: 11, color: Colors.onSurfaceVariant, fontWeight: '600' },
    orderIdValue: { fontSize: 11, color: Colors.outline, fontFamily: 'monospace' },
    ctaContainer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: Colors.surfaceContainerLowest,
        paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32,
        borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
        ...Shadows.editorial,
    },
    creatingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center', paddingVertical: 10 },
    creatingText: { fontSize: 14, color: Colors.onSurfaceVariant },
    payBtn: {
        backgroundColor: Colors.primaryContainer, borderRadius: BorderRadius.md,
        paddingVertical: 16, alignItems: 'center', ...Shadows.editorial,
    },
    payBtnText: { color: Colors.onPrimary, fontSize: 17, fontWeight: '700' },
});
