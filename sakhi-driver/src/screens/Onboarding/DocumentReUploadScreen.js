import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function DocumentReUploadScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { rejections = [] } = route.params ?? {};
  const { updateDriver } = useAuth();
  const [uploads, setUploads] = useState({});
  const [loading, setLoading] = useState(false);

  // ── Fallback: if no specific rejections provided, show all standard KYC docs ──
  const DEFAULT_DOCS = [
    { key: 'dl',        label: 'Driving Licence (Front)' },
    { key: 'dl_back',   label: 'Driving Licence (Back)' },
    { key: 'aadhaar',   label: 'Aadhaar Card' },
    { key: 'rc',        label: 'Vehicle RC' },
    { key: 'insurance', label: 'Insurance Certificate' },
  ];

  const docs = (rejections && rejections.length > 0) ? rejections : DEFAULT_DOCS;

  // At least dl + dl_back must be present for submission
  const requiredKeys = ['dl', 'dl_back'];
  const requiredDone = requiredKeys.every((k) => uploads[k]);

  const pickImage = async (key) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.9,
    });
    if (!result.canceled) setUploads((prev) => ({ ...prev, [key]: result.assets[0] }));
  };

  const handleResubmit = async () => {
    if (!requiredDone) {
      Alert.alert('Required Documents', 'Please upload at least DL Front and DL Back to continue.');
      return;
    }
    try {
      setLoading(true);
      const form = new FormData();
      docs.forEach(({ key }) => {
        if (!uploads[key]) return; // skip optional docs not uploaded
        const asset = uploads[key];
        form.append(key, { uri: asset.uri, type: 'image/jpeg', name: `${key}.jpg` });
      });
      await client.post('/drivers/kyc/re-upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateDriver({ onboarding_status: 'kyc_submitted' });
      navigation.replace('DocumentUnderReview');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? err.response?.data?.error?.message ?? 'Re-upload failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fix Documents</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Alert banner */}
        <View style={styles.alertBanner}>
          <Feather name="alert-triangle" size={20} color="#F59E0B" />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>Action Required</Text>
            <Text style={styles.alertSub}>The following documents need to be re-uploaded.</Text>
          </View>
        </View>

        <Text style={styles.headline}>Re-upload Documents</Text>

        {docs.map((rej) => (
          <View key={rej.key} style={styles.rejCard}>
            <View style={styles.rejHeader}>
              <Text style={styles.rejLabel}>{rej.label ?? rej.key}</Text>
              {rej.reason ? (
                <View style={styles.rejBadge}>
                  <Text style={styles.rejBadgeText}>REJECTED</Text>
                </View>
              ) : (
                <View style={[styles.rejBadge, { backgroundColor: '#EDE9FE' }]}>
                  <Text style={[styles.rejBadgeText, { color: '#7C3AED' }]}>REQUIRED</Text>
                </View>
              )}
            </View>
            {rej.reason && <Text style={styles.rejReason}>Reason: {rej.reason}</Text>}

            {uploads[rej.key] ? (
              <View style={styles.previewRow}>
                <Image source={{ uri: uploads[rej.key].uri }} style={styles.thumb} />
                <TouchableOpacity onPress={() => pickImage(rej.key)} style={styles.reuploadBtn}>
                  <Text style={styles.reuploadBtnText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage(rej.key)} activeOpacity={0.8}>
                <Text style={styles.uploadBtnText}><Feather name="paperclip" size={14} color="#BEA3D8" />  Upload {rej.label ?? rej.key}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.ctaBtn, (!requiredDone || loading) && styles.ctaDisabled]}
          onPress={handleResubmit}
          disabled={!requiredDone || loading}
          activeOpacity={0.85}

        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaText}>Resubmit for Review</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceLow },
  scroll: { paddingHorizontal: Spacing.base, paddingBottom: 120 },
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: Colors.onSurface },

  alertBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFF3CD', borderRadius: Radius.lg,
    padding: Spacing.md, gap: 10, marginTop: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#F59E0B30',
  },
  alertEmoji: { fontSize: 20 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  alertSub: { fontSize: 12, color: '#78350F', marginTop: 2 },

  headline: { fontSize: 20, fontWeight: '800', color: Colors.onSurface, letterSpacing: -0.5, marginBottom: 16 },
  noRejections: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', marginTop: 32 },

  rejCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: 12, ...Shadows.card,
  },
  rejHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  rejLabel: { fontSize: 15, fontWeight: '700', color: Colors.onSurface },
  rejBadge: {
    backgroundColor: '#FDECEA', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.full,
  },
  rejBadgeText: { fontSize: 9, fontWeight: '700', color: '#C62828', letterSpacing: 1 },
  rejReason: { fontSize: 12, color: Colors.onSurfaceVariant, marginBottom: 12, lineHeight: 18 },

  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: 8, borderWidth: 2, borderColor: Colors.online },
  reuploadBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primaryContainer,
  },
  reuploadBtnText: { color: Colors.primaryContainer, fontSize: 13, fontWeight: '600' },

  uploadBtn: {
    height: 48, borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceLow,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.primaryContainer,
  },
  uploadBtnText: { fontSize: 14, color: Colors.primaryContainer, fontWeight: '600' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.base, paddingBottom: 32, paddingTop: 12,
    backgroundColor: `${Colors.white}E0`,
  },
  ctaBtn: {
    height: 56, borderRadius: Radius.lg,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center', ...Shadows.lavender,
  },
  ctaDisabled: { backgroundColor: Colors.outlineVariant },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
