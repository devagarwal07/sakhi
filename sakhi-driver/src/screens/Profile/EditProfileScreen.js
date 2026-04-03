import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, KeyboardAvoidingView,
  Platform, Modal, FlatList, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import SakhiModal from '../../components/SakhiModal';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const PURPLE = '#BEA3D8';
const VIOLET = '#630ED4';
const DARK   = '#1C1A25';
const MUTED  = '#7B7487';
const WHITE  = '#FFFFFF';
const BG     = '#F5F0FF';
const GREEN  = '#047857';

const LANGUAGES = [
  'English', 'Hindi', 'Marathi', 'Bengali', 'Tamil',
  'Telugu', 'Kannada', 'Malayalam', 'Punjabi', 'Gujarati',
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EditProfileScreen({ navigation }) {
  const { driver, checkAuth } = useAuth();
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state — pre-filled from driver context
  const [name,    setName]    = useState(driver?.name  ?? '');
  const [email,   setEmail]   = useState(driver?.email ?? '');
  const [avatarUri, setAvatarUri] = useState(driver?.profile_photo ?? null);

  // DOB state
  const [dobDay,   setDobDay]   = useState(driver?.dob_day   ?? '01');
  const [dobMonth, setDobMonth] = useState(driver?.dob_month ?? '01');
  const [dobYear,  setDobYear]  = useState(driver?.dob_year  ?? '1990');
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [tempDay,   setTempDay]   = useState('01');
  const [tempMonth, setTempMonth] = useState('01');
  const [tempYear,  setTempYear]  = useState('1990');

  // Language state
  const [language, setLanguage] = useState(
    driver?.language_pref === 'kn' ? 'Kannada' : 'English',
  );
  const [showLangPicker, setShowLangPicker] = useState(false);

  // ── Avatar Picker ────────────────────────────────────────────────────────
  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setModal({
        icon: '⚠️',
        title: 'Permission Required',
        message: 'Please allow photo library access to update your profile picture.',
        buttons: [{ text: 'OK', onPress: () => setModal(null) }],
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  // ── DOB Helpers ──────────────────────────────────────────────────────────
  const formattedDob = `${String(dobDay).padStart(2,'0')}/${String(dobMonth).padStart(2,'0')}/${dobYear}`;

  const openDobPicker = () => {
    setTempDay(dobDay); setTempMonth(dobMonth); setTempYear(dobYear);
    setShowDobPicker(true);
  };

  const confirmDob = () => {
    const d = parseInt(tempDay, 10);
    const m = parseInt(tempMonth, 10);
    const y = parseInt(tempYear, 10);
    if (!d || d < 1 || d > 31) {
      setModal({ icon: '⚠️', title: 'Invalid Day', message: 'Please enter a valid day (1–31).', buttons: [{ text: 'OK', onPress: () => setModal(null) }] });
      return;
    }
    if (!m || m < 1 || m > 12) {
      setModal({ icon: '⚠️', title: 'Invalid Month', message: 'Please enter a valid month (1–12).', buttons: [{ text: 'OK', onPress: () => setModal(null) }] });
      return;
    }
    if (!y || y < 1920 || y > new Date().getFullYear() - 18) {
      setModal({ icon: '⚠️', title: 'Invalid Year', message: 'Drivers must be at least 18 years old.', buttons: [{ text: 'OK', onPress: () => setModal(null) }] });
      return;
    }
    setDobDay(String(d).padStart(2, '0'));
    setDobMonth(String(m).padStart(2, '0'));
    setDobYear(String(y));
    setShowDobPicker(false);
  };

  // ── Save Profile ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) {
      setModal({ icon: '⚠️', title: 'Missing Info', message: 'Full name cannot be empty.', buttons: [{ text: 'OK', onPress: () => setModal(null) }] });
      return;
    }
    if (email && !email.includes('@')) {
      setModal({ icon: '⚠️', title: 'Invalid Email', message: 'Please enter a valid email address.', buttons: [{ text: 'OK', onPress: () => setModal(null) }] });
      return;
    }
    try {
      setSaving(true);
      // Backend: language_pref is 'en' | 'kn' (see drivers.language_pref CHECK)
      const language_pref = language === 'Kannada' ? 'kn' : 'en';
      await client.patch('/drivers/profile', {
        name: name.trim(),
        email: email.trim(),
        language_pref,
      });
      await checkAuth?.();
      setModal({
        icon: '✅',
        title: 'Profile Updated!',
        message: 'Your profile changes have been saved successfully.',
        buttons: [{ text: 'Done', onPress: () => { setModal(null); navigation?.goBack(); } }],
      });
    } catch (err) {
      setModal({
        icon: '⚠️',
        title: 'Save Failed',
        message:
          err?.response?.data?.error?.message
          ?? err?.response?.data?.message
          ?? 'Could not save changes. Please try again.',
        buttons: [{ text: 'OK', onPress: () => setModal(null) }],
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : null}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity style={styles.saveTopBtn} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={PURPLE} />
              : <Text style={styles.saveTopText}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── Scrollable Form ── */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarWrap} onPress={handlePickAvatar} activeOpacity={0.85}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarImagePlaceholder}>
                  <Text style={{ fontSize: 40 }}>👩🏽</Text>
                </View>
              )}
              <View style={styles.avatarEditBtn}>
                <Text style={styles.avatarEditIcon}>📷</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Tap to change photo</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>

            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter full name"
                  placeholderTextColor={MUTED}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email address"
                  placeholderTextColor={MUTED}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Phone (read-only with change link) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PHONE</Text>
              <View style={[styles.inputWrap, styles.inputRow]}>
                <Text style={styles.inputText}>{driver?.phone ?? '+91 XXXXX XXXXX'}</Text>
                <TouchableOpacity onPress={() => navigation?.navigate('ChangePhoneInput')}>
                  <Text style={styles.changeLinkText}>Change →</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Date of Birth */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DATE OF BIRTH</Text>
              <TouchableOpacity
                style={[styles.inputWrap, styles.inputRow]}
                activeOpacity={0.7}
                onPress={openDobPicker}
              >
                <Text style={styles.inputText}>{formattedDob}</Text>
                <Text style={styles.inputEndIcon}>📅</Text>
              </TouchableOpacity>
            </View>

            {/* Preferred Language */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PREFERRED LANGUAGE</Text>
              <TouchableOpacity
                style={[styles.inputWrap, styles.inputRow]}
                activeOpacity={0.7}
                onPress={() => setShowLangPicker(true)}
              >
                <Text style={styles.inputText}>{language}</Text>
                <Text style={[styles.inputEndIcon, { fontSize: 14 }]}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Verification Status Badges */}
            <View style={styles.verificationBox}>
              <View style={styles.verifyRow}>
                <View style={styles.verifyIconWrap}>
                  <Text style={styles.verifyIcon}>✓</Text>
                </View>
                <Text style={styles.verifyLabel}>Gender Verified</Text>
              </View>
              <View style={styles.verifyRow}>
                <View style={styles.verifyIconWrap}>
                  <Text style={styles.verifyIcon}>✓</Text>
                </View>
                <Text style={styles.verifyLabel}>KYC Documents Approved</Text>
              </View>
            </View>

          </View>
        </ScrollView>

        {/* ── Fixed Save Button ── */}
        <View style={styles.bottomFixedWrap}>
          <TouchableOpacity style={[styles.actionBtn, saving && { opacity: 0.7 }]} activeOpacity={0.85} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={WHITE} />
              : <Text style={styles.actionBtnText}>Save Changes</Text>
            }
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>

      {/* ════ DOB Picker Modal ════ */}
      <Modal visible={showDobPicker} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setShowDobPicker(false)} />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHandle} />
          <Text style={styles.pickerTitle}>Select Date of Birth</Text>

          <View style={styles.dobRow}>
            <View style={styles.dobFieldWrap}>
              <Text style={styles.dobFieldLabel}>Day</Text>
              <TextInput
                style={styles.dobInput}
                value={tempDay}
                onChangeText={setTempDay}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="DD"
                placeholderTextColor="#AAA"
              />
            </View>
            <Text style={styles.dobSep}>/</Text>
            <View style={styles.dobFieldWrap}>
              <Text style={styles.dobFieldLabel}>Month</Text>
              <TextInput
                style={styles.dobInput}
                value={tempMonth}
                onChangeText={setTempMonth}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="MM"
                placeholderTextColor="#AAA"
              />
            </View>
            <Text style={styles.dobSep}>/</Text>
            <View style={[styles.dobFieldWrap, { flex: 2 }]}>
              <Text style={styles.dobFieldLabel}>Year</Text>
              <TextInput
                style={styles.dobInput}
                value={tempYear}
                onChangeText={setTempYear}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="YYYY"
                placeholderTextColor="#AAA"
              />
            </View>
          </View>

          <View style={styles.pickerActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDobPicker(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={confirmDob}>
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ════ Language Picker Modal ════ */}
      <Modal visible={showLangPicker} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setShowLangPicker(false)} />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHandle} />
          <Text style={styles.pickerTitle}>Preferred Language</Text>
          <FlatList
            data={LANGUAGES}
            keyExtractor={(item) => item}
            style={{ maxHeight: 280 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.langItem, item === language && styles.langItemActive]}
                onPress={() => { setLanguage(item); setShowLangPicker(false); }}
              >
                <Text style={[styles.langItemText, item === language && styles.langItemTextActive]}>
                  {item}
                </Text>
                {item === language && <Text style={styles.langCheck}>✓</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      <SakhiModal config={modal} onClose={() => setModal(null)} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:     { flex: 1, backgroundColor: BG },
  keyboardView: { flex: 1 },

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, height: 64, backgroundColor: BG,
  },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  backArrow:    { fontSize: 24, color: PURPLE, fontWeight: 'bold' },
  headerTitle:  { fontSize: 20, fontWeight: '700', color: DARK, letterSpacing: -0.5 },
  saveTopBtn:   { paddingVertical: 4, paddingHorizontal: 8 },
  saveTopText:  { fontSize: 16, fontWeight: '700', color: PURPLE },

  // ── Scroll ──
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 140 },

  // ── Avatar ──
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarWrap: {
    position: 'relative', width: 100, height: 100,
    backgroundColor: WHITE, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: WHITE,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 5,
  },
  avatarImage:              { width: 92, height: 92, borderRadius: 46 },
  avatarImagePlaceholder: {
    width: 92, height: 92, backgroundColor: '#FFDAC1',
    borderRadius: 46, justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  avatarEditBtn: {
    position: 'absolute', right: -4, bottom: 0,
    width: 32, height: 32, backgroundColor: PURPLE,
    borderRadius: 16, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: WHITE,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  avatarEditIcon: { fontSize: 14 },
  avatarHint:     { marginTop: 10, fontSize: 12, color: MUTED, fontWeight: '500' },

  // ── Form Card ──
  formCard: {
    backgroundColor: WHITE, borderRadius: 20, padding: 24, gap: 20,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 6,
  },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 2 },
  inputWrap: {
    backgroundColor: BG, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    minHeight: 48, justifyContent: 'center',
  },
  inputRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input:          { fontSize: 15, fontWeight: '500', color: DARK, flex: 1, padding: 0, margin: 0 },
  inputText:      { fontSize: 15, fontWeight: '500', color: DARK },
  changeLinkText: { fontSize: 13, fontWeight: '700', color: PURPLE },
  inputEndIcon:   { fontSize: 18, color: MUTED },

  // ── Verification ──
  verificationBox: {
    backgroundColor: '#F0FDF4', borderRadius: 12,
    padding: 16, gap: 14, marginTop: 4,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  verifyRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  verifyIconWrap:{ width: 20, height: 20, borderRadius: 10, backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center' },
  verifyIcon:    { fontSize: 11, fontWeight: 'bold', color: WHITE },
  verifyLabel:   { fontSize: 14, fontWeight: '600', color: GREEN },

  // ── Bottom Save ──
  bottomFixedWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    backgroundColor: BG,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  actionBtn: {
    width: '100%', height: 56, backgroundColor: PURPLE,
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  actionBtnText: { fontSize: 16, fontWeight: '700', color: WHITE, letterSpacing: 0.3 },

  // ── Modals ──
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  pickerSheet: {
    backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  pickerHandle: { width: 40, height: 4, backgroundColor: '#E2D9F3', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  pickerTitle:  { fontSize: 17, fontWeight: '700', color: DARK, marginBottom: 20, textAlign: 'center' },

  // DOB
  dobRow:       { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 28 },
  dobFieldWrap: { flex: 1, gap: 6 },
  dobFieldLabel:{ fontSize: 11, fontWeight: '600', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8 },
  dobInput: {
    backgroundColor: BG, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 14,
    fontSize: 18, fontWeight: '600', color: DARK, textAlign: 'center',
  },
  dobSep:        { fontSize: 22, fontWeight: '600', color: PURPLE, paddingBottom: 10 },
  pickerActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, height: 50, borderRadius: 12,
    backgroundColor: BG, justifyContent: 'center', alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: MUTED },
  confirmBtn: {
    flex: 1, height: 50, borderRadius: 12,
    backgroundColor: PURPLE, justifyContent: 'center', alignItems: 'center',
  },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: WHITE },

  // Language list
  langItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: BG,
  },
  langItemActive:     { backgroundColor: BG, borderRadius: 10, marginHorizontal: -8, paddingHorizontal: 16 },
  langItemText:       { fontSize: 15, fontWeight: '500', color: DARK },
  langItemTextActive: { fontWeight: '700', color: PURPLE },
  langCheck:          { fontSize: 16, color: PURPLE, fontWeight: '700' },
});
