import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, ScrollView, Platform, TextInput, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRide } from '../src/context/RideContext';

const { width } = Dimensions.get('window');

export default function SubscriptionRideScreen() {
    const router = useRouter();
    const { ride, updateSubscription } = useRide();
    const sub = ride.subscription || {};

    const toggleDay = (day) => {
        if (sub.days.includes(day)) {
            updateSubscription({ days: sub.days.filter(d => d !== day) });
        } else {
            updateSubscription({ days: [...sub.days, day] });
        }
    };

    const handleContinue = () => {
        if (!ride?.pickup?.address) {
            Alert.alert('Missing Field', 'Please select a pickup location.');
            return;
        }
        if (!ride?.dropoff?.address) {
            Alert.alert('Missing Field', 'Please select a drop-off location.');
            return;
        }
        if (!sub?.startDate || sub.startDate.trim() === '') {
            Alert.alert('Missing Field', 'Please enter a valid start date.');
            return;
        }
        if (!sub?.morningTime || sub.morningTime.trim() === '') {
            Alert.alert('Missing Field', 'Please enter a morning pickup time.');
            return;
        }
        if (sub?.isTwoWay && (!sub?.returnTime || sub.returnTime.trim() === '')) {
            Alert.alert('Missing Field', 'Please enter a return pickup time.');
            return;
        }
        if (!sub?.days || sub.days.length === 0) {
            Alert.alert('Missing Field', 'Please select at least one day for the subscription.');
            return;
        }

        router.push('/subscription-plans');
    };

    const daysList = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <View style={styles.container}>
            {/* Top Navigation Bar */}
            <View style={styles.topNav}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>

                <View style={styles.headerTitles}>
                    <Text style={styles.title}>Book a Subscription Ride</Text>
                    <Text style={styles.subtitle}>Set up your recurring daily rides</Text>
                </View>
                {/* Spacer to balance layout */}
                <View style={{ width: 32 }} />
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Address Selection Card */}
                <View style={styles.addressCard}>
                    {/* Pickup */}
                    <TouchableOpacity style={styles.addressRow} onPress={() => router.push('/location-search?returnRoute=/subscription-ride')} activeOpacity={0.8}>
                        <View style={styles.timelineCol}>
                            <View style={styles.dotGreen} />
                            <View style={styles.verticalDivider} />
                        </View>
                        <View style={styles.addressContentBorder}>
                            <Text style={styles.addressLabel}>PICKUP LOCATION</Text>
                            <Text style={styles.addressValue} numberOfLines={1}>{ride?.pickup?.address || 'Tap to select Pickup'}</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Dropoff */}
                    <TouchableOpacity style={styles.addressRow} onPress={() => router.push('/location-search?returnRoute=/subscription-ride')} activeOpacity={0.8}>
                        <View style={styles.timelineCol}>
                            <View style={styles.pinPurple}>
                                <View style={styles.pinHole} />
                            </View>
                        </View>
                        <View style={styles.addressContent}>
                            <Text style={styles.addressLabel}>DROP LOCATION</Text>
                            <Text style={styles.addressValue} numberOfLines={1}>{ride?.dropoff?.address || 'Tap to select Drop-off'}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Configuration Rows */}
                <View style={styles.configContainer}>
                    {/* Start Date */}
                    <View style={styles.configRow}>
                        <View style={styles.configTextCol}>
                            <Text style={styles.configTitle}>Start Date</Text>
                            <Text style={styles.configSub}>Subscription begins from</Text>
                        </View>
                        <View style={styles.pillBtn}>
                            <Text style={styles.pillIcon}>📅</Text>
                            <TextInput
                                style={styles.pillInput}
                                value={sub.startDate}
                                onChangeText={(t) => updateSubscription({ startDate: t })}
                            />
                        </View>
                    </View>

                    {/* Morning Pickup */}
                    <View style={styles.configRow}>
                        <View style={styles.configTextCol}>
                            <Text style={styles.configTitle}>Morning Pickup Time</Text>
                            <Text style={styles.configSub}>Daily departure time</Text>
                        </View>
                        <View style={styles.pillBtn}>
                            <Text style={styles.pillIcon}>🕒</Text>
                            <TextInput
                                style={styles.pillInput}
                                value={sub.morningTime}
                                onChangeText={(t) => updateSubscription({ morningTime: t })}
                            />
                        </View>
                    </View>

                    {/* Return Ride Toggle */}
                    <View style={styles.configRow}>
                        <View style={styles.configTextCol}>
                            <Text style={styles.configTitle}>Add Return Ride?</Text>
                            <Text style={styles.configSub}>Set a return pickup time</Text>
                        </View>
                        <TouchableOpacity 
                            style={[styles.checkbox, sub.isTwoWay && styles.checkboxActive]}
                            onPress={() => updateSubscription({ isTwoWay: !sub.isTwoWay })}
                        >
                            {sub.isTwoWay && <Text style={styles.checkboxTick}>✓</Text>}
                        </TouchableOpacity>
                    </View>

                    {/* Return Pickup Time */}
                    {sub.isTwoWay && (
                        <View style={styles.configRow}>
                            <View style={styles.configTextCol}>
                                <Text style={styles.configTitle}>Return Pickup Time</Text>
                                <Text style={styles.configSub}>Office to Home departure</Text>
                            </View>
                            <View style={styles.pillBtn}>
                                <Text style={styles.pillIcon}>🕒</Text>
                                <TextInput
                                    style={styles.pillInput}
                                    value={sub.returnTime}
                                    onChangeText={(t) => updateSubscription({ returnTime: t })}
                                />
                            </View>
                        </View>
                    )}

                    {/* Days of Week */}
                    <View style={styles.daysSection}>
                        <View style={styles.configTextCol}>
                            <Text style={styles.configTitle}>Days of Week</Text>
                            <Text style={styles.configSub}>Choose your recurring ride days</Text>
                        </View>
                        <View style={styles.daysRow}>
                            {daysList.map((day) => {
                                const isActive = sub.days.includes(day);
                                return (
                                    <TouchableOpacity 
                                        key={day}
                                        style={[styles.dayBubble, isActive ? styles.dayActive : styles.dayInactive]}
                                        onPress={() => toggleDay(day)}
                                    >
                                        <Text style={[styles.dayText, isActive ? styles.dayTextActive : styles.dayTextInactive]}>
                                            {day}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>

                {/* Bottom Padding for Footer */}
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Footer Action Button */}
            <View style={styles.footerOverlay}>
                <TouchableOpacity style={styles.submitBtn} onPress={handleContinue} activeOpacity={0.8}>
                    <Text style={styles.submitText}>Continue to Plan Selection</Text>
                </TouchableOpacity>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0FF' },

    // Top Navigation
    topNav: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: Platform.OS === 'ios' ? 118 : 74,
        paddingTop: Platform.OS === 'ios' ? 44 : 0,
        paddingHorizontal: 24,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: 'rgba(245, 240, 255, 0.8)',
        zIndex: 10,
    },
    backBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    backIcon: { fontSize: 24, color: '#1E1B2E', fontWeight: '500' },
    headerTitles: { alignItems: 'center' },
    title: { fontSize: 16, fontWeight: '600', color: '#1E1B2E', letterSpacing: -0.4 },
    subtitle: { fontSize: 12, fontWeight: '500', color: '#6B7280' },

    scrollContent: {
        paddingTop: Platform.OS === 'ios' ? 140 : 96,
        paddingHorizontal: 24,
        paddingBottom: 40,
    },

    // Address Card
    addressCard: {
        backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, marginBottom: 32,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 6,
    },
    addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
    timelineCol: { alignItems: 'center', paddingTop: 4, width: 14 },
    dotGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981' },
    verticalDivider: { width: 1, height: 32, backgroundColor: '#7B7487', opacity: 0.3, marginVertical: 4 }, // Simplified gradient line
    pinPurple: { 
        width: 13.33, height: 16.67, backgroundColor: '#BEA3D8',
        borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
        alignItems: 'center', paddingTop: 3
    },
    pinHole: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' },
    
    addressContentBorder: { flex: 1, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E0EF', marginBottom: 12 },
    addressContent: { flex: 1, paddingBottom: 0 },
    
    addressLabel: { fontSize: 10, fontWeight: '700', color: '#7B7487', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
    addressValue: { fontSize: 14, fontWeight: '500', color: '#1E1B2E' },

    // Config Rows
    configContainer: { gap: 32 },
    configRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    configTextCol: { gap: 0 },
    configTitle: { fontSize: 14, fontWeight: '600', color: '#1C1A25', marginBottom: 2 },
    configSub: { fontSize: 12, fontWeight: '400', color: '#1C1A25' },
    
    pillBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FFFFFF', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 9999,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2,
    },
    pillIcon: { fontSize: 12, color: '#BEA3D8' },
    pillInput: { fontSize: 12, fontWeight: '600', color: '#BEA3D8', padding: 0, width: 80, textAlign: 'center' },

    checkbox: {
        width: 18, height: 18, borderWidth: 1, borderColor: '#CCC3D8', borderRadius: 4,
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'
    },
    checkboxActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
    checkboxTick: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },

    // Days Section
    daysSection: { gap: 16 },
    daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
    dayBubble: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center'
    },
    dayActive: { backgroundColor: '#BEA3D8' },
    dayInactive: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CCC3D8' },
    dayText: { fontSize: 12, fontWeight: '700' },
    dayTextActive: { color: '#FFFFFF' },
    dayTextInactive: { color: '#7B7487' },

    // Footer overlay
    footerOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 104, padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 24,
        backgroundColor: 'rgba(245, 240, 255, 0.95)', // approximation for gradient
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.4)',
    },
    submitBtn: {
        width: '100%', height: 56, backgroundColor: '#BEA3D8', borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 32, elevation: 8,
    },
    submitText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

});
