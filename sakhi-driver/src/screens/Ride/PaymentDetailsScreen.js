import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';
import { useSocket } from '../../context/SocketContext';
import ScreenHeader, { HEADER_HEIGHT } from '../../components/ScreenHeader';

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
  star: { fontSize: 36, color: Colors.outlineVariant },
  starFilled: { color: '#F59E0B' },
});

// ── Main screen ─────────────────────────────────────────────────────────────
export default function PaymentDetailsScreen({ navigation, route }) {
  const { ride } = route.params ?? {};
  const { socket } = useSocket();

  const [summary, setSummary]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [cashConfirming, setCashConfirming] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating]           = useState(5);
  const [submittingRating, setSubmittingRating] = useState(false);

  // ── Fetch fare summary ───────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get(`/rides/${ride?.ride_id}/fare-summary`);
        setSummary(data);
      } catch {
        Alert.alert('Error', 'Could not load payment details.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Listen for online payment success ────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = ({ ride_id }) => {
      if (ride_id === ride?.ride_id) setShowRatingModal(true);
    };
    socket.on('payment:success', handler);
    return () => socket.off('payment:success', handler);
  }, [socket]);

  // ── Cash confirmation ────────────────────────────────────────────────────
  const handleCashConfirm = async () => {
    try {
      setCashConfirming(true);
      await client.post(`/rides/${ride?.ride_id}/cash-collected`);
      setShowRatingModal(true);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Try again.');
      setCashConfirming(false);
    }
  };

  // ── Submit rider rating ──────────────────────────────────────────────────
  const handleSubmitRating = async () => {
    try {
      setSubmittingRating(true);
      await client.post(`/rides/${ride?.ride_id}/rate-rider`, { rating });
      setShowRatingModal(false);
      navigation.reset({ index: 0, routes: [{ name: 'DriverHome' }] });
    } catch {
      // Non-fatal — go home anyway
      navigation.reset({ index: 0, routes: [{ name: 'DriverHome' }] });
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primaryContainer} />
        <Text style={styles.loaderText}>Loading payment details…</Text>
      </View>
    );
  }

  const isCash   = summary?.payment_method === 'cash';
  const netFare  = summary?.net_fare ?? 0;
  const baseFare = summary?.base_fare ?? 0;
  const waitChg  = summary?.wait_charge ?? 0;
  const commission = summary?.platform_commission ?? 0;

  return (
    <View style={styles.safe}>
      <ScreenHeader title="Payment Details" />
      <ScrollView contentContainerStyle={[styles.scroll, { }]} showsVerticalScrollIndicator={false}>
        {/* Success icon */}
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 44 }}>✅</Text>
        </View>
        <Text style={styles.headline}>Trip Completed! 🎉</Text>
        <Text style={styles.subline}>{ride?.dropoff_address ?? 'Drop-off reached'}</Text>

        {/* Fare card */}
        <View style={styles.fareCard}>
          <Text style={styles.fareTitle}>Net Fare to Collect</Text>
          <Text style={styles.fareAmount}>₹{netFare}</Text>

          <View style={styles.divider} />

          {/* Breakdown */}
          {[
            { label: 'Base Fare',           value: `₹${baseFare}` },
            { label: 'Wait Charges',         value: waitChg > 0 ? `₹${waitChg}` : '—' },
            { label: 'Platform Commission', value: `-₹${commission}`, red: true },
          ].map((row) => (
            <View key={row.label} style={styles.breakRow}>
              <Text style={styles.breakLabel}>{row.label}</Text>
              <Text style={[styles.breakValue, row.red && styles.breakRed]}>{row.value}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          {/* Payment method badge */}
          <View style={styles.methodRow}>
            <Text style={styles.methodLabel}>Payment Via</Text>
            <View style={[styles.methodBadge, isCash ? styles.cashBadge : styles.onlineBadge]}>
              <Text style={[styles.methodBadgeText, isCash ? styles.cashText : styles.onlineText]}>
                {isCash ? '💵 Cash' : '💳 Online'}
              </Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        {isCash ? (
          <TouchableOpacity
            style={[styles.cashBtn, cashConfirming && styles.cashBtnDisabled]}
            onPress={handleCashConfirm}
            disabled={cashConfirming}
            activeOpacity={0.85}
          >
            {cashConfirming
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.cashBtnText}>✅  Confirm Cash Collected (₹{netFare})</Text>
            }
          </TouchableOpacity>
        ) : (
          <View style={styles.waitingBanner}>
            <ActivityIndicator color={Colors.primaryContainer} size="small" />
            <Text style={styles.waitingText}>Waiting for payment confirmation…</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Rating Modal ──────────────────────────────────────────────── */}
      <Modal visible={showRatingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalHeadline}>Rate Your Rider</Text>
            <Text style={styles.modalSub}>{ride?.rider_name ?? 'Rider'}</Text>
            <StarRating value={rating} onChange={setRating} />
            <TouchableOpacity
              style={styles.rateSubmitBtn}
              onPress={handleSubmitRating}
              disabled={submittingRating}
              activeOpacity={0.85}
            >
              {submittingRating
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.rateSubmitText}>Submit & Go Home</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              setShowRatingModal(false);
              navigation.reset({ index: 0, routes: [{ name: 'DriverHome' }] });
            }}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceLow },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText: { fontSize: 14, color: Colors.onSurfaceVariant },
  scroll: { paddingHorizontal: Spacing.base, paddingTop: 16, paddingBottom: 40, alignItems: 'center' },

  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    marginTop: 20, marginBottom: 16, ...Shadows.lavender,
  },
  headline: { fontSize: 24, fontWeight: '800', color: Colors.onSurface, textAlign: 'center', letterSpacing: -0.5 },
  subline: { fontSize: 13, color: Colors.onSurfaceVariant, textAlign: 'center', marginTop: 4, marginBottom: 24 },

  fareCard: {
    width: '100%', backgroundColor: Colors.white,
    borderRadius: Radius.lg, padding: Spacing.base, marginBottom: 20, ...Shadows.card,
  },
  fareTitle: { fontSize: 11, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 1.5, marginBottom: 4 },
  fareAmount: { fontSize: 42, fontWeight: '900', color: Colors.primaryContainer, letterSpacing: -2, marginBottom: 16 },
  divider: { height: 1, backgroundColor: Colors.surfaceLow, marginVertical: 12 },
  breakRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  breakLabel: { fontSize: 13, color: Colors.onSurfaceVariant },
  breakValue: { fontSize: 13, fontWeight: '600', color: Colors.onSurface },
  breakRed: { color: '#EF4444' },
  methodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  methodLabel: { fontSize: 12, color: Colors.onSurfaceVariant },
  methodBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full },
  cashBadge: { backgroundColor: '#FEF3C7' },
  onlineBadge: { backgroundColor: `${Colors.primaryContainer}15` },
  methodBadgeText: { fontSize: 12, fontWeight: '700' },
  cashText: { color: '#D97706' },
  onlineText: { color: Colors.primaryContainer },

  cashBtn: {
    width: '100%', height: 60, borderRadius: Radius.lg,
    backgroundColor: Colors.online,
    alignItems: 'center', justifyContent: 'center', ...Shadows.card,
  },
  cashBtnDisabled: { backgroundColor: Colors.outlineVariant },
  cashBtnText: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  waitingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: `${Colors.primaryContainer}10`,
    width: '100%', borderRadius: Radius.lg, padding: Spacing.md,
    justifyContent: 'center',
  },
  waitingText: { fontSize: 13, color: Colors.primaryContainer, fontWeight: '600' },

  // Rating modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: Spacing.xl, alignItems: 'center', gap: 12,
  },
  modalHeadline: { fontSize: 22, fontWeight: '800', color: Colors.onSurface, textAlign: 'center' },
  modalSub: { fontSize: 14, color: Colors.onSurfaceVariant, marginBottom: 8 },
  rateSubmitBtn: {
    width: '100%', height: 56, borderRadius: Radius.lg,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center', ...Shadows.lavender,
  },
  rateSubmitText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  skipText: { fontSize: 13, color: Colors.onSurfaceVariant, textDecorationLine: 'underline', marginTop: 4 },
});
