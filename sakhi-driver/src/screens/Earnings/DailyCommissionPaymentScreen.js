/**
 * DailyCommissionPaymentScreen
 * Standalone daily commission payment — pixel-matched to Figma specs.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  Modal,
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

// ─── Design tokens (Figma) ───────────────────────────────────────────────────
const PURPLE = '#BEA3D8';
const DARK   = '#1C1A25';
const MUTED  = '#4A4455';
const WHITE  = '#FFFFFF';
const BG     = '#F5F0FF';
const DAILY_RATE = 35;

export default function DailyCommissionPaymentScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { driver } = useAuth();
  const insets = useSafeAreaInsets();

  const amount = route?.params?.amount ?? DAILY_RATE;
  const driverName = driver?.full_name?.split(' ')[0] ?? 'Sakhi';
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [phonePeUrl, setPhonePeUrl] = useState(null);
  const [transactionId, setTransactionId] = useState(null);
  const [showWebView, setShowWebView] = useState(false);
  const [modal, setModal] = useState(null);
  const [commissionDue, setCommissionDue] = useState(amount);
  const [selectedMethod, setSelectedMethod] = useState('upi');

  useEffect(() => {
    client.get('/drivers/commission/status')
      .then(({ data }) => {
        if (data.total_due > 0) setCommissionDue(data.total_due);
      })
      .catch(() => {});
  }, []);

  // ── Pay handler ───────────────────────────────────────────────────────────
  const handlePay = async () => {
    try {
      setPaymentLoading(true);
      const { data } = await client.post('/payments/commission/order', {
        amount: commissionDue, period: 'daily', driver_id: driver?.id,
      });
      setTransactionId(data.transaction_id);
      setPhonePeUrl(data.redirect_url);
      setShowWebView(true);
    } catch (err) {
      setModal({
        icon: '⚠️', title: t('earnings.paymentErrorTitle'),
        message: err.response?.data?.message ?? t('earnings.paymentErrorMessage'),
        buttons: [{ text: t('common.ok'), onPress: () => setModal(null) }],
      });
    } finally { setPaymentLoading(false); }
  };

  // ── WebView Navigation State Change Handler (Intercept Callback) ───────────
  const handleNavigationStateChange = async (navState) => {
    const { url } = navState;
    if (url && (url.includes('/payments/phonepe/callback') || url.includes('/payments/phonepe'))) {
      setShowWebView(false);
      try {
        setPaymentLoading(true);
        await client.post('/payments/commission/verify', {
          transaction_id: transactionId,
          period: 'daily',
          amount,
        });
        navigation.replace('CommissionPaidConfirmation', {
          amount, period: 'daily', method: 'PhonePe', txnId: transactionId,
        });
      } catch {
        setModal({
          icon: '⚠️', title: t('earnings.verificationFailedTitle'),
          message: t('earnings.verificationFailedMessage'),
          buttons: [{ text: t('common.ok'), onPress: () => setModal(null) }],
        });
      } finally {
        setPaymentLoading(false);
      }
    }
  };

  return (
    <View style={s.root}>
      <StatusBar style="dark" />

      {/* ════════ HEADER ════════ */}
      <View style={[s.header, { paddingTop: Math.max(insets.top, 0) }]}>
        <View style={s.headerInner}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={16} color={PURPLE} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Daily Commission</Text>
          {/* Spacer */}
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
          <Text style={s.welcomeBack}>WELCOME BACK</Text>
          <Text style={s.greetingName}>{greeting}, {driverName} 👋</Text>
        </View>

        {/* ── Commission Card ── */}
        <View style={s.commCard}>
          {/* Centered chip */}
          <View style={s.chipWrap}>
            <View style={s.chip}>
              <Text style={s.chipText}>DAILY COMMISSION DUE</Text>
            </View>
          </View>

          {/* Amount */}
          <View style={s.amountWrap}>
            <Text style={s.amountBig}>₹{commissionDue}</Text>
          </View>

          {/* Subtitle */}
          <View style={s.amountSubWrap}>
            <Text style={s.amountSub}>1 day platform fee = ₹{DAILY_RATE}</Text>
          </View>
        </View>

        {/* ── Status Banner ── */}
        <View style={s.statusBanner}>
          <Feather name="alert-triangle" size={18} color="#BA1A1A" />
          <Text style={s.statusText}>
            Unpaid — You cannot go online until paid
          </Text>
        </View>

        {/* ── Payment Methods ── */}
        <View style={s.pmSection}>
          <Text style={s.pmHeading}>SELECT PAYMENT METHOD</Text>

          <View style={s.pmList}>
            {/* UPI Row */}
            <TouchableOpacity
              style={s.upiRow}
              onPress={() => { setSelectedMethod('upi'); handlePay(); }}
              activeOpacity={0.85}
            >
              <View style={s.pmRowInner}>
                <View style={s.upiIconBox}>
                  <Feather name="smartphone" size={18} color={PURPLE} />
                </View>
                <View style={s.pmTextWrap}>
                  <Text style={s.pmLabelBold}>UPI</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color={PURPLE} />
            </TouchableOpacity>

            {/* Card Row */}
            <TouchableOpacity
              style={s.mutedRow}
              onPress={() => { setSelectedMethod('card'); handlePay(); }}
              activeOpacity={0.85}
            >
              <View style={s.pmRowInner}>
                <View style={s.mutedIconBox}>
                  <Feather name="credit-card" size={18} color={MUTED} />
                </View>
                <Text style={s.pmLabelBold}>Credit / Debit Card</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#CCC3D8" />
            </TouchableOpacity>

            {/* Net Banking Row */}
            <TouchableOpacity
              style={s.mutedRow}
              onPress={() => { setSelectedMethod('netbanking'); handlePay(); }}
              activeOpacity={0.85}
            >
              <View style={s.pmRowInner}>
                <View style={s.mutedIconBox}>
                  <Feather name="globe" size={18} color={MUTED} />
                </View>
                <Text style={s.pmLabelBold}>Net Banking</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#CCC3D8" />
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
            <Text style={s.wvTitle}>{t('ride.securePayment') || 'Secure Payment'}</Text>
            <TouchableOpacity onPress={() => setShowWebView(false)}>
              <Feather name="x" size={22} color={DARK} />
            </TouchableOpacity>
          </View>
          {phonePeUrl && (
            <WebView
              source={{ uri: phonePeUrl }}
              javaScriptEnabled domStorageEnabled
              originWhitelist={['*']}
              onNavigationStateChange={handleNavigationStateChange}
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

// ─── Styles (Figma-matched) ──────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // ── Header ──
  header: {
    backgroundColor: 'rgba(245,240,255,0.8)',
    zIndex: 10,
    shadowColor: 'rgba(124,58,237,1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
  },
  headerInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, height: 64,
  },
  backBtn: {
    width: 32, height: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, fontSize: 18, fontWeight: '600', color: PURPLE,
    letterSpacing: -0.45, lineHeight: 28,
  },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 180 },

  // ── Greeting ──
  greetingSection: {
    paddingHorizontal: 24, paddingTop: 32, gap: 4,
  },
  welcomeBack: {
    fontSize: 14, fontWeight: '500', color: MUTED,
    letterSpacing: 0.35, lineHeight: 20, opacity: 0.8,
  },
  greetingName: {
    fontSize: 24, fontWeight: '700', color: DARK,
    letterSpacing: -0.6, lineHeight: 32,
  },

  // ── Commission Card ──
  commCard: {
    marginHorizontal: 24, marginTop: 32,
    backgroundColor: WHITE, borderRadius: 24,
    paddingVertical: 32, paddingHorizontal: 32,
    shadowColor: 'rgba(124,58,237,1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08, shadowRadius: 32, elevation: 6,
  },
  chipWrap: { alignItems: 'center' },
  chip: {
    backgroundColor: '#EBE6F5', borderRadius: 9999,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  chipText: {
    fontSize: 10, fontWeight: '700', color: PURPLE,
    letterSpacing: 1, textTransform: 'uppercase', lineHeight: 15,
    textAlign: 'center',
  },
  amountWrap: { alignItems: 'center', marginTop: 16 },
  amountBig: {
    fontSize: 48, fontWeight: '800', color: DARK,
    letterSpacing: -2.4, lineHeight: 48, textAlign: 'center',
  },
  amountSubWrap: { alignItems: 'center', marginTop: 8 },
  amountSub: {
    fontSize: 14, fontWeight: '500', color: MUTED,
    textAlign: 'center', lineHeight: 20,
  },

  // ── Status Banner ──
  statusBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginHorizontal: 24, marginTop: 24,
    padding: 16, gap: 12,
    backgroundColor: 'rgba(255,218,214,0.4)',
    borderWidth: 1, borderColor: 'rgba(186,26,26,0.1)',
    borderRadius: 16,
  },
  statusText: {
    flex: 1, fontSize: 12, fontWeight: '600', color: '#93000A', lineHeight: 15,
  },

  // ── Payment Methods ──
  pmSection: {
    paddingHorizontal: 24, marginTop: 48, gap: 24,
  },
  pmHeading: {
    fontSize: 12, fontWeight: '700', color: 'rgba(74,68,85,0.7)',
    letterSpacing: 1.2, textTransform: 'uppercase', lineHeight: 16,
    paddingHorizontal: 4,
  },
  pmList: { gap: 12 },
  // UPI row — white
  upiRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, height: 80,
    backgroundColor: WHITE, borderRadius: 16,
    shadowColor: 'rgba(124,58,237,1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04, shadowRadius: 16, elevation: 3,
  },
  pmRowInner: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  upiIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#EADDFF',
    alignItems: 'center', justifyContent: 'center',
  },
  pmTextWrap: { gap: 4 },
  pmLabelBold: { fontSize: 16, fontWeight: '700', color: DARK, lineHeight: 24 },
  // Card / Net Banking rows — muted bg
  mutedRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, height: 80,
    backgroundColor: '#F6F1FF', opacity: 0.8, borderRadius: 16,
  },
  mutedIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#E5E0EF',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Footer ──
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: BG,
    paddingHorizontal: 24, paddingTop: 24,
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
