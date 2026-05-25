import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  
  Dimensions,
  BackHandler} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import CustomAlert from '../../utils/CustomAlert';

const { width } = Dimensions.get('window');
const OTP_LENGTH = 6;
const RESEND_SECS = 30;

// Custom keypad layout
const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

export default function DriverOtpVerificationScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { phone, devBypass } = route.params ?? {};
  const { login } = useAuth();

  const [otp, setOtp] = useState([]);   // array of digit strings
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(RESEND_SECS);

  // Auto-fill bypass code when navigated from dev bypass button
  useEffect(() => {
    if (devBypass && devBypass.length === OTP_LENGTH) {
      const digits = devBypass.split('');
      setOtp(digits);
      // Small delay so UI renders first
      setTimeout(() => handleVerify(devBypass), 300);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Back confirmation — shown on both header back & hardware back ──────────
  const handleBack = useCallback(() => {
    // If currently loading (verification in progress), block back entirely
    if (loading) return true;

    CustomAlert.alert(
      '⚠️ Verification Incomplete',
      'You have not verified your OTP yet. What would you like to do?',
      [
        {
          text: 'Try Again',
          style: 'default',
          onPress: () => {
            // Stay on screen, clear whatever was entered
            setOtp([]);
          },
        },
        {
          text: 'Change Number',
          style: 'destructive',
          onPress: () => {
            // Use canGoBack() guard — goBack() crashes when OTP is the
            // root screen (nothing behind it in the stack).
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('DriverLogin');
            }
          },
        },
      ],
      { cancelable: false },
    );
    return true; // prevent default back action
  }, [loading, navigation]);

  // Intercept Android hardware back button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [handleBack]);

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  // ── Keypad press ────────────────────────────────────────────────────────
  const handleKey = (key) => {
    if (key === '') return;
    if (key === '⌫') {
      setOtp((prev) => prev.slice(0, -1));
      return;
    }
    if (otp.length >= OTP_LENGTH) return;
    const next = [...otp, key];
    setOtp(next);
    // Auto-submit when 6th digit is entered
    if (next.length === OTP_LENGTH) {
      handleVerify(next.join(''));
    }
  };

  // ── Resend ──────────────────────────────────────────────────────────────
  const handleResend = async () => {
    try {
      const client = (await import('../../api/client')).default;
      await client.post('/auth/send-otp', { phone, role: 'driver' });
      setOtp([]);
      setTimer(RESEND_SECS);
    } catch {
      CustomAlert.alert('Error', 'Could not resend OTP.');
    }
  };

  // ── Verify ──────────────────────────────────────────────────────────────
  const handleVerify = async (code = otp.join('')) => {
    if (code.length < OTP_LENGTH) return;
    try {
      setLoading(true);
      console.log('[OTP] Verifying', phone, 'with code', code);
      const result = await login(phone, code);
      if (!result.success) {
        CustomAlert.alert('Invalid OTP', result.message ?? 'Please try again.');
        setOtp([]);
        return;
      }
      // ✅ No navigation.reset() needed here.
      // login() updates isAuthenticated in AuthContext → RootNavigator
      // automatically swaps AuthStack → OnboardingStack or MainStack.
    } catch (err) {
      console.error('[OTP] verify error:', err.message, err.response?.data);
      CustomAlert.alert('Error', err.message ?? 'Verification failed. Please try again.');
      setOtp([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Format phone for display ─────────────────────────────────────────────
  const formattedPhone = phone
    ? phone.replace(/(\+91)(\d{5})(\d{5})/, '$1 $2 $3')
    : '';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar style="dark" />

      {/* ── Top App Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('auth.verificationScreen')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Main Content ── */}
      <View style={styles.content}>

        {/* Branding / identity */}
        <View style={styles.identity}>
          <Text style={styles.heading}>{t('auth.verifyYourNumber')}</Text>
          <View style={styles.sublineWrap}>
            <Text style={styles.subline}>
              {t('auth.otpSentTo')}{'\n'}
              <Text style={styles.phoneNum}>{formattedPhone}</Text>
            </Text>
          </View>
          <View style={styles.smsBadge}>
            <Feather name="message-circle" size={12} color="#94A3B8" />
            <Text style={styles.smsBadgeText}>{t('auth.sentViaSms')}</Text>
          </View>
        </View>

        {/* OTP Boxes */}
        <View style={styles.otpRow}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => {
            const isActive = i === otp.length;
            const isFilled = i < otp.length;
            return (
              <View
                key={i}
                style={[
                  styles.otpBox,
                  isFilled && styles.otpBoxFilled,
                  isActive && styles.otpBoxActive,
                ]}
              >
                {isFilled ? (
                  <Text style={styles.otpDigit}>{otp[i]}</Text>
                ) : isActive ? (
                  <View style={styles.cursor} />
                ) : (
                  <View style={styles.dot} />
                )}
              </View>
            );
          })}
        </View>

        {/* Resend row */}
        <View style={styles.resendRow}>
          {timer > 0 ? (
            <Text style={styles.resendTimer}>
              {t('auth.resendOtpIn')}{' '}
              <Text style={styles.resendCountdown}>
                0:{String(timer).padStart(2, '0')}
              </Text>
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendLink}>{t('auth.resendOtp')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Custom Keypad */}
        <View style={styles.keypad}>
          {KEYPAD.map((row, ri) => (
            <View key={ri} style={styles.keyRow}>
              {row.map((key, ki) => (
                <TouchableOpacity
                  key={ki}
                  style={[styles.keyBtn, key === '' && styles.keyBtnEmpty]}
                  onPress={() => handleKey(key)}
                  activeOpacity={key === '' ? 1 : 0.7}
                  disabled={key === ''}
                >
                  <Text style={[
                    styles.keyText,
                    key === '⌫' && styles.keyBackspace,
                  ]}>
                    {key}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* ── Bottom CTA ── */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.ctaBtn, (otp.length < OTP_LENGTH || loading) && styles.ctaDisabled]}
          onPress={() => handleVerify()}
          disabled={otp.length < OTP_LENGTH || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaText}>{t('auth.verifyAndContinue')}</Text>
          }
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          By continuing, you confirm that you are the authorized{'\n'}driver of the registered vehicle.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },

  // ── Top bar ─────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 64,
    backgroundColor: 'rgba(245,240,255,0.85)',
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 99,
  },
  backArrow: { fontSize: 22, color: '#BEA3D8' },
  topBarTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 18, fontWeight: '600',
    color: '#1E1B2E', letterSpacing: -0.45,
  },

  // ── Content ─────────────────────────────────────────────────────────────
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 40,
    alignItems: 'center',
  },

  // Identity block
  identity: { alignItems: 'center', marginBottom: 28 },
  heading: {
    fontSize: 24, fontWeight: '800',
    color: '#1E1B2E', letterSpacing: -0.6,
    textAlign: 'center', marginBottom: 12,
  },
  sublineWrap: { alignItems: 'center', marginBottom: 12 },
  subline: {
    fontSize: 14, fontWeight: '400',
    color: '#64748B', textAlign: 'center', lineHeight: 22,
  },
  phoneNum: { fontWeight: '700', color: '#1E1B2E' },

  // SMS badge
  smsBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F0FF',
    borderWidth: 1, borderColor: 'rgba(204,195,216,0.2)',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4,
    gap: 6,
  },
  smsIcon: { fontSize: 11 },
  smsBadgeText: {
    fontSize: 10, fontWeight: '700',
    letterSpacing: 0.5, textTransform: 'uppercase',
    color: '#94A3B8',
  },

  // ── OTP Boxes ─────────────────────────────────────────────────────────
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    width: '100%',
  },
  otpBox: {
    flex: 1, height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(177,143,254,0.4)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 16,
    elevation: 3,
  },
  otpBoxActive: {
    borderWidth: 2, borderColor: '#BEA3D8',
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOpacity: 0.1,
    // Focus ring approximated via shadow
  },
  otpBoxFilled: {
    borderColor: 'rgba(177,143,254,0.6)',
  },
  otpDigit: {
    fontSize: 20, fontWeight: '700', color: '#1E1B2E',
  },
  cursor: {
    width: 2, height: 22,
    backgroundColor: '#BEA3D8',
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(124,58,237,0.2)',
  },

  // ── Resend ───────────────────────────────────────────────────────────
  resendRow: { marginBottom: 28, alignItems: 'center' },
  resendTimer: { fontSize: 14, fontWeight: '500', color: '#94A3B8' },
  resendCountdown: { fontWeight: '700', color: '#9C6FD7' },
  resendLink: { fontSize: 14, fontWeight: '700', color: '#9C6FD7' },

  // ── Custom Keypad ────────────────────────────────────────────────────
  keypad: { width: '100%', gap: 4 },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 0,
  },
  keyBtn: {
    width: (width - 64) / 3,
    height: 52,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 12,
  },
  keyBtnEmpty: { opacity: 0 },
  keyText: {
    fontSize: 20, fontWeight: '600', color: '#1E1B2E',
  },
  keyBackspace: {
    fontSize: 18, color: '#64748B',
  },

  // ── Bottom ────────────────────────────────────────────────────────────
  bottom: {
    paddingHorizontal: 32,
    paddingBottom: 32,
    gap: 14,
    alignItems: 'center',
  },
  ctaBtn: {
    width: '100%', height: 56,
    borderRadius: 12,
    backgroundColor: '#9C6FD7',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 24,
    elevation: 8,
  },
  ctaDisabled: {
    backgroundColor: '#CCC3D8',
    shadowOpacity: 0, elevation: 0,
  },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  disclaimer: {
    fontSize: 11, color: '#94A3B8',
    textAlign: 'center', lineHeight: 18,
  },
});
