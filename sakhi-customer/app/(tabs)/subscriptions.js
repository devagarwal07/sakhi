import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useRide } from '../../src/context/RideContext';

export default function SubscriptionsDashboard() {
    const router = useRouter();
    const { ride } = useRide();
    const sub = ride?.subscription || {};
    const [isPaused, setIsPaused] = useState(false);

    const handlePause = () => {
        Alert.alert(
            isPaused ? 'Resume Subscription' : 'Pause Subscription',
            isPaused
                ? 'Your subscription rides will resume from tomorrow.'
                : 'Your upcoming rides will be paused until you resume.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: isPaused ? 'Resume' : 'Pause', onPress: () => setIsPaused(!isPaused) },
            ]
        );
    };

    const handleCancel = () => {
        Alert.alert(
            'Cancel Subscription?',
            'This will permanently cancel your current plan. Any unused rides will be forfeited.',
            [
                { text: 'Keep Plan', style: 'cancel' },
                { text: 'Yes, Cancel', style: 'destructive', onPress: () => Alert.alert('Subscription Cancelled', 'Your plan has been cancelled.') },
            ]
        );
    };
    
    // Dynamic values mapped from context
    const pickupName = ride?.pickup?.address?.split(',')[0] || 'Koramangala';
    const dropoffName = ride?.dropoff?.address?.split(',')[0] || 'MG Road';
    
    const daysRange = sub.days?.length > 3 
        ? `${sub.days[0]}–${sub.days[sub.days.length - 1]}` 
        : (sub.days?.join(', ') || 'Mon–Fri');

    const pickupTime = sub.morningTime || '8:30 AM';
    const totalRides = sub.plan || 30;

    // Generate upcoming dates sequentially from tomorrow
    const generateUpcoming = () => {
        const rides = [];
        const today = new Date();
        for (let i = 1; i <= 5; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            rides.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                time: pickupTime,
                status: 'SCHEDULED'
            });
        }
        return rides;
    };
    
    const upcomingRides = generateUpcoming();

    return (
        <View style={styles.container}>
            {/* Top Navigation Bar */}
            <View style={styles.topNav}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>My Subscription</Text>
                </View>
                <TouchableOpacity style={styles.menuBtn} onPress={() => router.push('/subscription-plans')}>
                    <Text style={styles.menuIcon}>＋</Text>
                </TouchableOpacity>
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Active Subscription Card */}
                <View style={styles.activeCard}>
                    <View style={styles.cardHeader}>
                        <View style={styles.routeCol}>
                            <Text style={styles.routeTitle} numberOfLines={1}>{pickupName} → {dropoffName}</Text>
                            <Text style={styles.routeSub}>{pickupTime.replace(' ', '')} pickup · {daysRange}</Text>
                        </View>
                        <View style={styles.statusBadge}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusText}>Active</Text>
                        </View>
                    </View>

                    {/* Progress */}
                    <View style={styles.progressSection}>
                        <View style={styles.progressRow}>
                            <Text style={styles.progressNumbers}>18 / {totalRides}</Text>
                            <Text style={styles.progressLabel}>RIDES REMAINING</Text>
                        </View>
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressBar, { width: `${(18/totalRides)*100}%` }]} />
                        </View>
                    </View>

                    {/* Next Ride Indicator */}
                    <View style={styles.nextRideRow}>
                        <Text style={styles.calendarIcon}>📅</Text>
                        <Text style={styles.nextRideText}>Tomorrow, {pickupTime}</Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={[styles.actionBtn, styles.pauseBtn]} activeOpacity={0.8} onPress={handlePause}>
                        <Text style={styles.pauseText}>{isPaused ? 'Resume' : 'Pause'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.resumeBtn]} activeOpacity={0.8} onPress={() => router.push('/subscription-ride')}>
                        <Text style={styles.resumeText}>Modify</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} activeOpacity={0.8} onPress={handleCancel}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>

                {/* Upcoming Rides */}
                <View style={styles.upcomingSection}>
                    <Text style={styles.upcomingTitle}>Upcoming Rides</Text>
                    
                    <View style={styles.ridesList}>
                        {upcomingRides.map((ride, idx) => (
                            <View key={idx} style={styles.rideRow}>
                                <View style={styles.dateCol}>
                                    <Text style={styles.dateBold}>{ride.date}</Text>
                                    <Text style={styles.dayLight}>{ride.day}</Text>
                                </View>
                                <View style={styles.dividerVertical} />
                                <Text style={styles.timeText}>{ride.time} Pickup</Text>
                                <View style={styles.statusPill}>
                                    <Text style={styles.statusPillText}>{ride.status}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0FF' },
    
    topNav: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: Platform.OS === 'ios' ? 104 : 84,
        paddingTop: Platform.OS === 'ios' ? 44 : 20,
        paddingHorizontal: 24,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: 'rgba(245, 240, 255, 0.8)',
        zIndex: 10,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    backBtn: { width: 32, height: 32, justifyContent: 'center' },
    backIcon: { fontSize: 24, color: '#BEA3D8' },
    title: { fontSize: 18, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.45 },
    menuBtn: { width: 32, height: 32, alignItems: 'flex-end', justifyContent: 'center' },
    menuIcon: { fontSize: 24, color: '#BEA3D8', fontWeight: 'bold' },

    scrollContent: {
        paddingTop: Platform.OS === 'ios' ? 120 : 100,
        paddingHorizontal: 24,
    },

    activeCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 6,
        marginBottom: 24,
        borderLeftWidth: 6, borderLeftColor: '#BEA3D8'
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
    routeCol: { flex: 1, paddingRight: 10 },
    routeTitle: { fontSize: 20, fontWeight: '700', color: '#1E1B2E', lineHeight: 25, marginBottom: 4 },
    routeSub: { fontSize: 14, fontWeight: '400', color: '#6B7280' },
    
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#ECFDF5', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 9999
    },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669' },
    statusText: { fontSize: 12, fontWeight: '600', color: '#059669', letterSpacing: 0.3 },

    progressSection: { marginBottom: 16 },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
    progressNumbers: { fontSize: 24, fontWeight: '800', color: '#1E1B2E', letterSpacing: -0.6 },
    progressLabel: { fontSize: 12, fontWeight: '500', color: '#6B7280', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },
    progressTrack: { height: 10, backgroundColor: '#F5F0FF', borderRadius: 5, overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: '#BEA3D8', borderRadius: 5 },

    nextRideRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    calendarIcon: { fontSize: 14 },
    nextRideText: { fontSize: 14, fontWeight: '600', color: '#BEA3D8' },

    actionsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 32 },
    actionBtn: { flex: 1, marginHorizontal: 4, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    
    pauseBtn: { borderColor: '#FB923C' },
    pauseText: { fontSize: 12, fontWeight: '700', color: '#F97316' },
    
    resumeBtn: { borderColor: '#D1FAE5' },
    resumeText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
    
    cancelBtn: { borderColor: '#F87171' },
    cancelText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },

    upcomingSection: { width: '100%' },
    upcomingTitle: { fontSize: 18, fontWeight: '700', color: '#1E1B2E', marginBottom: 24 },
    ridesList: { gap: 24 },
    
    rideRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 40 },
    dateCol: { width: 56 },
    dateBold: { fontSize: 16, fontWeight: '700', color: '#1E1B2E', marginBottom: 2 },
    dayLight: { fontSize: 12, fontWeight: '400', color: '#6B7280' },
    
    dividerVertical: { width: 1, height: 32, backgroundColor: '#F0ECFA', marginHorizontal: 16 },
    
    timeText: { flex: 1, fontSize: 16, fontWeight: '500', color: '#1E1B2E' },
    
    statusPill: { backgroundColor: '#EDE9FE', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12 },
    statusPillText: { fontSize: 10, fontWeight: '700', color: '#BEA3D8', textTransform: 'uppercase', letterSpacing: 0.5 },

});
