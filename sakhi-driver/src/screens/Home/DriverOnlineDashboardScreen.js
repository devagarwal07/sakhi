import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Alert, Dimensions, Image, ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { stopLocationTracking } from '../../services/locationTask';

const SCREEN_W = Dimensions.get('window').width;

// ── Bottom Tab Item ────────────────────────────────────────────────────────────
function TabItem({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity style={tab.item} onPress={onPress} activeOpacity={0.7}>
      <View style={[tab.iconWrap, active && tab.iconWrapActive]}>
        <Image source={icon} style={[tab.icon, active && tab.iconActive]} resizeMode="contain" />
      </View>
      <Text style={[tab.label, active && tab.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
const tab = StyleSheet.create({
  item:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  iconWrap:       { paddingHorizontal: 16, paddingVertical: 4, borderRadius: 12 },
  iconWrapActive: { backgroundColor: '#F5F0FF' },
  icon:           { width: 22, height: 22, tintColor: '#9CA3AF' },
  iconActive:     { tintColor: '#BEA3D8' },
  label: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.5,
    textTransform: 'uppercase', color: '#9CA3AF', lineHeight: 14,
  },
  labelActive: { color: '#BEA3D8' },
});

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function DriverHomeScreen({ navigation }) {
  const { driver, updateDriver } = useAuth();

  const [isOnline,       setIsOnline]       = useState(driver?.is_online ?? false);
  const [earnings,       setEarnings]       = useState({ today: 340, trips: 5, rating: 4.9 });
  const [statusLoading,  setStatusLoading]  = useState(false);
  const [countdown,      setCountdown]      = useState(25 * 60); // 25:00

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the driver icon
  useEffect(() => {
    if (!isOnline) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isOnline]);

  // Countdown timer for subscription banner
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useFocusEffect(
    useCallback(() => {
      setIsOnline(driver?.is_online ?? false);
      // Fetch fresh earnings
      client.get('/drivers/earnings/today').then(r => {
        setEarnings({
          today:  r.data?.today_earnings ?? 340,
          trips:  r.data?.today_trips    ?? 5,
          rating: r.data?.rating         ?? 4.9,
        });
      }).catch(() => {});
    }, [driver])
  );

  // Toggle offline → online goes through PaymentPlans
  const handleToggle = async () => {
    if (!isOnline) {
      navigation.navigate('PaymentPlans');
      return;
    }
    try {
      setStatusLoading(true);
      await client.post('/drivers/status', { is_online: false });
      updateDriver({ is_online: false });
      setIsOnline(false);
      await stopLocationTracking();
    } catch {
      Alert.alert('Error', 'Could not update status. Try again.');
    } finally {
      setStatusLoading(false);
    }
  };

  const activeTab = 'home';

  return (
    <View style={s.root}>
      <StatusBar style="dark" />

      {/* ════════════════════════════════════════════
          MAP SECTION  (top 55%, h: 464)
          bg: #E8E1F5  (light lavender map)
      ════════════════════════════════════════════ */}
      <View style={s.mapSection}>

        {/* Map background: #E8E1F5 */}
        <View style={s.mapBg}>
          {/* Faint road grid pattern using lines */}
          <View style={s.mapGrid}>
            {[0.2, 0.4, 0.6, 0.8].map(v => (
              <View key={`h${v}`} style={[s.gridLineH, { top: `${v * 100}%` }]} />
            ))}
            {[0.2, 0.4, 0.6, 0.8].map(v => (
              <View key={`v${v}`} style={[s.gridLineV, { left: `${v * 100}%` }]} />
            ))}
            {/* Diagonal/ring roads */}
            <View style={s.ringRoad1} />
            <View style={s.ringRoad2} />
          </View>
        </View>

        {/* Gradient overlay: rgba(245,240,255,0) → rgba(245,240,255,0.4) */}
        <View style={s.mapGradient} />

        {/* Driver Icon Center Position */}
        <View style={s.driverIconContainer}>
          {/* Glow Pulse: 96×96, rgba(190,163,216,0.1), blur */}
          <Animated.View style={[s.glowPulse, { transform: [{ scale: pulseAnim }] }]} />

          {/* White circle 64×64, border 2px rgba(190,163,216,0.2), shadow */}
          <View style={s.driverCircle}>
            {/* Car icon: 33×30, #BEA3D8 */}
            <Image
              source={require('../../../assets/car.png')}
              style={s.driverCarIcon}
              resizeMode="contain"
            />
          </View>

          {/* "YOU" label: bg #BEA3D8, radius 9999, padding 4/12 */}
          <View style={s.youLabelWrap}>
            <View style={s.youLabelBg}>
              {/* Text: 10px 700w #FFF, uppercase, letter-spacing 1 */}
              <Text style={s.youLabelText}>YOU</Text>
            </View>
          </View>
        </View>

      </View>

      {/* ════════════════════════════════════════════
          TOP APP BAR (absolute)
          padding: 24, h: 96
          row justify-between
      ════════════════════════════════════════════ */}
      <View style={s.topBar}>
        {/* Hamburger button: 48×48 white circle, shadow */}
        <TouchableOpacity style={s.hamburgerBtn} activeOpacity={0.8}>
          {/* Icon: 18×12, #BEA3D8 (3 bars) */}
          <View style={s.hamburgerIcon}>
            <View style={s.hamburgerLine} />
            <View style={s.hamburgerLine} />
            <View style={s.hamburgerLine} />
          </View>
        </TouchableOpacity>

        {/* Earnings chip: white pill, padding 8/16, shadow, radius 16 */}
        <View style={s.earningsChip}>
          {/* "Today:": 12px 500w #4A4455, letter-spacing -0.3 */}
          <Text style={s.earningsChipLabel}>Today:</Text>
          {/* "₹340": 14px 700w #BEA3D8, letter-spacing -0.35 */}
          <Text style={s.earningsChipValue}>₹{earnings.today}</Text>
        </View>
      </View>

      {/* ════════════════════════════════════════════
          BOTTOM SHEET (45%, h: 379.8)
          bg: #FFF, radius: 32/32/0/0
          shadow: 0 16 32 rgba(124,58,237,0.08)
      ════════════════════════════════════════════ */}
      <View style={s.bottomSheet}>

        {/* Handle: 48×4, #E5E0EF, radius 9999, absolute center top:16 */}
        <View style={s.handle} />

        <ScrollView contentContainerStyle={s.bottomSheetScroll} showsVerticalScrollIndicator={false}>
          {/* ── STATUS TOGGLE SECTION ── */}
          <View style={s.toggleSection}>
          {/* Toggle pill: bg #F6F1FF, w:280, h:64, radius 9999 */}
          <View style={s.togglePill}>
            {/* Offline thumb (left when offline): rgba(204,195,216,0.2) */}
            <View style={[s.toggleThumb, isOnline && s.toggleThumbRight]} />

            <TouchableOpacity
              style={s.toggleOption}
              onPress={() => !isOnline ? null : handleToggle()}
              activeOpacity={0.8}
            >
              {/* OFFLINE: 14px 700w #4A4455 when active */}
              <Text style={[s.toggleText, !isOnline && s.toggleTextActive]}>OFFLINE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.toggleOption}
              onPress={() => isOnline ? null : handleToggle()}
              activeOpacity={0.8}
              disabled={statusLoading}
            >
              {/* ONLINE: 14px 700w rgba(74,68,85,0.4) when inactive */}
              <Text style={[s.toggleText, isOnline && s.toggleTextActive, !isOnline && s.toggleTextDim]}>
                ONLINE
              </Text>
            </TouchableOpacity>
          </View>

          {/* Status heading + subtitle */}
          {/* "You are Offline/Online": 20px 700w #1C1A25, letter-spacing -0.5 */}
          <Text style={s.statusHeading}>
            {isOnline ? 'You are Online' : 'You are Offline'}
          </Text>
          {/* Subtitle: 14px 400w #4A4455 */}
          <Text style={s.statusSubtitle}>
            {isOnline ? 'Looking for ride requests...' : 'Go online to receive rides'}
          </Text>
        </View>

        {/* ── STATS ROW ── */}
        <View style={s.statsRow}>
          {/* ₹340 TODAY */}
          <View style={s.statCard}>
            <Text style={s.statValue}>₹{earnings.today}</Text>
            <Text style={s.statLabel}>TODAY</Text>
          </View>
          {/* 5 TRIPS */}
          <View style={s.statCard}>
            <Text style={s.statValue}>{earnings.trips}</Text>
            <Text style={s.statLabel}>TRIPS</Text>
          </View>
          {/* 4.9★ RATING */}
          <View style={s.statCard}>
            <View style={s.statRatingRow}>
              <Text style={s.statValue}>{earnings.rating}</Text>
              <Text style={s.statStar}>★</Text>
            </View>
            <Text style={s.statLabel}>RATING</Text>
          </View>
        </View>

        {/* ── SUBSCRIPTION BANNER ──
            bg #F5F0FF, border 1px rgba(190,163,216,0.05), radius 16, padding 12/16 */}
        <View style={s.subBanner}>
          {/* Lock icon: #7D3D00 */}
          <Text style={s.subIcon}>🔒</Text>
          {/* Text stack */}
          <View style={s.subTextStack}>
            {/* Title: 12px 700w #7D3D00, letter-spacing -0.3 */}
            <Text style={s.subTitle}>Subscription Ride in {formatCountdown(countdown)} mins</Text>
            {/* Subtitle: 10px 400w rgba(74,68,85,0.7) */}
            <Text style={s.subSubtitle}>Complete payment to unlock priority rides</Text>
          </View>
          {/* Countdown: 12px 900w #7D3D00 */}
          <Text style={s.subCountdown}>{formatCountdown(countdown)}</Text>
        </View>

        </ScrollView>
      </View>

      {/* ════════════════════════════════════════════
          BOTTOM NAV (absolute)
          h: 77, padding: 8 33.06 24 33.05, gap: 34.1
          bg: rgba(255,255,255,0.8)
          radius: 16/16/0/0
      ════════════════════════════════════════════ */}
      <View style={s.nav}>
        <TabItem
          icon={require('../../../assets/home.png')}
          label="HOME"
          active={activeTab === 'home'}
          onPress={() => {}}
        />
        <TabItem
          icon={require('../../../assets/earning.png')}
          label="EARNINGS"
          active={activeTab === 'earnings'}
          onPress={() => navigation.navigate('MyEarnings')}
        />
        <TabItem
          icon={require('../../../assets/wallet.png')}
          label="WALLET"
          active={activeTab === 'wallet'}
          onPress={() => navigation.navigate('TransactionHistory')}
        />
        <TabItem
          icon={require('../../../assets/profile.png')}
          label="ACCOUNT"
          active={activeTab === 'account'}
          onPress={() => navigation.navigate('MyProfile')}
        />
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  /* Root: #F5F0FF fill */
  root: { flex: 1, backgroundColor: '#F5F0FF' },

  /* ── MAP SECTION: top 55%, bg #E8E1F5 ── */
  mapSection: {
    width: '100%',
    height: 464,
    backgroundColor: '#E8E1F5',
    overflow: 'hidden',
    position: 'relative',
  },

  /* Map bg colour */
  mapBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#E8E1F5' },

  /* Faint road grid */
  mapGrid: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  gridLineH: {
    position: 'absolute', left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(190,163,216,0.25)',
  },
  gridLineV: {
    position: 'absolute', top: 0, bottom: 0, width: 1,
    backgroundColor: 'rgba(190,163,216,0.25)',
  },
  ringRoad1: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    left: '50%', top: '50%',
    marginLeft: -100, marginTop: -100,
    borderWidth: 1, borderColor: 'rgba(190,163,216,0.35)',
  },
  ringRoad2: {
    position: 'absolute',
    width: 320, height: 320, borderRadius: 160,
    left: '50%', top: '50%',
    marginLeft: -160, marginTop: -160,
    borderWidth: 1, borderColor: 'rgba(190,163,216,0.20)',
  },

  /* Gradient overlay: transparent → rgba(245,240,255,0.4) */
  mapGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(245,240,255,0.25)',
  },

  /* Driver icon: center of map */
  driverIconContainer: {
    position: 'absolute',
    /* left: 41.79%, right: 41.79%, top: 39.77%, bottom: 39.77% */
    left: '50%', top: '50%',
    marginLeft: -32, marginTop: -47,
    alignItems: 'center',
  },
  /* Glow pulse: 96×96, rgba(190,163,216,0.1) */
  glowPulse: {
    position: 'absolute',
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(190,163,216,0.10)',
    left: -16, top: 0,
    zIndex: 0,
  },
  /* White circle: 64×64, border 2px rgba(190,163,216,0.2), shadow */
  driverCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 2, borderColor: 'rgba(190,163,216,0.20)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10, shadowRadius: 15,
    elevation: 8, zIndex: 2,
  },
  /* Car icon: 33×30, tint #BEA3D8 */
  driverCarIcon: { width: 33, height: 30, tintColor: '#BEA3D8' },

  /* "YOU" label margin: padding-top 8 */
  youLabelWrap: { paddingTop: 8, zIndex: 1 },
  /* "YOU" pill: bg #BEA3D8, radius 9999, padding 4/12, shadow */
  youLabelBg: {
    backgroundColor: '#BEA3D8', borderRadius: 9999,
    paddingHorizontal: 12, paddingVertical: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 6, elevation: 3,
  },
  /* Text: 10px 700w #FFF, uppercase, letter-spacing 1 */
  youLabelText: {
    fontSize: 10, fontWeight: '700', color: '#FFFFFF',
    textTransform: 'uppercase', letterSpacing: 1, lineHeight: 15,
  },

  /* ── TOP BAR: absolute, h:96, padding:24, row justify-between ── */
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 96,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 24, zIndex: 10,
  },
  /* Hamburger: 48×48 white circle, shadow */
  hamburgerBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  /* Hamburger icon: 18×12, 3 bars */
  hamburgerIcon: { width: 18, height: 12, gap: 4, justifyContent: 'space-between' },
  hamburgerLine: { width: 18, height: 2, backgroundColor: '#BEA3D8', borderRadius: 1 },

  /* Earnings chip: padding 8/16, bg #FFF, radius 16, shadow */
  earningsChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16, height: 36,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  /* "Today:": 12px 500w #4A4455, letter-spacing -0.3 */
  earningsChipLabel: { fontSize: 12, fontWeight: '500', color: '#4A4455', letterSpacing: -0.3, lineHeight: 16 },
  /* "₹340": 14px 700w #BEA3D8, letter-spacing -0.35 */
  earningsChipValue: { fontSize: 14, fontWeight: '700', color: '#BEA3D8', letterSpacing: -0.35, lineHeight: 20 },

  /* ── BOTTOM SHEET: h:~380, white, radius 32/32/0/0 ── */
  bottomSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08, shadowRadius: 16,
    elevation: 10,
    position: 'relative',
  },

  /* Scrollable area inside bottom sheet */
  bottomSheetScroll: {
    paddingTop: 40,
    paddingHorizontal: 24,
    paddingBottom: 100, // Space for Bottom Nav
    gap: 24,
  },

  /* Handle: 48×4, #E5E0EF, radius 9999, absolute center top:16 */
  handle: {
    position: 'absolute', top: 12,
    zIndex: 10,
    width: 48, height: 4, borderRadius: 9999,
    backgroundColor: '#E5E0EF',
    alignSelf: 'center', left: '50%', marginLeft: -24,
  },

  /* ── STATUS TOGGLE SECTION: col, align center, gap 16 ── */
  toggleSection: { alignItems: 'center', gap: 16 },

  /* Toggle pill: w:280, h:64, bg #F6F1FF, radius 9999 */
  togglePill: {
    width: 280, height: 64,
    backgroundColor: '#F6F1FF',
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  /* Thumb: absolute, left side for offline, right for online */
  toggleThumb: {
    position: 'absolute',
    width: '50%', height: 52,
    left: '2.14%', top: 6,
    backgroundColor: 'rgba(204,195,216,0.20)',
    borderRadius: 9999,
  },
  toggleThumbRight: { left: '47.86%' },

  /* Each option: flex 1, centered */
  toggleOption: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 64, zIndex: 1 },
  /* Text: 14px 700w */
  toggleText:       { fontSize: 14, fontWeight: '700', color: 'rgba(74,68,85,0.4)', lineHeight: 20 },
  toggleTextActive: { color: '#4A4455' },
  toggleTextDim:    { color: 'rgba(74,68,85,0.4)' },

  /* Status heading: 20px 700w #1C1A25, letter-spacing -0.5 */
  statusHeading: { fontSize: 20, fontWeight: '700', color: '#1C1A25', letterSpacing: -0.5, lineHeight: 28 },
  /* Subtitle: 14px 400w #4A4455 */
  statusSubtitle: { fontSize: 14, fontWeight: '400', color: '#4A4455', lineHeight: 20 },

  /* ── STATS ROW: row, gap between cards ── */
  statsRow: { flexDirection: 'row', gap: 8 },
  /* Each stat card: flex 1, bg #F6F1FF, radius 16, padding 12, h:71, col center */
  statCard: {
    flex: 1, height: 71,
    backgroundColor: '#F6F1FF',
    borderRadius: 16, padding: 12,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  /* Value: 18px 900w #BEA3D8, letter-spacing -0.45 */
  statValue: { fontSize: 18, fontWeight: '900', color: '#BEA3D8', letterSpacing: -0.45, lineHeight: 28 },
  statRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  /* Label: 10px 700w #4A4455, uppercase, letter-spacing 0.5 */
  statLabel: { fontSize: 10, fontWeight: '700', color: '#4A4455', textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 15 },
  statStar:  { fontSize: 11, color: '#BEA3D8', lineHeight: 16 },

  /* ── SUBSCRIPTION BANNER:
      row, align center, padding 12/16, gap 12
      bg #F5F0FF, border 1px rgba(190,163,216,0.05), radius 16, h:57 ── */
  subBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#F5F0FF',
    borderWidth: 1, borderColor: 'rgba(190,163,216,0.05)',
    borderRadius: 16, height: 57,
  },
  subIcon:  { fontSize: 18 },
  subTextStack: { flex: 1, gap: 2 },
  /* Title: 12px 700w #7D3D00, letter-spacing -0.3 */
  subTitle:    { fontSize: 12, fontWeight: '700', color: '#7D3D00', letterSpacing: -0.3, lineHeight: 16 },
  /* Subtitle: 10px 400w rgba(74,68,85,0.7) */
  subSubtitle: { fontSize: 10, fontWeight: '400', color: 'rgba(74,68,85,0.7)', lineHeight: 15 },
  /* Countdown: 12px 900w #7D3D00 */
  subCountdown: { fontSize: 12, fontWeight: '900', color: '#7D3D00', lineHeight: 16 },

  /* ── NAV: absolute, bottom:-3, h:77
      row, padding: 8 33.06 24 33.05, gap 34.1
      bg: rgba(255,255,255,0.8), radius 16/16/0/0
      shadow: 0 -16 32 rgba(124,58,237,0.08) ── */
  nav: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 77,
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 33, paddingRight: 33, paddingTop: 8, paddingBottom: 24,
    gap: 34,
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: -16 },
    shadowOpacity: 0.08, shadowRadius: 32,
    elevation: 10, zIndex: 20,
  },
});
