import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';

const NOTIFICATION_GROUPS = [
  {
    title: 'Rides',
    items: [
      { key: 'new_ride_requests', label: 'New Ride Requests', sub: 'Alert when a new ride is assigned' },
      { key: 'ride_cancelled',    label: 'Ride Cancellations', sub: 'Rider cancels before pickup'       },
    ],
  },
  {
    title: 'Earnings',
    items: [
      { key: 'commission_due',    label: 'Commission Due Reminder', sub: 'Daily/weekly fee reminders' },
      { key: 'payout_received',   label: 'Payout Received',        sub: 'When money hits your account'},
    ],
  },
  {
    title: 'Subscriptions',
    items: [
      { key: 'upcoming_sub_ride', label: 'Upcoming Subscription Ride', sub: '30 min before scheduled pickup' },
      { key: 'sub_assigned',      label: 'New Subscription Assigned',  sub: 'When a rider books you'        },
    ],
  },
  {
    title: 'Account',
    items: [
      { key: 'doc_expiry',        label: 'Document Expiry Alerts', sub: '30 days before any doc expires' },
      { key: 'promotions',        label: 'Promotions & Offers',    sub: 'Bonuses and incentive schemes'  },
    ],
  },
];

export default function NotificationSettingsScreen({ navigation }) {
  const [settings, setSettings] = useState({
    new_ride_requests: true,
    ride_cancelled:    true,
    commission_due:    true,
    payout_received:   true,
    upcoming_sub_ride: true,
    sub_assigned:      true,
    doc_expiry:        true,
    promotions:        false,
  });

  const toggle = async (key, val) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
    try {
      await client.patch('/drivers/notification-settings', { [key]: val });
    } catch {
      setSettings((prev) => ({ ...prev, [key]: !val })); // revert
      Alert.alert('Error', 'Could not update setting.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {NOTIFICATION_GROUPS.map((group) => (
          <View key={group.title}>
            <Text style={styles.groupTitle}>{group.title.toUpperCase()}</Text>
            <View style={styles.card}>
              {group.items.map((item, i, arr) => (
                <View key={item.key}>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                      <Text style={styles.itemSub}>{item.sub}</Text>
                    </View>
                    <Switch
                      value={settings[item.key] ?? false}
                      onValueChange={(v) => toggle(item.key, v)}
                      trackColor={{ false: Colors.outlineVariant, true: Colors.primaryContainer }}
                      thumbColor={Colors.white}
                    />
                  </View>
                  {i < arr.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceLow },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 22, color: Colors.primaryContainer },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.onSurface },

  scroll: { paddingHorizontal: Spacing.base, paddingBottom: 40, gap: 6 },
  groupTitle: { fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 1.5, marginBottom: 6, marginTop: 10 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, ...Shadows.card },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 14 },
  itemLabel: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  itemSub: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.surfaceLow, marginHorizontal: Spacing.md },
});
