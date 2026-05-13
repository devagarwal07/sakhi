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
import { useTranslation } from 'react-i18next';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PURPLE = '#BEA3D8';
const DEEP = '#BEA3D8';
const DARK = '#1E1B2E';
const MUTED = '#6B7280';
const WHITE = '#FFFFFF';
const BG = '#F5F0FF';
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  label: { fontSize: 14, fontWeight: '400', color: MUTED },
  value: { fontSize: 14, fontWeight: '600', color: DARK },
  bold: { fontWeight: '800', fontSize: 16 },
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radioOff: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1C4E9' },
  radioOn: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PURPLE },
  iconBox: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  iconBoxActive: { backgroundColor: '#EADDFF' },
  iconEmoji: { fontSize: 18 },
  textWrap: { flex: 1 },
  label: { fontSize: 15, fontWeight: '500', color: '#64748B' },
  labelActive: { fontWeight: '700', color: DARK },
  badge: { fontSize: 11, color: MUTED, marginTop: 1 },
});

// ─── Processing Overlay ───────────────────────────────────────────────────────
function ProcessingOverlay({ visible, amount, t }) {
  if (!visible) return null;
  return (
    <View style={ov.backdrop}>
      <View style={ov.card}>
        {/* Header */}
        <View style={ov.header}>
          <View style={ov.brand}>
            <View style={ov.logoBox}><Text style={ov.logoLetter}>S</Text></View>
            <Text style={ov.brandName}>{t('earnings.sakhiPay')}</Text>
          </View>
          <View style={ov.amtCol}>
            <Text style={ov.amtLabel}>{t('earnings.amountDue')}</Text>
            <Text style={ov.amtValue}>₹{amount}</Text>
          </View>
        </View>

        <View style={ov.divider} />

        {/* Body */}
        <View style={ov.body}>
          <View style={ov.spinnerRing}>
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
          <Text style={ov.statusText}>{t('earnings.processingPayment')}</Text>
          <Text style={ov.statusSub}>{t('earnings.doNotClose')}</Text>
        </View>

        {/* Footer */}
        <View style={ov.footer}>
          <Text style={ov.shield}>🛡️</Text>
          <Text style={ov.secured}>{t('earnings.securedEncryption')}</Text>
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
  card: { width: '100%', backgroundColor: WHITE, borderRadius: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { fontSize: 14, fontWeight: '900', color: WHITE },
  brandName: { fontSize: 15, fontWeight: '700', color: DARK },
  amtCol: { alignItems: 'flex-end' },
  amtLabel: { fontSize: 9, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8 },
  amtValue: { fontSize: 22, fontWeight: '800', color: DARK, letterSpacing: -0.8 },
  divider: { height: 1, backgroundColor: BG },
  body: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  spinnerRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#EADDFF', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  statusText: { fontSize: 18, fontWeight: '700', color: DARK, marginBottom: 8 },
  statusSub: { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BG, paddingVertical: 16 },
  shield: { fontSize: 14 },
  secured: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.8 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DailyCommissionPaymentScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { driver } = useAuth();
  const insets = useSafeAreaInsets();

  const period = route?.params?.period ?? 'daily';
  const isWeekly = period === 'weekly';

  // ── Official Sakhi commission rates ──────────────────────────────────────
  const DAILY_RATE = 35;   // ₹35/day
  const WEEKLY_RATE = 210;  // ₹210 for 7 days (₹30/day, saves ₹35 vs paying daily)
  const amount = route?.params?.amount ?? (isWeekly ? WEEKLY_RATE : DAILY_RATE);
  const screenTitle = isWeekly ? t('earnings.weeklyCommissionTitle') : t('earnings.dailyCommissionTitle');
  const driverName = driver?.full_name?.split(' ')[0] ?? t('common.driver');

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [rzpHtml, setRzpHtml] = useState(null);
  const [showWebView, setShowWebView] = useState(false);
  const [modal, setModal] = useState(null);
  const [commissionDue, setCommissionDue] = useState(amount);   // amount prop is initial/fallback
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
    const openingPayment = t('earnings.openingPayment');
    const commissionDesc = t('earnings.platformCommissionDescription', {
      period: isWeekly ? t('earnings.weekly') : t('earnings.daily'),
    });
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
  <div class="loader"><div class="spinner"></div>${openingPayment}</div>
  <script>
    var options = {
      key:         "${key_id}",
      order_id:    "${order_id}",
      amount:      "${amount}",
      currency:    "${currency}",
      name:        'Sakhi',
      description: '${commissionDesc}',
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
        amount: commissionDue,          // use live amount from /commission/status
        period,
        driver_id: driver?.id,
      });
      setRzpHtml(buildRzpHtml({
        key_id: data.key_id,
        order_id: data.order_id,
        amount: String(data.amount),
        currency: data.currency || 'INR',
      }));
      setShowWebView(true);
    } catch (err) {
      setModal({
        icon: '⚠️',
        title: t('earnings.paymentErrorTitle'),
        message: err.response?.data?.message ?? t('earnings.paymentErrorMessage'),
        buttons: [{ text: t('common.ok'), onPress: () => setModal(null) }],
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
            razorpay_order_id: msg.razorpay_order_id,
            razorpay_payment_id: msg.razorpay_payment_id,
            razorpay_signature: msg.razorpay_signature,
            period,
            amount,
          });
          navigation.replace('CommissionPaidConfirmation', {
            amount, period,
            method: 'Razorpay',
            txnId: msg.razorpay_payment_id,
          });
        } catch {
          setModal({
            icon: '⚠️',
            title: t('earnings.verificationFailedTitle'),
            message: t('earnings.verificationFailedMessage'),
            buttons: [{ text: t('common.ok'), onPress: () => setModal(null) }],
          });
        }
      } else if (msg.type === 'DISMISSED') {
        setShowWebView(false);
      } else if (msg.type === 'FAILED' || msg.type === 'ERROR') {
        setShowWebView(false);
        setModal({
          icon: '⚠️',
          title: t('earnings.paymentFailedTitle'),
          message: msg.error ?? t('earnings.paymentFailedMessage'),
          buttons: [{ text: t('common.ok'), onPress: () => setModal(null) }],
        });
      }
    } catch { /* JSON parse error — ignore */ }
  };

  // Breakdown rows
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const gst = Math.round(amount * 0.18);
  const base = amount - gst;

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
          <Text style={s.greetingHi}>{t('home.goodDay')}</Text>
          <Text style={s.greetingSub}>
            {t('earnings.platformFeePrompt', { period: isWeekly ? t('earnings.weekly') : t('earnings.daily') })}
          </Text>
        </View>

        {/* ── Commission Card ── */}
        <View style={s.summaryCard}>
          {/* Row 1: Label + Status Chip */}
          <View style={s.row1}>
            <View style={{ flex: 1 }}>
              <Text style={s.commLabel}>
                {isWeekly ? 'WEEKLY COMMISSION\nDUE' : 'DAILY COMMISSION\nDUE'}
              </Text>
            </View>
            <View style={s.dueChip}>
              <Text style={s.dueChipText}>
                {`DUE BY ${today.toUpperCase()}`}
              </Text>
            </View>
          </View>

          {/* Center Amount */}
          <View style={s.centerAmount}>
            <Text style={s.totalBig}>₹{amount}</Text>
            <Text style={s.totalDate}>
              {isWeekly ? `7 days × ₹${WEEKLY_RATE / 7}/day` : `1 day × ₹${DAILY_RATE}/day`}
            </Text>
          </View>

          {/* Warning/Status Rows */}
          <View style={s.statusSection}>
            {/* Warning row */}
            <View style={s.warningRow}>
              <Text style={s.warningIcon}>⚠️</Text>
              <Text style={s.warningText}>
                Unpaid — You cannot go online until paid
              </Text>
            </View>
            {/* Info row */}
            <View style={s.infoRow}>
              <Feather name="info" size={15} color={PURPLE} />
              <Text style={s.infoRowText}>{t('earnings.dueBy', { date: today })}</Text>
            </View>
          </View>
        </View>

        {/* ── Payment Methods Section ── */}
        <View style={s.payMethodsSection}>
          <Text style={s.payMethodsHeading}>PAYMENT METHODS</Text>

          <View style={s.payMethodsList}>
            {/* UPI Row (Expanded) */}
            <View style={s.upiCard}>
              <View style={s.pmRow}>
                <View style={s.pmIconBox}>
                  <Feather name="smartphone" size={18} color={PURPLE} />
                </View>
                <Text style={s.pmLabelActive}>UPI / Google Pay / PhonePe</Text>
                <View style={s.radioOn}>
                  <View style={s.radioDotInner} />
                </View>
              </View>
              {/* UPI Input */}
              <View style={s.upiInputRow}>
                <View style={s.upiInputWrap}>
                  <Text style={s.upiPlaceholder}>Enter UPI ID (e.g. meena@okaxis)</Text>
                </View>
                <TouchableOpacity style={s.verifyBtn} activeOpacity={0.8}>
                  <Text style={s.verifyBtnText}>Verify</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Card Row */}
            <View style={s.cardRow}>
              <View style={s.pmRow}>
                <View style={s.pmIconBox}>
                  <Feather name="credit-card" size={18} color={MUTED} />
                </View>
                <Text style={s.pmLabel}>Credit / Debit Card</Text>
                <View style={s.radioOff} />
              </View>
            </View>

            {/* Net Banking Row */}
            <View style={s.netBankRow}>
              <View style={s.pmRow}>
                <View style={s.pmIconBox}>
                  <Feather name="globe" size={18} color={MUTED} />
                </View>
                <Text style={s.pmLabel}>Net Banking</Text>
                <View style={s.radioOff} />
              </View>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* ── Fixed Footer ── */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Security badge */}
        <View style={s.secRow}>
          <Text style={s.secIcon}>🔒</Text>
          <Text style={s.secText}>{t('earnings.securedEncryption')}</Text>
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
            : <Text style={s.payBtnText}>{t('earnings.payViaRazorpay')} ₹{amount} ⚡</Text>
          }
        </TouchableOpacity>

        {/* Pay Later */}
        <TouchableOpacity
          style={s.payLaterBtn}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'DriverHome' }] })}
          activeOpacity={0.7}
        >
          <Text style={s.payLaterText}>{t('earnings.payLater')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Razorpay WebView modal ── */}
      <Modal visible={showWebView} animationType="slide" onRequestClose={() => setShowWebView(false)}>
        <View style={{ flex: 1, backgroundColor: '#F5F0FF' }}>
          <View style={s.webViewHeader}>
            <Text style={s.webViewTitle}>{t('ride.securePayment')}</Text>
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
  scrollContent: { paddingHorizontal: 24, paddingTop: 8, gap: 24 },

  // Greeting
  greeting: { gap: 4 },
  greetingHi: { fontSize: 20, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.5, lineHeight: 28 },
  greetingSub: { fontSize: 14, fontWeight: '400', color: MUTED, lineHeight: 18 },

  // Commission Card
  summaryCard: {
    backgroundColor: WHITE, borderRadius: 12,
    padding: 24, gap: 24,
    borderLeftWidth: 4, borderLeftColor: PURPLE,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08, shadowRadius: 32, elevation: 6,
  },
  row1: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  commLabel: {
    fontSize: 12, fontWeight: '700', color: MUTED,
    letterSpacing: 0.6, textTransform: 'uppercase', lineHeight: 16,
  },
  dueChip: {
    backgroundColor: '#FFDCC6',
    borderWidth: 1, borderColor: 'rgba(161, 81, 0, 0.3)',
    borderRadius: 9999, paddingHorizontal: 15, paddingVertical: 7,
  },
  dueChipText: { fontSize: 10, fontWeight: '700', color: '#FFB784', lineHeight: 15 },
  centerAmount: { alignItems: 'center', paddingVertical: 8, gap: 8 },
  totalBig: { fontSize: 48, fontWeight: '800', color: PURPLE, letterSpacing: -2.4, lineHeight: 48, textAlign: 'center' },
  totalDate: { fontSize: 14, fontWeight: '500', color: MUTED, textAlign: 'center', lineHeight: 20 },
  // Status section inside card
  statusSection: {
    borderTopWidth: 1, borderTopColor: '#F6F1FF',
    paddingTop: 16, gap: 12,
  },
  warningRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255, 218, 214, 0.1)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  warningIcon: { fontSize: 16 },
  warningText: { fontSize: 12, fontWeight: '600', color: '#BA1A1A', flex: 1, lineHeight: 16 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(190, 163, 216, 0.1)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  infoRowText: { fontSize: 12, fontWeight: '500', color: '#4A4455', lineHeight: 16 },

  // Payment Methods Section
  payMethodsSection: { gap: 16 },
  payMethodsHeading: {
    fontSize: 14, fontWeight: '700', color: '#1E1B2E',
    letterSpacing: 1.4, textTransform: 'uppercase',
    opacity: 0.6, paddingHorizontal: 4, lineHeight: 20,
  },
  payMethodsList: { gap: 12 },
  // UPI expanded card
  upiCard: {
    backgroundColor: WHITE, borderRadius: 12, padding: 16, gap: 16,
    borderWidth: 2, borderColor: PURPLE,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04, shadowRadius: 20, elevation: 3,
  },
  pmRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  pmIconBox: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#F5F0FF',
    alignItems: 'center', justifyContent: 'center',
  },
  pmLabelActive: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1C1A25', lineHeight: 20 },
  pmLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#4A4455', lineHeight: 20 },
  radioOn: {
    width: 20, height: 20, borderRadius: 9999,
    borderWidth: 4, borderColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
  },
  radioDotInner: { width: 8, height: 8, borderRadius: 9999, backgroundColor: PURPLE },
  radioOff: {
    width: 20, height: 20, borderRadius: 9999,
    borderWidth: 2, borderColor: '#CCC3D8',
  },
  upiInputRow: { flexDirection: 'row', gap: 8 },
  upiInputWrap: {
    flex: 1, backgroundColor: '#F6F1FF', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 9, justifyContent: 'center',
  },
  upiPlaceholder: { fontSize: 14, fontWeight: '400', color: '#9CA3AF', lineHeight: 17 },
  verifyBtn: {
    backgroundColor: 'rgba(190, 163, 216, 0.1)', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center',
  },
  verifyBtnText: { fontSize: 12, fontWeight: '700', color: PURPLE, lineHeight: 16 },
  // Card / Net Banking rows
  cardRow: {
    backgroundColor: WHITE, borderRadius: 12, padding: 16,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04, shadowRadius: 20, elevation: 2,
  },
  netBankRow: {
    backgroundColor: WHITE, borderRadius: 12, padding: 16,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04, shadowRadius: 20, elevation: 2,
  },

  // Footer — Figma: rgba(255,255,255,0.9) + blur
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24,
    gap: 16,
  },
  secRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secIcon: { fontSize: 11 },
  secText: { fontSize: 10, fontWeight: '600', color: MUTED, letterSpacing: 0.6 },
  // Figma: border-radius 12px, box-shadow 0px 16px 32px rgba(124,58,237,0.2)
  payBtn: {
    height: 56, borderRadius: 12, backgroundColor: PURPLE,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2, shadowRadius: 32, elevation: 8,
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { fontSize: 16, fontWeight: '700', color: WHITE, lineHeight: 24 },
  payBtnIcon: { fontSize: 13, color: WHITE },
  // Figma: 14px / 600 / #6B7280
  payLaterBtn: { alignItems: 'center', paddingVertical: 2 },
  payLaterText: { fontSize: 14, fontWeight: '600', color: MUTED, lineHeight: 20 },

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
