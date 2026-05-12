import React, { useEffect } from 'react';
import { BackHandler } from 'react-native';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function DriverGenderVerificationScreen({ navigation }) {
  // Prevent GO_BACK crash — this is the root onboarding screen
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const { t } = useTranslation();
  const { driver } = useAuth();

  // Green check if already verified (returning from DriverFaceLivenessScreen)
  const isVerified =
    driver?.verification_status === 'approved' || !!driver?.gender_verified;

  const handleStartLiveness = () => {
    navigation.navigate('DriverFaceLiveness');
  };

  const handleContinue = () => {
    navigation.navigate('DriverKycUpload');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.canGoBack() && navigation.goBack()}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={24} color="#BEA3D8" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sakhi</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Main Content */}
        <View style={styles.main}>

          {/* Shield icon */}
          <View style={styles.iconCircleWrapper}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons
                name={isVerified ? 'shield-check' : 'shield-check-outline'}
                size={40}
                color={isVerified ? '#22C55E' : '#BEA3D8'}
              />
            </View>
          </View>

          {/* Title */}
          <View style={styles.contentHeader}>
            <Text style={styles.headline}>Verify Your Identity</Text>
            <Text style={styles.subline}>Only verified women drivers can join Sakhi.</Text>
          </View>

          {/* Cards */}
          <View style={styles.cards}>

            {/* Face Scan card */}
            <TouchableOpacity
              style={[styles.card, isVerified && styles.cardVerified]}
              onPress={isVerified ? undefined : handleStartLiveness}
              activeOpacity={isVerified ? 1 : 0.85}
            >
              <View style={[styles.cardBg, isVerified && styles.cardBgVerified]}>
                <MaterialCommunityIcons
                  name="face-recognition"
                  size={24}
                  color={isVerified ? '#22C55E' : '#BEA3D8'}
                />
              </View>
              <View style={styles.cardTextCont}>
                <Text style={styles.cardTitle}>Face Scan</Text>
                <Text style={styles.cardSub}>
                  {isVerified
                    ? 'Identity verified successfully ✓'
                    : 'Guided camera-based identity check'}
                </Text>
              </View>
              {isVerified ? (
                <MaterialCommunityIcons name="check-circle" size={22} color="#22C55E" />
              ) : (
                <Feather name="chevron-right" size={22} color="#BEA3D8" style={styles.chevronIcon} />
              )}
            </TouchableOpacity>

            {/* Info box */}
            <View style={styles.infoBox}>
              <MaterialCommunityIcons name="information-outline" size={18} color="#BEA3D8" style={{ marginTop: 1, marginRight: 10 }} />
              <Text style={styles.infoText}>
                We use AI-based face analysis to verify you are a woman. Your photo is stored
                securely and never shared with third parties.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={[styles.ctaBtn, !isVerified && styles.ctaDisabled]}
          onPress={isVerified ? handleContinue : handleStartLiveness}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>
            {isVerified ? 'Continue →' : 'Start Face Verification'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F5F0FF' },
  scroll: { paddingBottom: 160, flexGrow: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 16, height: 56,
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontFamily: 'Inter', fontWeight: '600', fontSize: 16, color: '#1E1B2E', letterSpacing: -0.4 },

  main:              { alignItems: 'center', paddingHorizontal: 24, paddingTop: 32 },
  iconCircleWrapper: { marginBottom: 40 },
  iconCircle: {
    width: 80, height: 80, backgroundColor: '#FFFFFF', borderRadius: 9999,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
  },

  contentHeader: { alignItems: 'center', marginBottom: 40 },
  headline: {
    fontFamily: 'Inter', fontWeight: '700', fontSize: 24, color: '#1E1B2E',
    textAlign: 'center', letterSpacing: -0.6, marginBottom: 11,
  },
  subline: { fontFamily: 'Inter', fontWeight: '400', fontSize: 14, color: '#6B7280', textAlign: 'center' },

  cards: { width: '100%', gap: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderColor: 'rgba(255,255,255,0.5)', borderWidth: 1,
    shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
  },
  cardVerified: { borderColor: 'rgba(34,197,94,0.35)', borderWidth: 1.5, backgroundColor: '#F0FDF4' },

  cardBg: {
    width: 42, height: 48, backgroundColor: '#F5F0FF',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  cardBgVerified: { backgroundColor: 'rgba(34,197,94,0.1)' },

  cardTextCont: { flex: 1 },
  cardTitle: { fontFamily: 'Inter', fontWeight: '700', fontSize: 16, color: '#1E1B2E', marginBottom: 2 },
  cardSub:   { fontFamily: 'Inter', fontWeight: '400', fontSize: 12, color: '#6B7280', lineHeight: 16 },
  chevronIcon: { opacity: 0.4 },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(190,163,216,0.12)', borderRadius: 12,
    padding: 14,
  },
  infoText: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 18 },

  bottomArea: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 120, paddingHorizontal: 24, justifyContent: 'center',
    backgroundColor: '#F5F0FF',
  },
  ctaBtn: {
    height: 56, borderRadius: 12, backgroundColor: '#9B70D4',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
  },
  ctaDisabled: { backgroundColor: '#C4A8E8' },
  ctaText: { fontFamily: 'Inter', fontWeight: '700', fontSize: 16, color: '#FFFFFF' },
});
