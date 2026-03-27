import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';

const ISSUE_TYPES = [
  'Ride Issue',
  'Commission Dispute',
  'Document Problem',
  'Payment Not Received',
  'Safety Concern',
  'App / Navigation Error',
  'Other',
];

export default function RaiseAComplaintScreen({ navigation }) {
  const [issueType, setIssueType]   = useState(ISSUE_TYPES[0]);
  const [showPicker, setShowPicker] = useState(false);
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, quality: 0.85,
    });
    if (!result.canceled) setScreenshot(result.assets[0]);
  };

  const handleSubmit = async () => {
    if (description.trim().length < 10) {
      Alert.alert('Too short', 'Please describe your issue in at least 10 characters.');
      return;
    }
    try {
      setSubmitting(true);
      const form = new FormData();
      form.append('issue_type', issueType);
      form.append('description', description.trim());
      if (screenshot) {
        form.append('screenshot', {
          uri: screenshot.uri, type: 'image/jpeg', name: 'screenshot.jpg',
        });
      }
      await client.post('/drivers/complaints', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Submitted! ✅', 'We\'ll get back to you within 24 hours.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>Raise a Complaint</Text>
        <Text style={styles.pageSubtitle}>We'll get back to you within 24 hours.</Text>

        <View style={styles.card}>
          {/* Issue Type */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ISSUE TYPE</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowPicker(!showPicker)}
              activeOpacity={0.75}
            >
              <Text style={styles.selectorText}>{issueType}</Text>
              <Text style={styles.selectorChevron}>{showPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showPicker && (
              <View style={styles.dropdown}>
                {ISSUE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.dropdownItem, type === issueType && styles.dropdownItemActive]}
                    onPress={() => { setIssueType(type); setShowPicker(false); }}
                  >
                    <Text style={[styles.dropdownItemText, type === issueType && styles.dropdownItemTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>DESCRIBE YOUR ISSUE</Text>
              <Text style={styles.charCount}>{description.length}/500</Text>
            </View>
            <TextInput
              style={styles.textarea}
              value={description}
              onChangeText={(t) => setDescription(t.slice(0, 500))}
              placeholder="Tell us what happened…"
              placeholderTextColor={Colors.onSurfaceVariant}
              multiline numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          {/* Screenshot upload */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ATTACH SCREENSHOT (OPTIONAL)</Text>
            {screenshot ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: screenshot.uri }} style={styles.preview} resizeMode="cover" />
                <TouchableOpacity style={styles.removeImg} onPress={() => setScreenshot(null)}>
                  <Text style={styles.removeImgText}>✕ Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadBox} onPress={handlePickImage} activeOpacity={0.7}>
                <Text style={styles.uploadIcon}>🖼</Text>
                <Text style={styles.uploadLabel}>Upload Image</Text>
                <Text style={styles.uploadSub}>Tap to browse</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.submitBtnText}>Submit Complaint</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceLow },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 22, color: Colors.primaryContainer },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.onSurface },

  scroll: { paddingHorizontal: Spacing.base, paddingBottom: 40, gap: 16 },
  pageTitle: { fontSize: 28, fontWeight: '900', color: Colors.onSurface, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, color: Colors.onSurfaceVariant, marginTop: -8 },

  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, gap: 18, ...Shadows.card },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 1.5 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  charCount: { fontSize: 11, color: Colors.onSurfaceVariant },

  selector: {
    height: 52, backgroundColor: Colors.surfaceLow, borderRadius: Radius.lg,
    paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  selectorText: { fontSize: 15, color: Colors.onSurface, fontWeight: '500' },
  selectorChevron: { fontSize: 12, color: Colors.primaryContainer },
  dropdown: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.outlineVariant, overflow: 'hidden', ...Shadows.card,
  },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.surfaceLow },
  dropdownItemActive: { backgroundColor: `${Colors.primaryContainer}10` },
  dropdownItemText: { fontSize: 14, color: Colors.onSurface },
  dropdownItemTextActive: { color: Colors.primaryContainer, fontWeight: '700' },

  textarea: {
    backgroundColor: Colors.surfaceLow, borderRadius: Radius.lg,
    padding: 14, fontSize: 15, color: Colors.onSurface, minHeight: 100,
  },

  uploadBox: {
    borderWidth: 2, borderColor: Colors.outlineVariant, borderStyle: 'dashed',
    borderRadius: Radius.lg, padding: 24, alignItems: 'center', gap: 6,
    backgroundColor: `${Colors.surfaceLow}80`,
  },
  uploadIcon: { fontSize: 36 },
  uploadLabel: { fontSize: 13, fontWeight: '700', color: Colors.primaryContainer },
  uploadSub: { fontSize: 11, color: Colors.onSurfaceVariant },
  previewWrap: { borderRadius: Radius.lg, overflow: 'hidden' },
  preview: { width: '100%', height: 160, borderRadius: Radius.lg },
  removeImg: {
    backgroundColor: Colors.white, paddingVertical: 8, alignItems: 'center',
    borderTopWidth: 1, borderColor: Colors.outlineVariant,
  },
  removeImgText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },

  submitBtn: {
    height: 56, borderRadius: Radius.lg,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center', ...Shadows.lavender,
  },
  submitBtnDisabled: { backgroundColor: Colors.outlineVariant },
  submitBtnText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
});
