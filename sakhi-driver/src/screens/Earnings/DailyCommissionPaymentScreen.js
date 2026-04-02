import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import SakhiModal from '../../components/SakhiModal';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PURPLE  = '#BEA3D8';
const DEEP    = '#7C3AED';
const DARK    = '#1C1A25';
const MUTED   = '#6B7280';
const WHITE   = '#FFFFFF';
const BG      = '#F5F0FF';
const CARD_SH = { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 20, elevation: 4 };

// ─── Breakdown row ────────────────────────────────────────────────────────────
function BreakdownRow({ label, value, bold, accent }) {
  return (
    <View style={br.row}>
      <Text style={[br.label, bold && br.bold]}>{label}</Text>
      <Text style={[br.value, bold && br.bold, accent && br.accent]}>{value}</Text>
    </View>
  );
}
const br = StyleSheet.create({
  row:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  label:  { fontSize: 14, fontWeight: '400', color: MUTED },
  value:  { fontSize: 14, fontWeight: '600', color: DARK },
  bold:   { fontWeight: '800', fontSize: 16 },
  accent: { color: PURPLE },
});

// ─── Payment Method Card ──────────────────────────────────────────────────────
function PayMethodCard({ id, icon, label, badge, active, onPress, children }) {
  return (
    <TouchableOpacity
      style={[pm.card, active && pm.cardActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={pm.row}>
        {/* Radio */}
        <View style={active ? pm.radioOn : pm.radioOff}>
          {active && <View style={pm.radioDot} />}
        </View>
        {/* Icon box */}
        <View style={[pm.iconBox, active && pm.iconBoxActive]}>
          <Text style={pm.iconEmoji}>{icon}</Text>
        </View>
        {/* Label + badge */}
        <View style={pm.textWrap}>
          <Text style={[pm.label, active && pm.labelActive]}>{label}</Text>
          {badge && <Text style={pm.badge}>{badge}</Text>}
        </View>
      </View>
      {/* Expandable area */}
      {active && children}
    </TouchableOpacity>
  );
}
const pm = StyleSheet.create({
  card: {
    backgroundColor: WHITE, borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: 'transparent',
    ...CARD_SH,
  },
  cardActive: { borderColor: 'rgba(190,163,216,0.4)', backgroundColor: BG },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radioOff:   { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1C4E9' },
  radioOn:    { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  radioDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: PURPLE },
  iconBox:    { width: 38, height: 38, borderRadius: 11, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  iconBoxActive: { backgroundColor: '#EADDFF' },
  iconEmoji:  { fontSize: 18 },
  textWrap:   { flex: 1 },
  label:      { fontSize: 15, fontWeight: '500', color: '#4A4455' },
  labelActive:{ fontWeight: '700', color: DARK },
  badge:      { fontSize: 11, color: MUTED, marginTop: 1 },
});

// ─── Processing Overlay ───────────────────────────────────────────────────────
function ProcessingOverlay({ visible, amount }) {
  if (!visible) return null;
  return (
    <View style={ov.backdrop}>
      <View style={ov.card}>
        {/* Header */}
        <View style={ov.header}>
          <View style={ov.brand}>
            <View style={ov.logoBox}><Text style={ov.logoLetter}>S</Text></View>
            <Text style={ov.brandName}>Sakhi Pay</Text>
          </View>
          <View style={ov.amtCol}>
            <Text style={ov.amtLabel}>AMOUNT DUE</Text>
            <Text style={ov.amtValue}>₹{amount}</Text>
          </View>
        </View>

        <View style={ov.divider} />

        {/* Body */}
        <View style={ov.body}>
          <View style={ov.spinnerRing}>
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
          <Text style={ov.statusText}>Processing Payment…</Text>
          <Text style={ov.statusSub}>Please do not close the app or press back.</Text>
        </View>

        {/* Footer */}
        <View style={ov.footer}>
          <Text style={ov.shield}>🛡️</Text>
          <Text style={ov.secured}>SECURED · 256-BIT ENCRYPTION</Text>
        </View>
      </View>
    </View>
  );
}
const ov = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(28,26,37,0.55)',
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
    paddingHorizontal: 24,
  },
  card:   { width: '100%', backgroundColor: WHITE, borderRadius: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
  brand:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox:{ width: 28, height: 28, borderRadius: 8, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  logoLetter:{ fontSize: 14, fontWeight: '900', color: WHITE },
  brandName: { fontSize: 15, fontWeight: '700', color: DARK },
  amtCol: { alignItems: 'flex-end' },
  amtLabel:{ fontSize: 9, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8 },
  amtValue:{ fontSize: 22, fontWeight: '800', color: DARK, letterSpacing: -0.8 },
  divider: { height: 1, backgroundColor: BG },
  body:    { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  spinnerRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#EADDFF', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  statusText: { fontSize: 18, fontWeight: '700', color: DARK, marginBottom: 8 },
  statusSub:  { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },
  footer:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BG, paddingVertical: 16 },
  shield:  { fontSize: 14 },
  secured: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.8 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DailyCommissionPaymentScreen({ navigation, route }) {
  const { driver } = useAuth();
  const insets = useSafeAreaInsets();

  const period      = route?.params?.period ?? 'daily';
  const isWeekly    = period === 'weekly';
  const amount      = route?.params?.amount ?? (isWeekly ? 350 : 50);
  const screenTitle = isWeekly ? 'Weekly Commission' : 'Daily Commission';
  const driverName  = driver?.full_name?.split(' ')[0] ?? 'Driver';

  const [method,       setMethod]       = useState('upi');
  const [upiId,        setUpiId]        = useState('');
  const [upiVerified,  setUpiVerified]  = useState(false);
  const [processing,   setProcessing]   = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [modal,        setModal]        = useState(null);

  // ── UPI-specific fields
  const [cardNumber,   setCardNumber]   = useState('');
  const [cardExpiry,   setCardExpiry]   = useState('');
  const [cardCvv,      setCardCvv]      = useState('');
  const [cardName,     setCardName]     = useState('');

  const handleVerifyUpi = () => {
    if (!upiId.includes('@')) {
      setModal({
        icon: '⚠️',
        title: 'Invalid UPI ID',
        message: 'UPI ID must contain @  (e.g. name@okaxis)',
        buttons: [{ text: 'OK', onPress: () => setModal(null) }],
      });
      return;
    }
    setUpiVerified(true);
    setModal({
      icon: '✅',
      title: 'UPI Verified',
      message: `${upiId} is ready for payment.`,
      buttons: [{ text: 'Great!', style: 'primary', onPress: () => setModal(null) }],
    });
  };

  const handlePay = async () => {
    if (method === 'upi' && !upiId.trim()) {
      setModal({
        icon: '⚠️',
        title: 'UPI ID Required',
        message: 'Please enter your UPI ID to proceed.',
        buttons: [{ text: 'OK', onPress: () => setModal(null) }],
      });
      return;
    }
    if (method === 'card' && (!cardNumber || !cardExpiry || !cardCvv || !cardName)) {
      setModal({
        icon: '⚠️',
        title: 'Card Details Required',
        message: 'Please fill in all card details.',
        buttons: [{ text: 'OK', onPress: () => setModal(null) }],
      });
      return;
    }

    setProcessing(true);
    setLoading(true);

    // Fire API in background
    client.post('/drivers/commission-pay', {
      period, amount,
      payment_method: method,
      upi_id: method === 'upi' ? upiId : undefined,
    }).catch(() => {});

    // Simulate processing (2.5s) → navigate
    setTimeout(() => {
      setProcessing(false);
      setLoading(false);
      navigation.replace('CommissionPaidConfirmation', {
        amount,
        period,
        method: method === 'upi' ? 'UPI' : method === 'card' ? 'Debit/Credit Card' : 'Net Banking',
        txnId: `TXN${Date.now()}`,
      });
    }, 2500);
  };

  // Breakdown rows
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const gst   = Math.round(amount * 0.18);
  const base  = amount - gst;

  return (
    <View style={s.root}>
      <StatusBar style="dark" />

      <ScreenHeader title={screenTitle} onBack={() => navigation.goBack()} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 160 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Greeting ── */}
        <View style={s.greeting}>
          <Text style={s.greetingHi}>Good Day, {driverName} 👋</Text>
          <Text style={s.greetingSub}>Complete your {isWeekly ? 'weekly' : 'daily'} platform fee to go online.</Text>
        </View>

        {/* ── Order Summary Card ── */}
        <View style={s.summaryCard}>
          {/* Due chip */}
          <View style={s.dueChip}>
            <Text style={s.dueChipText}>{isWeekly ? 'WEEKLY' : 'DAILY'} COMMISSION DUE</Text>
          </View>

          {/* Big amount */}
          <Text style={s.totalBig}>₹{amount}</Text>
          <Text style={s.totalDate}>Due by {today}</Text>

          <View style={s.divider} />

          {/* Breakdown */}
          <BreakdownRow label="Platform fee (base)" value={`₹${base}`} />
          <BreakdownRow label="GST (18%)"           value={`₹${gst}`} />
          <View style={s.divider} />
          <BreakdownRow label="Total payable" value={`₹${amount}`} bold accent />
        </View>

        {/* ── Warning ── */}
        <View style={s.warningRow}>
          <Text style={s.warningIcon}>⚠️</Text>
          <Text style={s.warningText}>Unpaid commission — you cannot go online until this is cleared.</Text>
        </View>

        {/* ── PAY VIA label ── */}
        <Text style={s.sectionLabel}>PAY VIA</Text>

        {/* ── UPI ── */}
        <PayMethodCard
          id="upi" icon="📲"
          label="UPI (PhonePe / GPay)"
          badge="Instant · No extra charges"
          active={method === 'upi'}
          onPress={() => { setMethod('upi'); setUpiVerified(false); }}
        >
          <View style={s.upiInputRow}>
            <TextInput
              style={s.upiInput}
              placeholder="Enter UPI ID  (e.g. name@okaxis)"
              placeholderTextColor="#B0A8C0"
              value={upiId}
              onChangeText={(t) => { setUpiId(t); setUpiVerified(false); }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={[s.verifyBtn, upiVerified && s.verifyBtnDone]}
              onPress={handleVerifyUpi}
            >
              <Text style={s.verifyBtnText}>{upiVerified ? 'Done ✓' : 'Verify'}</Text>
            </TouchableOpacity>
          </View>
          {/* Saved UPI hint */}
          <TouchableOpacity style={s.savedUpiHint} onPress={() => setUpiId('driver@okaxis')}>
            <Text style={s.savedUpiHintText}>💾  Use saved: driver@okaxis</Text>
          </TouchableOpacity>
        </PayMethodCard>

        {/* ── Card ── */}
        <PayMethodCard
          id="card" icon="💳"
          label="Debit / Credit Card"
          badge="Visa · Mastercard · Rupay"
          active={method === 'card'}
          onPress={() => setMethod('card')}
        >
          <View style={s.cardFormWrap}>
            <TextInput style={s.cardInput} placeholder="Card Number" placeholderTextColor="#B0A8C0"
              value={cardNumber} onChangeText={setCardNumber} keyboardType="numeric" maxLength={19} />
            <View style={s.cardRow}>
              <TextInput style={[s.cardInput, s.cardInputHalf]} placeholder="MM/YY" placeholderTextColor="#B0A8C0"
                value={cardExpiry} onChangeText={setCardExpiry} keyboardType="numeric" maxLength={5} />
              <TextInput style={[s.cardInput, s.cardInputHalf]} placeholder="CVV" placeholderTextColor="#B0A8C0"
                value={cardCvv} onChangeText={setCardCvv} keyboardType="numeric" maxLength={4} secureTextEntry />
            </View>
            <TextInput style={s.cardInput} placeholder="Cardholder Name" placeholderTextColor="#B0A8C0"
              value={cardName} onChangeText={setCardName} autoCapitalize="words" />
          </View>
        </PayMethodCard>

        {/* ── Net Banking ── */}
        <PayMethodCard
          id="net" icon="🏦"
          label="Net Banking"
          badge="All major banks supported"
          active={method === 'net'}
          onPress={() => setMethod('net')}
        >
          <View style={s.netBankingNote}>
            <Text style={s.netBankingNoteText}>You'll be redirected to your bank's portal to complete payment.</Text>
          </View>
        </PayMethodCard>

        {/* ── Policy note ── */}
        <View style={s.policyNote}>
          <Text style={s.policyIcon}>ⓘ</Text>
          <Text style={s.policyText}>
            Commission is non-refundable. Your online status will be activated immediately after successful payment.
          </Text>
        </View>

      </ScrollView>

      {/* ── Fixed Footer ── */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Security badge */}
        <View style={s.secRow}>
          <Text style={s.secIcon}>🔒</Text>
          <Text style={s.secText}>SECURED BY 256-BIT ENCRYPTION</Text>
        </View>

        {/* Pay CTA */}
        <TouchableOpacity
          style={[s.payBtn, loading && s.payBtnDisabled]}
          onPress={handlePay}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={s.payBtnText}>{loading ? 'Processing…' : `Pay ₹${amount} & Go Online`}</Text>
          {!loading && <Text style={s.payBtnIcon}> ⚡</Text>}
        </TouchableOpacity>

        {/* Pay Later */}
        <TouchableOpacity
          style={s.payLaterBtn}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'DriverHome' }] })}
          activeOpacity={0.7}
        >
          <Text style={s.payLaterText}>PAY LATER — STAY OFFLINE</Text>
        </TouchableOpacity>
      </View>

      {/* ── Processing Overlay ── */}
      <ProcessingOverlay visible={processing} amount={amount} />

      {/* ── SakhiModal ── */}
      <SakhiModal config={modal} onClose={() => setModal(null)} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },

  // Greeting
  greeting:    { gap: 4 },
  greetingHi:  { fontSize: 20, fontWeight: '700', color: DARK, letterSpacing: -0.4 },
  greetingSub: { fontSize: 13, fontWeight: '400', color: MUTED, lineHeight: 18 },

  // Order Summary Card
  summaryCard: {
    backgroundColor: WHITE, borderRadius: 20,
    paddingVertical: 24, paddingHorizontal: 20, gap: 0,
    ...CARD_SH,
  },
  dueChip: {
    alignSelf: 'flex-start', borderWidth: 1, borderColor: '#D1C4E9',
    borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 4,
    marginBottom: 12,
  },
  dueChipText: { fontSize: 9, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 1 },
  totalBig:   { fontSize: 52, fontWeight: '900', color: DARK, letterSpacing: -2.5, lineHeight: 58, marginBottom: 2 },
  totalDate:  { fontSize: 12, fontWeight: '400', color: MUTED, marginBottom: 16 },
  divider:    { height: 1, backgroundColor: '#F0EBF8', marginVertical: 4 },

  // Warning
  warningRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFF2F0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  warningIcon: { fontSize: 16, marginTop: 1 },
  warningText: { fontSize: 13, fontWeight: '600', color: '#B91C1C', flex: 1, lineHeight: 19 },

  // Section label
  sectionLabel: { fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 1.2 },

  // UPI input row
  upiInputRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  upiInput: {
    flex: 1, backgroundColor: WHITE,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontWeight: '500', color: DARK,
    borderWidth: 1, borderColor: 'rgba(190,163,216,0.25)',
  },
  verifyBtn:     { backgroundColor: PURPLE, borderRadius: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  verifyBtnDone: { backgroundColor: '#059669' },
  verifyBtnText: { fontSize: 13, fontWeight: '700', color: WHITE },
  savedUpiHint:  { marginTop: 10, paddingVertical: 8, paddingHorizontal: 4 },
  savedUpiHintText: { fontSize: 12, fontWeight: '600', color: PURPLE },

  // Card form
  cardFormWrap: { marginTop: 14, gap: 10 },
  cardInput: {
    backgroundColor: WHITE, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontWeight: '500', color: DARK,
    borderWidth: 1, borderColor: 'rgba(190,163,216,0.25)',
  },
  cardRow:       { flexDirection: 'row', gap: 10 },
  cardInputHalf: { flex: 1 },

  // Net banking note
  netBankingNote: { marginTop: 12, backgroundColor: WHITE, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(190,163,216,0.2)' },
  netBankingNoteText: { fontSize: 12, color: MUTED, lineHeight: 18 },

  // Policy note
  policyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#EDE9FE', borderRadius: 14, padding: 16 },
  policyIcon: { fontSize: 16, color: PURPLE, marginTop: 1 },
  policyText: { flex: 1, fontSize: 12, color: MUTED, lineHeight: 18 },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: BG, paddingHorizontal: 20, paddingTop: 14,
    gap: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(190,163,216,0.15)',
  },
  secRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secIcon:  { fontSize: 11 },
  secText:  { fontSize: 10, fontWeight: '600', color: MUTED, letterSpacing: 0.6 },
  payBtn: {
    height: 56, borderRadius: 16, backgroundColor: PURPLE,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: DEEP, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 6,
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { fontSize: 16, fontWeight: '700', color: WHITE },
  payBtnIcon: { fontSize: 16, color: WHITE },
  payLaterBtn:  { alignItems: 'center', paddingVertical: 2 },
  payLaterText: { fontSize: 11, fontWeight: '700', color: PURPLE, textTransform: 'uppercase', letterSpacing: 1 },
});
