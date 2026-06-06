import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, ScrollView, Platform, ActivityIndicator, Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRide } from '../src/context/RideContext';
import { useAuth } from '../src/context/AuthContext';
import SakhiModal from '../src/components/SakhiModal';
import { createSubscriptionOrder } from '../src/api/endpoints';
import apiClient from '../src/api/client';
import { ANDROID_STATUS_BAR_HEIGHT } from '../src/utils/androidUtils';
import PhonePePaymentSdk from 'react-native-phonepe-pg';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// PhonePe Production environment
const PHONEPE_ENV = 'PRODUCTION';
const PHONEPE_CLIENT_ID = 'SU2605301736448889015067'; // used as merchantId in SDK init

export default function SubscriptionPaymentScreen() {
    const router = useRouter();
    const { ride } = useRide();
    const { user } = useAuth();
    const sub = ride.subscription || {};

    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState(null);
    const [intentData, setIntentData] = useState(null);
    const [intentLoading, setIntentLoading] = useState(true);
    const [sdkReady, setSdkReady] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);

    const insets = useSafeAreaInsets();

    const topInset = Platform.OS === 'ios' ? insets.top : ANDROID_STATUS_BAR_HEIGHT;
    const topNavPaddingTop = topInset + (Platform.OS === 'ios' ? 0 : 8);
    const topNavHeight = topInset + (Platform.OS === 'ios' ? 64 : 56);
    const scrollTopPadding = topNavHeight + (Platform.OS === 'ios' ? 16 : 8);

    const footerPaddingBottom = Math.max(insets.bottom, 24) + (Platform.OS === 'ios' ? 10 : 0);
    const footerSpacerHeight = 56 + 16 + footerPaddingBottom + 64 + 24;

    const pickupName = ride?.pickup?.address?.split(',')[0] || 'Pickup';
    const dropoffName = ride?.dropoff?.address?.split(',')[0] || 'Drop';

    const daysRange = sub.days?.length > 3
        ? `${sub.days[0]}–${sub.days[sub.days.length - 1]}`
        : (sub.days?.join(', ') || 'Mon–Fri');

    // ── Initialize PhonePe SDK ───────────────────────────────────────────────
    useEffect(() => {
        const initSdk = async () => {
            try {
                await PhonePePaymentSdk.init(
                    PHONEPE_ENV,         // 'PRODUCTION'
                    PHONEPE_CLIENT_ID,   // merchant/client ID
                    user?.id ? String(user.id) : 'sakhi_payment_flow', // flowId — required by latest SDK
                    false                // enableLogging (set true for debug builds only)
                );
                setSdkReady(true);
            } catch (err) {
                console.warn('PhonePe SDK init error:', err);
                // Non-fatal — we can still try without the SDK
                setSdkReady(false);
            }
        };
        initSdk();
    }, []);

    // ── Fetch subscription intent (pricing) ─────────────────────────────────
    useEffect(() => {
        const createIntent = async () => {
            try {
                const dayToInt = {
                    'Sun': 0,
                    'Mon': 1,
                    'Tue': 2,
                    'Wed': 3,
                    'Thu': 4,
                    'Fri': 5,
                    'Sat': 6
                };

                const formatTime24 = (timeStr) => {
                    if (!timeStr) return '';
                    const [time, period] = timeStr.split(' ');
                    if (!time || !period) return '';
                    let [h, m] = time.split(':').map(Number);
                    if (period === 'PM' && h !== 12) h += 12;
                    if (period === 'AM' && h === 12) h = 0;
                    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                };

                const formatDateYMD = (dateStr) => {
                    if (!dateStr) return '';
                    // Hermes engine fails on new Date("Jun 03, 2026"), so parse manually
                    const parts = dateStr.replace(',', '').split(' ');
                    if (parts.length === 3) {
                        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        const mIndex = months.indexOf(parts[0]);
                        if (mIndex !== -1) {
                            const y = parts[2];
                            const m = String(mIndex + 1).padStart(2, '0');
                            const day = String(parts[1]).padStart(2, '0');
                            return `${y}-${m}-${day}`;
                        }
                    }
                    return '';
                };

                const payload = {
                    pickup_lat: parseFloat(ride?.pickup?.latitude),
                    pickup_lng: parseFloat(ride?.pickup?.longitude),
                    pickup_address: ride?.pickup?.address,
                    drop_lat: parseFloat(ride?.dropoff?.latitude),
                    drop_lng: parseFloat(ride?.dropoff?.longitude),
                    drop_address: ride?.dropoff?.address,
                    pickup_time: formatTime24(sub.morningTime),
                    return_pickup_time: sub.isTwoWay ? formatTime24(sub.returnTime) : undefined,
                    start_date: formatDateYMD(sub.startDate),
                    plan_rides: parseInt(sub.plan),
                    days_of_week: (sub.days || []).map(d => dayToInt[d]).filter(v => v !== undefined),
                    is_two_way: !!sub.isTwoWay,
                };

                const { data } = await apiClient.post('/subscriptions/intent', payload);
                setIntentData(data);
            } catch (err) {
                let msg = err?.response?.data?.error?.message || err?.message || 'Could not fetch ride estimate.';

                // If there are detailed validation errors from Zod, append them so we can see what's wrong!
                const details = err?.response?.data?.error?.details;
                if (details && details.fieldErrors) {
                    msg += '\n\n' + JSON.stringify(details.fieldErrors, null, 2);
                }

                setModal({
                    icon: '⚠️',
                    title: 'Subscription Error',
                    message: msg,
                    buttons: [{ text: 'Go Back', onPress: () => { setModal(null); router.back(); } }]
                });
            } finally {
                setIntentLoading(false);
            }
        };

        if (ride?.pickup && ride?.dropoff && sub.plan) {
            createIntent();
        } else {
            setIntentLoading(false);
        }
    }, [ride, sub]);

    // App packages for Android targetApp checks
    const UPI_APPS = {
        'PhonePe': 'com.phonepe.app',
        'GPay': 'com.google.android.apps.nbu.paisa.user',
        'Paytm': 'net.one97.paytm',
        'BHIM': 'in.org.npci.upiapp',
    };

    // ── Handle Pay ───────────────────────────────────────────────────────────
    const handlePay = async (methodLabel = 'PhonePe') => {
        if (!intentData?.subscription_id) {
            setModal({
                icon: '⚠️',
                title: 'Error',
                message: 'No active subscription intent found. Please try again.',
                buttons: [{ text: 'OK', onPress: () => setModal(null) }],
            });
            return;
        }

        setLoading(true);

        // --- App Installation Check for Native intents ---
        let paymentMode = 'UPI_INTENT';
        let targetApp = UPI_APPS[methodLabel];

        if (methodLabel === 'Pay using Gateway') {
            paymentMode = 'PAY_PAGE';
            targetApp = undefined;
        } else if (Platform.OS === 'android' && sdkReady) {
            try {
                const appsJson = await PhonePePaymentSdk.getUpiAppsForAndroid();
                if (appsJson && typeof appsJson === 'string') {
                    const installedApps = JSON.parse(appsJson);
                    const isInstalled = installedApps.some(a => a.packageName === targetApp);
                    if (!isInstalled) {
                        setLoading(false);
                        setModal({
                            icon: '⚠️',
                            title: 'App Not Installed',
                            message: `Please install ${methodLabel} to pay using that.`,
                            buttons: [{ text: 'OK', onPress: () => setModal(null) }],
                        });
                        return;
                    }
                }
            } catch (err) {
                console.warn('[PhonePe] Could not fetch installed apps:', err);
                // Proceed optimistically
            }
        }

        try {
            // Step 1: Create PhonePe order via backend (returns token + base64_payload)
            const { data } = await createSubscriptionOrder({
                amount: intentData.total_cost,  // INR
                subscription_id_temp: intentData.subscription_id,
                paymentMode,
                targetApp,
            });

            const { transaction_id, sdk_payload, base64_payload } = data;
            // sdk_payload is raw JSON string — the native iOS SDK parses it directly with JSONSerialization
            // base64_payload is kept as fallback
            const requestPayload = sdk_payload || base64_payload;
            if (!transaction_id || !requestPayload) {
                throw new Error('Failed to create payment order. Please try again.');
            }

            // Step 2: Launch PhonePe native SDK checkout
            let transactionSuccess = false;

            if (sdkReady && requestPayload) {
                try {
                    // Native iOS SDK parses request as raw JSON string (not base64)
                    // sdk_payload = JSON string: { orderId, merchantId, token, paymentMode }
                    const response = await PhonePePaymentSdk.startTransaction(
                        requestPayload,
                        Platform.OS === 'ios' ? 'sakhi' : null
                    );

                    // SDK returns: { status: 'SUCCESS'|'FAILURE'|'INTERRUPTED', error?: string }
                    if (response?.status === 'SUCCESS' || response?.code === 'PAYMENT_SUCCESS') {
                        transactionSuccess = true;
                    } else if (
                        response?.status === 'INTERRUPTED' ||
                        response?.status === 'CANCELLED' ||
                        response?.error?.toLowerCase?.().includes('cancel')
                    ) {
                        // User cancelled — silently exit, let them try again
                        return;
                    } else if (response?.status === 'FAILURE') {
                        // Explicit payment failure — show user-friendly message
                        const failMsg = _friendlyPhonePeError(response?.error);
                        throw new Error(failMsg);
                    } else {
                        throw new Error(_friendlyPhonePeError(response?.error || response?.message) || 'Payment was not completed. Please try again.');
                    }
                } catch (sdkErr) {
                    // Silently handle user-cancelled cases
                    if (
                        sdkErr?.message?.toLowerCase?.().includes('cancel') ||
                        sdkErr?.message?.toLowerCase?.().includes('dismiss')
                    ) {
                        setLoading(false);
                        return;
                    }
                    // Re-throw other SDK errors to outer catch
                    throw sdkErr;
                }
            } else {
                throw new Error('PhonePe SDK is not available. Please update the app and try again.');
            }

            if (transactionSuccess) {
                // Step 3: Verify payment on backend + activate subscription
                try {
                    await apiClient.post(`/subscriptions/${intentData.subscription_id}/activate`, {
                        transaction_id,
                    });
                    // Step 4: Navigate to success screen
                    router.replace('/payment-success');
                } catch (activateErr) {
                    // Payment was captured but activation failed
                    const activateMsg = activateErr?.response?.data?.error?.message
                        || activateErr?.message
                        || 'Payment received but subscription activation failed. Please contact support with your transaction ID: ' + transaction_id;
                    setModal({
                        icon: '⚠️',
                        title: 'Activation Failed',
                        message: activateMsg,
                        buttons: [{ text: 'Contact Support', onPress: () => { setModal(null); router.push('/help-support'); } },
                                  { text: 'OK', style: 'cancel', onPress: () => setModal(null) }],
                    });
                }
            }

        } catch (err) {
            // Silently swallow user cancellation signals
            if (
                err?.code === 0 ||
                err?.message?.toLowerCase?.().includes('cancel') ||
                err?.message?.toLowerCase?.().includes('dismiss')
            ) {
                return;
            }
            const msg = err?.response?.data?.error?.message
                || err?.message
                || 'Payment could not be processed. Please try again.';
            setModal({
                icon: '💳',
                title: 'Payment Failed',
                message: msg,
                buttons: [
                    {
                        text: 'Try Again',
                        style: 'primary',
                        onPress: () => setModal(null),
                    },
                    {
                        text: 'Try Different Method',
                        style: 'cancel',
                        onPress: () => { setModal(null); setSelectedApp(null); },
                    },
                ],
            });
        } finally {
            setLoading(false);
        }
    };

    // Map PhonePe SDK error codes/strings to user-friendly messages
    const _friendlyPhonePeError = (code) => {
        if (!code) return null;
        const c = String(code).toUpperCase();
        if (c.includes('INSUFFICIENT') || c.includes('LOW_BALANCE')) return 'Your bank account has insufficient funds. Please try a different payment method.';
        if (c.includes('BANK_DECLINED') || c.includes('DECLINED')) return 'Your bank declined the payment. Please try again or use a different method.';
        if (c.includes('INVALID_UPI') || c.includes('UPI_ID')) return 'Invalid UPI ID. Please check your UPI details and try again.';
        if (c.includes('LIMIT') || c.includes('EXCEEDED')) return 'Transaction limit exceeded. Please try a smaller amount or contact your bank.';
        if (c.includes('TIMEOUT') || c.includes('TIMED_OUT')) return 'Payment timed out. Please try again.';
        if (c.includes('NETWORK') || c.includes('CONNECTION')) return 'Network error during payment. Please check your connection and try again.';
        if (c.includes('AUTH') || c.includes('AUTHENTICATION')) return 'Authentication failed. Please try again.';
        return 'Payment could not be processed. Please try again or use a different payment method.';
    };

    if (intentLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#BEA3D8" />
                <Text style={{ marginTop: 12, color: '#6B7280', fontSize: 14, fontWeight: '600' }}>
                    Configuring subscription slots...
                </Text>
            </View>
        );
    }

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
                {/* Driver Assignment Banner */}
                {intentData?.driver_info ? (
                    <View style={styles.driverBanner}>
                        <Feather name="shield" size={18} color="#16a34a" />
                        <Text style={styles.driverBannerText}>
                            Dedicated Sakhi: <Text style={{ fontWeight: '700' }}>{intentData.driver_info.name}</Text> is assigned to your schedule.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.driverBanner}>
                        <Feather name="search" size={18} color="#7C3AED" />
                        <Text style={styles.driverBannerText}>
                            We are finding your Sakhi driver. Complete payment to confirm slot.
                        </Text>
                    </View>
                )}

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
                        <Text style={styles.totalAmt}>₹{intentData ? intentData.total_cost : (sub.price || 364)}</Text>
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

                {/* Gateway Box */}
                <TouchableOpacity
                    style={[styles.gatewayBtn, selectedApp === 'Pay using Gateway' && styles.gatewayBtnActive]}
                    onPress={() => setSelectedApp('Pay using Gateway')}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Feather name="credit-card" size={18} color={selectedApp === 'Pay using Gateway' ? '#BEA3D8' : '#94A3B8'} />
                        <Text style={[styles.gatewayBtnText, selectedApp === 'Pay using Gateway' && styles.gatewayBtnTextActive]}>Pay using Gateway</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={selectedApp === 'Pay using Gateway' ? '#BEA3D8' : '#E2E8F0'} />
                </TouchableOpacity>

                {/* OR Divider */}
                <View style={styles.orDividerRow}>
                    <View style={styles.orDividerLine} />
                    <Text style={styles.orDividerText}>OR</Text>
                    <View style={styles.orDividerLine} />
                </View>

                {/* UPI Apps Strip */}
                <View style={styles.upiStrip}>
                    <Text style={styles.upiStripLabel}>Pay directly using</Text>
                    <View style={styles.upiAppRow}>
                        {[
                            { label: 'PhonePe', icon: 'smartphone' },
                            { label: 'GPay', icon: 'smartphone' },
                            { label: 'Paytm', icon: 'smartphone' },
                            { label: 'BHIM', icon: 'smartphone' },
                        ].map((app) => (
                            <TouchableOpacity
                                key={app.label}
                                style={[styles.upiAppBtn, app.label === selectedApp && styles.upiAppBtnActive]}
                                onPress={() => setSelectedApp(app.label)}
                                disabled={loading}
                                activeOpacity={0.75}
                            >
                                <Feather name={app.icon} size={20} color={app.label === selectedApp ? '#BEA3D8' : '#94A3B8'} style={{ marginBottom: 2 }} />
                                <Text style={[styles.upiAppLabel, app.label === selectedApp && styles.upiAppLabelActive]}>{app.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Main Pay Button */}
                <TouchableOpacity
                    style={[styles.submitBtn, (loading || !selectedApp) && { opacity: 0.7 }]}
                    onPress={() => {
                        if (!selectedApp) {
                            setModal({
                                icon: '⚠️',
                                title: 'Select Payment Method',
                                message: 'Please select an app from above to continue.',
                                buttons: [{ text: 'OK', onPress: () => setModal(null) }],
                            });
                            return;
                        }
                        handlePay(selectedApp);
                    }}
                    disabled={loading || !selectedApp}
                    activeOpacity={0.88}
                >
                    {loading
                        ? <ActivityIndicator color="#FFFFFF" />
                        : <Text style={styles.submitText}>
                            {selectedApp ? `Pay ₹${intentData ? intentData.total_cost : (sub.price || 364)} — Open ${selectedApp}` : `Pay ₹${intentData ? intentData.total_cost : (sub.price || 364)}`}
                        </Text>
                    }
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 4 }}>
                    <Feather name="lock" size={11} color="#94A3B8" />
                    <Text style={[styles.securedNote, { paddingBottom: 0 }]}>Secured by PhonePe · 256-bit encryption</Text>
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

    driverBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#F0FDF4',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#DCFCE7',
    },
    driverBannerText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
        color: '#15803D',
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
    gatewayBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 16,
        marginBottom: 4,
    },
    gatewayBtnActive: {
        backgroundColor: '#F3E8FF',
        borderColor: '#BEA3D8',
        borderWidth: 1.5,
    },
    gatewayBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E1B2E',
    },
    gatewayBtnTextActive: {
        color: '#BEA3D8',
    },
    orDividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 8,
    },
    orDividerLine: {
        height: 1,
        backgroundColor: '#E2E8F0',
        flex: 1,
    },
    orDividerText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
    },
    upiStrip: {
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
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
    upiAppBtnActive: {
        backgroundColor: '#F3E8FF',
        borderWidth: 1.5,
        borderColor: '#BEA3D8',
    },
    upiAppEmoji: { fontSize: 20 },
    upiAppLabel: { fontSize: 9, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
    upiAppLabelActive: { color: '#BEA3D8' },

    submitBtn: {
        width: '100%', height: 56, backgroundColor: '#BEA3D8', borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: 'rgba(190, 163, 216, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.25, shadowRadius: 32, elevation: 8,
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
