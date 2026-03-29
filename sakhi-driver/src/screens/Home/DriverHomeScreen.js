import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, ScrollView, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Bottom Tab Item ────────────────────────────────────────────────────────────
function TabItem({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity style={tab.item} onPress={onPress} activeOpacity={0.7}>
      <Image source={icon} style={[tab.icon, active && tab.iconActive]} resizeMode="contain" />
      <Text style={[tab.label, active && tab.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
const tab = StyleSheet.create({
  item:        { flex: 1, alignItems: 'center', gap: 4 },
  icon:        { width: 22, height: 22, tintColor: '#9CA3AF' },
  iconActive:  { tintColor: '#BEA3D8' },
  label:       { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: '#9CA3AF', lineHeight: 14 },
  labelActive: { color: '#BEA3D8' },
});

// ── Quick Action Button ────────────────────────────────────────────────────────
function QuickAction({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={qa.btn} onPress={onPress} activeOpacity={0.8}>
      <View style={qa.iconBox}>
        <View style={qa.innerIconBg}>
          <Image source={icon} style={qa.icon} resizeMode="contain" />
        </View>
      </View>
      <Text style={qa.label}>{label}</Text>
    </TouchableOpacity>
  );
}
const qa = StyleSheet.create({
  btn:      { alignItems: 'center', gap: 8 },
  iconBox:  {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  innerIconBg: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3E8FF',
    alignItems: 'center', justifyContent: 'center',
  },
  icon:     { width: 20, height: 20, tintColor: '#BEA3D8' },
  label:    { fontSize: 12, fontWeight: '600', color: '#4A4455', textAlign: 'center' },
});

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function DriverHomeScreen({ navigation }) {
  const { driver } = useAuth();
  const [earnings, setEarnings] = useState({ today: 1250, rides: 8, onlineTime: '5h 20m' });

  useFocusEffect(useCallback(() => {
    // Optionally fetch active stats if backend supports it
    client.get('/drivers/earnings/today')
      .then(r => {
        if(r.data && r.data.today_earnings) {
          setEarnings(prev => ({ ...prev, today: r.data.today_earnings, rides: r.data.today_trips || prev.rides }));
        }
      })
      .catch(() => {});
  }, []));

  const handleGoOnline = () => {
    // Go to PaymentPlans
    navigation.navigate('PaymentPlans');
  };

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={s.safeArea}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* ── HEADER ── */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={s.profilePicWrap}>
                {/* Fallback avatar */}
                <Feather name="user" size={24} color="#FFF" />
              </View>
              <View style={s.headerTextWrap}>
                <Text style={s.greetingText}>Hi, Priya <Text style={s.waveIcon}>👋</Text></Text>
                <Text style={s.tierText}>GOLD TIER DRIVER</Text>
              </View>
            </View>
            
            <TouchableOpacity style={s.notifBtn} activeOpacity={0.8}>
              <Feather name="bell" size={20} color="#BEA3D8" />
            </TouchableOpacity>
          </View>

          {/* ── EARNINGS CARD ── */}
          <View style={s.earningsCard}>
            <View style={s.earningsTop}>
              <View>
                <Text style={s.earningsTitle}>Today's Earnings</Text>
                <Text style={s.earningsAmount}>₹{earnings.today}</Text>
              </View>
              {/* Fake Sparkline using CSS borders */}
              <View style={s.sparklineWrap}>
                <View style={s.sparklineItem1}></View>
                <View style={s.sparklineItem2}></View>
                <View style={s.sparklineItem3}></View>
              </View>
            </View>

            <View style={s.divider} />

            <View style={s.earningsBottom}>
              <View style={s.statsBlock}>
                <Text style={s.statsLabel}>Completed</Text>
                <Text style={s.statsValue}>{earnings.rides} Rides</Text>
              </View>
              <View style={s.statsBlock}>
                <Text style={s.statsLabel}>Online Time</Text>
                <Text style={s.statsValue}>{earnings.onlineTime}</Text>
              </View>
              <TouchableOpacity style={s.detailsBtn} activeOpacity={0.8}>
                <Text style={s.detailsText}>Details</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── HUGE 'GO ONLINE' BUTTON ── */}
          <View style={s.actionCenter}>
            <TouchableOpacity style={s.hugeGoOnlineBtn} onPress={handleGoOnline} activeOpacity={0.85}>
              <Feather name="power" size={42} color="#FFFFFF" style={s.powerIcon} />
              <Text style={s.hugeGoOnlineText}>GO ONLINE</Text>
            </TouchableOpacity>

            <Text style={s.offlineStatusHeading}>You are currently offline</Text>
            <Text style={s.offlineStatusSub}>Go online to start receiving ride requests</Text>
          </View>

          {/* ── QUICK ACTIONS ── */}
          <View style={s.quickActionsRow}>
            <QuickAction
              icon={require('../../../assets/car.png')}
              label="My Rides"
              onPress={() => navigation.navigate('TripInProgress')}
            />
            <QuickAction
              icon={require('../../../assets/earning.png')}
              label="Earnings"
              onPress={() => navigation.navigate('MyEarnings')}
            />
            <QuickAction
              icon={require('../../../assets/subscription.png')}
              label="Subscription"
              onPress={() => navigation.navigate('SubscriptionRides')} // update route if needed
            />
          </View>

          {/* ── MAP EXPLORE ZONE ── */}
          <View style={s.mapExploreCard}>
            <View style={s.mapPlaceholderBg}>
              {/* Dummy map lines */}
              <View style={s.mapLine1} />
              <View style={s.mapLine2} />
              <View style={s.mapLine3} />
            </View>
            <TouchableOpacity style={s.explorePill} activeOpacity={0.9}>
              <Text style={s.exploreText}>Tap to explore demand zones</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* ── BOTTOM NAV ── */}
      <View style={s.nav}>
        <TabItem
          icon={require('../../../assets/home.png')}
          label="HOME"
          active={true}
          onPress={() => {}}
        />
        <TabItem
          icon={require('../../../assets/rides.png')}
          label="RIDES"
          active={false}
          onPress={() => navigation.navigate('TripInProgress')}
        />
        <TabItem
          icon={require('../../../assets/wallet.png')}
          label="WALLET"
          active={false}
          onPress={() => navigation.navigate('PaymentPlans')}
        />
        <TabItem
          icon={require('../../../assets/profile.png')}
          label="PROFILE"
          active={false}
          onPress={() => navigation.navigate('MyProfile')}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F8FA' },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center'
  },

  /* ── Header ── */
  header: {
    width: '100%',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 12
  },
  profilePicWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#0F766E', // Teal color for avatar bg based on image
    alignItems: 'center', justifyContent: 'center'
  },
  headerTextWrap: {
    justifyContent: 'center'
  },
  greetingText: { fontSize: 18, fontWeight: '700', color: '#1E1B2E', marginBottom: 2 },
  waveIcon: { fontSize: 18 },
  tierText: { fontSize: 10, fontWeight: '700', color: '#C4A6E1', letterSpacing: 0.5, textTransform: 'uppercase' },
  
  notifBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F3E8FF',
    alignItems: 'center', justifyContent: 'center',
  },

  /* ── Earnings Card ── */
  earningsCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 40,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05, shadowRadius: 16, elevation: 4,
  },
  earningsTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 20
  },
  earningsTitle: { fontSize: 13, fontWeight: '600', color: '#A855F7', marginBottom: 8 },
  earningsAmount: { fontSize: 32, fontWeight: '800', color: '#1E1B2E', letterSpacing: -1 },
  
  sparklineWrap: {
    width: 80, height: 40,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end'
  },
  // Fake curved line using circles with no bottom borders
  sparklineItem1: { width: 25, height: 20, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 20, borderColor: '#C4A6E1', marginRight: -5 },
  sparklineItem2: { width: 25, height: 40, borderTopWidth: 2, borderTopLeftRadius: 25, borderTopRightRadius: 25, borderColor: '#C4A6E1', marginRight: -5 },
  sparklineItem3: { width: 25, height: 25, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 20, borderColor: '#C4A6E1' },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 20, width: '100%' },
  
  earningsBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  statsBlock: { },
  statsLabel: { fontSize: 12, fontWeight: '500', color: '#9CA3AF', marginBottom: 4 },
  statsValue: { fontSize: 14, fontWeight: '700', color: '#1E1B2E' },
  
  detailsBtn: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 9999
  },
  detailsText: { fontSize: 12, fontWeight: '600', color: '#A855F7' },

  /* ── Huge Go Online Button ── */
  actionCenter: {
    alignItems: 'center',
    marginBottom: 40,
    width: '100%'
  },
  hugeGoOnlineBtn: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#C4A6E1',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#A855F7', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3, shadowRadius: 32, elevation: 12,
  },
  powerIcon: { marginBottom: 16 },
  hugeGoOnlineText: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },

  offlineStatusHeading: { fontSize: 16, fontWeight: '600', color: '#4A4455', marginTop: 32, marginBottom: 8 },
  offlineStatusSub: { fontSize: 13, fontWeight: '400', color: '#9CA3AF' },

  /* ── Quick Actions ── */
  quickActionsRow: {
    width: '100%',
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 40
  },

  /* ── Map Explore Card ── */
  mapExploreCard: {
    width: '100%',
    height: 140,
    borderRadius: 24,
    backgroundColor: '#D1D5DB', // gray placeholder map bg
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative'
  },
  mapPlaceholderBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.2 },
  mapLine1: { position: 'absolute', width: '150%', height: 2, backgroundColor: '#FFFFFF', transform: [{rotate: '15deg'}], top: 40, left: -20 },
  mapLine2: { position: 'absolute', width: '150%', height: 2, backgroundColor: '#FFFFFF', transform: [{rotate: '-25deg'}], top: 80, left: -20 },
  mapLine3: { position: 'absolute', width: '150%', height: 2, backgroundColor: '#FFFFFF', transform: [{rotate: '45deg'}], top: 0, left: 40 },

  explorePill: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 9999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 4
  },
  exploreText: { fontSize: 14, fontWeight: '700', color: '#BEA3D8' },

  /* ── Bottom Nav ── */
  nav: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 12, paddingBottom: 28,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: 'rgba(190,163,216,0.1)',
  },
});
