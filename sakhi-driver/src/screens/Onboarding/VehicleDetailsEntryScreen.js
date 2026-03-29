import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

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

export default function VehicleDetailsEntryScreen({ navigation }) {
  const { updateDriver } = useAuth();
  const [vehicleType, setVehicleType] = useState('auto');
  const [regNumber, setRegNumber]     = useState('');
  const [colour, setColour]           = useState('Yellow');
  const [modelName, setModelName]     = useState('');
  const [loading, setLoading]         = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const canSubmit = vehicleType && regNumber.trim().length >= 4 && colour && modelName.trim().length >= 2;
  const currentVehicleTypeLabel = VEHICLE_TYPES.find(v => v.id === vehicleType)?.label || 'Select Type';

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      setLoading(true);
      await client.post('/drivers/vehicle', {
        vehicle_type:        vehicleType,
        registration_number: regNumber.toUpperCase().trim(),
        colour,
        model_name:          modelName.trim(),
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Nav - TopAppBar */}
      <View style={styles.topAppBar}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Feather name="arrow-left" size={24} color="#7C3AED" />
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

          {/* Header Titles */}
          <View style={styles.headerTitles}>
            <Text style={styles.headline}>Your Vehicle Details</Text>
            <Text style={styles.subline}>Please provide accurate information to complete your registration.</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            
            {/* Vehicle Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>VEHICLE TYPE</Text>
              <View style={{ zIndex: 10 }}>
                <TouchableOpacity 
                  style={styles.dropdownBtn} 
                  onPress={() => setDropdownOpen(!dropdownOpen)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownText}>{currentVehicleTypeLabel}</Text>
                  <Feather name={dropdownOpen ? "chevron-up" : "chevron-down"} size={20} color="#7C3AED" />
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
            <View style={[styles.inputGroup, { zIndex: 1 }]}>
              <Text style={styles.inputLabel}>REGISTRATION NUMBER</Text>
              <View style={styles.textInputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="KA 05 AB 1234"
                  placeholderTextColor="#CBD5E1"
                  value={regNumber}
                  onChangeText={(t) => setRegNumber(t.toUpperCase())}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Vehicle Colour */}
            <View style={[styles.inputGroup, { zIndex: 1 }]}>
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
            </View>

            {/* Model Name */}
            <View style={[styles.inputGroup, { marginBottom: 0, zIndex: 1 }]}>
              <Text style={styles.inputLabel}>MODEL NAME</Text>
              <View style={styles.textInputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Bajaj RE"
                  placeholderTextColor="#CBD5E1"
                  value={modelName}
                  onChangeText={setModelName}
                />
              </View>
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
            <MaterialCommunityIcons name="decagram" size={24} color="#D8B4E2" />
          </View>

        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.bottomFooter}>
        <SafeAreaView edges={['bottom']} style={{ width: '100%', alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.submitBtn, (!canSubmit || loading) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(245, 240, 255, 0.95)',
    zIndex: 100,
  },
  safeAreaHeader: {
    width: '100%',
  },
  headerContent: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 18,
    color: '#1E1B2E',
  },
  stepText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 14,
    color: '#6B7280',
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 160,
  },
  mainCanvas: {
    paddingHorizontal: 24,
    paddingTop: 110,
    paddingBottom: 128,
    alignItems: 'center',
    width: '100%',
  },
  headerTitles: {
    width: '100%',
    marginBottom: 32,
  },
  headline: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 26,
    lineHeight: 32,
    color: '#1E1B2E',
    letterSpacing: -0.6,
    marginBottom: 12,
  },
  subline: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    paddingRight: 16,
  },
  formCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
    marginBottom: 24,
    zIndex: 2,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#8A8A8E',
    marginBottom: 8,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F6FC',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
  },
  dropdownText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 15,
    color: '#1E1B2E',
  },
  dropdownListContainer: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 100,
  },
  dropdownListItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownListText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 15,
    color: '#6B7280',
  },
  dropdownListTextActive: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  textInputWrapper: {
    backgroundColor: '#F8F6FC',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  textInput: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 15,
    color: '#1E1B2E',
    height: '100%',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 16,
  },
  colorOuterRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOuterRingActive: {
    borderColor: '#7C3AED',
  },
  colorInnerCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorWhiteBorder: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
  },
  previewIconBg: {
    width: 48,
    height: 48,
    backgroundColor: '#F5F0FF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTextCol: {
    flex: 1,
    marginLeft: 16,
    marginRight: 12,
  },
  previewTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    color: '#1E1B2E',
    marginBottom: 4,
  },
  previewSub: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    color: '#6B7280',
  },
  bottomFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(245, 240, 255, 0.9)',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  submitBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#AB8BDB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
