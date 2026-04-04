import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import client from '../../api/client';

const { width } = Dimensions.get('window');

export default function DriverLoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = phone.replace(/\s/g, '').length === 10;

  const handleSendOtp = async () => {
    if (!isValid) return;
    try {
      setLoading(true);
      await client.post('/auth/send-otp', { phone: `+91${phone}`, role: 'driver' });
      navigation.navigate('DriverOtp', { phone: `+91${phone}` });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Could not send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.canGoBack() && navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Sakhi Driver</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Illustration ── */}
          <View style={styles.illustrationCard}>
            <Image
              source={require('../../../assets/riksha.png')}
              style={styles.illustration}
              resizeMode="contain"
            />
          </View>

          {/* ── Header Text ── */}
          <View style={styles.headerText}>
            <Text style={styles.heading}>Welcome, Sakhi</Text>
            <Text style={styles.subheading}>
              Log in or register to start driving with Sakhi
            </Text>
          </View>

          {/* ── Phone Input ── */}
          <View style={[styles.inputCard, phone.length > 0 && styles.inputCardFocused]}>
            {/* Country code */}
            <View style={styles.countryCode}>
              <Text style={styles.flag}>🇮🇳</Text>
              <Text style={styles.dialCode}>+91</Text>
            </View>
            <View style={styles.inputDivider} />
            <TextInput
              style={styles.phoneInput}
              placeholder="Phone number"
              placeholderTextColor="rgba(123,116,135,0.5)"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              returnKeyType="done"
              onSubmitEditing={handleSendOtp}
            />
          </View>

          {/* ── CTA Button ── */}
          <TouchableOpacity
            style={[styles.ctaBtn, (!isValid || loading) && styles.ctaDisabled]}
            onPress={handleSendOtp}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.ctaText}>Send OTP via SMS  ›</Text>
            }
          </TouchableOpacity>

          {/* ── Divider ── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>VERIFICATION</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Footer ── */}
          <Text style={styles.footer}>
            By continuing, you agree to our{' '}
            <Text style={styles.footerLink}>Terms of Service</Text>
            {' & '}
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },

  // ── Top app bar ──────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    height: 64,
    backgroundColor: 'rgba(245,240,255,0.85)',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: '#BEA3D8',
    fontWeight: '500',
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1B2E',
    letterSpacing: -0.5,
  },

  // ── Scroll content ───────────────────────────────────────────────────────
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // ── Illustration card ────────────────────────────────────────────────────
  illustrationCard: {
    width: '100%',
    height: 220,
    backgroundColor: '#F5F0FF',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 32,
  },
  illustration: {
    width: '90%',
    height: '90%',
  },

  // ── Header text ──────────────────────────────────────────────────────────
  headerText: {
    marginBottom: 24,
    gap: 8,
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E1B2E',
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  subheading: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 26,
  },

  // ── Phone input ──────────────────────────────────────────────────────────
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputCardFocused: {
    borderColor: 'rgba(190,163,216,0.6)',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
  },
  flag: { fontSize: 18 },
  dialCode: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  inputDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(204,195,216,0.3)',
    marginRight: 14,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1E1B2E',
  },

  // ── CTA button ───────────────────────────────────────────────────────────
  ctaBtn: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#AD86E1',   // matches gradient midpoint
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
    marginBottom: 0,
  },
  ctaDisabled: {
    backgroundColor: '#CCC3D8',
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── VERIFICATION divider ─────────────────────────────────────────────────
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(204,195,216,0.2)',
  },
  dividerLabel: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#6B7280',
  },

  // ── Footer ───────────────────────────────────────────────────────────────
  footer: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLink: {
    color: '#BEA3D8',
    textDecorationLine: 'underline',
  },
});
