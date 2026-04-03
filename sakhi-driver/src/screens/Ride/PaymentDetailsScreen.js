import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, Alert, ScrollView, SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import client from '../../api/client';
import { useSocket } from '../../context/SocketContext';
import ScreenHeader from '../../components/ScreenHeader';
import { Feather, MaterialIcons } from '@expo/vector-icons';

// ── Razorpay Checkout WebView HTML ───────────────────────────────────────────
function buildRazorpayHtml({ key_id, order_id, amount, currency, name, description, prefill_name, prefill_contact }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #F7F6F8; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .loader { text-align: center; font-family: sans-serif; color: #64748B; font-size: 14px; }
    .spinner { width: 36px; height: 36px; border: 3px solid #EDE9FE; border-top: 3px solid #BEA3D8;
      border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    Opening payment…
  </div>
  <script>
    var options = {
      key:         "${key_id}",
      order_id:    "${order_id}",
      amount:      "${amount}",
      currency:    "${currency}",
      name:        "${name}",
      description: "${description}",
      prefill: {
        name:    "${prefill_name}",
        contact: "${prefill_contact}",
      },
      theme: { color: "#BEA3D8" },
      modal: {
        ondismiss: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: "DISMISSED" }));
        }
      },
      handler: function(response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type:                  "SUCCESS",
          razorpay_order_id:     response.razorpay_order_id,
          razorpay_payment_id:   response.razorpay_payment_id,
          razorpay_signature:    response.razorpay_signature,
        }));
      }
    };
    try {
      var rzp = new Razorpay(options);
      rzp.on("payment.failed", function(resp) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type:  "FAILED",
          error: resp.error.description,
        }));
      });
      rzp.open();
    } catch(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "ERROR", error: e.message }));
    }
  </script>
</body>
</html>`;
}

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

  // Razorpay WebView state
  const [rzpHtml, setRzpHtml]       = useState(null);
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
        Alert.alert('Error', 'Could not load payment details.');
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
      Alert.alert('Error', err.response?.data?.message ?? 'Try again.');
      setCashConfirming(false);
    }
  };

  // ── Open Razorpay: create order → build HTML → show WebView ────────────
  const handleOnlinePayment = async () => {
    try {
      setPaymentLoading(true);
      const { data } = await client.post(`/rides/${rideId}/payment/order`);
      const html = buildRazorpayHtml({
        key_id:          data.key_id,
        order_id:        data.order_id,
        amount:          String(data.amount),
        currency:        data.currency || 'INR',
        name:            'Sakhi',
        description:     `Ride to ${dropoffLabel}`,
        prefill_name:    riderName,
        prefill_contact: riderPhone,
      });
      setRzpHtml(html);
      setShowWebView(true);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Could not initiate payment. Try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // ── Handle message from Razorpay WebView ────────────────────────────────
  const handleWebViewMessage = async (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);

      if (msg.type === 'SUCCESS') {
        setShowWebView(false);
        // Verify signature on backend
        try {
          await client.post(`/rides/${rideId}/payment/verify`, {
            razorpay_order_id:   msg.razorpay_order_id,
            razorpay_payment_id: msg.razorpay_payment_id,
            razorpay_signature:  msg.razorpay_signature,
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setShowRatingModal(true);
        } catch {
          Alert.alert('Verification Failed', 'Payment was received but verification failed. Contact support.');
        }
      } else if (msg.type === 'DISMISSED') {
        setShowWebView(false);
        Alert.alert('Payment Cancelled', 'You closed before completing payment. You can try again.');
      } else if (msg.type === 'FAILED' || msg.type === 'ERROR') {
        setShowWebView(false);
        Alert.alert('Payment Failed', msg.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      // JSON parse error — ignore
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

  const isCash    = summary?.payment_method === 'cash';
  const netFare   = summary?.net_fare     ?? 0;
  const baseFare  = summary?.base_fare    ?? 0;
  const waitChg   = summary?.wait_charge  ?? 0;
  const commission = summary?.platform_commission ?? 0;
  const isPaid     = ['paid', 'collected'].includes(summary?.payment_status);

  return (
    <View style={styles.safe}>
      <ScreenHeader title="Payment Details" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Trip complete icon */}
        <View style={styles.iconCircle}>
          <Feather name="check-circle" size={48} color="#10B981" />
        </View>
        <Text style={styles.headline}>Trip Completed!</Text>
        <Text style={styles.subline}>{dropoffLabel}</Text>

        {/* Fare card */}
        <View style={styles.fareCard}>
          <Text style={styles.fareTitle}>NET FARE TO COLLECT</Text>
          <Text style={styles.fareAmount}>₹{netFare}</Text>

          <View style={styles.divider} />

          {[
            { label: 'Base Fare',           value: `₹${baseFare}` },
            { label: 'Wait Charges',         value: waitChg > 0 ? `₹${waitChg}` : '—' },
            { label: 'Platform Commission',  value: `-₹${commission}`, red: true },
          ].map((row) => (
            <View key={row.label} style={styles.breakRow}>
              <Text style={styles.breakLabel}>{row.label}</Text>
              <Text style={[styles.breakValue, row.red && styles.breakRed]}>{row.value}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.methodRow}>
            <Text style={styles.methodLabel}>Payment Via</Text>
            <View style={[styles.methodBadge, isCash ? styles.cashBadge : styles.onlineBadge]}>
              <MaterialIcons
                name={isCash ? 'payments' : 'credit-card'}
                size={13}
                color={isCash ? '#D97706' : '#7C3AED'}
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
                  <Text style={styles.btnText}>Confirm Cash Collected (₹{netFare})</Text>
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
                  <Text style={styles.btnText}>Pay ₹{netFare} via Razorpay</Text>
                </>
            }
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Razorpay WebView Modal ─────────────────────────────────────── */}
      <Modal visible={showWebView} animationType="slide" onRequestClose={() => setShowWebView(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F6F8' }}>
          {/* Header bar */}
          <View style={styles.webViewHeader}>
            <Text style={styles.webViewTitle}>Secure Payment</Text>
            <TouchableOpacity onPress={() => setShowWebView(false)} style={styles.webViewClose}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
          <WebView
            source={{ html: rzpHtml || '' }}
            onMessage={handleWebViewMessage}
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
  headline: { fontSize: 24, fontWeight: '800', color: '#1C1A25', textAlign: 'center', letterSpacing: -0.5 },
  subline:  { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 24 },

  fareCard: {
    width: '100%', backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
  },
  fareTitle:   { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 4 },
  fareAmount:  { fontSize: 44, fontWeight: '900', color: '#7C3AED', letterSpacing: -2, marginBottom: 16 },
  divider:     { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  breakRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  breakLabel:  { fontSize: 13, color: '#64748B' },
  breakValue:  { fontSize: 13, fontWeight: '600', color: '#1C1A25' },
  breakRed:    { color: '#EF4444' },
  methodRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  methodLabel: { fontSize: 12, color: '#64748B' },
  methodBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 9999, flexDirection: 'row', alignItems: 'center', gap: 4 },
  cashBadge:   { backgroundColor: '#FEF3C7' },
  onlineBadge: { backgroundColor: '#EDE9FE' },
  methodBadgeText: { fontSize: 12, fontWeight: '700' },
  cashText:    { color: '#D97706' },
  onlineText:  { color: '#7C3AED' },

  actionBtn:  { width: '100%', height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  cashBtn:    { backgroundColor: '#10B981', shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 },
  onlineBtn:  { backgroundColor: '#7C3AED', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 },
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
  webViewTitle: { fontSize: 16, fontWeight: '700', color: '#1C1A25' },
  webViewClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  webViewLoader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 12 },

  // Rating modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 12, alignItems: 'center', gap: 12 },
  modalHandle: { width: 36, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginBottom: 8 },
  modalHeadline: { fontSize: 22, fontWeight: '800', color: '#1C1A25', textAlign: 'center' },
  modalSub: { fontSize: 14, color: '#64748B', marginBottom: 4 },
  rateSubmitBtn: {
    width: '100%', height: 56, borderRadius: 14, backgroundColor: '#BEA3D8',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#BEA3D8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  rateSubmitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  skipText: { fontSize: 13, color: '#94A3B8', textDecorationLine: 'underline', marginTop: 4 },
});
