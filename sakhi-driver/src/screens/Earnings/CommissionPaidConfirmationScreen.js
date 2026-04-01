import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { startLocationTracking } from '../../services/locationTask';
import client from '../../api/client';
import ScreenHeader, { HEADER_HEIGHT } from '../../components/ScreenHeader';
import BottomNavBar, { NAV_HEIGHT } from '../../components/BottomNavBar';

// ── Receipt Row ───────────────────────────────────────────────────────────────
function ReceiptRow({ label, value, valuePurple }) {
  return (
    <View style={s.receiptRow}>
      <Text style={s.receiptLabel}>{label}</Text>
      <Text style={[s.receiptValue, valuePurple && s.receiptValuePurple]}>{value}</Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function CommissionPaidConfirmationScreen({ navigation, route }) {
  const { updateDriver } = useAuth();
  const params      = route?.params ?? {};
  const amount      = params.amount  ?? 350;
  const period      = params.period  ?? 'weekly';
  const payMethod   = params.method  ?? 'UPI';
  const txnId       = params.txnId   ?? 'TXN987654321';
  const isWeekly    = period === 'weekly';
  const periodLabel = isWeekly ? '23 Mar – 29 Mar 2026' : 'Today';
  const infoText    = isWeekly
    ? 'Your platform fee is active for 7 days. Earning starts now! 💜'
    : 'Your platform fee is active for today. Earning starts now! 💜';

  const handleGoOnline = () => {
    // 1. Optimistic context update — toggle shows ONLINE instantly
    updateDriver({ is_online: true });

    // 2. Fire-and-forget background tasks (don't block navigation)
    client.post('/drivers/status', { is_online: true }).catch(() => {});
    startLocationTracking().catch(() => {});

    // 3. Navigate immediately — no waiting
    navigation.reset({ index: 0, routes: [{ name: 'DriverHome' }] });
  };

  return (
    <View style={s.root}>
      <StatusBar style="dark" />

      {/* ── HEADER ── */}
      <ScreenHeader
        title="Payment Confirmed"
        onBack={() => navigation.reset({ index: 0, routes: [{ name: 'DriverHome' }] })}
      />

      {/* ── SCROLLABLE CONTENT ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── HERO: icon + heading + subtitle ── */}
        <View style={s.hero}>
          {/* White circle with green glow: 96×96 */}
          <View style={s.iconCircle}>
            <View style={s.greenIcon}>
              <Text style={s.checkMark}>✓</Text>
            </View>
            {/* rgba(34,197,94,0.1) overlay */}
            <View style={s.iconOverlay} />
          </View>

          {/* "Commission Paid!": 24px 800w #1E1B2E, letter-spacing -0.6 */}
          <Text style={s.heading}>Commission Paid!</Text>

          {/* Subtitle: 16px 500w #6B7280, line-height 26 */}
          <Text style={s.subtitle}>
            You're all set to go online and accept rides.
          </Text>
        </View>

        {/* ── RECEIPT CARD: white, radius 16, padding 24
              shadow: 0 16 32 rgba(124,58,237,0.08) ── */}
        <View style={s.receiptCard}>
          {/* Rows: gap 20 */}
          <View style={s.receiptRows}>
            {/* Amount Paid | ₹{amount} purple 18px 700w */}
            <ReceiptRow label="Amount Paid"    value={`₹${amount}`} valuePurple />
            {/* Period | date 14px 600w dark */}
            <ReceiptRow label="Period"         value={periodLabel} />
            {/* Payment Method | method 14px 600w dark */}
            <ReceiptRow label="Payment Method" value={payMethod} />
          </View>

          {/* HorizontalBorder: border-top 1px #F0ECFA, padding-top 16, gap 124.89 */}
          <View style={s.horizontalBorder}>
            {/* "Transaction ID": 12px 500w #6B7280 */}
            <Text style={s.txnLabel}>Transaction ID</Text>
            {/* TXN value: 12px Liberation Mono 400w #6B7280 */}
            <Text style={s.txnValue}>{txnId}</Text>
          </View>
        </View>

        {/* ── INFO BOX: bg #EDE9FE, radius 12, padding 16 ── */}
        <View style={s.infoBox}>
          {/* Text: 14px 500w #BEA3D8, centered, line-height 20 */}
          <Text style={s.infoText}>{infoText}</Text>
        </View>

        {/* ── GO ONLINE BUTTON: #BEA3D8, radius 12, h:56 ── */}
        <TouchableOpacity style={s.goOnlineBtn} onPress={handleGoOnline} activeOpacity={0.85}>
          {/* Text: 16px 700w #FFF */}
          <Text style={s.goOnlineBtnText}>Go Online Now</Text>
        </TouchableOpacity>

      </ScrollView>

      <BottomNavBar navigation={navigation} activeTab="wallet" />
    </View>
  );
}

const s = StyleSheet.create({

  /* Root */
  root: { flex: 1, backgroundColor: '#F5F0FF' },

  scroll: { flex: 1 },
  scrollContent: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 24,
  },

  /* ── Hero section (col, centered, gap 16) ── */
  hero: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingBottom: 8,
  },

  /* Background+Shadow: 96×96, white, radius 9999
     box-shadow: 0 0 40px rgba(34,197,94,0.2) */
  iconCircle: {
    width: 96, height: 96, borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.20, shadowRadius: 40,
    elevation: 8,
    marginBottom: 8,
  },
  /* Green icon: 50×50, #22C55E, radius 25 */
  greenIcon: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 0,
  },
  checkMark: { fontSize: 26, color: '#FFFFFF', fontWeight: '800' },
  /* Overlay: rgba(34,197,94,0.1), absolute fill, radius 9999, z:1 */
  iconOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 9999,
    backgroundColor: 'rgba(34,197,94,0.10)',
    zIndex: 1,
  },

  /* Commission Paid!: 24px 800w #1E1B2E, letter-spacing -0.6, line-height 32 */
  heading: {
    fontSize: 24, fontWeight: '800', color: '#1E1B2E',
    letterSpacing: -0.6, lineHeight: 32, textAlign: 'center',
  },
  /* Subtitle: 16px 500w #6B7280, line-height 26, centered */
  subtitle: {
    fontSize: 16, fontWeight: '500', color: '#6B7280',
    lineHeight: 26, textAlign: 'center',
  },

  /* ── Receipt card: white, radius 16, padding 24
        shadow: 0 16 32 rgba(124,58,237,0.08) ── */
  receiptCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08, shadowRadius: 32,
    elevation: 5,
    gap: 20,
  },
  /* Rows container: col, gap 20 */
  receiptRows: { gap: 20 },

  /* Receipt row: row, justify space-between */
  receiptRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  /* Label: 14px 500w #6B7280, line-height 20 */
  receiptLabel: { fontSize: 14, fontWeight: '500', color: '#6B7280', lineHeight: 20 },
  /* Value: 14px 600w #1E1B2E, line-height 20 */
  receiptValue: { fontSize: 14, fontWeight: '600', color: '#1E1B2E', lineHeight: 20 },
  /* Purple value: 18px 700w #BEA3D8 */
  receiptValuePurple: { fontSize: 18, fontWeight: '700', color: '#BEA3D8', lineHeight: 28 },

  /* HorizontalBorder: border-top 1px #F0ECFA, padding-top 16
     row, justify space-between */
  horizontalBorder: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F0ECFA',
    paddingTop: 16,
  },
  /* Transaction ID: 12px 500w #6B7280, line-height 16 */
  txnLabel: { fontSize: 12, fontWeight: '500', color: '#6B7280', lineHeight: 16 },
  /* TXN value: 12px 400w #6B7280, monospace */
  txnValue: { fontSize: 12, fontWeight: '400', color: '#6B7280', lineHeight: 16, fontFamily: 'monospace' },

  /* ── Info box: bg #EDE9FE, radius 12, padding 16 ── */
  infoBox: {
    width: '100%',
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  /* Text: 14px 500w #BEA3D8, centered, line-height 20 */
  infoText: {
    fontSize: 14, fontWeight: '500', color: '#BEA3D8',
    lineHeight: 20, textAlign: 'center',
  },

  /* ── Go Online button: col justify-center align-center
        padding: 16 0, h:56, bg #BEA3D8, radius 12
        shadow: 0 10 15 -3 rgba(0,0,0,0.1) ── */
  goOnlineBtn: {
    width: '100%', height: 56,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#BEA3D8',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10, shadowRadius: 15,
    elevation: 4,
  },
  /* Text: 16px 700w #FFF, line-height 24 */
  goOnlineBtnText: {
    fontSize: 16, fontWeight: '700', color: '#FFFFFF', lineHeight: 24, textAlign: 'center',
  },

});
