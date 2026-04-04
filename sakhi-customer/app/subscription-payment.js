import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, ScrollView, Platform, TextInput, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRide } from '../src/context/RideContext';
import SakhiModal from '../src/components/SakhiModal';
import RazorpayCheckout from 'react-native-razorpay';

const { width } = Dimensions.get('window');

export default function SubscriptionPaymentScreen() {
    const router = useRouter();
    const { ride } = useRide();
    const sub = ride.subscription || {};
    
    const [modal, setModal] = useState(null);

    const pickupName = ride?.pickup?.address?.split(',')[0] || 'Pickup';
    const dropoffName = ride?.dropoff?.address?.split(',')[0] || 'Drop';
    
    // Formatting days: 'Mon' and 'Fri' -> 'Mon–Fri' gracefully
    const daysRange = sub.days?.length > 3 
        ? `${sub.days[0]}–${sub.days[sub.days.length - 1]}` 
        : (sub.days?.join(', ') || 'Mon–Fri');

    const handlePay = () => {        const priceInPaise = (sub.price || 364) * 100;
        const options = {
            description: 'Sakhi Ride Subscription',
            image: 'https://cdn-icons-png.flaticon.com/512/3209/3209935.png', // Default icon for Razorpay checkout, can be changed later
            currency: 'INR',
            key: process.env.EXPO_PUBLIC_RAZORPAY_KEY?.startsWith('rzp_') ? process.env.EXPO_PUBLIC_RAZORPAY_KEY : 'rzp_test_1DP5mmOlF5G5ag',
            amount: priceInPaise,
            name: 'Sakhi',
            prefill: {
                // In production, dynamically grab these from the global user state
                email: 'customer@example.com',
                contact: '9191919191',
                name: 'Sakhi User'
            },
            theme: { color: '#BEA3D8' }
        };

        RazorpayCheckout.open(options).then((data) => {
            // Success
            // Server verification using data.razorpay_payment_id can be done here implicitly or safely on the backend
            router.replace('/payment-success');
        }).catch((error) => {
            // Failure
            setModal({
                icon: '❌',
                title: 'Payment Failed',
                message: error.description || 'The payment was cancelled or failed.',
                buttons: [{ text: 'OK', onPress: () => setModal(null) }]
            });
        });
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
                            <Text style={styles.specValue}>{sub.startDate || '15 March 2026'}</Text>
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

                {/* Removed Custom Payment UI - Razorpay completely takes over this logic naturally! */}
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
                <TouchableOpacity style={styles.submitBtn} onPress={handlePay}>
                    <Text style={styles.submitText}>Proceed to Pay ₹{sub.price || 364}</Text>
                </TouchableOpacity>
            </View>



            <SakhiModal config={modal} onClose={() => setModal(null)} />
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
        height: Platform.OS === 'ios' ? 108 : 64,
        paddingTop: Platform.OS === 'ios' ? 44 : 0,
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
        paddingTop: Platform.OS === 'ios' ? 124 : 88,
        paddingHorizontal: 20,
    },

    // Order Summary Card
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


    // Policy Note
    policyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#EDE9FE', borderRadius: 12, padding: 16 },
    policyIcon: { fontSize: 16, color: '#BEA3D8', marginTop: 2 },
    policyText: { flex: 1, fontSize: 12, fontWeight: '400', color: '#6B7280', lineHeight: 20 },

    // Footer overlay
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

    // Modal Styles
    modalOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(30, 27, 46, 0.6)',
        justifyContent: 'center', alignItems: 'center', zIndex: 100,
        paddingHorizontal: 24
    },
    modalCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 24,
    },
    modalBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    razorpayLogo: { backgroundColor: '#2563EB', width: 24, height: 24, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
    razorpayR: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
    modalBrandText: { fontSize: 14, fontWeight: '700', color: '#1E1B2E' },
    modalAmountCol: { alignItems: 'flex-end' },
    modalAmountLabel: { fontSize: 10, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' },
    modalAmountValue: { fontSize: 24, fontWeight: '800', color: '#1E1B2E' },
    
    modalDivider: { height: 1, backgroundColor: '#F5F0FF' },
    
    modalBody: {
        alignItems: 'center',
        paddingVertical: 40, paddingHorizontal: 24,
    },
    spinnerRing: {
        width: 80, height: 80, borderRadius: 40,
        borderWidth: 3, borderColor: '#EADDFF',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 24
    },
    modalStatus: { fontSize: 18, fontWeight: '700', color: '#1E1B2E', marginBottom: 12 },
    modalSub: { fontSize: 14, fontWeight: '400', color: '#6B7280', textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
    
    modalFooter: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: '#F5F0FF',
        paddingVertical: 16
    },
    shieldIcon: { fontSize: 14 },
    securedText: { fontSize: 10, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5 },

});
