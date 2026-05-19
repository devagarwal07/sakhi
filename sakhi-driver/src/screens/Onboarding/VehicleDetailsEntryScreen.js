import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  validateRegistrationNumber,
  validateModelName,
} from '../../utils/onboardingValidators';

const ERROR = '#EF4444';
const OK    = '#10B981';

const VEHICLE_TYPES = [
  { id: 'auto',       label: 'Auto' },
  { id: 'erickshaw',  label: 'E-Rickshaw' },
  { id: 'minivan',    label: 'Mini Van' },
];

const VEHICLE_COLORS = [
  { id: 'Yellow', hex: '#FACC15' },
  { id: 'White',  hex: '#FFFFFF' },
  { id: 'Black',  hex: '#000000' },
  { id: 'Silver', hex: '#CBD5E1' },
];

function FieldError({ error }) {
  if (!error) return null;
  return (
    <View style={styles.fieldErrRow}>
      <Feather name="alert-circle" size={11} color={ERROR} />
      <Text style={styles.fieldErrTxt}>{error}</Text>
    </View>
  );
}

function ValidatedInput({
  label, value, onChangeText, placeholder, autoCapitalize = 'none',
  error, hint, keyboardType = 'default', maxLength,
}) {
  const isOk = value.trim().length > 0 && !error;
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[
        styles.textInputWrapper,
        error ? styles.inputWrapError : null,
        isOk  ? styles.inputWrapOk    : null,
      ]}>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#CBD5E1"
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          maxLength={maxLength}
        />
        {isOk  && <Feather name="check" size={16} color={OK} style={styles.inputIcon} />}
        {error && <Feather name="alert-circle" size={16} color={ERROR} style={styles.inputIcon} />}
      </View>
      {hint && !error && <Text style={styles.hintTxt}>{hint}</Text>}
      <FieldError error={error} />
    </View>
  );
}

export default function VehicleDetailsEntryScreen({ navigation }) {
  const { t } = useTranslation();
  const { updateDriver } = useAuth();
  const [vehicleType, setVehicleType] = useState('auto');
  const [regNumber, setRegNumber]     = useState('');
  const [colour, setColour]           = useState('Yellow');
  const [modelName, setModelName]     = useState('');
  const [loading, setLoading]         = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [touched, setTouched] = useState({});
  const [errors,  setErrors]  = useState({});

  const validateField = useCallback((field, value) => {
    let result = { ok: true };
    if (field === 'regNumber') result = validateRegistrationNumber(value);
    if (field === 'modelName') result = validateModelName(value);
    setErrors(prev => ({ ...prev, [field]: result.ok ? undefined : result.error }));
    return result.ok;
  }, []);

  const handleChange = (field, value, setter) => {
    setter(value);
    if (touched[field]) validateField(field, value);
  };

  const handleBlur = (field, value) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  const hasErrors = Object.values(errors).some(Boolean);
  const canSubmit = !hasErrors && vehicleType && regNumber.trim().length >= 9 && colour && modelName.trim().length >= 2;
  const currentVehicleTypeLabel = VEHICLE_TYPES.find(v => v.id === vehicleType)?.label || 'Select Type';

  const handleSubmit = async () => {
    setTouched({ regNumber: true, modelName: true });
    const regResult = validateRegistrationNumber(regNumber);
    const modelResult = validateModelName(modelName);

    setErrors({
      regNumber: regResult.ok ? undefined : regResult.error,
      modelName: modelResult.ok ? undefined : modelResult.error,
    });

    if (!regResult.ok || !modelResult.ok) {
      Alert.alert('Fix Required', 'Please correct the highlighted fields.');
      return;
    }

    try {
      setLoading(true);
      await client.post('/drivers/vehicle', {
        vehicle_type:        vehicleType,
        registration_number: regResult.clean,
        colour,
        model_name:          modelResult.clean,
      });
      updateDriver({ onboarding_status: 'vehicle_added' });
      navigation.navigate('VerificationLoading');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Could not save vehicle details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={undefined}>
      {/* Nav - TopAppBar */}
      <View style={styles.topAppBar}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Feather name="arrow-left" size={24} color="#BEA3D8" />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle}>Vehicle Details</Text>
            </View>
            <Text style={styles.stepText}>Step 4 of 5</Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.mainCanvas}>

          {/* Karnataka notice banner */}
          <View style={styles.kaBanner}>
            <MaterialCommunityIcons name="map-marker-check" size={15} color="#1D4ED8" />
            <Text style={styles.kaBannerTxt}>
              Karnataka registered vehicles only (KA)
            </Text>
          </View>

          {/* Header Titles */}
          <View style={styles.headerTitles}>
            <Text style={styles.headline}>Your Vehicle Details</Text>
            <Text style={styles.subline}>Please provide accurate information to complete your registration.</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            
            {/* Vehicle Type */}
            <View style={[styles.inputGroup, { zIndex: 10 }]}>
              <Text style={styles.inputLabel}>VEHICLE TYPE</Text>
              <View>
                <TouchableOpacity 
                  style={styles.dropdownBtn} 
                  onPress={() => setDropdownOpen(!dropdownOpen)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownText}>{currentVehicleTypeLabel}</Text>
                  <Feather name={dropdownOpen ? "chevron-up" : "chevron-down"} size={20} color="#BEA3D8" />
                </TouchableOpacity>
                {dropdownOpen && (
                  <View style={styles.dropdownListContainer}>
                    {VEHICLE_TYPES.map(vt => (
                      <TouchableOpacity 
                        key={vt.id} 
                        style={styles.dropdownListItem}
                        onPress={() => {
                          setVehicleType(vt.id);
                          setDropdownOpen(false);
                        }}
                      >
                        <Text style={[styles.dropdownListText, vehicleType === vt.id && styles.dropdownListTextActive]}>
                          {vt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Registration Number */}
            <ValidatedInput
              label="REGISTRATION NUMBER (KA ONLY)"
              value={regNumber}
              onChangeText={(v) => handleChange('regNumber', v.toUpperCase().replace(/\s/g, ''), setRegNumber)}
              placeholder="KA05AB1234"
              autoCapitalize="characters"
              maxLength={12}
              error={touched.regNumber ? errors.regNumber : undefined}
              hint="Format: KA + district + series + number (e.g. KA05AB1234)"
            />

            {/* Model Name */}
            <ValidatedInput
              label="MODEL NAME"
              value={modelName}
              onChangeText={(v) => handleChange('modelName', v, setModelName)}
              placeholder="e.g. Bajaj RE, Mahindra Treo"
              autoCapitalize="words"
              error={touched.modelName ? errors.modelName : undefined}
            />

            {/* Vehicle Colour */}
            <View style={[styles.inputGroup, { zIndex: 1, marginBottom: 0 }]}>
              <Text style={styles.inputLabel}>VEHICLE COLOUR</Text>
              <View style={styles.colorRow}>
                {VEHICLE_COLORS.map((c) => {
                  const isActive = colour === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.colorOuterRing, isActive && styles.colorOuterRingActive]}
                      onPress={() => setColour(c.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.colorInnerCircle, { backgroundColor: c.hex }, c.hex === '#FFFFFF' && styles.colorWhiteBorder]} />
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.selectedColorTxt}>Selected: {colour}</Text>
            </View>

          </View>

          {/* Preview Card */}
          <View style={styles.previewCard}>
            <View style={styles.previewIconBg}>
              <MaterialCommunityIcons name="car" size={24} color="#D8B4E2" />
            </View>
            <View style={styles.previewTextCol}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {regNumber || 'KA 05 AB 1234'} · {colour || 'Yellow'}
              </Text>
              <Text style={styles.previewSub} numberOfLines={1}>
                {modelName || 'Bajaj RE'}
              </Text>
            </View>
            {canSubmit && <MaterialCommunityIcons name="check-decagram" size={24} color={OK} />}
          </View>

        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.bottomFooter}>
        <SafeAreaView edges={['bottom']} style={{ width: '100%', alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.submitBtn, (!canSubmit || loading) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Save &amp; Continue</Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },
  topAppBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: 'rgba(245, 240, 255, 0.95)',
    zIndex: 100,
  },
  safeAreaHeader: { width: '100%' },
  headerContent: {
    height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  titleContainer: { flex: 1 },
  headerTitle: { fontFamily: 'Inter', fontWeight: '600', fontSize: 18, color: '#1E1B2E' },
  stepText: { fontFamily: 'Inter', fontWeight: '500', fontSize: 14, color: '#6B7280' },
  
  kaBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EFF6FF', borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE',
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 24, width: '100%',
  },
  kaBannerTxt: { fontSize: 13, fontWeight: '600', color: '#1D4ED8', flex: 1 },

  scroll: { flexGrow: 1, paddingBottom: 160 },
  mainCanvas: {
    paddingHorizontal: 24, paddingTop: 90, paddingBottom: 128, alignItems: 'center', width: '100%',
  },
  headerTitles: { width: '100%', marginBottom: 32 },
  headline: {
    fontFamily: 'Inter', fontWeight: '700', fontSize: 26, lineHeight: 32,
    color: '#1E1B2E', letterSpacing: -0.6, marginBottom: 12,
  },
  subline: {
    fontFamily: 'Inter', fontWeight: '400', fontSize: 15, lineHeight: 22,
    color: '#6B7280', paddingRight: 16,
  },
  formCard: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24,
    shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.05, shadowRadius: 24, elevation: 4, marginBottom: 24, zIndex: 2,
  },
  
  // Input
  inputGroup: { marginBottom: 24 },
  inputLabel: {
    fontFamily: 'Inter', fontWeight: '600', fontSize: 11, letterSpacing: 1.2,
    color: '#8A8A8E', marginBottom: 8, textTransform: 'uppercase'
  },
  textInputWrapper: {
    backgroundColor: '#F8F6FC', borderRadius: 12, height: 48,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'transparent'
  },
  inputWrapError: { borderColor: `${ERROR}66`, backgroundColor: '#FFF5F5' },
  inputWrapOk:    { borderColor: `${OK}55` },
  textInput: {
    flex: 1, fontFamily: 'Inter', fontWeight: '500', fontSize: 15, color: '#1E1B2E', height: '100%', padding: 0
  },
  inputIcon: { marginLeft: 8 },
  hintTxt: { fontSize: 10, color: '#94A3B8', marginTop: 4, lineHeight: 14 },
  fieldErrRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  fieldErrTxt: { fontSize: 11, color: ERROR, fontWeight: '500', flex: 1 },

  // Dropdown
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8F6FC', borderRadius: 12, height: 48, paddingHorizontal: 16,
  },
  dropdownText: { fontFamily: 'Inter', fontWeight: '500', fontSize: 15, color: '#1E1B2E' },
  dropdownListContainer: {
    position: 'absolute', top: 52, left: 0, right: 0, backgroundColor: '#FFFFFF',
    borderRadius: 12, paddingVertical: 8, shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 10, zIndex: 100,
  },
  dropdownListItem: { paddingVertical: 12, paddingHorizontal: 16 },
  dropdownListText: { fontFamily: 'Inter', fontWeight: '500', fontSize: 15, color: '#6B7280' },
  dropdownListTextActive: { color: '#BEA3D8', fontWeight: '600' },

  // Colors
  colorRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  colorOuterRing: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  colorOuterRingActive: { borderColor: '#BEA3D8' },
  colorInnerCircle: { width: 28, height: 28, borderRadius: 14 },
  colorWhiteBorder: { borderWidth: 1, borderColor: '#E2E8F0' },
  selectedColorTxt:{ fontSize: 11, color: '#6B7280', marginTop: 10 },

  // Preview
  previewCard: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 4,
  },
  previewIconBg: {
    width: 48, height: 48, backgroundColor: '#F5F0FF', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  previewTextCol: { flex: 1, marginLeft: 16, marginRight: 12 },
  previewTitle: {
    fontFamily: 'Inter', fontWeight: '700', fontSize: 14, color: '#1E1B2E', marginBottom: 4,
  },
  previewSub: { fontFamily: 'Inter', fontWeight: '400', fontSize: 12, color: '#6B7280' },

  // Footer
  bottomFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(245, 240, 255, 0.95)', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16,
  },
  submitBtn: {
    width: '100%', height: 56, backgroundColor: '#9B70D4', borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', shadowColor: '#9B70D4',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontFamily: 'Inter', fontWeight: '700', fontSize: 16, color: '#FFFFFF' },
});
