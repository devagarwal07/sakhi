import React, { useState } from 'react';
import {
    View, Text, StyleSheet, Switch, ScrollView,
    TouchableOpacity, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';

export default function NotificationsScreen() {
    const router = useRouter();
    const [prefs, setPrefs] = useState({
        ride_updates: true,
        driver_arrival: true,
        subscription_reminders: true,
        promotions: false,
        safety_alerts: true,
        app_updates: false,
    });

    const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

    const NotifRow = ({ label, description, settingKey, icon }) => (
        <View style={styles.notifRow}>
            <View style={styles.notifIconBg}>
                <Text style={{ fontSize: 18 }}>{icon}</Text>
            </View>
            <View style={styles.notifBody}>
                <Text style={styles.notifLabel}>{label}</Text>
                <Text style={styles.notifDesc}>{description}</Text>
            </View>
            <Switch
                value={prefs[settingKey]}
                onValueChange={() => toggle(settingKey)}
                trackColor={{ false: Colors.outlineVariant, true: Colors.primaryFixed }}
                thumbColor={prefs[settingKey] ? Colors.primaryContainer : Colors.surfaceContainerHighest}
                ios_backgroundColor={Colors.outlineVariant}
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backArrow}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Ride Notifications */}
                <Text style={styles.sectionLabel}>Ride Alerts</Text>
                <View style={styles.card}>
                    <NotifRow
                        icon="🚗" label="Ride Updates" settingKey="ride_updates"
                        description="Status changes, driver en route, arrival alerts"
                    />
                    <View style={styles.divider} />
                    <NotifRow
                        icon="📍" label="Driver Arrival" settingKey="driver_arrival"
                        description="Know when your driver reaches your pickup point"
                    />
                    <View style={styles.divider} />
                    <NotifRow
                        icon="🛡️" label="Safety Alerts" settingKey="safety_alerts"
                        description="SOS confirmations, emergency contact notifications"
                    />
                </View>

                {/* Subscription */}
                <Text style={styles.sectionLabel}>Subscriptions</Text>
                <View style={styles.card}>
                    <NotifRow
                        icon="🔄" label="Subscription Reminders" settingKey="subscription_reminders"
                        description="Daily ride reminders and schedule confirmations"
                    />
                </View>

                {/* Marketing */}
                <Text style={styles.sectionLabel}>Marketing</Text>
                <View style={styles.card}>
                    <NotifRow
                        icon="🎉" label="Promotions & Offers" settingKey="promotions"
                        description="Promo codes, seasonal discounts, referral rewards"
                    />
                    <View style={styles.divider} />
                    <NotifRow
                        icon="📱" label="App Updates" settingKey="app_updates"
                        description="New features and important app changes"
                    />
                </View>

                <TouchableOpacity style={styles.saveBtn}>
                    <Text style={styles.saveBtnText}>Save Preferences</Text>
                </TouchableOpacity>
            </ScrollView>
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
    content: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
    sectionLabel: {
        fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant,
        textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8,
    },
    card: {
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 16, overflow: 'hidden', ...Shadows.card,
    },
    notifRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 14, paddingHorizontal: 16,
    },
    notifIconBg: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: Colors.surfaceContainerLow,
        alignItems: 'center', justifyContent: 'center',
    },
    notifBody: { flex: 1 },
    notifLabel: { fontSize: 14, fontWeight: '600', color: Colors.onSurface, marginBottom: 2 },
    notifDesc: { fontSize: 11, color: Colors.onSurfaceVariant, lineHeight: 15 },
    divider: { height: 1, backgroundColor: Colors.outlineVariant, marginLeft: 68 },
    saveBtn: {
        backgroundColor: Colors.primaryContainer, borderRadius: BorderRadius.md,
        paddingVertical: 14, alignItems: 'center', marginTop: 8, ...Shadows.editorial,
    },
    saveBtnText: { color: Colors.onPrimary, fontSize: 15, fontWeight: '700' },
});
