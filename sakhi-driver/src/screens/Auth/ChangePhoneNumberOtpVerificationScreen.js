import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet,  ActivityIndicator} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client, { saveTokens } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import CustomAlert from '../../utils/CustomAlert';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function ChangePhoneNumberOtpVerificationScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { phone } = route.params ?? {};
  const { updateDriver } = useAuth();

  const [otp, setOtp]           = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading]   = useState(false);
  const [resendTimer, setTimer] = useState(RESEND_SECONDS);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  const handleChange = (text, index) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    if (digit && index === OTP_LENGTH - 1) handleVerify(next.join(''));
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    try {
      await client.post('/drivers/profile/phone/resend-otp', { new_phone: phone });
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimer(RESEND_SECONDS);
      inputRefs.current[0]?.focus();
    } catch {
      CustomAlert.alert('Error', 'Could not resend OTP.');
    }
  };

  const handleVerify = async (code = otp.join('')) => {
    if (code.length < OTP_LENGTH) return;
    try {
      setLoading(true);
      const { data } = await client.post('/drivers/profile/phone/verify-otp', { new_phone: phone, otp: code });
      if (data?.accessToken && data?.refreshToken) {
        await saveTokens(data.accessToken, data.refreshToken);
      }
      if (data?.driver?.phone) {
        updateDriver({ phone: data.driver.phone });
      }
      CustomAlert.alert('Success', 'Your phone number has been updated.', [
        { text: 'OK', onPress: () => navigation.popToTop() },
      ]);
    } catch (err) {
      CustomAlert.alert(
        'Invalid OTP',
        err.response?.data?.error?.message ?? err.response?.data?.message ?? 'Please try again.',
      );
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const filled = otp.join('').length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.blobBL} />
      <View style={styles.blobTR} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify New Number</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.headline}>Enter OTP</Text>
        <Text style={styles.subline}>
          6-digit code sent to{'\n'}
          <Text style={styles.phoneHighlight}>{phone}</Text>
        </Text>

        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => (inputRefs.current[i] = r)}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={(t) => handleChange(t, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              autoFocus={i === 0}
            />
          ))}
        </View>

        <View style={styles.resendRow}>
          {resendTimer > 0
            ? <Text style={styles.resendTimer}>
                Resend in <Text style={styles.resendCountdown}>0:{String(resendTimer).padStart(2, '0')}</Text>
              </Text>
            : <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Resend OTP</Text>
              </TouchableOpacity>
          }
        </View>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.ctaBtn, (filled < OTP_LENGTH || loading) && styles.ctaDisabled]}
          onPress={() => handleVerify()}
          disabled={filled < OTP_LENGTH || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaText}>Confirm Change</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  blobBL: {
    position: 'absolute', bottom: -100, left: -100,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(124,58,237,0.05)',
  },
  blobTR: {
    position: 'absolute', top: -100, right: -100,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(103,75,181,0.07)',
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${Colors.primaryContainer}15`,
  },
  backIcon: { fontSize: 26, color: Colors.primaryContainer, marginTop: -3 },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 17, fontWeight: '600', color: Colors.onSurface,
  },
  content: { flex: 1, paddingHorizontal: Spacing.xl, paddingTop: 36 },
  headline: {
    fontSize: 26, fontWeight: '800',
    color: Colors.onSurface, letterSpacing: -0.5, marginBottom: 10,
  },
  subline: {
    fontSize: 14, color: Colors.onSurfaceVariant, lineHeight: 22, marginBottom: 36,
  },
  phoneHighlight: { fontWeight: '700', color: Colors.onSurface },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  otpBox: {
    flex: 1, height: 56, backgroundColor: Colors.white,
    borderRadius: Radius.lg, borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    textAlign: 'center', fontSize: 22, fontWeight: '700',
    color: Colors.onSurface, ...Shadows.card,
  },
  otpBoxFilled: {
    borderColor: Colors.primaryContainer, borderWidth: 2,
    backgroundColor: `${Colors.primaryContainer}08`,
  },
  resendRow: { alignItems: 'center', marginTop: 20 },
  resendTimer: { fontSize: 13, color: Colors.onSurfaceVariant },
  resendCountdown: { fontWeight: '700', color: Colors.primaryContainer },
  resendLink: { fontSize: 13, fontWeight: '700', color: Colors.primaryContainer },
  bottom: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing['2xl'] },
  ctaBtn: {
    height: 56, borderRadius: Radius.lg,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center', ...Shadows.lavender,
  },
  ctaDisabled: { backgroundColor: Colors.outlineVariant },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
