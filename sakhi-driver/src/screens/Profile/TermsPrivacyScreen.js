import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import SakhiModal from '../../components/SakhiModal';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const PURPLE = '#BEA3D8';
const DARK   = '#1E1B2E';
const MUTED  = '#6B7280';
const WHITE  = '#FFFFFF';
const BG     = '#F5F0FF';

const LEGAL_ITEMS = [
  {
    id: 'terms',
    icon: '📄',
    label: 'Terms of Service',
    modal: { icon: '📄', title: 'Terms of Service', message: 'Opening terms of service at sakhi.app/driver-terms' },
  },
  {
    id: 'privacy',
    icon: '🛡️',
    label: 'Privacy Policy',
    modal: { icon: '🛡️', title: 'Privacy Policy', message: 'Opening privacy policy at sakhi.app/privacy' },
  },
  {
    id: 'cookie',
    icon: '🍪',
    label: 'Cookie Policy',
    modal: { icon: '🍪', title: 'Cookie Policy', message: 'Opening cookie policy at sakhi.app/cookies' },
  },
  {
    id: 'driver_agreement',
    icon: '🤝',
    label: 'Driver Partner Agreement',
    modal: { icon: '🤝', title: 'Driver Partner Agreement', message: 'Opening driver partner agreement at sakhi.app/driver-agreement' },
  },
];

export default function TermsPrivacyScreen({ navigation }) {
  const [modal, setModal] = useState(null);

  const handleItemPress = (item) => {
    setModal({
      ...item.modal,
      buttons: [
        { text: 'Open in Browser', onPress: () => { setModal(null); Linking.openURL('https://sakhi.app'); } },
        { text: 'Close', style: 'cancel', onPress: () => setModal(null) },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="Terms & Privacy" onBack={() => navigation?.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <Text style={styles.pageSubtext}>Review our policies and guidelines</Text>

        {/* Legal Links Card */}
        <View style={styles.legalCard}>
          {LEGAL_ITEMS.map((item, index) => (
            <View key={item.id}>
              <TouchableOpacity style={styles.legalRow} activeOpacity={0.7} onPress={() => handleItemPress(item)}>
                <View style={styles.legalLeft}>
                  <View style={styles.legalIconBox}>
                    <Text style={styles.legalIcon}>{item.icon}</Text>
                  </View>
                  <Text style={styles.legalLabel}>{item.label}</Text>
                </View>
                <Text style={styles.legalChevron}>›</Text>
              </TouchableOpacity>
              {index < LEGAL_ITEMS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Last Updated Note */}
        <View style={styles.updateNote}>
          <Text style={styles.updateNoteText}>
            Last updated: January 2025
          </Text>
          <Text style={styles.updateNoteSubtext}>
            By using Sakhi as a driver partner, you agree to the above terms and policies.
          </Text>
        </View>

        <Text style={styles.footerText}>© {new Date().getFullYear()} Sakhi. All rights reserved.</Text>

      </ScrollView>

      <SakhiModal config={modal} onClose={() => setModal(null)} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:     { flex: 1, backgroundColor: BG },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 24, gap: 20, paddingBottom: 60 },

  pageSubtext: {
    fontSize: 14, color: MUTED,
    textAlign: 'center', marginBottom: 4,
  },

  // ── Legal Card ──
  legalCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 4,
    overflow: 'hidden',
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  legalLeft:    { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  legalIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  legalIcon:    { fontSize: 18 },
  legalLabel:   { fontSize: 15, fontWeight: '600', color: DARK, flex: 1 },
  legalChevron: { fontSize: 20, color: '#CBD5E1', fontWeight: '300' },
  divider:      { height: 1, backgroundColor: BG, marginHorizontal: 20 },

  // ── Update Note ──
  updateNote: {
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  updateNoteText:    { fontSize: 12, fontWeight: '700', color: PURPLE, textAlign: 'center' },
  updateNoteSubtext: { fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 18 },

  footerText: { textAlign: 'center', fontSize: 12, color: '#94A3B8', fontWeight: '500', marginTop: 8 },
});
