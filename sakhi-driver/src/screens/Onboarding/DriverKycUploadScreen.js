import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const DOCS = [
  { key: 'dl_front',  label: 'Driving License',    sub: 'Front side',  emoji: '🪪' },
  { key: 'dl_back',   label: 'Driving License',    sub: 'Back side',   emoji: '🪪' },
  { key: 'aadhaar',   label: 'Aadhaar Card',        sub: 'Front side',  emoji: '🆔' },
  { key: 'vehicle_rc',label: 'Vehicle RC',          sub: 'Registration Certificate', emoji: '🚗' },
  { key: 'profile',   label: 'Profile Photo',       sub: 'Clear face photo',        emoji: '📸' },
];

export default function DriverKycUploadScreen({ navigation }) {
  const { updateDriver } = useAuth();
  const [uploads, setUploads] = useState({});
  const [loading, setLoading] = useState(false);

  const allUploaded = DOCS.every((d) => uploads[d.key]);

  const pickImage = async (key) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to upload documents.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });
    if (!result.canceled) {
      setUploads((prev) => ({ ...prev, [key]: result.assets[0] }));
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const form = new FormData();
      DOCS.forEach(({ key }) => {
        const asset = uploads[key];
        form.append(key, {
          uri:  asset.uri,
          type: 'image/jpeg',
          name: `${key}.jpg`,
        });
      });
      await client.post('/drivers/kyc/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateDriver({ onboarding_status: 'kyc_submitted' });
      navigation.navigate('VehicleDetailsEntry');
    } catch (err) {
      Alert.alert('Upload Error', err.response?.data?.message ?? 'Please try again.');
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
        <Text style={styles.headerTitle}>KYC Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Step 2 of 5 · Upload Documents</Text>
          <Text style={styles.progressPct}>{Math.round((Object.keys(uploads).length / DOCS.length) * 100)}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(Object.keys(uploads).length / DOCS.length) * 100}%` }]} />
        </View>

        <Text style={styles.headline}>Upload Your Documents</Text>
        <Text style={styles.subline}>Required for verification and account activation</Text>

        {/* Document rows */}
        <View style={styles.card}>
          {DOCS.map((doc, idx) => {
            const uploaded = !!uploads[doc.key];
            return (
              <View key={doc.key}>
                <View style={styles.docRow}>
                  <View style={styles.docIcon}>
                    <Text style={styles.docEmoji}>{doc.emoji}</Text>
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docLabel}>{doc.label}</Text>
                    <Text style={styles.docSub}>{doc.sub}</Text>
                  </View>

                  {uploaded ? (
                    <View style={styles.uploadedCol}>
                      <Image source={{ uri: uploads[doc.key].uri }} style={styles.thumb} />
                      <TouchableOpacity onPress={() => pickImage(doc.key)}>
                        <Text style={styles.reupload}>Re-upload</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage(doc.key)}>
                      <Text style={styles.uploadBtnText}>Upload</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {idx < DOCS.length - 1 && <View style={styles.rowDivider} />}
              </View>
            );
          })}
        </View>

        {/* Info */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoEmoji}>⏱</Text>
          <Text style={styles.infoText}>Clean documents are auto-approved. Flagged ones go to manual review.</Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.ctaBtn, (!allUploaded || loading) && styles.ctaDisabled]}
          onPress={handleSubmit}
          disabled={!allUploaded || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaText}>Submit for Verification</Text>
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

  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 6 },
  progressLabel: { fontSize: 11, fontWeight: '700', color: Colors.primaryContainer, letterSpacing: 0.5 },
  progressPct: { fontSize: 11, color: Colors.onSurfaceVariant },
  progressTrack: { height: 8, backgroundColor: Colors.surfaceContainer, borderRadius: 4, overflow: 'hidden', marginBottom: 24 },
  progressFill: { height: '100%', backgroundColor: Colors.primaryContainer, borderRadius: 4 },

  headline: { fontSize: 22, fontWeight: '800', color: Colors.onSurface, letterSpacing: -0.5, marginBottom: 4 },
  subline: { fontSize: 14, color: Colors.onSurfaceVariant, marginBottom: 20 },

  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, overflow: 'hidden', ...Shadows.card },
  docRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: 12 },
  docIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.surfaceLow,
    alignItems: 'center', justifyContent: 'center',
  },
  docEmoji: { fontSize: 22 },
  docInfo: { flex: 1 },
  docLabel: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  docSub: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: Colors.surfaceLow, marginHorizontal: Spacing.md },

  uploadBtn: {
    paddingHorizontal: 16, paddingVertical: 7,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.full,
  },
  uploadBtnText: { fontSize: 12, fontWeight: '600', color: Colors.primaryContainer },

  uploadedCol: { alignItems: 'center', gap: 4 },
  thumb: { width: 48, height: 48, borderRadius: 8, borderWidth: 2, borderColor: Colors.online },
  reupload: { fontSize: 10, color: Colors.onSurfaceVariant, textDecorationLine: 'underline' },

  infoBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: `${Colors.primaryContainer}18`,
    borderRadius: Radius.lg, padding: Spacing.md,
    marginTop: 16, gap: 10,
  },
  infoEmoji: { fontSize: 18 },
  infoText: { flex: 1, fontSize: 12, color: Colors.onSurfaceVariant, lineHeight: 18 },

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
