import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import PhonePePaymentSdk from 'react-native-phonepe-pg';
import SakhiModal from '../src/components/SakhiModal';
import { createCancellationFineOrder, verifyCancellationFine } from '../src/api/endpoints';
import { ANDROID_STATUS_BAR_HEIGHT } from '../src/utils/androidUtils';

const PHONEPE_ENV       = 'PRODUCTION';
const PHONEPE_CLIENT_ID = 'SU2605301736448889015067';
const FINE_AMOUNT       = 20;

export default function CancellationFineScreen() {
    const router  = useRouter();
    const insets  = useSafeAreaInsets();
    const [loading, setLoading]   = useState(false);
    const [sdkReady, setSdkReady] = useState(false);
    const [modal, setModal]       = useState(null);

    const topInset = Platform.OS === 'ios' ? insets.top : ANDROID_STATUS_BAR_HEIGHT;
    const topNavHeight = topInset + (Platform.OS === 'ios' ? 64 : 56);
    const footerPadding = Math.max(insets.bottom, 24);

    // ── Init PhonePe SDK ────────────────────────────────────────────────────
    useEffect(() => {
        PhonePePaymentSdk.init(PHONEPE_ENV, PHONEPE_CLIENT_ID, '', false)
            .then(() => setSdkReady(true))
            .catch(() => setSdkReady(false));
    }, []);

    // ── Pay fine via PhonePe ────────────────────────────────────────────────
    const handlePayFine = async () => {
        setLoading(true);
        try {
            // Step 1: Get PhonePe order token from backend
            const { data } = await createCancellationFineOrder();
            const { transaction_id, base64_payload } = data;

            if (!transaction_id || !base64_payload) {
                throw new Error('Failed to create payment order. Please try again.');
            }

            if (!sdkReady) {
                throw new Error('PhonePe is not available. Please update the app.');
            }

            // Step 2: Launch PhonePe SDK
            const response = await PhonePePaymentSdk.startTransaction(
                base64_payload,
                Platform.OS === 'ios' ? 'sakhi' : null
            );

            if (response?.status === 'SUCCESS' || response?.code === 'PAYMENT_SUCCESS') {
                // Step 3: Verify with backend + clear fine flag
                await verifyCancellationFine(transaction_id);

                setModal({
                    icon: '✅',
                    title: 'Fine Paid!',
                    message: 'Your ₹20 cancellation fine has been paid. You can now book rides again.',
                    buttons: [{
                        text: 'Book a Ride',
                        onPress: () => { setModal(null); router.replace('/(tabs)/'); },
                    }],
                });
            } else if (
                response?.status === 'INTERRUPTED' ||
                response?.status === 'CANCELLED' ||
                response?.error?.toLowerCase?.().includes('cancel')
            ) {
                // User dismissed — do nothing
                setLoading(false);
            } else {
                throw new Error(response?.error || 'Payment was not successful. Please try again.');
            }
        } catch (err) {
            if (
                err?.code === 0 ||
                err?.message?.toLowerCase?.().includes('cancel') ||
                err?.message?.toLowerCase?.().includes('dismiss')
            ) {
                setLoading(false);
                return;
            }
            const msg = err?.response?.data?.error?.message || err?.message || 'Payment failed.';
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
            {/* Top Nav */}
            <View style={[styles.topNav, { height: topNavHeight, paddingTop: topInset + 12 }]}>
                <TouchableOpacity
                    onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/')}
                    style={styles.backBtn}
                    activeOpacity={0.7}
                >
                    <Feather name="x" size={22} color="#BEA3D8" />
                </TouchableOpacity>
                <Text style={styles.navTitle}>Cancellation Fine</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Content */}
            <View style={[styles.content, { paddingTop: topNavHeight + 32 }]}>

                {/* Warning Icon Badge */}
                <View style={styles.iconWrap}>
                    <View style={styles.iconPulse1} />
                    <View style={styles.iconPulse2} />
                    <View style={styles.iconCircle}>
                        <Feather name="alert-triangle" size={36} color="#F59E0B" />
                    </View>
                </View>

                {/* Heading */}
                <Text style={styles.title}>Ride Cancellation Fine</Text>
                <Text style={styles.subtitle}>
                    You have cancelled 3 rides in a row. A cancellation fine has been applied
                    as per our policy — similar to Ola & Uber.
                </Text>

                {/* Fine Card */}
                <View style={styles.fineCard}>
                    <View style={styles.fineRow}>
                        <View>
                            <Text style={styles.fineLabel}>Cancellation Fine</Text>
                            <Text style={styles.fineSub}>3 consecutive cancellations</Text>
                        </View>
                        <Text style={styles.fineAmount}>₹{FINE_AMOUNT}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.fineRow}>
                        <Text style={styles.totalLabel}>Total Due</Text>
                        <Text style={styles.totalAmount}>₹{FINE_AMOUNT}</Text>
                    </View>
                </View>

                {/* Policy Note */}
                <View style={styles.policyNote}>
                    <Feather name="info" size={14} color="#BEA3D8" style={{ marginTop: 2 }} />
                    <Text style={styles.policyText}>
                        This fine resets your cancellation counter. Please be considerate of
                        your Sakhi drivers — frequent cancellations affect their earnings.
                    </Text>
                </View>
            </View>

            {/* Footer Pay Button */}
            <View style={[styles.footer, { paddingBottom: footerPadding }]}>
                <TouchableOpacity
                    style={[styles.payBtn, loading && { opacity: 0.7 }]}
                    onPress={handlePayFine}
                    disabled={loading}
                    activeOpacity={0.88}
                    id="pay-fine-btn"
                >
                    {loading
                        ? <ActivityIndicator color="#FFF" />
                        : (
                            <View style={styles.payBtnContent}>
                                <Feather name="smartphone" size={18} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={styles.payBtnText}>Pay ₹{FINE_AMOUNT} via PhonePe</Text>
                            </View>
                        )
                    }
                </TouchableOpacity>

                <View style={styles.securedRow}>
                    <Feather name="lock" size={11} color="#94A3B8" />
                    <Text style={styles.securedText}>Secured by PhonePe · 256-bit encryption</Text>
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
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'rgba(245, 240, 255, 0.95)',
        zIndex: 10,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    navTitle: { fontSize: 17, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.4 },

    content: {
        flex: 1,
        paddingHorizontal: 24,
        alignItems: 'center',
    },

    // Warning icon
    iconWrap: {
        width: 120, height: 120,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 28,
        position: 'relative',
    },
    iconPulse1: {
        position: 'absolute',
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
    },
    iconPulse2: {
        position: 'absolute',
        width: 88, height: 88, borderRadius: 44,
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
    },
    iconCircle: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: '#FEF3C7',
        borderWidth: 2, borderColor: '#FDE68A',
        alignItems: 'center', justifyContent: 'center',
    },

    title: {
        fontSize: 24, fontWeight: '800', color: '#1E1B2E',
        letterSpacing: -0.6, textAlign: 'center', marginBottom: 12,
    },
    subtitle: {
        fontSize: 14, fontWeight: '400', color: '#64748B',
        lineHeight: 22, textAlign: 'center', marginBottom: 32,
        paddingHorizontal: 8,
    },

    // Fine card
    fineCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 6,
    },
    fineRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    fineLabel: { fontSize: 15, fontWeight: '600', color: '#1E1B2E' },
    fineSub:   { fontSize: 12, fontWeight: '400', color: '#94A3B8', marginTop: 2 },
    fineAmount:{ fontSize: 18, fontWeight: '700', color: '#F59E0B' },
    divider:   { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
    totalLabel:{ fontSize: 16, fontWeight: '700', color: '#1E1B2E' },
    totalAmount:{ fontSize: 22, fontWeight: '800', color: '#BEA3D8' },

    // Policy note
    policyNote: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        backgroundColor: '#EDE9FE', borderRadius: 12, padding: 14,
        width: '100%',
    },
    policyText: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 18 },

    // Footer
    footer: {
        paddingHorizontal: 24, paddingTop: 16,
        backgroundColor: 'rgba(245, 240, 255, 0.95)',
        borderTopWidth: 1, borderTopColor: 'rgba(190, 163, 216, 0.2)',
        gap: 12,
    },
    payBtn: {
        width: '100%', height: 56,
        backgroundColor: '#5A2D82',
        borderRadius: 14, alignItems: 'center', justifyContent: 'center',
        shadowColor: '#5A2D82',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3, shadowRadius: 20, elevation: 8,
    },
    payBtnContent: { flexDirection: 'row', alignItems: 'center' },
    payBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
    securedRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    },
    securedText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
});
