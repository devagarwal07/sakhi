import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';

export default function CommissionPaidConfirmationScreen({ navigation, route }) {
  const {
    amount        = 0,
    period        = 'daily',
    payment_method = 'upi',
    transaction_id = '',
    period_label  = '',
  } = route.params ?? {};

  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pop-in animation
    Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
    Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    // Pulse on checkmark
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1000, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const methodLabels = { upi: 'UPI', debit_card: 'Debit/Credit Card', net_banking: 'Net Banking' };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Check icon */}
        <Animated.View style={[styles.iconWrap, { transform: [{ scale }], opacity }]}>
          <Animated.View style={[styles.iconPulse, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.iconInner}>
            <Text style={styles.checkIcon}>✅</Text>
          </View>
        </Animated.View>

        <Text style={styles.headline}>Commission Paid! 🎉</Text>
        <Text style={styles.subline}>You're all set to go online and accept rides.</Text>

        {/* Receipt card */}
        <View style={styles.receiptCard}>
          {[
            { label: 'Amount Paid',      value: `₹${amount}`,                    accent: true },
            { label: 'Period',           value: period_label || (period === 'daily' ? 'Today' : 'This Week') },
            { label: 'Payment Method',   value: methodLabels[payment_method] ?? payment_method },
            { label: 'Transaction ID',   value: transaction_id, mono: true },
          ].map((row, i, arr) => (
            <View key={row.label}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>{row.label}</Text>
                <Text style={[
                  styles.receiptValue,
                  row.accent && styles.receiptValueAccent,
                  row.mono   && styles.receiptValueMono,
                ]}>
                  {row.value}
                </Text>
              </View>
              {i < arr.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Info strip */}
        <View style={styles.infoStrip}>
          <Text style={styles.infoText}>
            💜 Your platform fee is active. Earnings start now!
          </Text>
        </View>

        {/* Go online CTA */}
        <TouchableOpacity
          style={styles.goOnlineBtn}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'DriverHome' }] })}
          activeOpacity={0.85}
        >
          <Text style={styles.goOnlineText}>Go Online Now 🚗</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceLow },
  scroll: {
    flexGrow: 1, alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingTop: 40, paddingBottom: 40, gap: 20,
  },

  iconWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  iconPulse: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#D1FAE5', opacity: 0.6,
  },
  iconInner: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#22C55E', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  checkIcon: { fontSize: 48 },

  headline: { fontSize: 26, fontWeight: '900', color: Colors.onSurface, textAlign: 'center', letterSpacing: -0.5 },
  subline: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },

  receiptCard: {
    width: '100%', backgroundColor: Colors.white,
    borderRadius: Radius.lg, padding: Spacing.base, ...Shadows.card,
  },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  receiptLabel: { fontSize: 13, color: Colors.onSurfaceVariant },
  receiptValue: { fontSize: 13, fontWeight: '600', color: Colors.onSurface },
  receiptValueAccent: { fontSize: 17, fontWeight: '800', color: Colors.primaryContainer },
  receiptValueMono: { fontFamily: 'monospace', fontSize: 11, color: Colors.onSurfaceVariant },
  divider: { height: 1, backgroundColor: Colors.surfaceLow, marginVertical: 10 },

  infoStrip: {
    width: '100%', backgroundColor: `${Colors.primaryContainer}12`,
    borderRadius: Radius.lg, padding: Spacing.md,
  },
  infoText: { fontSize: 13, color: Colors.primaryContainer, fontWeight: '600', textAlign: 'center', lineHeight: 20 },

  goOnlineBtn: {
    width: '100%', height: 60, borderRadius: Radius.lg,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center', ...Shadows.lavender,
  },
  goOnlineText: { color: Colors.white, fontSize: 17, fontWeight: '800' },
});
