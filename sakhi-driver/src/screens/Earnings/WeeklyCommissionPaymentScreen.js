/**
 * WeeklyCommissionPaymentScreen
 * Standalone screen — fully independent from DailyCommissionPaymentScreen.
 * Pixel-matched to Figma weekly commission payment specs.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, ScrollView, ActivityIndicator,
  SafeAreaView, Modal, Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import SakhiModal from '../../components/SakhiModal';
import { useTranslation } from 'react-i18next';

// ─── Design tokens (from Figma) ──────────────────────────────────────────────
const PURPLE  = '#BEA3D8';
const DARK    = '#1E1B2E';
const MUTED   = '#6B7280';
const WHITE   = '#FFFFFF';
const BG      = '#F5F0FF';
const WEEKLY_RATE = 210;

export default function WeeklyCommissionPaymentScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { driver } = useAuth();
  const insets = useSafeAreaInsets();

  const amount = route?.params?.amount ?? WEEKLY_RATE;
  const driverName = driver?.full_name?.split(' ')[0] ?? 'Sakhi';
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [rzpHtml, setRzpHtml] = useState(null);
  const [showWebView, setShowWebView] = useState(false);
  const [modal, setModal] = useState(null);
  const [commissionDue, setCommissionDue] = useState(amount);
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  useEffect(() => {
    client.get('/drivers/commission/status')
      .then(({ data }) => {
        if (data.total_due > 0) setCommissionDue(data.total_due);
      })
      .catch(() => {});
  }, []);

  // ── Razorpay HTML builder ─────────────────────────────────────────────────
  function buildRzpHtml({ key_id, order_id, amount, currency }) {
    return `<!DOCTYPE html>
<html><head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#F5F0FF;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .loader{text-align:center;font-family:sans-serif;color:#6B7280;font-size:14px}
    .spinner{width:36px;height:36px;border:3px solid #EDE9FE;border-top:3px solid #BEA3D8;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 12px}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head><body>
  <div class="loader"><div class="spinner"></div>${t('earnings.openingPayment')}</div>
  <script>
    var rzp = new Razorpay({
      key:"${key_id}",order_id:"${order_id}",amount:"${amount}",currency:"${currency}",
      name:'Sakhi',description:'Weekly Platform Commission',
      prefill:{name:'${driverName}'},theme:{color:'#BEA3D8'},
      modal:{ondismiss:function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'DISMISSED'}))}},
      handler:function(r){window.ReactNativeWebView.postMessage(JSON.stringify({type:'SUCCESS',razorpay_order_id:r.razorpay_order_id,razorpay_payment_id:r.razorpay_payment_id,razorpay_signature:r.razorpay_signature}))}
    });
    rzp.on('payment.failed',function(r){window.ReactNativeWebView.postMessage(JSON.stringify({type:'FAILED',error:r.error.description}))});
    rzp.open();
  </script>
</body></html>`;
  }

  // ── Pay handler ───────────────────────────────────────────────────────────
  const handlePay = async () => {
    try {
      setPaymentLoading(true);
      const { data } = await client.post('/payments/commission/order', {
        amount: commissionDue, period: 'weekly', driver_id: driver?.id,
      });
      setRzpHtml(buildRzpHtml({
        key_id: data.key_id, order_id: data.order_id,
        amount: String(data.amount), currency: data.currency || 'INR',
      }));
      setShowWebView(true);
    } catch (err) {
      setModal({
        icon: '⚠️', title: t('earnings.paymentErrorTitle'),
        message: err.response?.data?.message ?? t('earnings.paymentErrorMessage'),
        buttons: [{ text: t('common.ok'), onPress: () => setModal(null) }],
      });
    } finally { setPaymentLoading(false); }
  };

  // ── WebView message handler ───────────────────────────────────────────────
  const handleWebViewMessage = async (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'SUCCESS') {
        setShowWebView(false);
        try {
          await client.post('/payments/commission/verify', {
            razorpay_order_id: msg.razorpay_order_id,
            razorpay_payment_id: msg.razorpay_payment_id,
            razorpay_signature: msg.razorpay_signature,
            period: 'weekly', amount,
          });
          navigation.replace('CommissionPaidConfirmation', {
            amount, period: 'weekly', method: 'Razorpay', txnId: msg.razorpay_payment_id,
          });
        } catch {
          setModal({
            icon: '⚠️', title: t('earnings.verificationFailedTitle'),
            message: t('earnings.verificationFailedMessage'),
            buttons: [{ text: t('common.ok'), onPress: () => setModal(null) }],
          });
        }
      } else if (msg.type === 'DISMISSED') {
        setShowWebView(false);
      } else if (msg.type === 'FAILED' || msg.type === 'ERROR') {
        setShowWebView(false);
        setModal({
          icon: '⚠️', title: t('earnings.paymentFailedTitle'),
          message: msg.error ?? t('earnings.paymentFailedMessage'),
          buttons: [{ text: t('common.ok'), onPress: () => setModal(null) }],
        });
      }
    } catch { /* ignore */ }
  };

  // ── Avatar initials ───────────────────────────────────────────────────────
  const initials = (driver?.full_name || 'D')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={s.root}>
      <StatusBar style="dark" />

      {/* ════════ HEADER ════════ */}
      <View style={[s.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={s.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={PURPLE} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Weekly Commission</Text>
          {/* Spacer to balance the back button */}
          <View style={s.backBtn} />
        </View>
      </View>

      {/* ════════ SCROLLABLE CONTENT ════════ */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Greeting Section ── */}
        <View style={s.greetingSection}>
          <Text style={s.greetingText}>{greeting}, {driverName} 👋</Text>
          <Text style={s.subtitleText}>
            Pay your weekly platform fee to go online this week.
          </Text>
        </View>

        {/* ── Commission Card ── */}
        <View style={s.commCard}>
          {/* Row 1: Label + Due Chip */}
          <View style={s.row1}>
            <Text style={s.commLabel}>{'WEEKLY COMMISSION\nDUE'}</Text>
            <View style={s.dueChip}>
              <Text style={s.dueChipText}>{`DUE BY\n${today.toUpperCase()}`}</Text>
            </View>
          </View>

          {/* Center Amount */}
          <View style={s.centerAmount}>
            <Text style={s.amountBig}>₹{commissionDue}</Text>
            <Text style={s.amountSub}>7 days × ₹{Math.round(WEEKLY_RATE / 7)}/day</Text>
          </View>

          {/* Warning / Status Rows */}
          <View style={s.statusSection}>
            <View style={s.warningRow}>
              <Feather name="alert-triangle" size={15} color="#BA1A1A" />
              <Text style={s.warningText}>
                Unpaid — You cannot go online until paid
              </Text>
            </View>
            <View style={s.infoRow}>
              <Feather name="info" size={15} color={PURPLE} />
              <Text style={s.infoText}>Due by {today}</Text>
            </View>
          </View>
        </View>

        {/* ── Payment Methods ── */}
        <View style={s.pmSection}>
          <Text style={s.pmHeading}>PAYMENT METHODS</Text>

          <View style={s.pmList}>
            {/* UPI Row (Expanded) */}
            <TouchableOpacity
              style={[s.pmCard, selectedMethod === 'upi' && s.pmCardActive]}
              onPress={() => setSelectedMethod('upi')}
              activeOpacity={0.85}
            >
              <View style={s.pmRow}>
                <View style={s.pmIconBox}>
                  <Feather name="smartphone" size={18} color={selectedMethod === 'upi' ? PURPLE : MUTED} />
                </View>
                <Text style={selectedMethod === 'upi' ? s.pmLabelActive : s.pmLabel}>
                  UPI / Google Pay / PhonePe
                </Text>
                {selectedMethod === 'upi' ? (
                  <View style={s.radioOn}><View style={s.radioDot} /></View>
                ) : (
                  <View style={s.radioOff} />
                )}
              </View>
              {selectedMethod === 'upi' && (
                <View style={s.upiInputRow}>
                  <View style={s.upiInputWrap}>
                    <TextInput
                      style={s.upiInput}
                      placeholder="Enter UPI ID (e.g. meena@okaxis)"
                      placeholderTextColor="#9CA3AF"
                      value={upiId}
                      onChangeText={setUpiId}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                  <TouchableOpacity style={s.verifyBtn} activeOpacity={0.8} onPress={() => setModal({ icon: '✅', title: 'UPI Verification', message: 'UPI ID verification is handled automatically at checkout.', buttons: [{text: 'OK', onPress: () => setModal(null)}]})}>
                    <Text style={s.verifyBtnText}>Verify</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>

            {/* Card Row */}
            <TouchableOpacity
              style={[s.pmCard, selectedMethod === 'card' && s.pmCardActive]}
              onPress={() => setSelectedMethod('card')}
              activeOpacity={0.85}
            >
              <View style={s.pmRow}>
                <View style={s.pmIconBox}>
                  <Feather name="credit-card" size={18} color={selectedMethod === 'card' ? PURPLE : MUTED} />
                </View>
                <Text style={selectedMethod === 'card' ? s.pmLabelActive : s.pmLabel}>
                  Credit / Debit Card
                </Text>
                {selectedMethod === 'card' ? (
                  <View style={s.radioOn}><View style={s.radioDot} /></View>
                ) : (
                  <View style={s.radioOff} />
                )}
              </View>
            </TouchableOpacity>

            {/* Net Banking Row */}
            <TouchableOpacity
              style={[s.pmCard, selectedMethod === 'netbanking' && s.pmCardActive]}
              onPress={() => setSelectedMethod('netbanking')}
              activeOpacity={0.85}
            >
              <View style={s.pmRow}>
                <View style={s.pmIconBox}>
                  <Feather name="globe" size={18} color={selectedMethod === 'netbanking' ? PURPLE : MUTED} />
                </View>
                <Text style={selectedMethod === 'netbanking' ? s.pmLabelActive : s.pmLabel}>
                  Net Banking
                </Text>
                {selectedMethod === 'netbanking' ? (
                  <View style={s.radioOn}><View style={s.radioDot} /></View>
                ) : (
                  <View style={s.radioOff} />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ════════ FOOTER ════════ */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={s.footerInner}>
          <TouchableOpacity
            style={[s.payBtn, paymentLoading && s.payBtnDisabled]}
            onPress={handlePay}
            disabled={paymentLoading}
            activeOpacity={0.85}
          >
            {paymentLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={s.payBtnText}>Pay ₹{commissionDue} Now</Text>
                <Feather name="shield" size={16} color={WHITE} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.payLaterBtn}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'DriverHome' }] })}
            activeOpacity={0.7}
          >
            <Text style={s.payLaterText}>PAY LATER, STAY OFFLINE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Razorpay WebView Modal ── */}
      <Modal visible={showWebView} animationType="slide" onRequestClose={() => setShowWebView(false)}>
        <View style={{ flex: 1, backgroundColor: BG }}>
          <View style={s.wvHeader}>
            <Text style={s.wvTitle}>{t('ride.securePayment')}</Text>
            <TouchableOpacity onPress={() => setShowWebView(false)}>
              <Feather name="x" size={22} color={DARK} />
            </TouchableOpacity>
          </View>
          {rzpHtml && (
            <WebView
              source={{ html: rzpHtml }}
              javaScriptEnabled domStorageEnabled
              originWhitelist={['*']}
              onMessage={handleWebViewMessage}
              startInLoadingState
              renderLoading={() => (
                <View style={s.wvLoader}>
                  <ActivityIndicator size="large" color={PURPLE} />
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      <SakhiModal config={modal} onClose={() => setModal(null)} />
    </View>
  );
}

// ─── Styles — pixel-matched to Figma ──────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // ── Header ──
  header: {
    paddingHorizontal: 24,
    backgroundColor: 'rgba(245,240,255,0.8)',
    zIndex: 10,
    shadowColor: 'rgba(124,58,237,1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    height: 64,
  },
  backBtn: {
    width: 32, height: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, fontSize: 18, fontWeight: '600', color: PURPLE,
    letterSpacing: -0.45, lineHeight: 28,
  },
  greetingSection: {
    paddingHorizontal: 24, paddingTop: 32, gap: 4,
  },
  greetingText: {
    fontSize: 24, fontWeight: '700', color: '#1C1A25',
    letterSpacing: -0.6, lineHeight: 32, marginTop: 4,
  },
  subtitleText: {
    fontSize: 14, fontWeight: '400', color: MUTED,
    lineHeight: 18, marginTop: 8,
  },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 180 },

  // ── Commission Card ──
  commCard: {
    marginHorizontal: 24, marginTop: 32,
    backgroundColor: WHITE, borderRadius: 24,
    padding: 32, gap: 24,
    borderLeftWidth: 4, borderLeftColor: PURPLE,
    shadowColor: 'rgba(124,58,237,1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08, shadowRadius: 32, elevation: 6,
  },
  row1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  commLabel: {
    fontSize: 12, fontWeight: '700', color: MUTED,
    letterSpacing: 0.6, textTransform: 'uppercase', lineHeight: 16,
  },
  dueChip: {
    backgroundColor: '#FFDCC6',
    borderWidth: 1, borderColor: 'rgba(161,81,0,0.3)',
    borderRadius: 9999, paddingHorizontal: 15, paddingVertical: 7,
  },
  dueChipText: { fontSize: 10, fontWeight: '700', color: '#FFB784', lineHeight: 15 },
  centerAmount: { alignItems: 'center', paddingVertical: 8, gap: 8 },
  amountBig: {
    fontSize: 48, fontWeight: '800', color: PURPLE,
    letterSpacing: -2.4, lineHeight: 48, textAlign: 'center',
  },
  amountSub: { fontSize: 14, fontWeight: '500', color: MUTED, textAlign: 'center', lineHeight: 20 },
  statusSection: {
    borderTopWidth: 1, borderTopColor: '#F6F1FF',
    paddingTop: 16, gap: 12,
  },
  warningRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,218,214,0.4)', borderRadius: 16,
    padding: 16,
  },
  warningText: { fontSize: 12, fontWeight: '600', color: '#BA1A1A', flex: 1, lineHeight: 16 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(190,163,216,0.1)', borderRadius: 16,
    padding: 16,
  },
  infoText: { fontSize: 12, fontWeight: '500', color: '#4A4455', lineHeight: 16 },

  // ── Payment Methods ──
  pmSection: { paddingHorizontal: 24, marginTop: 48, gap: 24 },
  pmHeading: {
    fontSize: 12, fontWeight: '700', color: 'rgba(74,68,85,0.7)',
    letterSpacing: 1.2, textTransform: 'uppercase',
    paddingHorizontal: 4, lineHeight: 16,
  },
  pmList: { gap: 12 },
  pmCard: {
    backgroundColor: WHITE, borderRadius: 16, padding: 20, height: 80,
    shadowColor: 'rgba(124,58,237,1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04, shadowRadius: 16, elevation: 3,
    justifyContent: 'center',
  },
  pmCardActive: {
    borderWidth: 2, borderColor: PURPLE,
    gap: 16, height: undefined,
  },
  pmRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pmIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#EADDFF',
    alignItems: 'center', justifyContent: 'center',
  },
  pmLabelActive: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1C1A25', lineHeight: 24 },
  pmLabel: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1C1A25', lineHeight: 24 },
  radioOn: {
    width: 20, height: 20, borderRadius: 9999,
    borderWidth: 4, borderColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
  },
  radioDot: { width: 8, height: 8, borderRadius: 9999, backgroundColor: PURPLE },
  radioOff: {
    width: 20, height: 20, borderRadius: 9999,
    borderWidth: 2, borderColor: '#CCC3D8',
  },
  upiInputRow: { flexDirection: 'row', gap: 8 },
  upiInputWrap: {
    flex: 1, backgroundColor: '#F6F1FF', borderRadius: 8,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  upiInput: { fontSize: 14, fontWeight: '400', color: DARK, lineHeight: 17, paddingVertical: 9 },
  verifyBtn: {
    backgroundColor: 'rgba(190,163,216,0.1)', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center',
  },
  verifyBtnText: { fontSize: 12, fontWeight: '700', color: PURPLE, lineHeight: 16 },

  // ── Footer ──
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: BG,
    paddingHorizontal: 24, paddingTop: 24, gap: 15.5,
  },
  footerInner: { gap: 15.5 },
  payBtn: {
    height: 64, borderRadius: 16, backgroundColor: PURPLE,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: 'rgba(124,58,237,1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2, shadowRadius: 32, elevation: 8,
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { fontSize: 16, fontWeight: '700', color: WHITE, lineHeight: 24 },
  payLaterBtn: { alignItems: 'center', paddingVertical: 2 },
  payLaterText: {
    fontSize: 14, fontWeight: '700', color: PURPLE,
    letterSpacing: 0.35, textTransform: 'uppercase', lineHeight: 20,
  },

  // ── WebView Modal ──
  wvHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: 'rgba(190,163,216,0.2)',
  },
  wvTitle: { fontSize: 16, fontWeight: '700', color: DARK },
  wvLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', backgroundColor: BG,
  },
});
