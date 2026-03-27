import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const VEHICLE_TYPES = [
  { id: 'auto',       label: 'Auto Rickshaw', emoji: '🛺' },
  { id: 'erickshaw',  label: 'E-Rickshaw',    emoji: '⚡🛺' },
  { id: 'minivan',    label: 'Mini Van',       emoji: '🚐' },
];

const COLOURS = ['Yellow', 'White', 'Black', 'Silver', 'Blue', 'Red', 'Green'];

export default function VehicleDetailsEntryScreen({ navigation }) {
  const { updateDriver } = useAuth();
  const [vehicleType, setVehicleType] = useState('');
  const [regNumber, setRegNumber]     = useState('');
  const [colour, setColour]           = useState('');
  const [modelName, setModelName]     = useState('');
  const [loading, setLoading]         = useState(false);

  const canSubmit = vehicleType && regNumber.trim().length >= 4 && colour && modelName.trim().length >= 2;

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
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicle Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Step 3 of 5 · Vehicle Info</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={{ ...styles.progressFill, width: '60%' }} />
        </View>

        <Text style={styles.headline}>Your Vehicle</Text>
        <Text style={styles.subline}>Tell us about the vehicle you drive</Text>

        {/* Vehicle Type */}
        <Text style={styles.sectionLabel}>Vehicle Type</Text>
        <View style={styles.typeRow}>
          {VEHICLE_TYPES.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={[styles.typeCard, vehicleType === v.id && styles.typeCardActive]}
              onPress={() => setVehicleType(v.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.typeEmoji}>{v.emoji}</Text>
              <Text style={[styles.typeLabel, vehicleType === v.id && styles.typeLabelActive]}>{v.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reg Number */}
        <Text style={styles.sectionLabel}>Registration Number</Text>
        <View style={styles.inputBox}>
          <TextInput
            style={styles.input}
            placeholder="e.g. KA 05 AB 1234"
            placeholderTextColor={Colors.outlineVariant}
            value={regNumber}
            onChangeText={(t) => setRegNumber(t.toUpperCase())}
            autoCapitalize="characters"
          />
        </View>

        {/* Vehicle Colour */}
        <Text style={styles.sectionLabel}>Vehicle Colour</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.base }}>
          <View style={styles.colourRow}>
            {COLOURS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colourChip, colour === c && styles.colourChipActive]}
                onPress={() => setColour(c)}
              >
                <Text style={[styles.colourText, colour === c && styles.colourTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Model Name */}
        <Text style={styles.sectionLabel}>Model Name</Text>
        <View style={styles.inputBox}>
          <TextInput
            style={styles.input}
            placeholder="e.g. Bajaj RE, Piaggio Ape"
            placeholderTextColor={Colors.outlineVariant}
            value={modelName}
            onChangeText={setModelName}
          />
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.ctaBtn, (!canSubmit || loading) && styles.ctaDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaText}>Save & Continue</Text>
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

  progressRow: { marginTop: 16, marginBottom: 6 },
  progressLabel: { fontSize: 11, fontWeight: '700', color: Colors.primaryContainer, letterSpacing: 0.5, marginBottom: 6 },
  progressTrack: { height: 8, backgroundColor: Colors.surfaceContainer, borderRadius: 4, overflow: 'hidden', marginBottom: 24 },
  progressFill: { height: '100%', backgroundColor: Colors.primaryContainer, borderRadius: 4 },

  headline: { fontSize: 22, fontWeight: '800', color: Colors.onSurface, letterSpacing: -0.5, marginBottom: 4 },
  subline: { fontSize: 14, color: Colors.onSurfaceVariant, marginBottom: 24 },

  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: Colors.onSurface,
    letterSpacing: 0.3, marginBottom: 10,
  },

  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  typeCard: {
    flex: 1, padding: 12, borderRadius: Radius.lg,
    backgroundColor: Colors.white, alignItems: 'center', gap: 6,
    borderWidth: 2, borderColor: 'transparent', ...Shadows.card,
  },
  typeCardActive: { borderColor: Colors.primaryContainer, backgroundColor: `${Colors.primaryContainer}08` },
  typeEmoji: { fontSize: 26 },
  typeLabel: { fontSize: 11, fontWeight: '600', color: Colors.onSurfaceVariant, textAlign: 'center' },
  typeLabelActive: { color: Colors.primaryContainer },

  inputBox: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    height: 52, paddingHorizontal: Spacing.md, justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.outlineVariant, marginBottom: 24,
    ...Shadows.card,
  },
  input: { fontSize: 15, fontWeight: '500', color: Colors.onSurface },

  colourRow: { flexDirection: 'row', gap: 8, paddingRight: Spacing.base },
  colourChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: Radius.full, backgroundColor: Colors.white,
    borderWidth: 1.5, borderColor: Colors.outlineVariant, ...Shadows.card,
  },
  colourChipActive: { borderColor: Colors.primaryContainer, backgroundColor: `${Colors.primaryContainer}10` },
  colourText: { fontSize: 13, fontWeight: '500', color: Colors.onSurfaceVariant },
  colourTextActive: { color: Colors.primaryContainer, fontWeight: '700' },

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
