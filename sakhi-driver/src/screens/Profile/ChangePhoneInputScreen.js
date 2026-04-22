import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';

// ── Design Tokens ─────────────────────────────────────────────────────────────
const PURPLE  = '#BEA3D8';
const DEEP    = '#BEA3D8';
const DARK    = '#1E1B2E';
const MUTED   = '#94A3B8';
const WHITE   = '#FFFFFF';
const BG      = '#F5F0FF';
const ERROR   = '#BA1A1A';

const CARD_SH = {
  shadowColor: 'rgba(124, 58, 237, 1)',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 20,
  elevation: 4,
};

/**
 * ChangePhoneInputScreen
 * Step 1 of the phone change flow — driver enters their new phone number.
 * On submit, sends an OTP to the new number then navigates to ChangePhoneOtp.
 */
export default function ChangePhoneInputScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { driver } = useAuth();

  const [newPhone, setNewPhone]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const currentPhone = driver?.phone ?? route?.params?.current_phone ?? '';

  const handleSendOtp = async () => {
    const cleaned = newPhone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await client.post('/drivers/profile/phone/send-otp', {
        new_phone: `+91${cleaned}`,
      });
      navigation.navigate('ChangePhoneOtp', {
        current_phone: currentPhone,
        new_phone: `+91${cleaned}`,
        session_token: data?.session_token ?? null,
      });
    } catch (err) {
      setError(
        err?.response?.data?.error?.message
        ?? err?.response?.data?.message
        ?? 'Could not send OTP. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={undefined}
    >
      <View style={s.root}>
        {/* Decorative blobs */}
        <View style={s.blobTR} />
        <View style={s.blobBL} />

        <ScreenHeader title="Change Phone Number" onBack={() => navigation.goBack()} />

        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom + 32, 48) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Heading */}
          <View style={s.heading}>
            <Text style={s.pageTitle}>New Phone Number</Text>
            <Text style={s.pageSub}>
              Enter the new mobile number you'd like to use for your Sakhi driver account.
            </Text>
          </View>

          {/* Card */}
          <View style={s.card}>

            {/* Current number (read-only display) */}
            {currentPhone ? (
              <View style={s.currentRow}>
                <Text style={s.currentLabel}>CURRENT NUMBER</Text>
                <View style={s.currentValueRow}>
                  <Text style={s.shieldIcon}>🔒</Text>
                  <Text style={s.currentValue}>{currentPhone}</Text>
                </View>
              </View>
            ) : null}

            <View style={s.hairline} />

            {/* New number input */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>NEW NUMBER</Text>
              <View style={[s.inputRow, error ? s.inputRowError : null]}>
                {/* India flag + country code */}
                <View style={s.countryCode}>
                  <Text style={s.flag}>🇮🇳</Text>
                  <Text style={s.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={s.input}
                  value={newPhone}
                  onChangeText={(t) => { setNewPhone(t.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={MUTED}
                  keyboardType="phone-pad"
                  maxLength={10}
                  returnKeyType="done"
                  onSubmitEditing={handleSendOtp}
                  autoFocus
                />
                {newPhone.length === 10 && (
                  <Text style={s.checkIcon}>✓</Text>
                )}
              </View>
              {error ? <Text style={s.errorText}>{error}</Text> : null}
            </View>

            {/* Info note */}
            <View style={s.infoCard}>
              <Text style={s.infoEmoji}>ℹ️</Text>
              <Text style={s.infoText}>
                A 6-digit OTP will be sent to your new number. Your current number remains active until the change is verified.
              </Text>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[s.ctaBtn, (loading || newPhone.length < 10) && s.ctaBtnDisabled]}
            onPress={handleSendOtp}
            disabled={loading || newPhone.length < 10}
            activeOpacity={0.88}
          >
            {loading
              ? <ActivityIndicator color={WHITE} />
              : <Text style={s.ctaBtnText}>Send OTP →</Text>
            }
          </TouchableOpacity>

          {/* Fine print */}
          <Text style={s.finePrint}>
            Standard SMS rates may apply. OTP expires in 10 minutes.
          </Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, overflow: 'hidden' },

  blobTR: {
    position: 'absolute', width: 256, height: 256,
    top: -128, right: -128, borderRadius: 128,
    backgroundColor: 'rgba(210,187,255,0.2)',
  },
  blobBL: {
    position: 'absolute', width: 256, height: 256,
    bottom: -128, left: -128, borderRadius: 128,
    backgroundColor: 'rgba(206,189,255,0.2)',
  },

  scroll: { paddingHorizontal: 24, paddingTop: 16, gap: 24 },

  heading: { gap: 8 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: DARK, letterSpacing: -0.7 },
  pageSub:   { fontSize: 14, color: MUTED, lineHeight: 22 },

  card: {
    backgroundColor: WHITE, borderRadius: 16,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24,
    gap: 20, ...CARD_SH,
  },

  currentRow:     { gap: 6 },
  currentLabel:   { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase' },
  currentValueRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  shieldIcon:     { fontSize: 14 },
  currentValue:   { fontSize: 16, fontWeight: '500', color: 'rgba(74,68,85,0.55)' },
  hairline:       { height: 1, backgroundColor: BG },

  fieldGroup:     { gap: 8 },
  fieldLabel:     { fontSize: 11, fontWeight: '700', color: PURPLE, letterSpacing: 0.8, textTransform: 'uppercase' },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BG, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(190,163,216,0.30)',
  },
  inputRowError: { borderColor: ERROR },
  countryCode: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(190,163,216,0.12)',
    paddingHorizontal: 14, paddingVertical: 15,
    borderRightWidth: 1, borderRightColor: 'rgba(190,163,216,0.25)',
  },
  flag:            { fontSize: 16 },
  countryCodeText: { fontSize: 14, fontWeight: '600', color: DARK },
  input: {
    flex: 1, paddingVertical: 15, paddingHorizontal: 14,
    fontSize: 18, fontWeight: '600', color: DARK, letterSpacing: 1,
  },
  checkIcon: { fontSize: 18, color: '#10B981', paddingRight: 14, fontWeight: '700' },
  errorText: { fontSize: 12, color: ERROR, paddingLeft: 2 },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(190,163,216,0.10)', borderRadius: 12, padding: 14,
  },
  infoEmoji: { fontSize: 16, marginTop: 1 },
  infoText:  { flex: 1, fontSize: 13, color: MUTED, lineHeight: 20 },

  ctaBtn: {
    height: 56, borderRadius: 14,
    backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: DEEP,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.20, shadowRadius: 24,
    elevation: 6,
  },
  ctaBtnDisabled: { opacity: 0.55 },
  ctaBtnText: { fontSize: 17, fontWeight: '700', color: WHITE },

  finePrint: {
    fontSize: 11, color: MUTED, textAlign: 'center', lineHeight: 16,
  },
});
