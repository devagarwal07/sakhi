import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';

const PAYMENT_METHODS = [
  { id: 'upi',         label: 'UPI',               icon: '💳', sub: 'Google Pay, PhonePe, Paytm' },
  { id: 'debit_card',  label: 'Debit / Credit Card', icon: '💳', sub: 'Visa, Mastercard, RuPay'     },
  { id: 'net_banking', label: 'Net Banking',          icon: '🏦', sub: 'All major Indian banks'      },
];

export default function DailyCommissionPaymentScreen({ navigation, route }) {
  const { amount = 50, period = 'daily' } = route.params ?? {};
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [paying, setPaying]                 = useState(false);

  const handlePay = async () => {
    try {
      setPaying(true);
      const { data } = await client.post('/drivers/pay-commission', {
        amount,
        period,
        payment_method: selectedMethod,
      });
      navigation.replace('CommissionPaidConfirmation', {
        amount,
        period,
        payment_method: selectedMethod,
        transaction_id: data?.transaction_id ?? 'TXN' + Date.now(),
        period_label: data?.period_label ?? '',
      });
    } catch (err) {
      Alert.alert('Payment Failed', err.response?.data?.message ?? 'Please try again.');
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Commission</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <Text style={styles.greetSub}>PLATFORM FEE DUE</Text>
        <Text style={styles.greetTitle}>Pay to Go Online 🚗</Text>

        {/* Commission Card */}
        <View style={styles.amountCard}>
          <View style={styles.dueBadge}>
            <Text style={styles.dueBadgeText}>Daily Commission Due</Text>
          </View>
          <Text style={styles.amountText}>₹{amount}</Text>
          <Text style={styles.amountSub}>1 day platform fee = ₹{amount}</Text>
        </View>

        {/* Warning banner */}
        <View style={styles.warnBanner}>
          <Text style={styles.warnIcon}>⚠️</Text>
          <Text style={styles.warnText}>Unpaid — You cannot go online until this is paid</Text>
        </View>

        {/* Payment methods */}
        <Text style={styles.methodsTitle}>SELECT PAYMENT METHOD</Text>
        <View style={styles.methodsList}>
          {PAYMENT_METHODS.map((m) => {
            const isSelected = selectedMethod === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.methodRow, isSelected && styles.methodRowSelected]}
                onPress={() => setSelectedMethod(m.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.methodIconBox, isSelected && styles.methodIconBoxSelected]}>
                  <Text style={{ fontSize: 20 }}>{m.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.methodLabel, isSelected && styles.methodLabelSelected]}>{m.label}</Text>
                  <Text style={styles.methodSub}>{m.sub}</Text>
                </View>
                <View style={[styles.radio, isSelected && styles.radioFilled]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payBtn, paying && styles.payBtnDisabled]}
          onPress={handlePay}
          disabled={paying}
          activeOpacity={0.85}
        >
          {paying
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.payBtnText}>Pay ₹{amount} & Go Online ⚡</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.laterBtn}>
          <Text style={styles.laterText}>Pay Later — Stay Offline</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceLow },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 22, color: Colors.primaryContainer },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.primaryContainer },

  scroll: { paddingHorizontal: Spacing.base, paddingBottom: 120, gap: 16 },

  greetSub: { fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 1.5 },
  greetTitle: { fontSize: 22, fontWeight: '800', color: Colors.onSurface },

  amountCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center', ...Shadows.lavender,
  },
  dueBadge: {
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: Radius.full, marginBottom: 14,
  },
  dueBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.primaryContainer, letterSpacing: 1 },
  amountText: { fontSize: 52, fontWeight: '900', color: Colors.onSurface, letterSpacing: -2 },
  amountSub: { fontSize: 13, color: Colors.onSurfaceVariant, marginTop: 4 },

  warnBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: '#FECACA',
  },
  warnIcon: { fontSize: 18 },
  warnText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#B91C1C', lineHeight: 18 },

  methodsTitle: { fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 1.5 },
  methodsList: { gap: 10 },
  methodRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.outlineVariant,
    ...Shadows.card,
  },
  methodRowSelected: { borderColor: Colors.primaryContainer, backgroundColor: `${Colors.primaryContainer}05` },
  methodIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  methodIconBoxSelected: { backgroundColor: `${Colors.primaryContainer}15` },
  methodLabel: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  methodLabelSelected: { color: Colors.primaryContainer },
  methodSub: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 2 },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.outlineVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  radioFilled: { borderColor: Colors.primaryContainer },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primaryContainer },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surfaceLow,
    paddingHorizontal: Spacing.base, paddingBottom: 32, paddingTop: 12,
    gap: 10, ...Shadows.lavender,
  },
  payBtn: {
    height: 60, borderRadius: Radius.lg,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center', ...Shadows.lavender,
  },
  payBtnDisabled: { backgroundColor: Colors.outlineVariant },
  payBtnText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  laterBtn: { alignItems: 'center', paddingVertical: 8 },
  laterText: { fontSize: 13, fontWeight: '700', color: Colors.primaryContainer },
});
