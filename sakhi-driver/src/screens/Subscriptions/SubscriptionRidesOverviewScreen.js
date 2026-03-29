import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, ActivityIndicator, Alert, Dimensions, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import client from '../../api/client';

const { width: SCREEN_W } = Dimensions.get('window');

// Mock data to match Figma visual
const MOCK_TODAY = [
  { id: '1', time: '08:30 AM', route: 'Office Corridor - Tech Park', rider: 'Ananya Sharma', status: 'UPCOMING' },
  { id: '2', time: '05:45 PM', route: 'Tech Park - Residency Area', rider: 'Ananya Sharma', status: 'UPCOMING' }
];

const MOCK_UPCOMING_WEEK = [
  { id: 'w1', month: 'OCT', date: '24', dayTitle: 'Tomorrow, Tuesday', ridesCount: 2 },
  { id: 'w2', month: 'OCT', date: '25', dayTitle: 'Wednesday', ridesCount: 4 },
  { id: 'w3', month: 'OCT', date: '26', dayTitle: 'Thursday', ridesCount: 2 },
];

export default function SubscriptionRidesOverviewScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [optedIn, setOptedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [rides, setRides] = useState(MOCK_TODAY);

  // Example lock state for the banner
  const isLocked = true; 
  const minutesUntilNext = 28;

  const handleOptToggle = (val) => {
    setOptedIn(val);
    // In a real app we would call: client.patch('/drivers/subscriptions/opt-in', { opted_in: val })
  };

  return (
    <View style={styles.root}>
      {/* Background Aesthetic Blur Elements */}
      <View style={styles.blurTopRight} />
      <View style={styles.blurBottomLeft} />

      {/* Main Content Area */}
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 24) + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        
        {/* Opt-In Section */}
        <View style={styles.optInCard}>
          <View style={styles.optInRow1}>
            <Text style={styles.optInTitle}>Opt In to Subscription Rides</Text>
            <Switch
              value={optedIn}
              onValueChange={handleOptToggle}
              trackColor={{ false: '#CBD5E1', true: '#BEA3D8' }}
              thumbColor="#FFFFFF"
              style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
            />
          </View>
          <Text style={styles.optInSubText}>Priority matching and guaranteed earnings</Text>
        </View>

        {/* Locked Banner Section */}
        {isLocked && (
          <View style={styles.lockedBannerCard}>
            <MaterialIcons name="lock" size={16} color="#EA580C" style={{ marginTop: 2 }} />
            <View style={styles.lockedBannerCol}>
              <Text style={styles.lockedTextTitle}>Locked — Subscription ride in {minutesUntilNext} mins.</Text>
              <Text style={styles.lockedTextSub}>On-demand paused.</Text>
            </View>
          </View>
        )}

        {/* Today's Schedule Section */}
        <Text style={styles.sectionTitle}>TODAY'S SCHEDULE</Text>
        
        <View style={styles.rideList}>
          {rides.map((ride, idx) => (
            <TouchableOpacity 
              key={ride.id} 
              style={[styles.rideCard, idx === 1 && { opacity: 0.9 }]}
              activeOpacity={0.8}
            >
              <View style={styles.rideMarkerLine} />
              
              <View style={styles.rideCardInner}>
                <View style={styles.rideCardTopRow}>
                  <Text style={styles.rideTime}>{ride.time}</Text>
                  <View style={styles.upcomingBadge}>
                    <Text style={styles.upcomingBadgeText}>{ride.status}</Text>
                  </View>
                </View>
                
                <View style={styles.rideCardDetails}>
                  <Text style={styles.rideRoute}>{ride.route}</Text>
                  <Text style={styles.rideRider}>Rider: {ride.rider}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upcoming Week Section */}
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>UPCOMING WEEK</Text>
        
        <View style={styles.weekOverlay}>
          {MOCK_UPCOMING_WEEK.map((day, idx) => (
            <TouchableOpacity 
              key={day.id} 
              style={[
                styles.weekRowItem, 
                idx > 0 && { marginTop: 8 }
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.weekDateBadge}>
                <Text style={styles.weekMonthText}>{day.month}</Text>
                <Text style={styles.weekDateText}>{day.date}</Text>
              </View>
              
              <View style={styles.weekInfoCol}>
                <Text style={styles.weekDayTitle}>{day.dayTitle}</Text>
                <Text style={styles.weekRidesCount}>{day.ridesCount} subscription rides</Text>
              </View>

              <Feather name="chevron-right" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Top Floating App Bar */}
      <View style={[styles.headerAppBar, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={24} color="#BEA3D8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Rides</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F0FF',
    position: 'relative',
  },
  
  // -- Aesthetic Background Blurs --
  blurTopRight: {
    position: 'absolute',
    width: 256,
    height: 256,
    right: -96,
    top: -96,
    backgroundColor: 'rgba(190, 163, 216, 0.1)',
    borderRadius: 128,
  },
  blurBottomLeft: {
    position: 'absolute',
    width: 256,
    height: 256,
    left: -96,
    bottom: -96,
    backgroundColor: 'rgba(103, 75, 181, 0.1)',
    borderRadius: 128,
  },

  // -- MAIN CONTENT --
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Opt-In Section
  optInCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 4,
  },
  optInRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  optInTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 16,
    color: '#1C1A25',
  },
  optInSubText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 14,
    color: '#64748B',
  },

  // Locked Banner
  lockedBannerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 247, 237, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(254, 215, 170, 0.5)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  lockedBannerCol: {
    flex: 1,
    gap: 2,
  },
  lockedTextTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    color: '#C2410C',
  },
  lockedTextSub: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 12,
    color: 'rgba(234, 88, 12, 0.8)',
  },

  // Section Headers
  sectionTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    color: '#4A4455',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 16,
    opacity: 0.8,
  },

  // Ride Item Cards
  rideList: {
    gap: 16,
    marginBottom: 24,
  },
  rideCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 4,
    height: 128,
    overflow: 'hidden',
  },
  rideMarkerLine: {
    width: 6,
    height: '100%',
    backgroundColor: '#BEA3D8',
  },
  rideCardInner: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 12,
  },
  rideCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rideTime: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    color: '#BEA3D8',
  },
  upcomingBadge: {
    backgroundColor: '#E8DDFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  upcomingBadgeText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    color: '#3F1E8C',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rideCardDetails: {
    gap: 4,
  },
  rideRoute: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#1C1A25',
  },
  rideRider: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 14,
    color: '#64748B',
  },

  // Weekly Override View
  weekOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 16,
    padding: 8,
  },
  weekRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  weekDateBadge: {
    width: 40,
    height: 40,
    backgroundColor: '#F0ECFA',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekMonthText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    color: '#BEA3D8',
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  weekDateText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    color: '#1C1A25',
  },
  weekInfoCol: {
    flex: 1,
  },
  weekDayTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 16,
    color: '#1C1A25',
  },
  weekRidesCount: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    color: '#64748B',
  },

  // -- FLOATING HEADER --
  headerAppBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    // Note: React Native doesn't support backdrop-filter natively without special blurred views,
    // so we use a semi-transparent white.
  },
  backBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    color: '#1E1B4B',
    marginLeft: 16,
    letterSpacing: -0.36,
  },
});
