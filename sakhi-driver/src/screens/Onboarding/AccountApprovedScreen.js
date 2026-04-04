import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, ScrollView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

export default function AccountApprovedScreen({ navigation }) {
  const { driver } = useAuth();
  const scale = useRef(new Animated.Value(0.5)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const handleContinue = () => {
    navigation.reset({ index: 0, routes: [{ name: 'RootShell' }] });
  };

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.6] });

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#BEA3D8" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account Status</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Animated Success State */}
        <View style={styles.successStateWrap}>
          {/* Decorative soft circle glow */}
          <Animated.View style={[styles.successGlow, { opacity: glowOpacity }]} />
          <View style={styles.successIconBg}>
            <Animated.View style={{ transform: [{ scale }] }}>
              <MaterialCommunityIcons name="check-circle" size={56} color="#22C55E" />
            </Animated.View>
          </View>
        </View>

        {/* Headlines */}
        <View style={styles.headlineStack}>
          <Text style={styles.headline}>You're Approved! 🎉</Text>
          <Text style={styles.subline}>Your Sakhi driver account is active and ready.</Text>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          {/* Driver Name Row */}
          <View style={styles.driverRow}>
            <View>
              <Text style={styles.labelSmall}>DRIVER NAME</Text>
              <Text style={styles.driverVal}>{driver?.name ?? 'Priya Sharma'}</Text>
            </View>
            <View style={styles.personIconBg}>
              <MaterialCommunityIcons name="account-check-outline" size={20} color="#BEA3D8" />
            </View>
          </View>

          {/* Vehicle Info Box */}
          <View style={styles.vehicleBox}>
            <Text style={styles.labelSmall}>VEHICLE DETAILS</Text>
            <View style={styles.vehicleInfoRow}>
              <MaterialCommunityIcons name="train-car" size={16} color="#BEA3D8" />
              <Text style={styles.vehicleVal}>
                {(driver?.vehicle_model || 'Auto') + ' ' + (driver?.registration_number || 'KA 05 AB 1234')}
              </Text>
            </View>
          </View>

          {/* Status Indicators */}
          <View style={styles.statusRow}>
            <View style={styles.statusCol}>
              <Text style={styles.labelSmall}>KYC STATUS</Text>
              <View style={styles.statusValRow}>
                <Text style={styles.greenText}>Verified</Text>
                <MaterialCommunityIcons name="check" size={14} color="#16A34A" />
              </View>
            </View>
            <View style={[styles.statusCol, { alignItems: 'flex-end' }]}>
              <Text style={styles.labelSmall}>ACCOUNT</Text>
              <View style={styles.statusValRow}>
                <Text style={styles.greenText}>Active</Text>
                <MaterialCommunityIcons name="check" size={14} color="#16A34A" />
              </View>
            </View>
          </View>
        </View>

        {/* Welcome Banner */}
        <View style={styles.welcomeBanner}>
          <Text style={styles.welcomeText}>
            "Welcome to the Sakhi family. Your first ride{'\n'}awaits! 💜"
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Action Footer */}
      <View style={styles.footerShell}>
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.continueBtnText}>Continue to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: 'rgba(245, 240, 255, 0.8)',
    zIndex: 10,
    paddingHorizontal: 24,
    justifyContent: 'center',
    ...(Platform.OS === 'ios' && { marginTop: 44 }) // Offset for top safe area roughly
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    paddingRight: 16,
    paddingVertical: 10,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 18,
    color: '#1E1B2E',
    letterSpacing: -0.45,
  },
  scroll: {
    paddingTop: 140, // clear header + generous spacing
    paddingHorizontal: 24,
    paddingBottom: 160,
    alignItems: 'center',
  },
  successStateWrap: {
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  successGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#DCFCE7',
  },
  successIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 8,
  },
  headlineStack: {
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
  },
  headline: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 30,
    lineHeight: 36,
    color: '#1E1B2E',
    letterSpacing: -0.75,
    textAlign: 'center',
    marginBottom: 8,
  },
  subline: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 16,
    lineHeight: 26,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 6,
    marginBottom: 24,
  },
  driverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  labelSmall: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#6B7280',
    marginBottom: 4,
  },
  driverVal: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 28,
    color: '#1E1B2E',
  },
  personIconBg: {
    width: 38,
    height: 32,
    backgroundColor: '#F5F0FF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleBox: {
    backgroundColor: '#F5F0FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  vehicleVal: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 24,
    color: '#1E1B2E',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusCol: {
    alignItems: 'flex-start',
  },
  statusValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  greenText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 20,
    color: '#16A34A',
  },
  welcomeBanner: {
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  welcomeText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'center',
    color: '#6B7280',
  },
  footerShell: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 8,
  },
  continueBtn: {
    width: '100%',
    height: 60,
    backgroundColor: '#BEA3D8',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 6,
  },
  continueBtnText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    color: '#FFFFFF',
  },
});
