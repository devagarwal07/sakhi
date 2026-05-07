import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, Alert, ActivityIndicator, ScrollView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function DriverGenderVerificationScreen({ navigation }) {
  const { t } = useTranslation();
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
      navigation.navigate('DigiLockerConsent');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Header - Top Navigation Shell */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#BEA3D8" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sakhi</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Main Content */}
        <View style={styles.main}>
          {/* Brand/Safety Icon */}
          <View style={styles.iconCircleWrapper}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="shield-check-outline" size={40} color="#BEA3D8" />
            </View>
          </View>

          {/* Header Content */}
          <View style={styles.contentHeader}>
            <Text style={styles.headline}>Verify Your Identity</Text>
            <Text style={styles.subline}>Only verified women drivers can join Sakhi.</Text>
          </View>

          {/* Verification Cards */}
          <View style={styles.cards}>
            {/* Card 1: Aadhaar */}
            <TouchableOpacity style={styles.card} activeOpacity={0.85}>
              <View style={styles.cardBg}>
                <MaterialCommunityIcons name="card-account-details-outline" size={24} color="#BEA3D8" />
              </View>
              <View style={styles.cardTextCont}>
                <Text style={styles.cardTitle}>Upload Aadhaar</Text>
                <Text style={styles.cardSub}>Upload front &amp; back of your Aadhaar card</Text>
              </View>
              <Feather name="chevron-right" size={22} color="#BEA3D8" style={styles.chevronIcon} />
            </TouchableOpacity>

            {/* Card 2: Face Scan */}
            <TouchableOpacity style={styles.card} onPress={takeSelfie} activeOpacity={0.85}>
              <View style={styles.cardBg}>
                <MaterialCommunityIcons name="face-recognition" size={24} color="#BEA3D8" />
              </View>
              <View style={styles.cardTextCont}>
                <Text style={styles.cardTitle}>Face Scan</Text>
                <Text style={styles.cardSub}>Quick camera-based identity verification</Text>
              </View>
              <Feather name="chevron-right" size={22} color="#BEA3D8" style={styles.chevronIcon} />
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
            
            {/* Empty state/Illustration placeholder */}
            <View style={styles.illustrationWrapper}>
               <View style={styles.illustrationPlace}>
                  <MaterialCommunityIcons name="shield-account-outline" size={48} color="#BEA3D8" style={{opacity: 0.3}} />
               </View>
            </View>
          </View>
        </View>
        
      </ScrollView>

      {/* Fixed Bottom Action Area */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={[styles.ctaBtn, (!selfie || loading) && styles.ctaDisabled]}
          onPress={handleSubmit}
          disabled={!selfie || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },
  scroll: {
    paddingBottom: 160, 
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    height: 56,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 16,
    color: '#1E1B2E',
    letterSpacing: -0.4,
  },
  main: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  iconCircleWrapper: {
    marginBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 4,
  },
  contentHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headline: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 24,
    color: '#1E1B2E',
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: 11,
  },
  subline: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  cards: {
    width: '100%',
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 4,
  },
  cardBg: {
    width: 42,
    height: 48,
    backgroundColor: '#F5F0FF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardTextCont: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#1E1B2E',
    marginBottom: 2,
  },
  cardSub: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  chevronIcon: {
    opacity: 0.4,
  },
  illustrationWrapper: {
    alignItems: 'center',
    marginTop: 48,
  },
  illustrationPlace: {
    width: 128,
    height: 128,
    backgroundColor: '#FFFFFF',
    opacity: 0.4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  previewContainer: {
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  preview: {
    width: 160,
    height: 160,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#BEA3D8',
  },
  retakeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#BEA3D8',
  },
  retakeText: {
    fontSize: 13,
    color: '#BEA3D8',
    fontWeight: '600',
  },
  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    paddingHorizontal: 24,
    justifyContent: 'center',
    backgroundColor: '#F5F0FF',
  },
  ctaBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: '#9B70D4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 4,
  },
  ctaDisabled: {
    backgroundColor: '#BEA3D8',
    opacity: 0.6,
  },
  ctaText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
