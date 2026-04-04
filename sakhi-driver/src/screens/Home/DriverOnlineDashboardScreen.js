import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, ScrollView, Dimensions, Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import client from '../../api/client';
import BottomNavBar, { NAV_HEIGHT } from '../../components/BottomNavBar';
import DriverSidebarMenu from '../../components/DriverSidebarMenu';

const { width } = Dimensions.get('window');

// ─── Design Tokens ────────────────────────────────────────────────────────────
const PURPLE = '#BEA3D8';
const PURPLE_LIGHT = 'rgba(127, 25, 230, 0.1)';
const BG = '#F7F6F8';
const DARK = '#0F172A';

const TIER_COLORS = {
  bronze:   '#CD7F32',
  silver:   '#64748B',
  gold:     '#F59E0B',
  platinum: '#BEA3D8',
};

function getTierColor(tier) {
  return TIER_COLORS[(tier || 'gold').toLowerCase()] ?? '#F59E0B';
}

export default function DriverOnlineDashboardScreen({ navigation }) {
  const { driver } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [earnings, setEarnings] = useState({ today: null, trips: 0, onlineMinutes: 0 });

  useFocusEffect(
    useCallback(() => {
      client.get('/drivers/earnings/today').then(r => {
        setEarnings({
          today:          r.data?.today_earnings  ?? null,
          trips:          r.data?.today_trips     ?? 0,
          onlineMinutes:  r.data?.online_minutes  ?? 0,
        });
      }).catch(() => {});
    }, [driver])
  );

  const handleGoOnline = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    navigation.navigate('PaymentPlans');
  };

  return (
    <View style={s.root}>
      <StatusBar style="dark" />

      {/* ─── HEADER ─── */}
      <View style={[s.header, { paddingTop: Math.max(insets.top, 24) }]}>
        <View style={s.headerLeft}>
          <TouchableOpacity 
            style={s.avatarBorder} 
            onPress={() => setSidebarOpen(true)}
            activeOpacity={0.8}
          >
            <View style={s.avatarFallback}>
              {driver?.photo_url ? (
                <Image source={{ uri: driver.photo_url }} style={s.avatar} />
              ) : (
                <Feather name="user" size={24} color={PURPLE} />
              )}
            </View>
          </TouchableOpacity>
          <View style={s.headerTextCol}>
            <Text style={s.greeting}>Hi, {driver?.first_name || 'Driver'} 👋</Text>
            <Text style={[s.tier, { color: getTierColor(driver?.tier) }]}>
              {(driver?.tier || 'GOLD').toUpperCase()} TIER DRIVER
            </Text>
          </View>
        </View>
        
        <TouchableOpacity style={s.bellBtn} activeOpacity={0.8} onPress={() => navigation.navigate('Notifications')}>
          <Feather name="bell" size={20} color={PURPLE} />
        </TouchableOpacity>
      </View>

      {/* ─── MAIN CONTENT ─── */}
      <ScrollView 
        contentContainerStyle={[s.scrollContent, { paddingBottom: NAV_HEIGHT + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Earnings Summary Card */}
        <View style={s.earningsCard}>
          <View style={s.earningsTop}>
            <View style={s.earningsTextCol}>
            <Text style={s.earningsLabel}>Today's Earnings</Text>
            {earnings.today === null ? (
              <View style={s.earningsSkeleton} />
            ) : (
              <Text style={s.earningsAmount}>
                ₹{(earnings.today || 0).toLocaleString('en-IN')}
              </Text>
            )}
          </View>
            <View style={s.graphPlaceholder}>
              <MaterialCommunityIcons name="chart-bell-curve-cumulative" size={54} color={PURPLE} style={{ opacity: 0.6 }} />
            </View>
          </View>

          <View style={s.earningsDivider} />

          <View style={s.earningsStatsRow}>
            <View style={s.statBox}>
              <Text style={s.statLabel}>Completed</Text>
              <Text style={s.statValue}>{earnings.trips} Rides</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statLabel}>Online Time</Text>
              <Text style={s.statValue}>
                {earnings.onlineMinutes > 0
                  ? `${Math.floor(earnings.onlineMinutes / 60)}h ${earnings.onlineMinutes % 60}m`
                  : '—'}
              </Text>
            </View>
            <TouchableOpacity style={s.detailsBtn} onPress={() => navigation.navigate('MyEarnings')}>
              <Text style={s.detailsText}>Details</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Go Online Section */}
        <View style={s.goOnlineSection}>
          <View style={s.goOnlineGlow} />
          <TouchableOpacity 
            style={s.goOnlineBtn} 
            onPress={handleGoOnline}
            activeOpacity={0.8}
          >
            <Feather name="power" size={44} color="#FFF" />
            <Text style={s.goOnlineText}>GO ONLINE</Text>
          </TouchableOpacity>

          <View style={s.offlineTextCol}>
            <Text style={s.offlineTitle}>You are currently offline</Text>
            <Text style={s.offlineSub}>Go online to start receiving ride requests</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={s.quickActionsRow}>
          <TouchableOpacity style={s.qaCard} onPress={() => navigation.navigate('RideHistory')}>
            <View style={s.qaIconWrap}>
               <Feather name="truck" size={18} color={PURPLE} />
            </View>
            <Text style={s.qaLabel}>My Rides</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.qaCard} onPress={() => navigation.navigate('MyEarnings')}>
            <View style={s.qaIconWrap}>
               <MaterialIcons name="account-balance-wallet" size={20} color={PURPLE} />
            </View>
            <Text style={s.qaLabel}>Earnings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.qaCard} onPress={() => navigation.navigate('PaymentPlans')}>
            <View style={s.qaIconWrap}>
               <Feather name="tag" size={18} color={PURPLE} />
            </View>
            <Text style={s.qaLabel}>Subscription</Text>
          </TouchableOpacity>
        </View>

        {/* Demand Zones Card — replaces fake map hint placeholder */}
        <View style={s.demandCard}>
          <View style={s.demandHeader}>
            <Feather name="zap" size={14} color="#BEA3D8" />
            <Text style={s.demandTitle}>Demand Zones Near You</Text>
          </View>
          <View style={s.demandZonesRow}>
            <View style={s.demandZone}>
              <View style={[s.demandDot, { backgroundColor: '#EF4444' }]} />
              <Text style={s.demandZoneLabel}>High</Text>
            </View>
            <View style={s.demandZone}>
              <View style={[s.demandDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={s.demandZoneLabel}>Medium</Text>
            </View>
            <View style={s.demandZone}>
              <View style={[s.demandDot, { backgroundColor: '#10B981' }]} />
              <Text style={s.demandZoneLabel}>Low</Text>
            </View>
          </View>
          <View style={s.demandBarsRow}>
            <View style={[s.demandBar, { flex: 0.55, backgroundColor: '#FEE2E2' }]}>
              <View style={[s.demandBarFill, { flex: 1, backgroundColor: '#EF4444' }]} />
              <Text style={s.demandBarLabel}>Airport Road</Text>
            </View>
            <View style={[s.demandBar, { flex: 0.3, backgroundColor: '#FEF3C7' }]}>
              <View style={[s.demandBarFill, { flex: 1, backgroundColor: '#F59E0B' }]} />
              <Text style={s.demandBarLabel}>City Centre</Text>
            </View>
            <View style={[s.demandBar, { flex: 0.15, backgroundColor: '#ECFDF5' }]}>
              <View style={[s.demandBarFill, { flex: 1, backgroundColor: '#10B981' }]} />
              <Text style={s.demandBarLabel}>Suburbs</Text>
            </View>
          </View>
          <Text style={s.demandFooter}>Go online to see live surge zones on the map</Text>
        </View>



      </ScrollView>

      {/* ── Bottom Nav ── */}
      <BottomNavBar navigation={navigation} activeTab="home" />

      {/* ── Sidebar ── */}
      {sidebarOpen && (
        <DriverSidebarMenu
          navigation={navigation}
          onClose={() => setSidebarOpen(false)}
          activeRoute="DriverOnlineDashboard"
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.02)',
    zIndex: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBorder: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, borderColor: 'rgba(127, 25, 230, 0.2)',
    justifyContent: 'center', alignItems: 'center'
  },
  avatarFallback: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(127, 25, 230, 0.05)',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
  },
  avatar: { width: '100%', height: '100%' },
  headerTextCol: { gap: 2 },
  greeting: { fontFamily: 'Inter', fontWeight: '700', fontSize: 18, color: DARK },
  tier: { fontFamily: 'Inter', fontWeight: '500', fontSize: 12, color: PURPLE, letterSpacing: 0.6, textTransform: 'uppercase' },
  bellBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: PURPLE_LIGHT,
    justifyContent: 'center', alignItems: 'center',
  },

  // Scroll content
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, gap: 24 },

  // Earnings Card
  earningsCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1, borderColor: 'rgba(127, 25, 230, 0.05)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 15, elevation: 6,
  },
  earningsTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earningsTextCol: { gap: 4 },
  earningsLabel: { fontSize: 14, fontWeight: '500', color: 'rgba(127, 25, 230, 0.7)' },
  earningsAmount: { fontSize: 32, fontWeight: '700', color: DARK, letterSpacing: -1 },
  earningsSkeleton: { width: 120, height: 36, backgroundColor: '#F1F5F9', borderRadius: 8, marginTop: 4 },
  graphPlaceholder: { width: 96, height: 48, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 10 },
  
  earningsDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },
  
  earningsStatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statBox: { gap: 4 },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: '400' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  detailsBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: PURPLE_LIGHT, borderRadius: 9999,
  },
  detailsText: { fontSize: 12, fontWeight: '600', color: PURPLE },

  // Go Online Section
  goOnlineSection: { alignItems: 'center', marginVertical: 12, gap: 24, position: 'relative' },
  goOnlineGlow: {
    position: 'absolute', top: 0, left: '50%',
    width: 160, height: 160, marginLeft: -80,
    borderRadius: 80, backgroundColor: 'rgba(127, 25, 230, 0.2)',
    shadowColor: '#7F19E6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 8,
  },
  goOnlineBtn: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: PURPLE,
    justifyContent: 'center', alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 6,
  },
  goOnlineText: { fontSize: 16, fontWeight: '700', color: '#FFF', letterSpacing: 1.5, marginTop: -4 },
  offlineTextCol: { alignItems: 'center', gap: 6 },
  offlineTitle: { fontSize: 18, fontWeight: '600', color: '#64748B' },
  offlineSub: { fontSize: 13, color: '#94A3B8' },

  // Quick Actions
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  qaCard: {
    flex: 1, height: 90,
    backgroundColor: '#FFF', borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(127, 25, 230, 0.05)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  qaIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: PURPLE_LIGHT,
    justifyContent: 'center', alignItems: 'center',
  },
  qaLabel: { fontSize: 12, fontWeight: '600', color: '#334155' },

  // Demand Zones Card
  demandCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1, borderColor: 'rgba(127, 25, 230, 0.06)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    gap: 14,
  },
  demandHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  demandTitle: { fontSize: 13, fontWeight: '700', color: '#1E1B2E' },
  demandZonesRow: { flexDirection: 'row', gap: 16 },
  demandZone: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  demandDot: { width: 8, height: 8, borderRadius: 4 },
  demandZoneLabel: { fontSize: 12, fontWeight: '500', color: '#64748B' },
  demandBarsRow: { flexDirection: 'row', gap: 6, height: 48, alignItems: 'flex-end' },
  demandBar: { borderRadius: 8, overflow: 'hidden', justifyContent: 'flex-end' },
  demandBarFill: { borderRadius: 8 },
  demandBarLabel: { fontSize: 9, fontWeight: '600', color: '#64748B', textAlign: 'center', marginTop: 4 },
  demandFooter: { fontSize: 11, color: '#94A3B8', textAlign: 'center', fontStyle: 'italic' },


});
