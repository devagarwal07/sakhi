import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';

export default function ChangePhoneNumberInputScreen({ navigation }) {
  const [phone, setPhone]   = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = phone.replace(/\s/g, '').length === 10;

  const handleContinue = async () => {
    if (!isValid) return;
    try {
      setLoading(true);
      await client.post('/drivers/profile/phone/send-otp', { new_phone: `+91${phone}` });
      navigation.navigate('ChangePhoneOtp', { phone: `+91${phone}` });
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
        behavior={undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change Phone Number</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              Enter your new phone number. An OTP will be sent to verify it.
            </Text>
          </View>

          <Text style={styles.headline}>New Phone Number</Text>
          <Text style={styles.subline}>
            Your existing rides and earnings will be transferred to the new number.
          </Text>

          {/* Input */}
          <View style={[styles.inputCard, phone.length > 0 && styles.inputCardActive]}>
            <View style={styles.prefixBox}>
              <Text style={styles.flag}>🇮🇳</Text>
              <Text style={styles.prefix}>+91</Text>
            </View>
            <View style={styles.divider} />
            <TextInput
              style={styles.phoneInput}
              placeholder="New phone number"
              placeholderTextColor={Colors.outlineVariant}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.ctaBtn, (!isValid || loading) && styles.ctaDisabled]}
            onPress={handleContinue}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.ctaText}>Send OTP ›</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceLow },
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
  content: { flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: `${Colors.primaryContainer}12`,
    borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: `${Colors.primaryContainer}25`,
    marginBottom: Spacing.xl, gap: 8,
  },
  infoIcon: { fontSize: 16 },
  infoText: {
    flex: 1, fontSize: 13, color: Colors.onSurfaceVariant, lineHeight: 20,
  },
  headline: {
    fontSize: 26, fontWeight: '800',
    color: Colors.onSurface, letterSpacing: -0.5, marginBottom: 8,
  },
  subline: {
    fontSize: 14, color: Colors.onSurfaceVariant,
    lineHeight: 22, marginBottom: 28,
  },
  inputCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    height: 56, paddingHorizontal: Spacing.md,
    borderWidth: 2, borderColor: 'transparent', ...Shadows.card,
  },
  inputCardActive: { borderColor: `${Colors.primaryContainer}70` },
  prefixBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flag: { fontSize: 20 },
  prefix: { fontSize: 15, fontWeight: '600', color: Colors.onSurface },
  divider: {
    width: 1, height: 22,
    backgroundColor: Colors.outlineVariant, marginHorizontal: Spacing.sm,
  },
  phoneInput: {
    flex: 1, fontSize: 16, fontWeight: '500', color: Colors.onSurface,
  },
  ctaBtn: {
    marginTop: 20, height: 56, borderRadius: Radius.lg,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center', ...Shadows.lavender,
  },
  ctaDisabled: { backgroundColor: Colors.outlineVariant },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
