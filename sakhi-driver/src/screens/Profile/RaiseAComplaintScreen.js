import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image, Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronDown, ChevronUp, History,
  ImageIcon, X,
} from 'lucide-react-native';
import client from '../../api/client';
import ScreenHeader, { HEADER_HEIGHT } from '../../components/ScreenHeader';
import { useTranslation } from 'react-i18next';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PURPLE   = '#BEA3D8';
const VIOLET   = '#BEA3D8';
const DEEP     = '#BEA3D8';
const AB_FE    = '#AB8FFE';
const DARK     = '#1E1B2E';
const MUTED    = '#6B7280';
const WHITE    = '#FFFFFF';
const BG       = '#F5F0FF';
const FIELD_BG = '#F5F0FF';
const CARD_SH  = {
  shadowColor: 'rgba(124, 58, 237, 1)',
  shadowOffset: { width: 0, height: 16 },
  shadowOpacity: 0.08,
  shadowRadius: 32,
  elevation: 4,
};
const SUBMIT_SH = {
  shadowColor: 'rgba(124, 58, 237, 1)',
  shadowOffset: { width: 0, height: 16 },
  shadowOpacity: 0.15,
  shadowRadius: 32,
  elevation: 6,
};

// ─── Issue types ──────────────────────────────────────────────────────────────
const ISSUE_TYPES = [
  'Ride Issue',
  'Commission Dispute',
  'Document Problem',
  'Payment Not Received',
  'Safety Concern',
  'App / Navigation Error',
  'Other',
];

// Seed rides for "Select recent ride" picker
const MOCK_RIDES = [
  { id: 'r1', label: 'Today, 10:22 AM — Koramangala → HSR' },
  { id: 'r2', label: 'Yesterday, 6:45 PM — Indiranagar → MG Road' },
  { id: 'r3', label: '30 Mar, 9:10 AM — Bannerghatta → BTM' },
];

const MAX_DESC = 500;

// ─── Inline dropdown ──────────────────────────────────────────────────────────
function InlineDropdown({ open, items, selected, onSelect }) {
  if (!open) return null;
  return (
    <View style={dd.wrap}>
      {items.map((item, i) => (
        <TouchableOpacity
          key={item}
          style={[dd.row, i > 0 && dd.border, item === selected && dd.rowActive]}
          onPress={() => onSelect(item)}
          activeOpacity={0.75}
        >
          <Text style={[dd.text, item === selected && dd.textActive]}>{item}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const dd = StyleSheet.create({
  wrap:       { backgroundColor: WHITE, borderRadius: 12, marginTop: 4, overflow: 'hidden', ...CARD_SH },
  row:        { paddingVertical: 14, paddingHorizontal: 16 },
  border:     { borderTopWidth: 1, borderTopColor: BG },
  rowActive:  { backgroundColor: 'rgba(190,163,216,0.06)' },
  text:       { fontSize: 15, color: DARK, fontWeight: '400' },
  textActive: { color: VIOLET, fontWeight: '700' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function RaiseAComplaintScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Pre-select from Help & Support quick-help cards
  const initCategory = route?.params?.category;
  const initIssue = initCategory === 'commission'  ? 'Commission Dispute'
                  : initCategory === 'docs'         ? 'Document Problem'
                  : initCategory === 'safety'       ? 'Safety Concern'
                  : 'Ride Issue';

  const [issueType,     setIssueType]     = useState(initIssue);
  const [showIssue,     setShowIssue]     = useState(false);
  const [relatedRide,   setRelatedRide]   = useState(null);
  const [showRides,     setShowRides]     = useState(false);
  const [description,   setDescription]  = useState('');
  const [screenshot,    setScreenshot]    = useState(null);
  const [submitting,    setSubmitting]    = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const toggleIssue = useCallback(() => {
    setShowIssue(v => !v);
    setShowRides(false);
  }, []);

  const toggleRides = useCallback(() => {
    setShowRides(v => !v);
    setShowIssue(false);
  }, []);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to attach a screenshot.');
      return;
    }
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
      if (relatedRide) form.append('related_ride_id', relatedRide.id);
      if (screenshot) {
        form.append('screenshot', {
          uri: screenshot.uri, type: 'image/jpeg', name: 'screenshot.jpg',
        });
      }
      await client.post('/drivers/complaints', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Submitted ✅', "We'll get back to you within 24 hours.", [
        { text: 'OK', onPress: () => navigation?.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const HEADER_H = Math.max(insets.top, 0) + 72;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={undefined}
    >
      <View style={s.root}>

        {/* ── Decorative blobs ── */}
        <View style={s.blobTR} />
        <View style={s.blobBL} />

        <ScreenHeader title={t('profile.support')} onBack={() => navigation?.goBack()} />

        {/* ── Scrollable body ── */}
        <ScrollView
          contentContainerStyle={[s.scroll, { }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Page heading ── */}
          <View style={s.heading}>
            <Text style={s.pageTitle}>Raise a Complaint</Text>
            <Text style={s.pageSub}>{"We'll get back to you within 24 hours."}</Text>
          </View>

          {/* ════════════════════ Form Card ════════════════════ */}
          <View style={s.card}>

            {/* ── Issue Type ── */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>ISSUE TYPE</Text>
              <TouchableOpacity
                style={s.selector}
                onPress={toggleIssue}
                activeOpacity={0.8}
              >
                <Text style={s.selectorText}>{issueType}</Text>
                {showIssue
                  ? <ChevronUp   size={12} color={PURPLE} strokeWidth={2.5} />
                  : <ChevronDown size={12} color={PURPLE} strokeWidth={2.5} />
                }
              </TouchableOpacity>
              <InlineDropdown
                open={showIssue}
                items={ISSUE_TYPES}
                selected={issueType}
                onSelect={(t) => { setIssueType(t); setShowIssue(false); }}
              />
            </View>

            {/* ── Related Ride ── */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>RELATED RIDE (OPTIONAL)</Text>
              <TouchableOpacity
                style={s.ridePill}
                onPress={toggleRides}
                activeOpacity={0.8}
              >
                <Text style={[s.ridePillText, relatedRide && s.ridePillSelected]}>
                  {relatedRide ? relatedRide.label : 'Select recent ride'}
                </Text>
                <History size={18} color={PURPLE} strokeWidth={2} />
              </TouchableOpacity>
              <InlineDropdown
                open={showRides}
                items={MOCK_RIDES.map(r => r.label)}
                selected={relatedRide?.label ?? null}
                onSelect={(label) => {
                  const ride = MOCK_RIDES.find(r => r.label === label);
                  setRelatedRide(ride ?? null);
                  setShowRides(false);
                }}
              />
            </View>

            {/* ── Description ── */}
            <View style={s.fieldGroup}>
              <View style={s.fieldLabelRow}>
                <Text style={s.fieldLabel}>DESCRIBE YOUR ISSUE</Text>
                <Text style={s.charCount}>{description.length}/{MAX_DESC}</Text>
              </View>
              <TextInput
                style={s.textarea}
                value={description}
                onChangeText={(t) => setDescription(t.slice(0, MAX_DESC))}
                placeholder="Tell us what happened…"
                placeholderTextColor={MUTED}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            {/* ── Screenshot ── */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>ATTACH SCREENSHOT (OPTIONAL)</Text>

              {screenshot ? (
                <View style={s.previewCard}>
                  <Image source={{ uri: screenshot.uri }} style={s.previewImg} resizeMode="cover" />
                  <TouchableOpacity style={s.removeBtn} onPress={() => setScreenshot(null)}>
                    <X size={12} color={WHITE} strokeWidth={3} />
                    <Text style={s.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={s.uploadBox} onPress={handlePickImage} activeOpacity={0.8}>
                  {/* Image icon */}
                  <View style={s.uploadIconWrap}>
                    <ImageIcon size={27} color="#A78BFA" strokeWidth={1.8} />
                  </View>
                  {/* Upload button */}
                  <View style={s.uploadBtn}>
                    <Text style={s.uploadBtnText}>Upload Image</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

          </View>
          {/* ══════════════════ End Card ══════════════════════ */}

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[s.submitBtn, submitting && s.submitDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.88}
          >
            {submitting
              ? <ActivityIndicator color={WHITE} />
              : <Text style={s.submitText}>Submit Complaint</Text>
            }
          </TouchableOpacity>

          {/* Bottom safe area padding */}
          <View style={{ height: Math.max(insets.bottom, 24) }} />

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, overflow: 'hidden' },

  // ── Decorative blobs ─────────────────────────────────────────────────────
  blobTR: {
    position: 'absolute', width: 256, height: 256,
    top: -128, right: -128, borderRadius: 128,
    backgroundColor: 'rgba(210,187,255,0.2)',
  },
  blobBL: {
    position: 'absolute', width: 256, height: 256,
    bottom: -128, left: -128, borderRadius: 128,
    backgroundColor: 'rgba(206,189,255,0.2)',
  },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scroll: { paddingHorizontal: 24, paddingTop: 16, gap: 32, paddingBottom: 8 },

  // ── Heading ───────────────────────────────────────────────────────────────
  heading:  { gap: 8 },
  pageTitle:{ fontSize: 32, fontWeight: '800', color: DARK, letterSpacing: -0.8, lineHeight: 40 },
  pageSub:  { fontSize: 16, fontWeight: '400', color: MUTED, lineHeight: 24 },

  // ── Form Card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: WHITE, borderRadius: 16,
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32,
    gap: 24, ...CARD_SH,
  },

  // ── Field group ───────────────────────────────────────────────────────────
  fieldGroup:    { gap: 8 },
  fieldLabel:    { fontSize: 12, fontWeight: '500', color: MUTED, letterSpacing: 0.6, textTransform: 'uppercase', lineHeight: 18 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  charCount:     { fontSize: 11.2, fontWeight: '400', color: MUTED, lineHeight: 17 },

  // ── Issue type selector ───────────────────────────────────────────────────
  selector: {
    height: 56, backgroundColor: FIELD_BG, borderRadius: 12,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  selectorText: { fontSize: 16, fontWeight: '400', color: DARK, lineHeight: 24 },

  // ── Related ride pill ─────────────────────────────────────────────────────
  ridePill: {
    height: 56, backgroundColor: FIELD_BG, borderRadius: 9999,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  ridePillText:     { fontSize: 16, fontWeight: '400', color: DARK, lineHeight: 24, flex: 1 },
  ridePillSelected: { fontWeight: '600' },

  // ── Textarea ──────────────────────────────────────────────────────────────
  textarea: {
    backgroundColor: FIELD_BG, borderRadius: 12, padding: 16,
    fontSize: 16, color: DARK, minHeight: 128,
    textAlignVertical: 'top', lineHeight: 24,
  },

  // ── Upload box ────────────────────────────────────────────────────────────
  uploadBox: {
    borderWidth: 2, borderColor: 'rgba(204,195,216,0.4)', borderStyle: 'dashed',
    borderRadius: 12, paddingVertical: 24,
    backgroundColor: 'rgba(246,241,255,0.5)',
    alignItems: 'center', gap: 0,
  },
  uploadIconWrap: { marginBottom: 12 },
  uploadBtn:      {
    backgroundColor: AB_FE, borderRadius: 9999,
    paddingVertical: 8, paddingHorizontal: 24,
  },
  uploadBtnText: { fontSize: 16, fontWeight: '600', color: '#3F1E8C', lineHeight: 24 },

  // ── Preview ───────────────────────────────────────────────────────────────
  previewCard:  { borderRadius: 12, overflow: 'hidden' },
  previewImg:   { width: '100%', height: 160 },
  removeBtn:    {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#DC2626', paddingVertical: 10,
  },
  removeText:   { fontSize: 12, fontWeight: '700', color: WHITE },

  // ── Submit ────────────────────────────────────────────────────────────────
  submitBtn: {
    height: 56, borderRadius: 12, backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center', ...SUBMIT_SH,
  },
  submitDisabled: { opacity: 0.6 },
  submitText:     { fontSize: 18, fontWeight: '700', color: WHITE, lineHeight: 28 },
});
