import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Linking, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cancelSOS } from '../../api/endpoints';

// ── Design tokens ─────────────────────────────────────────────────────────────
const RED   = '#DC2626';
const DKRED = '#991B1B';
const WHITE = '#FFFFFF';
const GREEN = '#059669';

const DEMO_CONTACTS = [
  { id: '1', name: 'Anita Sharma',  initial: 'A', color: '#FCD34D', relation: 'Mother' },
  { id: '2', name: 'Riya Verma',    initial: 'R', color: '#38BDF8', relation: 'Sister' },
];

/**
 * SOSActiveScreen (Driver)
 *
 * Shown after SOS has been triggered.
 * Displays: alert sent confirmation, emergency contacts notified,
 * action buttons (Call Sakhi / Dial 112 / Cancel SOS).
 *
 * route.params:
 *   location { latitude, longitude }
 */
export default function SOSActiveScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = () => {
    Alert.alert(
      'Cancel SOS?',
      "Are you sure you're safe? This will cancel the SOS alert.",
      [
        { text: 'No, Keep SOS', style: 'cancel' },
        {
          text: "Yes, I'm Safe",
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              await cancelSOS();
            } catch {
              // Best-effort
            } finally {
              setCancelling(false);
              navigation.goBack();
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[s.root, { paddingTop: Math.max(insets.top, 0) }]}>

      {/* ── Top Nav ─────────────────────────────────────────────────── */}
      <View style={s.topNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.navIconBtn}>
          <Text style={s.navIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Emergency SOS</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom + 32, 60) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Siren Section ─────────────────────────────────────────── */}
        <View style={s.sirenSection}>
          <View style={s.ringOuter} />
          <View style={s.ringInner} />
          <View style={s.iconCircle}>
            <Text style={s.dangerIcon}>❕</Text>
          </View>
        </View>

        {/* ── Header Text ───────────────────────────────────────────── */}
        <View style={s.headerText}>
          <Text style={s.title}>SOS Alert Sent</Text>
          <Text style={s.subtitle}>
            Your emergency contacts and the Sakhi{'\n'}Safety Team have been notified with{'\n'}your live location.
          </Text>
        </View>

        {/* ── Status Card ───────────────────────────────────────────── */}
        <View style={s.card}>

          {/* Checklist */}
          <View style={s.statusList}>
            {[
              'Sakhi Safety Team Notified',
              'Live Location Shared with Contacts',
              'Trip Details Transmitted',
            ].map((txt) => (
              <View key={txt} style={s.statusRow}>
                <View style={s.checkBg}>
                  <Text style={s.checkMark}>✓</Text>
                </View>
                <Text style={s.statusText}>{txt}</Text>
              </View>
            ))}
          </View>

          {/* Divider */}
          <View style={s.divider} />

          {/* Emergency contacts */}
          <View style={s.contactsSection}>
            <Text style={s.contactsHeading}>YOUR EMERGENCY CONTACTS</Text>
            {DEMO_CONTACTS.map((c) => (
              <View key={c.id} style={s.contactRow}>
                <View style={s.contactLeft}>
                  <View style={[s.avatar, { backgroundColor: c.color }]}>
                    <Text style={s.avatarText}>{c.initial}</Text>
                  </View>
                  <View>
                    <Text style={s.contactName}>{c.name}</Text>
                    <Text style={s.contactRelation}>{c.relation}</Text>
                  </View>
                </View>
                <View style={s.notifiedPill}>
                  <Text style={s.notifiedText}>NOTIFIED ✓</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Action Buttons ────────────────────────────────────────── */}
        <View style={s.actionButtons}>

          {/* Call Sakhi */}
          <TouchableOpacity
            style={s.callBtn}
            onPress={() => Linking.openURL('tel:18001234567')}
            activeOpacity={0.85}
          >
            <Text style={s.callIcon}>📞</Text>
            <Text style={s.callBtnText}>Call Sakhi Safety Team</Text>
          </TouchableOpacity>

          {/* Message Sakhi */}
          <TouchableOpacity
            style={s.msgBtn}
            onPress={() => Alert.alert('Sakhi Safety Chat', 'Our team is on standby 24/7. Opening chat…')}
            activeOpacity={0.85}
          >
            <Text style={s.msgIcon}>💬</Text>
            <Text style={s.msgBtnText}>Message Sakhi Team</Text>
          </TouchableOpacity>

          {/* Emergency authorities */}
          <TouchableOpacity
            style={s.authoritiesRow}
            onPress={() => Linking.openURL('tel:112')}
            activeOpacity={0.8}
          >
            <Text style={s.authoritiesText}>🛡️  Contact Authorities (112)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Bottom Footer ─────────────────────────────────────────────── */}
      <View style={s.footer}>
        <TouchableOpacity
          style={s.cancelBtn}
          onPress={handleCancel}
          disabled={cancelling}
          activeOpacity={0.6}
        >
          <Text style={s.cancelText}>
            {cancelling ? 'CANCELLING…' : "CANCEL SOS — I'M SAFE"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: DKRED },

  // Top nav
  topNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    height: 56, paddingHorizontal: 20,
    backgroundColor: RED,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  navIconBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  navIcon:    { fontSize: 22, color: WHITE, fontWeight: '700' },
  navTitle:   { fontSize: 17, fontWeight: '900', color: WHITE, letterSpacing: -0.4 },

  scroll: { paddingHorizontal: 24, paddingTop: 32, gap: 24 },

  // Siren
  sirenSection: {
    alignItems: 'center', justifyContent: 'center',
    height: 192, position: 'relative',
  },
  ringOuter: {
    position: 'absolute', width: 176, height: 176, borderRadius: 88,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
  },
  ringInner: {
    position: 'absolute', width: 128, height: 128, borderRadius: 64,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)',
  },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: WHITE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 10,
  },
  dangerIcon: { fontSize: 36 },

  // Header text
  headerText: { alignItems: 'center', gap: 10 },
  title:      { fontSize: 28, fontWeight: '900', color: WHITE, letterSpacing: -0.7 },
  subtitle:   { fontSize: 15, fontWeight: '400', color: 'rgba(255,255,255,0.80)', textAlign: 'center', lineHeight: 24 },

  // Card
  card: {
    backgroundColor: WHITE, borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12, shadowRadius: 32, elevation: 10,
    gap: 16,
  },
  statusList: { gap: 12 },
  statusRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkBg:    {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center',
  },
  checkMark:  { color: GREEN, fontSize: 12, fontWeight: '800' },
  statusText: { fontSize: 14, fontWeight: '600', color: '#1E1B2E' },
  divider:    { height: 1, backgroundColor: '#F5F0FF' },

  contactsSection: { gap: 12 },
  contactsHeading: {
    fontSize: 10, fontWeight: '700', color: '#94A3B8',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  contactRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  contactLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:      {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:  { fontSize: 16, fontWeight: '700', color: WHITE },
  contactName: { fontSize: 14, fontWeight: '700', color: '#1E1B2E' },
  contactRelation: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  notifiedPill: {
    backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
  },
  notifiedText: { fontSize: 10, fontWeight: '700', color: GREEN, letterSpacing: 0.5 },

  // Actions
  actionButtons: { gap: 12 },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', height: 56, backgroundColor: WHITE, borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
  },
  callIcon:    { fontSize: 18 },
  callBtnText: { fontSize: 16, fontWeight: '700', color: RED },

  msgBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', height: 56,
    borderWidth: 2, borderColor: WHITE, borderRadius: 14,
  },
  msgIcon:    { fontSize: 18 },
  msgBtnText: { fontSize: 16, fontWeight: '700', color: WHITE },

  authoritiesRow: {
    alignItems: 'center', paddingVertical: 8,
  },
  authoritiesText: {
    fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.85)',
    textDecorationLine: 'underline',
  },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center',
  },
  cancelBtn: { paddingVertical: 14, paddingHorizontal: 32 },
  cancelText: {
    fontSize: 11, fontWeight: '700',
    color: 'rgba(255,255,255,0.60)',
    letterSpacing: 2, textTransform: 'uppercase',
  },
});
