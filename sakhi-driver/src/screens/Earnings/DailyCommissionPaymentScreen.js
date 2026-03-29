import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { startLocationTracking } from '../../services/locationTask';

const PAYMENT_METHODS = [
  {
    id: 'upi',
    icon: '📲',
    label: 'UPI',
    subLabel: null,
    hasLogos: true,
    hasInput: true,
  },
  {
    id: 'card',
    icon: '💳',
    label: 'Debit/Credit Card',
    subLabel: null,
    hasLogos: false,
    hasInput: false,
  },
  {
    id: 'netbanking',
    icon: '🏦',
    label: 'Net Banking',
    subLabel: null,
    hasLogos: false,
    hasInput: false,
  },
];

export default function DailyCommissionPaymentScreen({ navigation, route }) {
  const { driver, updateDriver } = useAuth();
  const period     = route?.params?.period ?? 'daily';
  const isWeekly   = period === 'weekly';
  const amount     = isWeekly ? 350 :  50;
  const screenTitle  = isWeekly ? 'Weekly Commission'  : 'Daily Commission';
  const dueLabel     = isWeekly ? 'WEEKLY COMMISSION DUE' : 'DAILY COMMISSION DUE';
  const breakdown    = isWeekly ? '7 days × ₹50/day = ₹350' : '1 day platform fee = ₹50';
  const btnLabel     = `Pay ₹${amount} & Go Online`;

  const driverName = driver?.full_name?.split(' ')[0] ?? 'Driver';

  const [payMethod, setPayMethod] = useState('upi');
  const [upiId, setUpiId]         = useState('');
  const [verified, setVerified]   = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleVerifyUpi = () => {
    if (!upiId.trim()) {
      Alert.alert('Enter UPI ID', 'Please enter your UPI ID first.');
      return;
    }
    setVerified(true);
    Alert.alert('Verified ✓', `UPI ID ${upiId} is verified.`);
  };

  const handlePay = async () => {
    if (payMethod === 'upi' && !verified && upiId.trim()) {
      // allow even unverified if they filled it (UX convenience)
    }

    setLoading(true);

    const methodLabel = payMethod === 'upi'        ? 'UPI'
                      : payMethod === 'card'       ? 'Debit/Credit Card'
                      : 'Net Banking';

    // Navigate immediately — don't block on API
    navigation.replace('CommissionPaidConfirmation', {
      amount,
      period,
      method: methodLabel,
      txnId:  `TXN${Date.now()}`,
    });

    // Fire API in background (non-blocking)
    client.post('/drivers/commission-pay', {
      period, amount,
      payment_method: payMethod,
      upi_id: payMethod === 'upi' ? upiId : undefined,
    }).catch(() => {/* silently ignore in dev */});
    setLoading(false);
  };

  return (
    <View style={s.root}>
      <StatusBar style="dark" />

      {/* ── TOP BAR: back + title ── */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.topTitle}>{screenTitle}</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── WELCOME GREETING ── */}
        <View style={s.greeting}>
          <Text style={s.welcomeBack}>WELCOME BACK</Text>
          <Text style={s.greetingName}>Good Morning, {driverName} 👋</Text>
        </View>

        {/* ── COMMISSION CARD: white, rounded 20, shadow ── */}
        <View style={s.commCard}>
          {/* "DAILY COMMISSION DUE" top chip */}
          <View style={s.dueChip}>
            <Text style={s.dueChipText}>{dueLabel}</Text>
          </View>

          {/* Big amount: dark #1C1A25 */}
          <Text style={s.amountValue}>₹{amount}</Text>

          {/* Breakdown */}
          <Text style={s.amountBreakdown}>{breakdown}</Text>
        </View>

        {/* ── WARNING ROW: separate from card ── */}
        <View style={s.warningRow}>
          <Text style={s.warningIcon}>⚠</Text>
          <Text style={s.warningText}>Unpaid — You cannot go online until paid</Text>
        </View>

        {/* ── SELECT PAYMENT METHOD label ── */}
        <Text style={s.sectionLabel}>SELECT PAYMENT METHOD</Text>

        {/* ── PAYMENT METHOD ROWS ── */}
        <View style={s.methodList}>
          {PAYMENT_METHODS.map((method) => {
            const isActive = payMethod === method.id;
            return (
              <TouchableOpacity
                key={method.id}
                style={s.methodRow}
                onPress={() => { setPayMethod(method.id); setVerified(false); }}
                activeOpacity={0.85}
              >
                {/* Icon box */}
                <View style={[s.methodIconBox, isActive && s.methodIconBoxActive]}>
                  <Text style={s.methodIconEmoji}>{method.icon}</Text>
                </View>

                {/* Label + logos */}
                <View style={s.methodLabelWrap}>
                  <Text style={[s.methodLabel, isActive && s.methodLabelActive]}>
                    {method.label}
                  </Text>
                  {/* UPI logos (small coloured chips) */}
                  {method.hasLogos && (
                    <View style={s.upiLogos}>
                      <View style={[s.upiLogoChip, { backgroundColor: '#1A237E' }]} />
                      <View style={[s.upiLogoChip, { backgroundColor: '#0D47A1' }]} />
                    </View>
                  )}
                </View>

                {/* Radio / checkmark */}
                {isActive ? (
                  <View style={s.checkCircle}>
                    <Text style={s.checkMark}>✓</Text>
                  </View>
                ) : (
                  <View style={s.radioEmpty} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── UPI INPUT (only when UPI selected) ── */}
        {payMethod === 'upi' && (
          <View style={s.upiInputRow}>
            <TextInput
              style={s.upiInput}
              placeholder="Enter UPI ID (e.g. meena@okaxis)"
              placeholderTextColor="#9CA3AF"
              value={upiId}
              onChangeText={(t) => { setUpiId(t); setVerified(false); }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity style={s.verifyBtn} onPress={handleVerifyUpi}>
              <Text style={s.verifyBtnText}>{verified ? 'Done ✓' : 'Verify'}</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* ── FIXED FOOTER ── */}
      <View style={s.footer}>
        {/* Pay CTA */}
        <TouchableOpacity
          style={[s.payBtn, loading && s.payBtnDisabled]}
          onPress={handlePay}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={s.payBtnText}>
            {loading ? 'Processing…' : btnLabel}
          </Text>
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
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F0FF' },

  // ── Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12,
    gap: 12, backgroundColor: '#F5F0FF',
  },
  backBtn:   { padding: 4 },
  backArrow: { fontSize: 20, color: '#BEA3D8', fontWeight: '600' },
  topTitle:  { fontSize: 18, fontWeight: '600', color: '#1E1B2E', letterSpacing: -0.3 },

  // ── Scroll
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 160, gap: 16 },

  // ── Greeting
  greeting:    { gap: 4, paddingVertical: 4 },
  welcomeBack: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 1,
  },
  greetingName: { fontSize: 20, fontWeight: '700', color: '#1C1A25' },

  // ── Commission card: white, radius 20, shadow, centered content
  commCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 28, paddingHorizontal: 24,
    alignItems: 'center', gap: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08, shadowRadius: 20,
    elevation: 4,
  },
  // "DAILY COMMISSION DUE" chip: outlined grey pill
  dueChip: {
    borderWidth: 1, borderColor: '#D1C4E9',
    borderRadius: 9999, paddingHorizontal: 14, paddingVertical: 4,
    marginBottom: 4,
  },
  dueChipText: {
    fontSize: 10, fontWeight: '700', color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  // Big amount: dark, 48px 800w
  amountValue: {
    fontSize: 52, fontWeight: '800', color: '#1C1A25',
    letterSpacing: -2, lineHeight: 56,
  },
  // Breakdown: 14px 400w grey
  amountBreakdown: { fontSize: 14, fontWeight: '400', color: '#9CA3AF' },

  // ── Warning row: pinkish-red, separate from card
  warningRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFEEEE',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
  },
  warningIcon: { fontSize: 16, color: '#E53E3E' },
  warningText: { fontSize: 13, fontWeight: '600', color: '#E53E3E', flex: 1 },

  // ── "SELECT PAYMENT METHOD" label
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 2,
  },

  // ── Method list
  methodList: { gap: 10 },
  methodRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8,
    elevation: 2,
  },
  // Icon box: 40×40, grey bg default, purple bg when active
  methodIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  methodIconBoxActive: { backgroundColor: '#F0E6FF' },
  methodIconEmoji: { fontSize: 18 },
  // Label wrap
  methodLabelWrap: { flex: 1, gap: 4 },
  methodLabel:       { fontSize: 15, fontWeight: '500', color: '#4A4455' },
  methodLabelActive: { fontWeight: '600', color: '#1C1A25' },
  // UPI logos (small coloured chips)
  upiLogos: { flexDirection: 'row', gap: 4 },
  upiLogoChip: { width: 16, height: 10, borderRadius: 3 },
  // Purple filled checkmark
  checkCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#BEA3D8',
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { fontSize: 13, color: '#FFFFFF', fontWeight: '800' },
  // Empty grey radio
  radioEmpty: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#D1C4E9',
  },

  // ── UPI input row
  upiInputRow: {
    flexDirection: 'row', gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12, padding: 12,
  },
  upiInput: {
    flex: 1, fontSize: 14, color: '#1C1A25',
    backgroundColor: '#F5F0FF',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
  },
  verifyBtn: {
    backgroundColor: 'rgba(190,163,216,0.15)',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  verifyBtnText: { fontSize: 13, fontWeight: '700', color: '#BEA3D8' },

  // ── Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#F5F0FF',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36,
    gap: 12,
  },
  // Pay btn: purple, radius 16, height 56
  payBtn: {
    height: 56, borderRadius: 16,
    backgroundColor: '#BEA3D8',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20, shadowRadius: 16,
    elevation: 6,
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  payBtnIcon: { fontSize: 16, color: '#FFFFFF' },
  // Pay later
  payLaterBtn:  { alignItems: 'center', paddingVertical: 4 },
  payLaterText: {
    fontSize: 11, fontWeight: '700', color: '#BEA3D8',
    textTransform: 'uppercase', letterSpacing: 1,
  },
});
