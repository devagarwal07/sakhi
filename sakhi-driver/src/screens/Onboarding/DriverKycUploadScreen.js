import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  Alert, ActivityIndicator, ScrollView, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  validateDriverName,
  validateDLNumber,
  validateRegistrationNumber,
  validateModelName,
  validateKycForm,
} from '../../utils/onboardingValidators';

const PURPLE = '#9B70D4';
const LIGHT  = '#F5F0FF';
const ERROR  = '#EF4444';
const OK     = '#10B981';

const VEHICLE_TYPES = [
  { id: 'auto',      label: 'Auto Rickshaw' },
  { id: 'erickshaw', label: 'E-Rickshaw' },
  { id: 'minivan',   label: 'Mini Van' },
  { id: 'cab',       label: 'Cab' },
];

const VEHICLE_COLORS = [
  { id: 'Yellow', hex: '#FACC15' },
  { id: 'White',  hex: '#FFFFFF' },
  { id: 'Black',  hex: '#1F2937' },
  { id: 'Silver', hex: '#CBD5E1' },
  { id: 'Blue',   hex: '#3B82F6' },
];

// ── Inline error hint ─────────────────────────────────────────────────────────
function FieldError({ error }) {
  if (!error) return null;
  return (
    <View style={s.fieldErrRow}>
      <Feather name="alert-circle" size={11} color={ERROR} />
      <Text style={s.fieldErrTxt}>{error}</Text>
    </View>
  );
}

// ── Reusable photo picker card ─────────────────────────────────────────────────
function PhotoPicker({ label, sublabel, icon, value, onChange, hasError }) {
  const pick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Allow photo library access to upload documents.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.length > 0) onChange(result.assets[0]);
  };

  return (
    <TouchableOpacity
      style={[s.photoBox, value && s.photoBoxFilled, hasError && s.photoBoxError]}
      onPress={pick}
      activeOpacity={0.85}
    >
      {value ? (
        <>
          <Image source={{ uri: value.uri }} style={s.photoPreview} />
          <View style={s.photoOverlay}>
            <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
            <Text style={s.photoOverlayTxt}>Change</Text>
          </View>
        </>
      ) : (
        <View style={s.photoPlaceholder}>
          <View style={[s.photoIconBg, hasError && { backgroundColor: '#FEE2E2' }]}>
            <MaterialCommunityIcons name={icon} size={26} color={hasError ? ERROR : PURPLE} />
          </View>
          <Text style={[s.photoLabel, hasError && { color: ERROR }]}>{label}</Text>
          <Text style={s.photoSub}>{sublabel}</Text>
          <View style={[s.uploadChip, hasError && { backgroundColor: '#FEE2E2' }]}>
            <Feather name="upload" size={11} color={hasError ? ERROR : PURPLE} />
            <Text style={[s.uploadChipTxt, hasError && { color: ERROR }]}>Upload</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Validated text input ──────────────────────────────────────────────────────
function ValidatedInput({
  label, value, onChangeText, placeholder, autoCapitalize = 'none',
  error, hint, keyboardType = 'default', maxLength,
}) {
  const isOk = value.trim().length > 0 && !error;
  return (
    <View style={s.inputGroup}>
      <Text style={s.inputLabel}>{label}</Text>
      <View style={[
        s.inputWrap,
        error  ? s.inputWrapError : null,
        isOk   ? s.inputWrapOk    : null,
      ]}>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          maxLength={maxLength}
        />
        {isOk  && <Feather name="check" size={16} color={OK} style={s.inputIcon} />}
        {error && <Feather name="alert-circle" size={16} color={ERROR} style={s.inputIcon} />}
      </View>
      {hint && !error && <Text style={s.hintTxt}>{hint}</Text>}
      <FieldError error={error} />
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function DriverKycUploadScreen({ navigation }) {
  const { updateDriver } = useAuth();

  // Photos
  const [dlFront, setDlFront] = useState(null);
  const [dlBack,  setDlBack]  = useState(null);

  // Personal
  const [driverName, setDriverName] = useState('');
  const [dlNumber,   setDlNumber]   = useState('');

  // Vehicle
  const [vehicleType, setVehicleType] = useState('auto');
  const [regNumber,   setRegNumber]   = useState('');
  const [modelName,   setModelName]   = useState('');
  const [colour,      setColour]      = useState('Yellow');
  const [typeOpen,    setTypeOpen]    = useState(false);

  // Field-level errors (only shown after first blur or submit attempt)
  const [touched,  setTouched]  = useState({});
  const [errors,   setErrors]   = useState({});
  const [photoErr, setPhotoErr] = useState(false);

  const [loading, setLoading] = useState(false);

  // ── Live field validation ────────────────────────────────────────────────
  const validateField = useCallback((field, value) => {
    let result = { ok: true };
    switch (field) {
      case 'driverName': result = validateDriverName(value);         break;
      case 'dlNumber':   result = validateDLNumber(value);           break;
      case 'regNumber':  result = validateRegistrationNumber(value); break;
      case 'modelName':  result = validateModelName(value);          break;
    }
    setErrors(prev => ({ ...prev, [field]: result.ok ? undefined : result.error }));
    return result.ok;
  }, []);

  const handleBlur = (field, value) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  const handleChange = (field, value, setter) => {
    setter(value);
    if (touched[field]) validateField(field, value);
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Mark all as touched to show all errors
    setTouched({ driverName: true, dlNumber: true, regNumber: true, modelName: true });

    const { valid, errors: formErrors, clean } = validateKycForm({
      driverName, dlNumber, regNumber, modelName,
    });
    setErrors(formErrors);

    const hasPhotos = dlFront && dlBack;
    setPhotoErr(!hasPhotos);

    if (!valid || !hasPhotos) {
      Alert.alert(
        'Fix Required',
        !hasPhotos
          ? 'Upload both sides of your Karnataka Driving Licence.'
          : 'Please correct the highlighted fields before continuing.',
      );
      return;
    }

    try {
      setLoading(true);

      // 1 — Upload DL photos + personal details
      const kycForm = new FormData();
      kycForm.append('dl',          { uri: dlFront.uri, type: 'image/jpeg', name: 'dl_front.jpg' });
      kycForm.append('dl_back',     { uri: dlBack.uri,  type: 'image/jpeg', name: 'dl_back.jpg' });
      kycForm.append('driver_name', clean.driverName);
      kycForm.append('dl_number',   clean.dlNumber);

      await client.post('/drivers/kyc/upload', kycForm, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      // 2 — Save vehicle details
      await client.post('/drivers/vehicle', {
        vehicle_type:        vehicleType,
        registration_number: clean.regNumber,
        colour,
        model_name:          clean.modelName,
      });

      updateDriver({ onboarding_status: 'kyc_submitted' });
      navigation.navigate('DocumentUnderReview');
    } catch (err) {
      Alert.alert('Submission Failed', err?.response?.data?.message ?? 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentTypeLabel = VEHICLE_TYPES.find(v => v.id === vehicleType)?.label ?? 'Select Type';

  // Submit enabled only when there are no known errors (live gate)
  const hasErrors = Object.values(errors).some(Boolean);
  const canSubmit = !hasErrors && dlFront && dlBack &&
    driverName.trim().length >= 2 &&
    dlNumber.trim().length  >= 13 &&
    regNumber.trim().length >= 9 &&
    modelName.trim().length >= 2;

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* ── Top bar ── */}
      <SafeAreaView edges={['top']} style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color={PURPLE} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Documents & Details</Text>
        <View style={{ width: 36 }} />
      </SafeAreaView>

      {/* ── Karnataka notice banner ── */}
      <View style={s.kaBanner}>
        <MaterialCommunityIcons name="map-marker-check" size={15} color="#1D4ED8" />
        <Text style={s.kaBannerTxt}>
          Karnataka registered vehicles & KA driving licences only
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Section 1: Driving Licence Photos ── */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <MaterialCommunityIcons name="card-account-details-outline" size={18} color={PURPLE} />
            <Text style={s.sectionTitle}>Driving Licence</Text>
          </View>
          <Text style={s.sectionSub}>Upload clear photos of both sides of your Karnataka DL</Text>

          <View style={s.photoRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.photoSideLabel}>FRONT SIDE</Text>
              <PhotoPicker
                label="DL Front"
                sublabel="Front photo"
                icon="card-account-details"
                value={dlFront}
                onChange={setDlFront}
                hasError={photoErr && !dlFront}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.photoSideLabel}>BACK SIDE</Text>
              <PhotoPicker
                label="DL Back"
                sublabel="Back photo"
                icon="card-account-details-outline"
                value={dlBack}
                onChange={setDlBack}
                hasError={photoErr && !dlBack}
              />
            </View>
          </View>
          {photoErr && (!dlFront || !dlBack) && (
            <FieldError error="Upload both sides of your Karnataka Driving Licence" />
          )}
        </View>

        {/* ── Section 2: Personal Details ── */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <MaterialCommunityIcons name="account-outline" size={18} color={PURPLE} />
            <Text style={s.sectionTitle}>Personal Details</Text>
          </View>
          <Text style={s.sectionSub}>Details must match your driving licence exactly</Text>

          <View style={s.card}>
            <ValidatedInput
              label="FULL NAME (AS ON DL)"
              value={driverName}
              onChangeText={v => handleChange('driverName', v, setDriverName)}
              placeholder="e.g. Priya Sharma"
              autoCapitalize="words"
              error={touched.driverName ? errors.driverName : undefined}
              hint="Enter first and last name as printed on your DL"
            />

            <ValidatedInput
              label="DL NUMBER (KARNATAKA KA ONLY)"
              value={dlNumber}
              onChangeText={v => handleChange('dlNumber', v.toUpperCase().replace(/\s/g, ''), setDlNumber)}
              placeholder="KA0520110012345"
              autoCapitalize="characters"
              maxLength={18}
              error={touched.dlNumber ? errors.dlNumber : undefined}
              hint="Format: KA + district + year + serial (e.g. KA0520110012345)"
            />

            {/* Karnataka DL info box */}
            <View style={s.infoBox}>
              <MaterialCommunityIcons name="information-outline" size={14} color="#1D4ED8" />
              <Text style={s.infoBoxTxt}>
                DL must start with <Text style={{ fontWeight: '700' }}>KA</Text> followed by
                your RTO code, year of issue, and serial number.
                {'\n'}Example: <Text style={{ fontFamily: 'monospace', fontWeight: '600' }}>KA0520110012345</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* ── Section 3: Vehicle Details ── */}
        <View style={[s.section, { marginBottom: 140 }]}>
          <View style={s.sectionHead}>
            <MaterialCommunityIcons name="car-outline" size={18} color={PURPLE} />
            <Text style={s.sectionTitle}>Vehicle Details</Text>
          </View>
          <Text style={s.sectionSub}>Vehicle must be registered in Karnataka (KA)</Text>

          <View style={s.card}>

            {/* Vehicle type dropdown */}
            <View style={[s.inputGroup, { zIndex: 10 }]}>
              <Text style={s.inputLabel}>VEHICLE TYPE</Text>
              <TouchableOpacity style={s.dropdownBtn} onPress={() => setTypeOpen(o => !o)}>
                <Text style={s.dropdownTxt}>{currentTypeLabel}</Text>
                <Feather name={typeOpen ? 'chevron-up' : 'chevron-down'} size={18} color={PURPLE} />
              </TouchableOpacity>
              {typeOpen && (
                <View style={s.dropdownList}>
                  {VEHICLE_TYPES.map(vt => (
                    <TouchableOpacity
                      key={vt.id}
                      style={s.dropdownItem}
                      onPress={() => { setVehicleType(vt.id); setTypeOpen(false); }}
                    >
                      <Text style={[s.dropdownItemTxt, vehicleType === vt.id && s.dropdownItemActive]}>
                        {vt.label}
                      </Text>
                      {vehicleType === vt.id && <Feather name="check" size={14} color={PURPLE} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Registration number */}
            <ValidatedInput
              label="REGISTRATION NUMBER (KA ONLY)"
              value={regNumber}
              onChangeText={v => handleChange('regNumber', v.toUpperCase().replace(/\s/g, ''), setRegNumber)}
              placeholder="KA05AB1234"
              autoCapitalize="characters"
              maxLength={12}
              error={touched.regNumber ? errors.regNumber : undefined}
              hint="Format: KA + district + series + number (e.g. KA05AB1234)"
            />

            {/* Model name */}
            <ValidatedInput
              label="VEHICLE MODEL"
              value={modelName}
              onChangeText={v => handleChange('modelName', v, setModelName)}
              placeholder="e.g. Bajaj RE, Mahindra Treo"
              autoCapitalize="words"
              error={touched.modelName ? errors.modelName : undefined}
            />

            {/* Colour */}
            <View style={[s.inputGroup, { marginBottom: 0, zIndex: 1 }]}>
              <Text style={s.inputLabel}>VEHICLE COLOUR</Text>
              <View style={s.colorRow}>
                {VEHICLE_COLORS.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.colorRing, colour === c.id && s.colorRingActive]}
                    onPress={() => setColour(c.id)}
                  >
                    <View style={[s.colorDot, { backgroundColor: c.hex }, c.hex === '#FFFFFF' && s.colorDotBorder]} />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.selectedColorTxt}>Selected: {colour}</Text>
            </View>

          </View>
        </View>

      </ScrollView>

      {/* ── Fixed footer ── */}
      <SafeAreaView edges={['bottom']} style={s.footer}>
        <TouchableOpacity
          style={[s.submitBtn, (!canSubmit || loading) && s.submitBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.88}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={s.submitBtnTxt}>Submit for Review</Text>
                <Feather name="send" size={15} color="#fff" style={{ marginLeft: 8 }} />
              </View>
            )
          }
        </TouchableOpacity>
        <Text style={s.footerNote}>
          <Feather name="shield" size={11} color="#94A3B8" /> Our team reviews documents within 24 hours
        </Text>
      </SafeAreaView>

    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: LIGHT },

  topBar:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10, backgroundColor: LIGHT },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EDE9FA', alignItems: 'center', justifyContent: 'center' },
  topTitle:{ fontSize: 17, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.4 },

  kaBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EFF6FF', borderBottomWidth: 1, borderBottomColor: '#BFDBFE',
    paddingHorizontal: 20, paddingVertical: 10,
  },
  kaBannerTxt: { fontSize: 12, fontWeight: '600', color: '#1D4ED8', flex: 1 },

  scroll: { paddingHorizontal: 20, paddingTop: 12 },

  section:      { marginBottom: 24 },
  sectionHead:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E1B2E' },
  sectionSub:   { fontSize: 12, color: '#6B7280', marginBottom: 12 },

  photoRow:      { flexDirection: 'row', gap: 12 },
  photoSideLabel:{ fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },

  photoBox: {
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 2, borderColor: '#E2D9F3', borderStyle: 'dashed',
    backgroundColor: '#fff', minHeight: 130,
  },
  photoBoxFilled: { borderStyle: 'solid', borderColor: `${PURPLE}66` },
  photoBoxError:  { borderColor: `${ERROR}66`, borderStyle: 'solid' },
  photoPreview:   { width: '100%', height: 130, resizeMode: 'cover' },
  photoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(155,112,212,0.88)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 7,
  },
  photoOverlayTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  photoPlaceholder:{ alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 12, gap: 5 },
  photoIconBg:     { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0EBF8', alignItems: 'center', justifyContent: 'center' },
  photoLabel:      { fontSize: 12, fontWeight: '700', color: '#1E1B2E', textAlign: 'center' },
  photoSub:        { fontSize: 10, color: '#94A3B8', textAlign: 'center' },
  uploadChip:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EDE9FA', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 },
  uploadChipTxt:   { fontSize: 11, fontWeight: '600', color: PURPLE },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 20,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 20, elevation: 4,
  },

  // ── Input ──
  inputGroup:  { gap: 7 },
  inputLabel:  { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase' },
  inputWrap:   { backgroundColor: LIGHT, borderRadius: 12, paddingHorizontal: 14, height: 48, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  inputWrapError: { borderColor: `${ERROR}66`, backgroundColor: '#FFF5F5' },
  inputWrapOk:    { borderColor: `${OK}55` },
  input:       { flex: 1, fontSize: 15, fontWeight: '500', color: '#1E1B2E', padding: 0 },
  inputIcon:   { marginLeft: 8 },
  hintTxt:     { fontSize: 10, color: '#94A3B8', lineHeight: 14 },

  fieldErrRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  fieldErrTxt: { fontSize: 11, color: ERROR, fontWeight: '500', flex: 1 },

  // ── Info box ──
  infoBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  infoBoxTxt: { flex: 1, fontSize: 11, color: '#1D4ED8', lineHeight: 17 },

  dropdownBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: LIGHT, borderRadius: 12, paddingHorizontal: 14, height: 48 },
  dropdownTxt:      { fontSize: 15, fontWeight: '500', color: '#1E1B2E' },
  dropdownList:     { position: 'absolute', top: 56, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10, zIndex: 100 },
  dropdownItem:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
  dropdownItemTxt:  { fontSize: 15, color: '#374151', fontWeight: '500' },
  dropdownItemActive:{ color: PURPLE, fontWeight: '700' },

  colorRow:       { flexDirection: 'row', gap: 12, marginTop: 4 },
  colorRing:      { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  colorRingActive:{ borderColor: PURPLE },
  colorDot:       { width: 28, height: 28, borderRadius: 14 },
  colorDotBorder: { borderWidth: 1, borderColor: '#E2E8F0' },
  selectedColorTxt:{ fontSize: 11, color: '#6B7280', marginTop: 6 },

  footer:         { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 14, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 12 },
  submitBtn:      { height: 56, backgroundColor: PURPLE, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: PURPLE, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnTxt:   { fontSize: 16, fontWeight: '700', color: '#fff' },
  footerNote:     { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 8, marginBottom: 4 },
});
