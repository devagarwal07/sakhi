import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function DriverGenderVerificationScreen({ navigation }) {
  const { updateDriver } = useAuth();
  const [selfie, setSelfie]   = useState(null);
  const [loading, setLoading] = useState(false);

  // ── Camera / Gallery ──────────────────────────────────────────────────────
  const takeSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed for face verification.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) setSelfie(result.assets[0]);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selfie) return;
    try {
      setLoading(true);
      const form = new FormData();
      form.append('selfie', {
        uri: selfie.uri,
        type: 'image/jpeg',
        name: 'selfie.jpg',
      });
      await client.post('/drivers/verify-identity', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateDriver({ onboarding_status: 'gender_verified' });
      navigation.navigate('DriverKycUpload');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sakhi</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Shield icon */}
        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>🛡️</Text>
        </View>

        <Text style={styles.headline}>Verify Your Identity</Text>
        <Text style={styles.subline}>Only verified women drivers can join Sakhi.</Text>

        {/* Option Cards */}
        <View style={styles.cards}>
          {/* Face Selfie */}
          <TouchableOpacity style={styles.card} onPress={takeSelfie} activeOpacity={0.85}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardEmoji}>🤳</Text>
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Face Scan</Text>
              <Text style={styles.cardSub}>Quick camera-based identity verification</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Selfie preview */}
          {selfie && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: selfie.uri }} style={styles.preview} />
              <TouchableOpacity style={styles.retakeBtn} onPress={takeSelfie}>
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ flex: 1 }} />
      </ScrollView>

      {/* CTA */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.ctaBtn, (!selfie || loading) && styles.ctaDisabled]}
          onPress={handleSubmit}
          disabled={!selfie || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaText}>Continue</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.surfaceLow },
  scroll: { paddingBottom: 120, flexGrow: 1 },

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
    fontSize: 17, fontWeight: '700', color: Colors.onSurface,
  },

  iconCircle: {
    alignSelf: 'center', width: 80, height: 80,
    borderRadius: 40, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 24, marginBottom: 20, ...Shadows.lavender,
  },
  iconEmoji: { fontSize: 40 },

  headline: {
    fontSize: 24, fontWeight: '800', color: Colors.onSurface,
    textAlign: 'center', letterSpacing: -0.5, paddingHorizontal: Spacing.xl,
  },
  subline: {
    fontSize: 14, color: Colors.onSurfaceVariant,
    textAlign: 'center', marginTop: 8, marginBottom: 32,
    paddingHorizontal: Spacing['2xl'],
  },

  cards: { paddingHorizontal: Spacing.base, gap: 12 },
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.base, flexDirection: 'row',
    alignItems: 'center', gap: 12, ...Shadows.card,
  },
  cardIcon: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: Colors.surfaceLow,
    alignItems: 'center', justifyContent: 'center',
  },
  cardEmoji: { fontSize: 24 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.onSurface },
  cardSub:   { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  chevron:   { fontSize: 22, color: Colors.primaryContainer },

  previewContainer: {
    alignItems: 'center', marginTop: 8, gap: 8,
  },
  preview: {
    width: 160, height: 160, borderRadius: Radius.lg,
    borderWidth: 3, borderColor: Colors.primaryContainer,
  },
  retakeBtn: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.primaryContainer,
  },
  retakeText: { fontSize: 13, color: Colors.primaryContainer, fontWeight: '600' },

  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.base, paddingBottom: 32, paddingTop: 16,
    backgroundColor: `${Colors.surfaceLow}DD`,
  },
  ctaBtn: {
    height: 56, borderRadius: Radius.lg,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center', ...Shadows.lavender,
  },
  ctaDisabled: { backgroundColor: Colors.outlineVariant },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
