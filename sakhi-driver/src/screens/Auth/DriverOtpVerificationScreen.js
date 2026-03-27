import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function DriverOtpVerificationScreen({ route, navigation }) {
  const { phone } = route.params ?? {};
  const { login } = useAuth();

  const [otp, setOtp]           = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading]   = useState(false);
  const [resendTimer, setTimer] = useState(RESEND_SECONDS);
  const inputRefs = useRef([]);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  // ── OTP input handlers ──────────────────────────────────────────────────
  const handleChange = (text, index) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    // Auto-submit when last digit entered
    if (digit && index === OTP_LENGTH - 1) {
      handleVerify(next.join(''));
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    try {
      const client = (await import('../../api/client')).default;
      await client.post('/auth/send-otp', { phone, role: 'driver' });
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimer(RESEND_SECONDS);
      inputRefs.current[0]?.focus();
    } catch {
      Alert.alert('Error', 'Could not resend OTP.');
    }
  };

  // ── Verify ──────────────────────────────────────────────────────────────
  const handleVerify = async (code = otp.join('')) => {
    if (code.length < OTP_LENGTH) return;
    try {
      setLoading(true);
      const result = await login(phone, code);

      if (!result.success) {
        Alert.alert('Invalid OTP', result.message);
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
        return;
      }

      const status = result.driver?.onboarding_status;
      if (status === 'approved') {
        navigation.reset({ index: 0, routes: [{ name: 'RootShell' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'RootShell' }] });
        // RootNavigator will redirect to OnboardingStack automatically
      }
    } catch {
      Alert.alert('Error', 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filled = otp.join('').length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Decorative blobs */}
      <View style={styles.blobBL} />
      <View style={styles.blobTR} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.headline}>Verify Your Number</Text>
        <Text style={styles.subline}>
          6-digit SMS code sent to{'\n'}
          <Text style={styles.phoneHighlight}>{phone}</Text>
        </Text>

        {/* OTP boxes */}
        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => (inputRefs.current[i] = r)}
              style={[
                styles.otpBox,
                digit ? styles.otpBoxFilled : null,
              ]}
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

        {/* Resend row */}
        <View style={styles.resendRow}>
          {resendTimer > 0
            ? <Text style={styles.resendTimer}>
                Resend OTP in{' '}
                <Text style={styles.resendCountdown}>0:{String(resendTimer).padStart(2, '0')}</Text>
              </Text>
            : <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Resend OTP</Text>
              </TouchableOpacity>
          }
        </View>
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.ctaBtn, (filled < OTP_LENGTH || loading) && styles.ctaDisabled]}
          onPress={() => handleVerify()}
          disabled={filled < OTP_LENGTH || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaText}>Verify & Continue</Text>
          }
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          By continuing, you confirm that you are the authorized driver of the registered vehicle.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  // Blobs
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

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
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

  // Content
  content: { flex: 1, paddingHorizontal: Spacing.xl, paddingTop: 36 },
  headline: {
    fontSize: 26, fontWeight: '800',
    color: Colors.onSurface, letterSpacing: -0.5, marginBottom: 10,
  },
  subline: {
    fontSize: 14, color: Colors.onSurfaceVariant,
    lineHeight: 22, marginBottom: 36,
  },
  phoneHighlight: { fontWeight: '700', color: Colors.onSurface },

  // OTP
  otpRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 8,
  },
  otpBox: {
    flex: 1, height: 56,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
    textAlign: 'center', fontSize: 22, fontWeight: '700',
    color: Colors.onSurface,
    ...Shadows.card,
  },
  otpBoxFilled: {
    borderColor: Colors.primaryContainer,
    borderWidth: 2,
    backgroundColor: `${Colors.primaryContainer}08`,
  },

  // Resend
  resendRow: { alignItems: 'center', marginTop: 20 },
  resendTimer: { fontSize: 13, color: Colors.onSurfaceVariant },
  resendCountdown: { fontWeight: '700', color: Colors.primaryContainer },
  resendLink: { fontSize: 13, fontWeight: '700', color: Colors.primaryContainer },

  // Bottom
  bottom: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    gap: 12,
  },
  ctaBtn: {
    height: 56, borderRadius: Radius.lg,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.lavender,
  },
  ctaDisabled: { backgroundColor: Colors.outlineVariant },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disclaimer: {
    fontSize: 11, textAlign: 'center',
    color: Colors.onSurfaceVariant, lineHeight: 16,
  },
});
