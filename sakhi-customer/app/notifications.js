import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Switch, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function NotificationsScreen() {
    const router = useRouter();

    // Default states matching the mockup
    const [preferences, setPreferences] = useState({
        driverAssigned: true,
        driverArrived: true,
        tripStarted: true,
        tripCompleted: true,
        rideCancelled: true,
        upcomingRide: true,
        dailyReminder: true,
        subExpiring: true,
        promotions: true,
        appUpdates: false,
    });

    const toggleSwitch = (key) => {
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const ToggleRow = ({ title, subtitle, stateKey, customBadge }) => (
        <View style={styles.row}>
            <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>{title}</Text>
                {customBadge ? (
                    <View style={styles.badgeContainer}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{customBadge}</Text>
                        </View>
                    </View>
                ) : (
                    <Text style={styles.rowSubtitle} numberOfLines={2}>{subtitle}</Text>
                )}
            </View>
            <Switch
                trackColor={{ false: '#E5E0EF', true: '#BEA3D8' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E5E0EF"
                onValueChange={() => toggleSwitch(stateKey)}
                value={preferences[stateKey]}
                style={styles.switchControl}
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>

                {/* Header */}
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
                            <Feather name="arrow-left" size={24} color="#BEA3D8" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Notifications</Text>
                    </View>
                    <View style={styles.iconBtn} />
                </View>

                {/* Main Scroll Content */}
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Master Settings Card */}
                    <View style={styles.settingsCard}>

                        {/* Section 1: Ride Notifications */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeading}>RIDE NOTIFICATIONS</Text>
                            <View style={styles.sectionContent}>
                                <ToggleRow title="Driver assigned" subtitle="Real-time updates on driver matching" stateKey="driverAssigned" />
                                <ToggleRow title="Driver arrived" subtitle="When your Sakhi is at the pickup point" stateKey="driverArrived" />
                                <ToggleRow title="Trip started" subtitle="Confirmation as your journey begins" stateKey="tripStarted" />
                                <ToggleRow title="Trip completed" subtitle="Summary of your reached destination" stateKey="tripCompleted" />
                                <ToggleRow title="Ride cancelled" subtitle="Alerts for any trip changes" stateKey="rideCancelled" />
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Section 2: Subscription */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeading}>SUBSCRIPTION</Text>
                            <View style={styles.sectionContent}>
                                <ToggleRow title="Upcoming ride reminder" subtitle="Alert for scheduled daily commutes" stateKey="upcomingRide" />
                                {/*<ToggleRow title="Daily reminder" stateKey="dailyReminder" customBadge="30 MINS BEFORE" />*/}
                                <ToggleRow title="Subscription expiring soon" subtitle="Notifications to renew your plan" stateKey="subExpiring" />
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Section 3: Offers */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeading}>OFFERS</Text>
                            <View style={styles.sectionContent}>
                                <ToggleRow title="Promotions" subtitle="Exclusive discounts and festive offers" stateKey="promotions" />
                                <ToggleRow title="App updates" subtitle="New features and performance improvements" stateKey="appUpdates" />
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Section 4: Emergency */}
                        <View style={styles.emergencySection}>
                            <Text style={styles.emergencyHeading}>EMERGENCY</Text>
                            <View style={styles.emergencyContent}>
                                <View style={styles.rowTextCol}>
                                    <Text style={styles.rowTitle}>SOS Confirmations</Text>
                                    <Text style={styles.rowSubtitle}>Critical safety alerts - cannot be disabled</Text>
                                </View>
                                {/* Padlock Icon Badge */}
                                <View style={styles.padlockBadge}>
                                    <Feather name="lock" size={14} color="#6B7280" />
                                </View>
                            </View>
                        </View>

                    </View>

                    {/* Restore Defaults Link */}
                    <TouchableOpacity style={styles.restoreBtn} activeOpacity={0.7} onPress={() => {
                        // Reset logic
                        setPreferences({
                            driverAssigned: true, driverArrived: true, tripStarted: true,
                            tripCompleted: true, rideCancelled: true, upcomingRide: true,
                            dailyReminder: true, subExpiring: true, promotions: true, appUpdates: false
                        });
                    }}>
                        <Text style={styles.restoreText}>Restore Defaults</Text>
                    </TouchableOpacity>

                </ScrollView>
            </View>
        </SafeAreaView>
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
    safeArea: { flex: 1, backgroundColor: '#F5F0FF' },
    container: { flex: 1 },






    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 32,
        paddingBottom: 40,
        alignItems: 'center',
    },

    /* Master Card */
    settingsCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
        paddingBottom: 24, // Matches emergency block padding
    },

    divider: {
        height: 1,
        backgroundColor: '#F5F0FF',
        marginHorizontal: 24,
    },

    /* Standard Sections */
    section: {
        padding: 24,
        paddingBottom: 16,
        gap: 16,
    },
    sectionHeading: {
        fontSize: 11, fontWeight: '700', color: '#BEA3D8', letterSpacing: 0.55, textTransform: 'uppercase', opacity: 0.8,
    },
    sectionContent: {
        gap: 24,
    },

    /* Row Layouts */
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
    },
    rowTextCol: {
        flex: 1,
        justifyContent: 'center',
        gap: 4,
    },
    rowTitle: {
        fontSize: 14, fontWeight: '700', color: '#1E1B2E', lineHeight: 20,
    },
    rowSubtitle: {
        fontSize: 12, fontWeight: '400', color: '#6B7280', lineHeight: 16,
    },
    switchControl: {
        transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
    },

    /* Custom Badges */
    badgeContainer: { flexDirection: 'row', marginTop: 2 },
    badge: {
        backgroundColor: '#F5F0FF',
        paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 9999,
    },
    badgeText: {
        fontSize: 10, fontWeight: '600', color: '#BEA3D8', letterSpacing: -0.5, textTransform: 'uppercase',
    },

    /* Emergency Section */
    emergencySection: {
        padding: 24,
        gap: 16,
        backgroundColor: 'rgba(246, 241, 255, 0.3)',
        borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
    },
    emergencyHeading: {
        fontSize: 11, fontWeight: '700', color: '#BA1A1A', letterSpacing: 0.55, textTransform: 'uppercase', opacity: 0.8,
    },
    emergencyContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    padlockBadge: {
        width: 28, height: 28, borderRadius: 14, backgroundColor: '#EDE9FA', justifyContent: 'center', alignItems: 'center',
    },
    padlockIcon: {
        fontSize: 12, color: '#6B7280',
    },

    /* Restore Defaults */
    restoreBtn: {
        marginTop: 32,
        paddingVertical: 12, paddingHorizontal: 24,
    },
    restoreText: {
        fontSize: 14, fontWeight: '500', color: '#6B7280', textalign: 'center',
    },
});
