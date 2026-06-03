import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator,  ScrollView, SafeAreaView} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import client from '../../api/client';
import { useSocket } from '../../context/SocketContext';
import ScreenHeader from '../../components/ScreenHeader';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import CustomAlert from '../../utils/CustomAlert';

// PhonePe redirect flow is used instead of Razorpay custom HTML

// ── Star rating component ────────────────────────────────────────────────────
function StarRating({ value, onChange }) {
  return (
    <View style={ratingStyles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onChange(star)} activeOpacity={0.7}>
          <Text style={[ratingStyles.star, star <= value && ratingStyles.starFilled]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const ratingStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  star: { fontSize: 36, color: '#E2E8F0' },
  starFilled: { color: '#F59E0B' },
});

// ── Main screen ──────────────────────────────────────────────────────────────
export default function PaymentDetailsScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { ride } = route.params ?? {};

  // Normalise field names — matchingEngine sends drop_address; ride_id or id
  const rideId       = ride?.ride_id ?? ride?.id;
  const dropoffLabel = ride?.dropoff_address ?? ride?.drop_address ?? 'Drop-off reached';
  const riderName    = ride?.rider_name  ?? 'Rider';
  const riderPhone   = ride?.rider_phone ?? ride?.rider_mobile ?? '';

  const { socket } = useSocket();
  const insets = useSafeAreaInsets();

  const [summary, setSummary]               = useState(null);
  const [loading, setLoading]               = useState(true);
  const [cashConfirming, setCashConfirming] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // PhonePe WebView state
  const [phonePeUrl, setPhonePeUrl] = useState(null);
  const [transactionId, setTransactionId] = useState(null);
  const [showWebView, setShowWebView] = useState(false);

  // Rating modal
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating]                   = useState(5);
  const [submittingRating, setSubmittingRating] = useState(false);

  // ── Fetch fare summary ───────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get(`/rides/${rideId}/fare-summary`);
        setSummary(data);
      } catch {
        CustomAlert.alert('Error', 'Could not load payment details.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Listen for payment:success from socket (online rides) ────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = ({ ride_id }) => {
      if (ride_id === rideId) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setShowRatingModal(true);
      }
    };
    socket.on('payment:success', handler);
    return () => socket.off('payment:success', handler);
  }, [socket]);

  // ── Cash confirmation ────────────────────────────────────────────────────
  const handleCashConfirm = async () => {
    try {
      setCashConfirming(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await client.post(`/rides/${rideId}/cash-collected`);
      setShowRatingModal(true);
    } catch (err) {
      CustomAlert.alert('Error', err.response?.data?.message ?? 'Try again.');
      setCashConfirming(false);
    }
  };

  // ── Open PhonePe: create order → show WebView ───────────────────────────
  const handleOnlinePayment = async () => {
    try {
      setPaymentLoading(true);
      const { data } = await client.post(`/rides/${rideId}/payment/order`);
      setTransactionId(data.transaction_id);
      setPhonePeUrl(data.redirect_url);
      setShowWebView(true);
    } catch (err) {
      CustomAlert.alert('Error', err.response?.data?.message ?? 'Could not initiate payment. Try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // ── WebView Navigation State Change Handler (Intercept Callback) ───────────
  const handleNavigationStateChange = async (navState) => {
    const { url } = navState;
    if (url && (url.includes('/payments/phonepe/callback') || url.includes('/payments/phonepe'))) {
      setShowWebView(false);
      try {
        setPaymentLoading(true);
        await client.post(`/rides/${rideId}/payment/verify`, {
          transaction_id: transactionId,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setShowRatingModal(true);
      } catch {
        CustomAlert.alert('Verification Failed', 'Payment was received but verification failed. Contact support.');
      } finally {
        setPaymentLoading(false);
      }
    }
  };

  // ── Submit rider rating ──────────────────────────────────────────────────
  const handleSubmitRating = async () => {
    try {
      setSubmittingRating(true);
      await client.post(`/rides/${rideId}/rate-rider`, { rating });
    } catch {
      // Non-fatal
    } finally {
      navigation.reset({ index: 0, routes: [{ name: 'DriverHome' }] });
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#BEA3D8" />
        <Text style={styles.loaderText}>Loading payment details…</Text>
      </View>
    );
  }

  const isCash      = summary?.payment_method === 'cash';
  const netFare     = summary?.net_fare     ?? 0;
  const baseFare    = summary?.base_fare    ?? 0;
  const waitChg     = summary?.wait_charge  ?? 0;
  const commission  = summary?.platform_commission ?? 0;
  const isPaid      = ['paid', 'collected'].includes(summary?.payment_status);
  const nightFare   = summary?.is_night_fare ?? false;
  const nightMultiplier = summary?.night_multiplier ?? 1.5;

  return (
    <View style={styles.safe}>
      <ScreenHeader title={t('profile.paymentDetails')} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Trip complete icon */}
        <View style={styles.iconCircle}>
          <Svg width={48} height={48} viewBox="0 0 50 50" fill="none">
            <Path
              d="M21.5 36.5L39.125 18.875L35.625 15.375L21.5 29.5L14.375 22.375L10.875 25.875L21.5 36.5ZM25 50C21.5417 50 18.2917 49.3438 15.25 48.0312C12.2083 46.7188 9.5625 44.9375 7.3125 42.6875C5.0625 40.4375 3.28125 37.7917 1.96875 34.75C0.65625 31.7083 0 28.4583 0 25C0 21.5417 0.65625 18.2917 1.96875 15.25C3.28125 12.2083 5.0625 9.5625 7.3125 7.3125C9.5625 5.0625 12.2083 3.28125 15.25 1.96875C18.2917 0.65625 21.5417 0 25 0C28.4583 0 31.7083 0.65625 34.75 1.96875C37.7917 3.28125 40.4375 5.0625 42.6875 7.3125C44.9375 9.5625 46.7188 12.2083 48.0312 15.25C49.3438 18.2917 50 21.5417 50 25C50 28.4583 49.3438 31.7083 48.0312 34.75C46.7188 37.7917 44.9375 40.4375 42.6875 42.6875C40.4375 44.9375 37.7917 46.7188 34.75 48.0312C31.7083 49.3438 28.4583 50 25 50Z"
              fill="#22C55E"
            />
          </Svg>
        </View>
        <Text style={styles.headline}>Trip Completed!</Text>
        <Text style={styles.subline}>{dropoffLabel}</Text>

        {/* Fare card */}
        <View style={styles.fareCard}>
          <Text style={styles.fareTitle}>NET FARE TO COLLECT</Text>
          <Text style={styles.fareAmount}>₹{netFare}</Text>

          <View style={styles.divider} />

          {[
            { label: 'Base Fare',          value: `₹${baseFare}` },
            { label: 'Wait Charges',        value: waitChg > 0 ? `₹${waitChg}` : '—' },
            nightFare ? { label: `🌙 Night Fare (${nightMultiplier}×)`, value: 'Applied', highlight: true } : null,
            { label: 'Platform Commission', value: `-₹${commission}`, red: true },
          ].filter(Boolean).map((row) => (
            <View key={row.label} style={styles.breakRow}>
              <Text style={[styles.breakLabel, row.highlight && styles.breakNight]}>{row.label}</Text>
              <Text style={[styles.breakValue, row.red && styles.breakRed, row.highlight && styles.breakNight]}>{row.value}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.methodRow}>
            <Text style={styles.methodLabel}>Payment Via</Text>
            <View style={[styles.methodBadge, isCash ? styles.cashBadge : styles.onlineBadge]}>
              <MaterialIcons
                name={isCash ? 'payments' : 'credit-card'}
                size={13}
                color={isCash ? '#D97706' : '#BEA3D8'}
              />
              <Text style={[styles.methodBadgeText, isCash ? styles.cashText : styles.onlineText]}>
                {isCash ? 'Cash' : 'Online'}
              </Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        {isPaid ? (
          <View style={styles.paidBanner}>
            <Feather name="check-circle" size={18} color="#10B981" />
            <Text style={styles.paidText}>Payment Confirmed</Text>
          </View>
        ) : isCash ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.cashBtn, cashConfirming && styles.btnDisabled]}
            onPress={handleCashConfirm}
            disabled={cashConfirming}
            activeOpacity={0.85}
          >
            {cashConfirming
              ? <ActivityIndicator color="#FFF" />
              : <>
                  <Feather name="check" size={20} color="#FFF" />
                  <Text style={styles.btnText} numberOfLines={1} adjustsFontSizeToFit>Confirm Cash Received (₹{netFare})</Text>
                </>
            }
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, styles.onlineBtn, paymentLoading && styles.btnDisabled]}
            onPress={handleOnlinePayment}
            disabled={paymentLoading}
            activeOpacity={0.85}
          >
            {paymentLoading
              ? <ActivityIndicator color="#FFF" />
              : <>
                  <MaterialIcons name="credit-card" size={20} color="#FFF" />
                  <Text style={styles.btnText}>Pay ₹{netFare} via PhonePe</Text>
                </>
            }
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── PhonePe WebView Modal ─────────────────────────────────────── */}
      <Modal visible={showWebView} animationType="slide" onRequestClose={() => setShowWebView(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F6F8' }}>
          {/* Header bar */}
          <View style={styles.webViewHeader}>
            <Text style={styles.webViewTitle}>Secure Payment</Text>
            <TouchableOpacity onPress={() => setShowWebView(false)} style={styles.webViewClose}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
          {phonePeUrl && (
            <WebView
              source={{ uri: phonePeUrl }}
              onNavigationStateChange={handleNavigationStateChange}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webViewLoader}>
                  <ActivityIndicator size="large" color="#BEA3D8" />
                  <Text style={styles.loaderText}>Loading payment gateway…</Text>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* ── Rating Modal ───────────────────────────────────────────────── */}
      <Modal visible={showRatingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalHeadline}>Rate Your Rider</Text>
            <Text style={styles.modalSub}>{riderName}</Text>
            <StarRating value={rating} onChange={setRating} />
            <TouchableOpacity
              style={styles.rateSubmitBtn}
              onPress={handleSubmitRating}
              disabled={submittingRating}
              activeOpacity={0.85}
            >
              {submittingRating
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.rateSubmitText}>Submit & Go Home</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: 'DriverHome' }] })}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F6F8' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#F7F6F8' },
  loaderText: { fontSize: 14, color: '#64748B', marginTop: 8 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48, alignItems: 'center' },

  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center',
    marginTop: 20, marginBottom: 16,
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
  },
  headline: { fontSize: 24, fontWeight: '800', color: '#1E1B2E', textAlign: 'center', letterSpacing: -0.5 },
  subline:  { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 24 },

  fareCard: {
    width: '100%', backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
  },
  fareTitle:   { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 4 },
  fareAmount:  { fontSize: 44, fontWeight: '900', color: '#BEA3D8', letterSpacing: -2, marginBottom: 16 },
  divider:     { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  breakRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  breakLabel:  { fontSize: 13, color: '#64748B' },
  breakValue:  { fontSize: 13, fontWeight: '600', color: '#1E1B2E' },
  breakRed:    { color: '#EF4444' },
  breakNight:  { color: '#7C3AED', fontWeight: '700' },
  methodRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  methodLabel: { fontSize: 12, color: '#64748B' },
  methodBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 9999, flexDirection: 'row', alignItems: 'center', gap: 4 },
  cashBadge:   { backgroundColor: '#FEF3C7' },
  onlineBadge: { backgroundColor: '#EDE9FE' },
  methodBadgeText: { fontSize: 12, fontWeight: '700' },
  cashText:    { color: '#D97706' },
  onlineText:  { color: '#BEA3D8' },

  actionBtn:  { width: '100%', height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  cashBtn:    { backgroundColor: '#10B981', shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 },
  onlineBtn:  { backgroundColor: '#BEA3D8', shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 },
  btnDisabled: { opacity: 0.55 },
  btnText:    { color: '#FFF', fontSize: 15, fontWeight: '800' },

  paidBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FDF4', width: '100%',
    borderRadius: 14, padding: 16, justifyContent: 'center',
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  paidText: { fontSize: 15, color: '#059669', fontWeight: '700' },

  // Razorpay WebView
  webViewHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFF',
  },
  webViewTitle: { fontSize: 16, fontWeight: '700', color: '#1E1B2E' },
  webViewClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  webViewLoader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 12 },

  // Rating modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 12, alignItems: 'center', gap: 12 },
  modalHandle: { width: 36, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginBottom: 8 },
  modalHeadline: { fontSize: 22, fontWeight: '800', color: '#1E1B2E', textAlign: 'center' },
  modalSub: { fontSize: 14, color: '#64748B', marginBottom: 4 },
  rateSubmitBtn: {
    width: '100%', height: 56, borderRadius: 14, backgroundColor: '#BEA3D8',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#BEA3D8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  rateSubmitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  skipText: { fontSize: 13, color: '#94A3B8', textDecorationLine: 'underline', marginTop: 4 },
});
