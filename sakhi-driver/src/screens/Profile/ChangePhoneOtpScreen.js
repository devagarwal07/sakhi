import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Phone, ShieldCheck, MessageSquare, ArrowRight, Delete } from 'lucide-react-native';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PURPLE  = '#BEA3D8';
const VIOLET  = '#7C3AED';
const DARK    = '#1C1A25';
const HEADER  = '#1E1B2E';
const MID     = '#4A4455';
const WHITE   = '#FFFFFF';
const BG      = '#F5F0FF';
const GREEN   = '#047857';
const CARD_SH = {
  shadowColor: '#7C3AED',
  shadowOffset: { width: 0, height: 16 },
  shadowOpacity: 0.08,
  shadowRadius: 32,
  elevation: 4,
};

const OTP_LENGTH = 6;

// ─── Custom numeric keypad ────────────────────────────────────────────────────
const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [null, '0', 'del'],
];

function NumKeypad({ onPress }) {
  return (
    <View style={kp.wrap}>
      {KEYS.map((row, r) => (
        <View key={r} style={kp.row}>
          {row.map((key, c) => {
            if (key === null) return <View key={c} style={kp.keyEmpty} />;
            if (key === 'del') {
              return (
                <TouchableOpacity
                  key={c}
                  style={kp.key}
                  onPress={() => onPress('del')}
                  activeOpacity={0.6}
                >
                  <Delete size={20} color={DARK} strokeWidth={2} />
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={c}
                style={kp.key}
                onPress={() => onPress(key)}
                activeOpacity={0.6}
              >
                <Text style={kp.keyText}>{key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}
const kp = StyleSheet.create({
  wrap:     { width: '100%', backgroundColor: 'rgba(229,224,239,0.7)', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingVertical: 8 },
  row:      { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 2 },
  key:      { width: 120, height: 48, alignItems: 'center', justifyContent: 'center' },
  keyEmpty: { width: 120, height: 48 },
  keyText:  { fontSize: 20, fontWeight: '600', color: DARK, lineHeight: 28 },
});

// ─── OTP box ──────────────────────────────────────────────────────────────────
function OtpBox({ digit, isFocused, isLast }) {
  const hasCursor = isFocused && !digit;
  return (
    <View style={[
      ob.box,
      isFocused && ob.boxFocused,
    ]}>
      {digit
        ? <Text style={ob.digit}>{digit}</Text>
        : hasCursor
          ? <View style={ob.cursor} />
          : null
      }
    </View>
  );
}
const ob = StyleSheet.create({
  box:        { width: 42.33, height: 56, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(204,195,216,0.3)', backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center', ...CARD_SH },
  boxFocused: { borderColor: 'rgba(99,14,212,0.5)', shadowColor: '#630ED4', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 0 } },
  digit:      { fontSize: 20, fontWeight: '700', color: DARK, lineHeight: 28 },
  cursor:     { width: 2, height: 24, backgroundColor: PURPLE, borderRadius: 1 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ChangePhoneOtpScreen({ navigation, route }) {
  const insets           = useSafeAreaInsets();
  const { checkAuth }    = useAuth();
  const currentPhone     = route?.params?.current_phone ?? '+91 98765 43210';
  const newPhone         = route?.params?.new_phone     ?? '+91 99887 76655';
  const sessionToken     = route?.params?.session_token ?? null;

  const [otp,           setOtp]          = useState('');
  const [verifying,     setVerifying]    = useState(false);
  const [resending,     setResending]    = useState(false);
  const [resendCountdown, setResendCountdown] = useState(30);
  const [otpSent,       setOtpSent]      = useState(true); // arrives pre-sent

  const countdownRef = useRef(null);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setResendCountdown((c) => {
        if (c <= 1) { clearInterval(countdownRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, []);

  // ── Keypad press ─────────────────────────────────────────────────────────
  const handleKey = useCallback((key) => {
    if (key === 'del') {
      setOtp((prev) => prev.slice(0, -1));
    } else if (otp.length < OTP_LENGTH) {
      const next = otp + key;
      setOtp(next);
      if (next.length === OTP_LENGTH) {
        // auto-submit when all digits entered
        submitOtp(next);
      }
    }
  }, [otp]);

  // ── Resend ────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCountdown > 0 || resending) return;
    try {
      setResending(true);
      setOtp('');
      await client.post('/drivers/profile/phone/resend-otp', { session_token: sessionToken });
      setResendCountdown(30);
      clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setResendCountdown((c) => {
          if (c <= 1) { clearInterval(countdownRef.current); return 0; }
          return c - 1;
        });
      }, 1000);
      setOtpSent(true);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Could not resend OTP. Try again.');
    } finally {
      setResending(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const submitOtp = async (code = otp) => {
    if (code.length < OTP_LENGTH) {
      Alert.alert('Incomplete', 'Please enter the 6-digit OTP.'); return;
    }
    try {
      setVerifying(true);
      await client.post('/drivers/profile/phone/verify-otp', {
        otp: code,
        session_token: sessionToken,
        new_phone: newPhone,
      });
      await checkAuth?.();
      Alert.alert('Success ✓', 'Phone number updated successfully!', [
        { text: 'OK', onPress: () => navigation?.goBack?.() },
      ]);
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Incorrect OTP. Please try again.';
      Alert.alert('Verification Failed', msg);
      setOtp('');
    } finally {
      setVerifying(false);
    }
  };

  const focusedIndex = Math.min(otp.length, OTP_LENGTH - 1);
  const isComplete   = otp.length === OTP_LENGTH;
  const canResend    = resendCountdown === 0 && !resending;

  const HEADER_H = Math.max(insets.top, 0) + 60;

  return (
    <View style={s.root}>

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={s.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={16} color={VIOLET} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Change Phone Number</Text>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: HEADER_H + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={false}
      >

        {/* ── Instruction ── */}
        <View style={s.instruction}>
          <Text style={s.instructionTitle}>Verify New Number</Text>
          <Text style={s.instructionSub}>
            Please enter the 6-digit code sent to your new mobile number to complete the update.
          </Text>
        </View>

        {/* ── Central Card ── */}
        <View style={s.card}>

          {/* Phone Overview */}
          <View style={s.phoneOverview}>
            {/* Current Number */}
            <View style={s.phoneRow}>
              <Text style={s.phoneRowLabel}>CURRENT NUMBER</Text>
              <View style={s.phoneNumRow}>
                <ShieldCheck size={11.67} color="rgba(74,68,85,0.5)" strokeWidth={2} />
                <Text style={s.phoneNumMuted}>{currentPhone}</Text>
              </View>
            </View>

            {/* Hair divider */}
            <View style={s.hairline} />

            {/* New Number */}
            <View style={s.phoneRow}>
              <Text style={[s.phoneRowLabel, s.phoneRowLabelNew]}>NEW NUMBER</Text>
              <View style={s.phoneNumRow}>
                <Phone size={8.75} color={PURPLE} strokeWidth={2} />
                <Text style={s.phoneNumBold}>{newPhone}</Text>
              </View>
            </View>
          </View>

          {/* OTP Section */}
          <View style={s.otpSection}>
            {/* Header row */}
            <View style={s.otpHeader}>
              <Text style={s.otpLabel}>ENTER OTP</Text>
              <TouchableOpacity onPress={handleResend} disabled={!canResend} activeOpacity={0.7}>
                {resending
                  ? <ActivityIndicator size="small" color={PURPLE} />
                  : <Text style={[s.resendText, !canResend && s.resendDisabled]}>
                      {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend code'}
                    </Text>
                }
              </TouchableOpacity>
            </View>

            {/* OTP Boxes */}
            <View style={s.otpBoxes}>
              {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                <OtpBox
                  key={i}
                  digit={otp[i] ?? ''}
                  isFocused={i === focusedIndex && !isComplete}
                  isLast={i === OTP_LENGTH - 1}
                />
              ))}
            </View>

            {/* OTP sent confirmation */}
            {otpSent && (
              <View style={s.sentPill}>
                <MessageSquare size={11.67} color="#059669" strokeWidth={2} />
                <Text style={s.sentText}>OTP sent via SMS</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Security note ── */}
        <View style={s.securityNote}>
          <ShieldCheck size={16} color="rgba(74,68,85,0.4)" strokeWidth={2} style={{ marginTop: 4, flexShrink: 0 }} />
          <Text style={s.securityText}>
            Your security is our priority. Changing your phone number will require re-authentication for future payments.
          </Text>
        </View>

      </ScrollView>

      {/* ── CTA button (above keyboard) ── */}
      <View style={s.ctaWrap}>
        <TouchableOpacity
          style={[s.verifyBtn, (!isComplete || verifying) && s.verifyBtnDisabled]}
          onPress={() => submitOtp()}
          disabled={!isComplete || verifying}
          activeOpacity={0.88}
        >
          {verifying
            ? <ActivityIndicator color={WHITE} />
            : <>
                <Text style={s.verifyBtnText}>Verify &amp; Update</Text>
                <ArrowRight size={12} color={WHITE} strokeWidth={3} />
              </>
          }
        </TouchableOpacity>
      </View>

      {/* ── Custom numeric keypad ── */}
      <NumKeypad onPress={handleKey} />

      {/* Bottom safe area fill */}
      {insets.bottom > 0 && <View style={{ height: insets.bottom, backgroundColor: 'rgba(229,224,239,0.7)' }} />}

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 24, paddingBottom: 14,
    height: 'auto',
    backgroundColor: 'rgba(245, 240, 255, 0.88)',
    ...Platform.select({
      ios: { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  backBtn:     { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: HEADER, letterSpacing: -0.45, lineHeight: 28 },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scroll: { paddingHorizontal: 24, paddingBottom: 24, gap: 24 },

  // ── Instruction ───────────────────────────────────────────────────────────
  instruction:     { gap: 6.88 },
  instructionTitle:{ fontSize: 24, fontWeight: '700', color: DARK, letterSpacing: -0.6, lineHeight: 32 },
  instructionSub:  { fontSize: 14, fontWeight: '400', color: MID, lineHeight: 23 },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: WHITE, borderRadius: 16, padding: 24, gap: 24, ...CARD_SH,
  },

  // ── Phone overview ────────────────────────────────────────────────────────
  phoneOverview: { gap: 16 },
  phoneRow:      { gap: 6 },
  phoneRowLabel: { fontSize: 11.2, fontWeight: '700', color: 'rgba(74,68,85,0.6)', letterSpacing: 0.56, textTransform: 'uppercase', lineHeight: 17 },
  phoneRowLabelNew: { color: PURPLE },
  phoneNumRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phoneNumMuted: { fontSize: 16, fontWeight: '500', color: 'rgba(74,68,85,0.5)', lineHeight: 24 },
  phoneNumBold:  { fontSize: 18, fontWeight: '700', color: DARK, lineHeight: 28 },
  hairline:      { height: 1, backgroundColor: '#F6F1FF' },

  // ── OTP section ───────────────────────────────────────────────────────────
  otpSection: { gap: 16, paddingTop: 8 },
  otpHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  otpLabel:   { fontSize: 12, fontWeight: '700', color: DARK, letterSpacing: 1.2, textTransform: 'uppercase', lineHeight: 16 },
  resendText: { fontSize: 12, fontWeight: '600', color: PURPLE, lineHeight: 16 },
  resendDisabled: { color: 'rgba(190,163,216,0.45)' },

  otpBoxes: { flexDirection: 'row', justifyContent: 'space-between' },

  // OTP sent pill
  sentPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#ECFDF5', borderRadius: 9999,
    paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'stretch',
  },
  sentText: { fontSize: 12, fontWeight: '600', color: GREEN, lineHeight: 16 },

  // ── Security note ─────────────────────────────────────────────────────────
  securityNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingLeft: 16 },
  securityText: { flex: 1, fontSize: 12, fontWeight: '400', color: MID, lineHeight: 16 },

  // ── CTA wrap ──────────────────────────────────────────────────────────────
  ctaWrap: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    background: 'transparent',
  },
  verifyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 56, borderRadius: 12, backgroundColor: PURPLE, ...CARD_SH,
  },
  verifyBtnDisabled: { opacity: 0.7 },
  verifyBtnText: { fontSize: 16, fontWeight: '700', color: WHITE, lineHeight: 24 },
});
