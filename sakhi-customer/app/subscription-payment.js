import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, ScrollView, Platform, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRide } from '../src/context/RideContext';

const { width } = Dimensions.get('window');

export default function SubscriptionPaymentScreen() {
    const router = useRouter();
    const { ride } = useRide();
    const sub = ride.subscription || {};
    
    const [selectedMethod, setSelectedMethod] = useState('UPI'); 
    const [upiId, setUpiId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const pickupName = ride?.pickup?.address?.split(',')[0] || 'Pickup';
    const dropoffName = ride?.dropoff?.address?.split(',')[0] || 'Drop';
    
    // Formatting days: 'Mon' and 'Fri' -> 'Mon–Fri' gracefully
    const daysRange = sub.days?.length > 3 
        ? `${sub.days[0]}–${sub.days[sub.days.length - 1]}` 
        : (sub.days?.join(', ') || 'Mon–Fri');

    const handlePay = () => {
        if (selectedMethod === 'UPI' && upiId.trim() === '') {
            Alert.alert('UPI ID Required', 'Please enter your UPI ID to verify and proceed.');
            return;
        }
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
            router.replace('/payment-success');
        }, 3000); // Simulate API call and payment processing wait
    };

    return (
        <View style={styles.container}>
            {/* Top Navigation Bar */}
            <View style={styles.topNav}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
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

                {/* Payment Methods */}
                <View style={styles.paymentSection}>
                    <Text style={styles.sectionHeader}>PAY VIA</Text>

                    {/* UPI Option */}
                    <View style={[styles.payMethodCard, selectedMethod === 'UPI' && styles.payMethodCardActive]}>
                        <TouchableOpacity 
                            style={styles.payMethodRow}
                            onPress={() => setSelectedMethod('UPI')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.payMethodLeft}>
                                <View style={selectedMethod === 'UPI' ? styles.radioSelected : styles.radioUnselected}>
                                    {selectedMethod === 'UPI' && <View style={styles.radioInner} />}
                                </View>
                                <Text style={styles.payMethodTitle}>UPI (PhonePe/GPay)</Text>
                            </View>
                            <Text style={styles.minusIcon}>-</Text>
                        </TouchableOpacity>

                        {/* Expanded UPI State */}
                        {selectedMethod === 'UPI' && (
                            <View style={styles.upiInputRow}>
                                <View style={styles.upiInputBox}>
                                    <TextInput 
                                        style={styles.upiInput}
                                        placeholder="Enter UPI ID"
                                        placeholderTextColor="rgba(107, 114, 128, 0.5)"
                                        value={upiId}
                                        onChangeText={setUpiId}
                                        autoCapitalize="none"
                                    />
                                </View>
                                <TouchableOpacity style={styles.verifyBtn} onPress={() => {
                                    if (!upiId.includes('@')) {
                                        Alert.alert('Invalid UPI ID', 'UPI ID must contain @. Example: name@upi');
                                    } else {
                                        Alert.alert('UPI Verified ✅', `${upiId} is valid and ready for payment.`);
                                    }
                                }}>
                                    <Text style={styles.verifyText}>Verify</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Debit/Credit Card */}
                    <TouchableOpacity 
                        style={styles.payMethodCardFlat}
                        onPress={() => setSelectedMethod('CARD')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.payMethodLeft}>
                            <View style={selectedMethod === 'CARD' ? styles.radioSelected : styles.radioUnselected}>
                                {selectedMethod === 'CARD' && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.payMethodTitle}>Debit/Credit Card</Text>
                        </View>
                        <Text style={styles.cardIcon}>💳</Text>
                    </TouchableOpacity>

                    {/* Net Banking */}
                    <TouchableOpacity 
                        style={styles.payMethodCardFlat}
                        onPress={() => setSelectedMethod('NET')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.payMethodLeft}>
                            <View style={selectedMethod === 'NET' ? styles.radioSelected : styles.radioUnselected}>
                                {selectedMethod === 'NET' && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.payMethodTitle}>Net Banking</Text>
                        </View>
                        <Text style={styles.bankIcon}>🏦</Text>
                    </TouchableOpacity>
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
                <TouchableOpacity style={styles.submitBtn} onPress={handlePay}>
                    <Text style={styles.submitText}>Pay ₹{sub.price || 364} & Confirm</Text>
                </TouchableOpacity>
            </View>

            {/* Processing Payment Overlay */}
            {isProcessing && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalBrand}>
                                <View style={styles.razorpayLogo}>
                                    <Text style={styles.razorpayR}>R</Text>
                                </View>
                                <Text style={styles.modalBrandText}>Sakhi</Text>
                            </View>
                            <View style={styles.modalAmountCol}>
                                <Text style={styles.modalAmountLabel}>AMOUNT DUE</Text>
                                <Text style={styles.modalAmountValue}>₹{sub.price || 364}</Text>
                            </View>
                        </View>
                        
                        <View style={styles.modalDivider} />

                        {/* Modal Body (Spinner) */}
                        <View style={styles.modalBody}>
                            <View style={styles.spinnerRing}>
                                <ActivityIndicator size="large" color="#BEA3D8" />
                            </View>
                            <Text style={styles.modalStatus}>Processing Payment...</Text>
                            <Text style={styles.modalSub}>Please do not close the app or press the back button.</Text>
                        </View>

                        {/* Modal Footer */}
                        <View style={styles.modalFooter}>
                            <Text style={styles.shieldIcon}>🛡️</Text>
                            <Text style={styles.securedText}>SECURED BY RAZORPAY</Text>
                        </View>
                    </View>
                </View>
            )}

        </View>
    );
}

const styles = StyleSheet.create({
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

    // Payment Methods Section
    paymentSection: { gap: 16, marginBottom: 24 },
    sectionHeader: { fontSize: 10, fontWeight: '700', color: '#6B7280', letterSpacing: 0.8, textTransform: 'uppercase' },

    payMethodCard: {
        backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2,
    },
    payMethodCardActive: {
        backgroundColor: '#F5F0FF', borderWidth: 1, borderColor: 'rgba(190, 163, 216, 0.2)',
    },
    payMethodCardFlat: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2,
    },

    payMethodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    payMethodLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    radioUnselected: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#E5E0EF' },
    radioSelected: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#BEA3D8', alignItems: 'center', justifyContent: 'center' },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#BEA3D8' },
    payMethodTitle: { fontSize: 14, fontWeight: '600', color: '#1E1B2E' },
    minusIcon: { fontSize: 16, color: '#6B7280', fontWeight: 'bold' },
    cardIcon: { fontSize: 16, color: '#6B7280' },
    bankIcon: { fontSize: 16, color: '#6B7280' },

    // UPI Expansion 
    upiInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
    upiInputBox: { flex: 1, height: 56, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(190, 163, 216, 0.1)', borderRadius: 8, paddingHorizontal: 12 },
    upiInput: { flex: 1, fontSize: 14, color: '#1E1B2E' },
    verifyBtn: { width: 68, height: 56, backgroundColor: '#BEA3D8', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    verifyText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

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
    modalBrandText: { fontSize: 14, fontWeight: '700', color: '#1C1A25' },
    modalAmountCol: { alignItems: 'flex-end' },
    modalAmountLabel: { fontSize: 10, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' },
    modalAmountValue: { fontSize: 24, fontWeight: '800', color: '#1C1A25' },
    
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
    modalStatus: { fontSize: 18, fontWeight: '700', color: '#1C1A25', marginBottom: 12 },
    modalSub: { fontSize: 14, fontWeight: '400', color: '#6B7280', textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
    
    modalFooter: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: '#F5F0FF',
        paddingVertical: 16
    },
    shieldIcon: { fontSize: 14 },
    securedText: { fontSize: 10, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5 },

});
