import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, ScrollView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRide } from '../src/context/RideContext';

const { width } = Dimensions.get('window');

export default function SubscriptionPlansScreen() {
    const router = useRouter();
    const { ride, updateSubscription } = useRide();
    const sub = ride.subscription || {};

    const handleSelectPlan = (plan, price) => {
        updateSubscription({ plan, price });
    };

    const pickupName = ride?.pickup?.address?.split(',')[0] || 'Pickup';
    const dropoffName = ride?.dropoff?.address?.split(',')[0] || 'Drop'; 

    return (
        <View style={styles.container}>
            {/* Top Navigation Bar */}
            <View style={styles.topNav}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>

                <View style={styles.headerTitles}>
                    <Text style={styles.title}>Choose Your Plan</Text>
                </View>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Route Pill */}
                <View style={styles.routePillWrapper}>
                    <View style={styles.routePill}>
                        <View style={styles.dotGreen} />
                        <Text style={styles.arrowSmall}>→</Text>
                        <View style={styles.pinPurple}>
                            <View style={styles.pinHole} />
                        </View>
                        <Text style={styles.routeText} numberOfLines={1}>
                            {pickupName}  →  {dropoffName}
                        </Text>
                    </View>
                </View>

                {/* Plans Stack */}
                <View style={styles.plansStack}>
                    
                    {/* Plan 1 */}
                    <TouchableOpacity 
                        style={sub.plan === 7 ? styles.planCardActive : styles.planCard}
                        onPress={() => handleSelectPlan(7, 364)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.planColLeft}>
                            <Text style={styles.planTitle}>7 Rides</Text>
                            <Text style={styles.planDesc}>1 week · Mon–Fri</Text>
                        </View>
                        <View style={styles.planColRight}>
                            <Text style={styles.planSubPrice}>₹52/ride</Text>
                            <Text style={styles.planTotalPrice}>₹364 total</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Plan 2 */}
                    <TouchableOpacity 
                        style={sub.plan === 15 ? styles.planCardActive : styles.planCard}
                        onPress={() => handleSelectPlan(15, 720)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.planColLeft}>
                            <Text style={styles.planTitle}>15 Rides</Text>
                            <Text style={styles.planDesc}>2 weeks · Mon–Fri</Text>
                        </View>
                        <View style={styles.planColRight}>
                            <Text style={styles.planSubPrice}>₹48/ride</Text>
                            <Text style={styles.planTotalPrice}>₹720 total</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Plan 3 (Best Value) */}
                    <TouchableOpacity 
                        style={sub.plan === 30 ? styles.planCardActive : styles.planCard}
                        onPress={() => handleSelectPlan(30, 1350)}
                        activeOpacity={0.8}
                    >
                        {/* Best Value Badge */}
                        <View style={styles.bestValueBadge}>
                            <Text style={styles.bestValueText}>BEST VALUE 🏷</Text>
                        </View>

                        <View style={styles.planColLeft}>
                            <Text style={styles.planTitle}>30 Rides</Text>
                            <Text style={styles.planDesc}>1 month · Mon–Fri</Text>
                        </View>
                        <View style={styles.planColRightActive}>
                            <View style={styles.priceCol}>
                                <Text style={styles.planSubPriceActive}>₹45/ride</Text>
                                <Text style={styles.planTotalPrice}>₹1,350 total</Text>
                            </View>
                            {sub.plan === 30 && (
                                <View style={styles.checkCircle}>
                                    <Text style={styles.checkIcon}>✓</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>

                </View>

                {/* Bottom Padding for Footer */}
                <View style={{ height: 140 }} />
            </ScrollView>

            {/* Footer Action Button */}
            <View style={styles.footerOverlay}>
                <TouchableOpacity style={styles.submitBtn} onPress={() => router.push('/subscription-payment')}>
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
        height: Platform.OS === 'ios' ? 116 : 72,
        paddingTop: Platform.OS === 'ios' ? 44 : 0,
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
        paddingTop: Platform.OS === 'ios' ? 130 : 90,
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
    routeText: { fontSize: 14, fontWeight: '500', color: '#1C1A25', marginLeft: 4 },

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

    planColRight: { alignItems: 'flex-end', gap: 4 },
    planSubPrice: { fontSize: 14, fontWeight: '500', color: '#BEA3D8' },
    planTotalPrice: { fontSize: 16, fontWeight: '700', color: '#1E1B2E' },

    planColRightActive: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    priceCol: { alignItems: 'flex-end', gap: 4 },
    planSubPriceActive: { fontSize: 14, fontWeight: '500', color: '#BEA3D8' },
    
    checkCircle: {
        width: 20, height: 20, borderRadius: 10, backgroundColor: '#BEA3D8',
        alignItems: 'center', justifyContent: 'center'
    },
    checkIcon: { fontSize: 12, color: '#FFFFFF', fontWeight: 'bold' },

    // Footer overlay
    footerOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 120, padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 24,
        paddingTop: 48,
        backgroundColor: 'rgba(245, 240, 255, 0.95)',
        justifyContent: 'flex-end',
    },
    submitBtn: {
        width: '100%', height: 56, backgroundColor: '#BEA3D8', borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8,
    },
    submitText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

});
