import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity,
} from 'react-native';
import client from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import SakhiModal from '../../components/SakhiModal';
import { useTranslation } from 'react-i18next';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const PURPLE   = '#BEA3D8';
const DARK     = '#1E1B2E';
const MUTED    = '#6B7280';
const WHITE    = '#FFFFFF';
const BG       = '#F5F0FF';
const RED_TEXT = '#BA1A1A';
const CARD_SH  = {
  shadowColor: 'rgba(124, 58, 237, 1)',
  shadowOffset: { width: 0, height: 16 },
  shadowOpacity: 0.08,
  shadowRadius: 32,
  elevation: 4,
};

// ─── Notification Group data ───────────────────────────────────────────────────
const NOTIFICATION_GROUPS = [
  {
    title: 'RIDE NOTIFICATIONS',
    items: [
      { key: 'new_ride_requests', label: 'New Ride Requests',  sub: 'Alert when a new ride is assigned to you' },
      { key: 'ride_cancelled',    label: 'Ride Cancellations', sub: 'When a rider cancels before pickup'      },
    ],
  },
  {
    title: 'EARNINGS',
    items: [
      { key: 'commission_due',  label: 'Commission Due Reminder', sub: 'Daily/weekly fee reminders' },
      { key: 'payout_received', label: 'Payout Received',        sub: 'When money hits your account' },
    ],
  },
  {
    title: 'SUBSCRIPTIONS',
    items: [
      { key: 'upcoming_sub_ride', label: 'Upcoming Subscription Ride',      sub: null, badge: '30 MINS BEFORE' },
      { key: 'sub_assigned',      label: 'New Subscription Assigned',        sub: 'When a rider books you for subscription' },
      { key: 'sub_cancelled',     label: 'Subscription Cancelled by Rider',  sub: 'When a rider cancels their subscription' },
      { key: 'sub_paused',        label: 'Subscription Paused by Rider',     sub: 'When a rider temporarily pauses rides' },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { key: 'doc_expiry',  label: 'Document Expiry Alerts', sub: '30 days before any document expires' },
      { key: 'promotions',  label: 'Promotions & Offers',    sub: 'Bonuses and incentive schemes' },
    ],
  },
];

// ─── Toggle Row ───────────────────────────────────────────────────────────────
function ToggleRow({ label, sub, badge, stateKey, value, onToggle }) {
  return (
    <View style={tr.row}>
      <View style={tr.textCol}>
        <Text style={tr.label}>{label}</Text>
        {badge ? (
          <View style={tr.badgeWrap}>
            <View style={tr.badge}>
              <Text style={tr.badgeText}>{badge}</Text>
            </View>
          </View>
        ) : sub ? (
          <Text style={tr.sub} numberOfLines={2}>{sub}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#E5E0EF', true: PURPLE }}
        thumbColor={WHITE}
        style={tr.switch}
      />
    </View>
  );
}
const tr = StyleSheet.create({
  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  textCol:  { flex: 1, justifyContent: 'center', gap: 4 },
  label:    { fontSize: 14, fontWeight: '700', color: DARK, lineHeight: 20 },
  sub:      { fontSize: 12, fontWeight: '400', color: MUTED, lineHeight: 16 },
  badgeWrap:{ flexDirection: 'row', marginTop: 2 },
  badge:    { backgroundColor: BG, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
  badgeText:{ fontSize: 10, fontWeight: '600', color: PURPLE, letterSpacing: -0.5, textTransform: 'uppercase' },
  switch:   { transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NotificationSettingsScreen({ navigation }) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    new_ride_requests: true,
    ride_cancelled:    true,
    commission_due:    true,
    payout_received:   true,
    upcoming_sub_ride: true,
    sub_assigned:      true,
    sub_cancelled:     true,
    sub_paused:        true,
    doc_expiry:        true,
    promotions:        false,
  });
  const [modal, setModal] = useState(null);

  const toggle = async (key, val) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
    try {
      await client.patch('/drivers/notification-settings', { [key]: val });
    } catch {
      setSettings((prev) => ({ ...prev, [key]: !val })); // revert on error
      setModal({
        icon: '⚠️',
        title: 'Update Failed',
        message: 'Could not update notification setting. Please try again.',
        buttons: [{ text: 'OK', onPress: () => setModal(null) }],
      });
    }
  };

  const handleRestoreDefaults = () => {
    setModal({
      icon: '🔄',
      title: 'Restore Defaults?',
      message: 'This will reset all notification preferences to their default values.',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => setModal(null) },
        {
          text: 'Restore',
          onPress: () => {
            setSettings({
              new_ride_requests: true,
              ride_cancelled:    true,
              commission_due:    true,
              payout_received:   true,
              upcoming_sub_ride: true,
              sub_assigned:      true,
              sub_cancelled:     true,
              sub_paused:        true,
              doc_expiry:        true,
              promotions:        false,
            });
            setModal(null);
          },
        },
      ],
    });
  };

  return (
    <View style={s.root}>
      <ScreenHeader title={t('profile.notificationSettings')} onBack={() => navigation?.goBack()} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Standard Groups ── */}
        {NOTIFICATION_GROUPS.map((group) => (
          <View key={group.title} style={s.section}>
            <Text style={s.sectionHeading}>{group.title}</Text>
            <View style={[s.card, { paddingVertical: 4 }]}>
              {group.items.map((item, i, arr) => (
                <View key={item.key}>
                  <View style={s.rowPad}>
                    <ToggleRow
                      label={item.label}
                      sub={item.sub}
                      badge={item.badge}
                      stateKey={item.key}
                      value={settings[item.key] ?? false}
                      onToggle={(v) => toggle(item.key, v)}
                    />
                  </View>
                  {i < arr.length - 1 && <View style={s.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* ── Emergency Section (non-toggleable) ── */}
        <View style={s.section}>
          <Text style={[s.sectionHeading, { color: RED_TEXT }]}>EMERGENCY</Text>
          <View style={[s.card, s.emergencyCard]}>
            <View style={s.rowPad}>
              <View style={tr.row}>
                <View style={tr.textCol}>
                  <Text style={tr.label}>SOS Confirmations</Text>
                  <Text style={tr.sub}>Critical safety alerts — cannot be disabled</Text>
                </View>
                <View style={s.padlockBadge}>
                  <Text style={s.padlockIcon}>🔒</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Restore Defaults ── */}
        <TouchableOpacity style={s.restoreBtn} activeOpacity={0.7} onPress={handleRestoreDefaults}>
          <Text style={s.restoreText}>Restore Defaults</Text>
        </TouchableOpacity>

      </ScrollView>

      <SakhiModal config={modal} onClose={() => setModal(null)} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: BG },
  scroll:{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 48, gap: 24 },

  section:        { gap: 12 },
  sectionHeading: {
    fontSize: 11, fontWeight: '700', color: PURPLE,
    letterSpacing: 0.55, textTransform: 'uppercase', opacity: 0.8,
    paddingLeft: 4,
  },

  card: {
    backgroundColor: WHITE, borderRadius: 16,
    ...CARD_SH,
  },
  emergencyCard: {
    backgroundColor: 'rgba(246, 241, 255, 0.6)',
  },
  rowPad: { paddingHorizontal: 20, paddingVertical: 16 },
  divider:{ height: 1, backgroundColor: BG, marginHorizontal: 20 },

  // Emergency lock badge
  padlockBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EDE9FA',
    justifyContent: 'center', alignItems: 'center',
  },
  padlockIcon: { fontSize: 14 },

  // Restore Defaults
  restoreBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  restoreText: {
    fontSize: 14, fontWeight: '500', color: MUTED, textAlign: 'center',
  },
});
