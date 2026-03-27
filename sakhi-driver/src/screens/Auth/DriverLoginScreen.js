import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';

export default function DriverLoginScreen({ navigation }) {
  const [phone, setPhone]     = useState('');
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Decorative blobs */}
          <View style={styles.blobTR} />
          <View style={styles.blobBL} />

          {/* Branding */}
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Text style={styles.brandEmoji}>🛺</Text>
            </View>
            <Text style={styles.brandName}>Sakhi Driver</Text>
            <View style={styles.partnerBadge}>
              <Text style={styles.partnerText}>PARTNER APP</Text>
            </View>
          </View>

          {/* Headline */}
          <View style={styles.headlineBlock}>
            <Text style={styles.headline}>Welcome, Driver</Text>
            <Text style={styles.subline}>
              Log in or register to start driving with Sakhi
            </Text>
          </View>

          {/* Phone input card */}
          <View style={[styles.inputCard, phone.length > 0 && styles.inputCardActive]}>
            {/* +91 prefix */}
            <View style={styles.prefixBox}>
              <Text style={styles.flag}>🇮🇳</Text>
              <Text style={styles.prefix}>+91</Text>
            </View>
            <View style={styles.divider} />
            <TextInput
              style={styles.phoneInput}
              placeholder="Phone number"
              placeholderTextColor={Colors.outlineVariant}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              returnKeyType="done"
              onSubmitEditing={handleSendOtp}
            />
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.ctaBtn, (!isValid || loading) && styles.ctaDisabled]}
            onPress={handleSendOtp}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.ctaText}>Send OTP via SMS ›</Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>VERIFICATION</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Footer */}
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
  safe:   { flex: 1, backgroundColor: Colors.surfaceLow },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.base, paddingBottom: 40 },

  // Blobs
  blobTR: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(124,58,237,0.06)',
  },
  blobBL: {
    position: 'absolute', bottom: -80, left: -80,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(124,58,237,0.04)',
  },

  // Brand
  brandRow: { alignItems: 'center', marginTop: 32, gap: 10 },
  brandIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.lavender,
  },
  brandEmoji: { fontSize: 38 },
  brandName: {
    fontSize: 28, fontWeight: '800',
    color: Colors.onSurface, letterSpacing: -0.5,
  },
  partnerBadge: {
    backgroundColor: `${Colors.primaryContainer}22`,
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: `${Colors.primaryContainer}40`,
  },
  partnerText: {
    fontSize: 9, fontWeight: '700', letterSpacing: 2,
    color: Colors.primaryContainer,
  },

  // Headline
  headlineBlock: { marginTop: 32, marginBottom: 28 },
  headline: {
    fontSize: 30, fontWeight: '800',
    color: Colors.onSurface, letterSpacing: -0.5,
  },
  subline: {
    fontSize: 15, color: Colors.onSurfaceVariant,
    marginTop: 4, lineHeight: 22,
  },

  // Phone input
  inputCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg, height: 56,
    paddingHorizontal: Spacing.md,
    borderWidth: 2, borderColor: 'transparent',
    ...Shadows.card,
  },
  inputCardActive: { borderColor: `${Colors.primaryContainer}70` },
  prefixBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flag: { fontSize: 20 },
  prefix: { fontSize: 15, fontWeight: '600', color: Colors.onSurface },
  divider: {
    width: 1, height: 22,
    backgroundColor: Colors.outlineVariant,
    marginHorizontal: Spacing.sm,
  },
  phoneInput: {
    flex: 1, fontSize: 16, fontWeight: '500',
    color: Colors.onSurface, letterSpacing: 0.5,
  },

  // CTA
  ctaBtn: {
    marginTop: 20, height: 56, borderRadius: Radius.lg,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.lavender,
  },
  ctaDisabled: { backgroundColor: Colors.outlineVariant },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Divider row
  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 32, gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: `${Colors.outlineVariant}40` },
  dividerLabel: {
    fontSize: 9, fontWeight: '700', letterSpacing: 2,
    color: Colors.onSurfaceVariant,
  },

  // Footer
  footer: {
    fontSize: 11, color: Colors.onSurfaceVariant,
    textAlign: 'center', marginTop: 24, lineHeight: 18,
  },
  footerLink: { color: Colors.primaryContainer, fontWeight: '600' },
});
