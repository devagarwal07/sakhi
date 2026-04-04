import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  SafeAreaView, Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import SakhiModal from '../../components/SakhiModal';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PURPLE  = '#BEA3D8';
const DEEP    = '#BEA3D8';
const DARK    = '#1E1B2E';
const MUTED   = '#6B7280';
const WHITE   = '#FFFFFF';
const BG      = '#F5F0FF';
const CARD_SH = { shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 20, elevation: 4 };

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
  label:      { fontSize: 15, fontWeight: '500', color: '#64748B' },
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

  // ── Official Sakhi commission rates ──────────────────────────────────────
  const DAILY_RATE  = 35;   // ₹35/day
  const WEEKLY_RATE = 210;  // ₹210 for 7 days (₹30/day, saves ₹35 vs paying daily)
  const amount      = route?.params?.amount ?? (isWeekly ? WEEKLY_RATE : DAILY_RATE);
  const screenTitle = isWeekly ? 'Weekly Commission' : 'Daily Commission';
  const driverName  = driver?.full_name?.split(' ')[0] ?? 'Driver';

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [rzpHtml, setRzpHtml]               = useState(null);
  const [showWebView, setShowWebView]       = useState(false);
  const [modal, setModal]                   = useState(null);
  const [commissionDue, setCommissionDue]   = useState(amount);   // amount prop is initial/fallback
  const [commissionEntries, setCommissionEntries] = useState([]);

  // ── Fetch actual unpaid commission on mount ────────────────────────────────────────
  useEffect(() => {
    client.get('/drivers/commission/status')
      .then(({ data }) => {
        if (data.total_due > 0) setCommissionDue(data.total_due);
        setCommissionEntries(data.entries || []);
      })
      .catch(() => {
        // Non-fatal — falls back to route.params.amount
      });
  }, []);

  // ── Build Razorpay checkout HTML ────────────────────────────────────────
  function buildRzpHtml({ key_id, order_id, amount, currency }) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#F5F0FF; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .loader { text-align:center; font-family:sans-serif; color:#6B7280; font-size:14px; }
    .spinner { width:36px; height:36px; border:3px solid #EDE9FE; border-top:3px solid #BEA3D8;
      border-radius:50%; animation:spin 0.8s linear infinite; margin:0 auto 12px; }
    @keyframes spin { to { transform:rotate(360deg); } }
  </style>
</head>
<body>
  <div class="loader"><div class="spinner"></div>Opening payment…</div>
  <script>
    var options = {
      key:         "${key_id}",
      order_id:    "${order_id}",
      amount:      "${amount}",
      currency:    "${currency}",
      name:        'Sakhi',
      description: '${isWeekly ? 'Weekly' : 'Daily'} Platform Commission',
      prefill: { name: '${driverName}' },
      theme: { color: '#BEA3D8' },
      modal: {
        ondismiss: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DISMISSED' }));
        }
      },
      handler: function(response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type:                'SUCCESS',
          razorpay_order_id:   response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature:  response.razorpay_signature,
        }));
      }
    };
    try {
      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function(resp) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type:'FAILED', error: resp.error.description }));
      });
      rzp.open();
    } catch(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type:'ERROR', error: e.message }));
    }
  </script>
</body>
</html>`;
  }

  // ── Pay — create order then open WebView ────────────────────────────────
  const handlePay = async () => {
    try {
      setPaymentLoading(true);
      const { data } = await client.post('/payments/commission/order', {
        amount:    commissionDue,          // use live amount from /commission/status
        period,
        driver_id: driver?.id,
      });
      setRzpHtml(buildRzpHtml({
        key_id:   data.key_id,
        order_id: data.order_id,
        amount:   String(data.amount),
        currency: data.currency || 'INR',
      }));
      setShowWebView(true);
    } catch (err) {
      setModal({
        icon: '⚠️',
        title: 'Payment Error',
        message: err.response?.data?.message ?? 'Could not initiate payment. Please try again.',
        buttons: [{ text: 'OK', onPress: () => setModal(null) }],
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  // ── Handle WebView message from Razorpay ────────────────────────────────
  const handleWebViewMessage = async (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'SUCCESS') {
        setShowWebView(false);
        try {
          // Verify signature on backend
          await client.post('/payments/commission/verify', {
            razorpay_order_id:   msg.razorpay_order_id,
            razorpay_payment_id: msg.razorpay_payment_id,
            razorpay_signature:  msg.razorpay_signature,
            period,
            amount,
          });
          navigation.replace('CommissionPaidConfirmation', {
            amount, period,
            method: 'Razorpay',
            txnId:  msg.razorpay_payment_id,
          });
        } catch {
          setModal({
            icon: '⚠️',
            title: 'Verification Failed',
            message: 'Payment received but verification failed. Contact support with your payment ID.',
            buttons: [{ text: 'OK', onPress: () => setModal(null) }],
          });
        }
      } else if (msg.type === 'DISMISSED') {
        setShowWebView(false);
      } else if (msg.type === 'FAILED' || msg.type === 'ERROR') {
        setShowWebView(false);
        setModal({
          icon: '⚠️',
          title: 'Payment Failed',
          message: msg.error ?? 'Something went wrong. Please try again.',
          buttons: [{ text: 'OK', onPress: () => setModal(null) }],
        });
      }
    } catch { /* JSON parse error — ignore */ }
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

          {/* Weekly savings badge */}
          {isWeekly && (
            <View style={s.savingsBadge}>
              <Text style={s.savingsBadgeText}>💰 Save ₹35 vs paying daily (₹30/day × 7)</Text>
            </View>
          )}

          <View style={s.divider} />

          {/* Breakdown */}
          {isWeekly ? (
            <>
              <BreakdownRow label="7-Day Plan (₹30/day)"     value="₹210" />
              <BreakdownRow label="vs. Daily Plan (₹35/day)" value="₹245" />
              <BreakdownRow label="Your Savings"             value="-₹35" />
            </>
          ) : (
            <>
              <BreakdownRow label="Daily platform fee"  value="₹35" />
              <BreakdownRow label="7-Day plan available" value="₹210" />
            </>
          )}
          <View style={s.divider} />
          <BreakdownRow label="Total payable" value={`₹${amount}`} bold accent />
        </View>

        {/* ── Free Trial Note ── */}
        <View style={s.trialNote}>
          <Text style={s.trialIcon}>🎁</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.trialTitle}>7-Day Free Trial for New Drivers</Text>
            <Text style={s.trialSub}>No commission charged for your first 7 days after account setup.</Text>
          </View>
        </View>

        {/* ── Warning ── */}
        <View style={s.warningRow}>
          <Text style={s.warningIcon}>⚠️</Text>
          <Text style={s.warningText}>Unpaid commission — you cannot go online until this is cleared.</Text>
        </View>

        {/* ── PAY VIA info ── */}
        <View style={s.rzpInfoCard}>
          <Feather name="shield" size={18} color={PURPLE} />
          <View style={{ flex: 1 }}>
            <Text style={s.rzpInfoTitle}>Pay via Razorpay</Text>
            <Text style={s.rzpInfoSub}>UPI · Cards · Net Banking · Wallets — all supported</Text>
          </View>
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
          style={[s.payBtn, paymentLoading && s.payBtnDisabled]}
          onPress={handlePay}
          disabled={paymentLoading}
          activeOpacity={0.85}
        >
          {paymentLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.payBtnText}>Pay ₹{amount} via Razorpay ⚡</Text>
          }
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

      {/* ── Razorpay WebView modal ── */}
      <Modal visible={showWebView} animationType="slide" onRequestClose={() => setShowWebView(false)}>
        <View style={{ flex: 1, backgroundColor: '#F5F0FF' }}>
          <View style={s.webViewHeader}>
            <Text style={s.webViewTitle}>Secure Payment</Text>
            <TouchableOpacity onPress={() => setShowWebView(false)}>
              <Feather name="x" size={22} color="#1E1B2E" />
            </TouchableOpacity>
          </View>
          {rzpHtml && (
            <WebView
              source={{ html: rzpHtml }}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['*']}
              onMessage={handleWebViewMessage}
              startInLoadingState
              renderLoading={() => (
                <View style={s.wvLoader}>
                  <ActivityIndicator size="large" color="#BEA3D8" />
                </View>
              )}
            />
          )}
        </View>
      </Modal>

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

  // Savings badge (weekly plan)
  savingsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  savingsBadgeText: { fontSize: 12, fontWeight: '700', color: '#059669' },

  // Free trial note
  trialNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#EDE9FE', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.15)',
  },
  trialIcon: { fontSize: 20, marginTop: 1 },
  trialTitle: { fontSize: 13, fontWeight: '700', color: '#4C1D95', marginBottom: 3 },
  trialSub:   { fontSize: 12, fontWeight: '400', color: '#6D28D9', lineHeight: 18 },

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

  // Razorpay info card
  rzpInfoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#EDE9FE', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: 'rgba(190,163,216,0.3)',
  },
  rzpInfoTitle: { fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 2 },
  rzpInfoSub:   { fontSize: 12, color: MUTED, lineHeight: 16 },

  // Razorpay WebView modal header
  webViewHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: WHITE,
    borderBottomWidth: 1, borderBottomColor: 'rgba(190,163,216,0.2)',
  },
  webViewTitle: { fontSize: 16, fontWeight: '700', color: DARK },
  wvLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F0FF',
  },
});
