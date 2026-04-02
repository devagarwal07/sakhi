import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Alert, Dimensions, Image, ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { stopLocationTracking } from '../../services/locationTask';
import BottomNavBar, { NAV_HEIGHT } from '../../components/BottomNavBar';
import DriverSidebarMenu from '../../components/DriverSidebarMenu';

const SCREEN_W = Dimensions.get('window').width;

// ─── Design Tokens ────────────────────────────────────────────────────────────
const PURPLE  = '#BEA3D8';
const DEEP    = '#7C3AED';
const VIOLET  = '#630ED4';
const DARK    = '#1C1A25';
const MID     = '#4A4455';
const MUTED   = '#7B7487';
const WHITE   = '#FFFFFF';
const BG      = '#F5F0FF';
const GREEN   = '#059669';
const AMBER   = '#F59E0B';

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ value, label, unit, highlight }) {
  return (
    <View style={[sc.card, highlight && sc.cardHighlight]}>
      <View style={sc.valueRow}>
        {unit && <Text style={sc.unit}>{unit}</Text>}
        <Text style={[sc.value, highlight && sc.valueHighlight]}>{value}</Text>
      </View>
      <Text style={sc.label}>{label}</Text>
    </View>
  );
}
const sc = StyleSheet.create({
  card: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 8,
    backgroundColor: BG, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  cardHighlight: { backgroundColor: PURPLE + '22', borderWidth: 1, borderColor: PURPLE + '44' },
  valueRow:      { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  unit:          { fontSize: 13, fontWeight: '700', color: PURPLE, marginBottom: 2 },
  value:         { fontSize: 20, fontWeight: '900', color: DARK,   letterSpacing: -0.8, lineHeight: 28 },
  valueHighlight:{ color: PURPLE },
  label:         { fontSize: 9,  fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6 },
});

// ─── Online Status Card ── Premium dark fintech card ────────────────────────
function OnlineStatusCard({ earnings, onGoOffline, statusLoading, countdown }) {
  const glowAnim  = useRef(new Animated.Value(0.5)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scanAnim  = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    // Ambient glow breathe
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 1800, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
    // Entrance
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, damping: 16, stiffness: 160, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    // Scan line sweep
    Animated.loop(
      Animated.timing(scanAnim, { toValue: 1, duration: 3000, useNativeDriver: true })
    ).start();
  }, []);

  const fmtTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}h ${m}m` : `${m}:${s}`;
  };

  return (
    <Animated.View style={[card.root, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

      {/* ── Animated ambient glow corners ── */}
      <Animated.View style={[card.glowTL, { opacity: glowAnim }]} />
      <Animated.View style={[card.glowBR, { opacity: glowAnim }]} />

      {/* ── TOP ROW: badge + go-offline ── */}
      <View style={card.topRow}>
        <View style={card.liveBadge}>
          <View style={card.liveDot} />
          <Text style={card.liveBadgeText}>LIVE NOW</Text>
        </View>
        <TouchableOpacity
          style={card.offlineBtn}
          onPress={onGoOffline}
          disabled={statusLoading}
          activeOpacity={0.7}
        >
          <Text style={card.offlineBtnText}>{statusLoading ? '···' : 'Go Offline'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── BIG EARNINGS DISPLAY ── */}
      <View style={card.earningsBlock}>
        <Text style={card.earningsCaption}>TODAY'S EARNINGS</Text>
        <View style={card.earningsRow}>
          <Text style={card.earningsCurrency}>₹</Text>
          <Text style={card.earningsAmount}>{earnings.today}</Text>
        </View>
      </View>

      {/* ── HORIZONTAL DIVIDER with glow ── */}
      <View style={card.glowDivider}>
        <View style={card.glowDividerLine} />
        <View style={card.glowDividerDot} />
        <View style={card.glowDividerLine} />
      </View>

      {/* ── STATS STRIP ── */}
      <View style={card.statsStrip}>
        <View style={card.statItem}>
          <Text style={card.statVal}>{earnings.trips}</Text>
          <Text style={card.statLbl}>TRIPS</Text>
        </View>
        <View style={card.statSep} />
        <View style={card.statItem}>
          <Text style={card.statVal}>{Number(earnings.rating).toFixed(1)}</Text>
          <Text style={card.statLbl}>RATING</Text>
        </View>
        <View style={card.statSep} />
        <View style={card.statItem}>
          <Text style={card.statVal}>{fmtTime(countdown)}</Text>
          <Text style={card.statLbl}>SESSION</Text>
        </View>
      </View>

      {/* ── INFO ROW ── */}
      <View style={card.infoRow}>
        <View style={card.infoPill}>
          <Text style={card.infoPillIcon}>📡</Text>
          <Text style={card.infoPillText}>GPS · Connected</Text>
        </View>
        <View style={card.infoPill}>
          <Text style={card.infoPillIcon}>🔍</Text>
          <Text style={card.infoPillText}>Searching rides</Text>
        </View>
      </View>

    </Animated.View>
  );
}

const card = StyleSheet.create({
  root: {
    backgroundColor: '#1C1A25',
    borderRadius: 24,
    padding: 22,
    gap: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 32,
    elevation: 12,
  },

  // Ambient glow corners
  glowTL: {
    position: 'absolute', top: -30, left: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(16,185,129,0.18)',
  },
  glowBR: {
    position: 'absolute', bottom: -40, right: -20,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(190,163,216,0.12)',
  },

  // Top row
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
  },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10B981' },
  liveBadgeText: {
    fontSize: 10, fontWeight: '800', color: '#10B981',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  offlineBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  offlineBtnText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.2 },

  // Big earnings
  earningsBlock: { gap: 4 },
  earningsCaption: {
    fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.35)',
    letterSpacing: 2, textTransform: 'uppercase',
  },
  earningsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 2 },
  earningsCurrency: {
    fontSize: 24, fontWeight: '600', color: 'rgba(255,255,255,0.6)',
    marginTop: 6, lineHeight: 40,
  },
  earningsAmount: {
    fontSize: 56, fontWeight: '900', color: '#FFFFFF',
    letterSpacing: -3, lineHeight: 64,
  },

  // Glow divider
  glowDivider: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  glowDividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  glowDividerDot:  { width: 4, height: 4, borderRadius: 2, backgroundColor: '#10B981' },

  // Stats strip
  statsStrip: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem:   { alignItems: 'center', gap: 3 },
  statVal:    { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5, lineHeight: 24 },
  statLbl:    { fontSize: 8,  fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, textTransform: 'uppercase' },
  statSep:    { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.10)' },

  // Info pills
  infoRow: { flexDirection: 'row', gap: 8 },
  infoPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  infoPillIcon: { fontSize: 12 },
  infoPillText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.1 },
});

// ─── Offline Card ─────────────────────────────────────────────────────────────
function OfflineCard({ onGoOnline }) {
  return (
    <View style={off.wrap}>
      <View style={off.left}>
        <View style={off.iconBox}>
          <Text style={{ fontSize: 22 }}>🔴</Text>
        </View>
        <View>
          <Text style={off.title}>You're Offline</Text>
          <Text style={off.sub}>Start earning — go online now</Text>
        </View>
      </View>
      <TouchableOpacity style={off.btn} onPress={onGoOnline} activeOpacity={0.85}>
        <Text style={off.btnText}>Go Online</Text>
      </TouchableOpacity>
    </View>
  );
}
const off = StyleSheet.create({
  wrap: {
    backgroundColor: WHITE, borderRadius: 20, padding: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1.5, borderColor: 'rgba(190,163,216,0.2)',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 4,
  },
  left:    { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  iconBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '700', color: DARK, lineHeight: 22 },
  sub:   { fontSize: 12, fontWeight: '400', color: MUTED, lineHeight: 18 },
  btn: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, backgroundColor: PURPLE,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 4,
  },
  btnText: { fontSize: 13, fontWeight: '700', color: WHITE },
});

// ─── Quick Actions Grid ───────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { emoji: '💰', label: 'Earnings',   route: 'MyEarnings'       },
  { emoji: '🛺', label: 'Ride History', route: 'RideHistory'   },
  { emoji: '🔔', label: 'Notifications', route: 'Notifications'},
  { emoji: '📋', label: 'My Docs',    route: 'MyDocuments'      },
];
function QuickActions({ navigation }) {
  return (
    <View style={qa.section}>
      <Text style={qa.heading}>QUICK ACTIONS</Text>
      <View style={qa.grid}>
        {QUICK_ACTIONS.map((a) => (
          <TouchableOpacity key={a.label} style={qa.card} onPress={() => navigation.navigate(a.route)} activeOpacity={0.75}>
            <Text style={qa.emoji}>{a.emoji}</Text>
            <Text style={qa.label}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
const qa = StyleSheet.create({
  section: { gap: 12 },
  heading: {
    fontSize: 10, fontWeight: '700', color: MUTED,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  grid:  { flexDirection: 'row', gap: 8 },
  card: {
    flex: 1, backgroundColor: WHITE,
    borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: BG,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  emoji: { fontSize: 20 },
  label: { fontSize: 10, fontWeight: '600', color: MID, textAlign: 'center', lineHeight: 14 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DriverHomeScreen({ navigation }) {
  const { driver, updateDriver } = useAuth();
  const insets = useSafeAreaInsets();

  const [isOnline,      setIsOnline]      = useState(driver?.is_online ?? false);
  const [earnings,      setEarnings]      = useState({ today: 340, trips: 5, rating: 4.9 });
  const [statusLoading, setStatusLoading] = useState(false);
  const [sessionSecs,   setSessionSecs]   = useState(0);   // how long online this session
  const [sidebarOpen,   setSidebarOpen]   = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the map car icon
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

  // Session timer — reset when toggling online
  useEffect(() => {
    if (!isOnline) { setSessionSecs(0); return; }
    const t = setInterval(() => setSessionSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isOnline]);

  useFocusEffect(
    useCallback(() => {
      setIsOnline(driver?.is_online ?? false);
      client.get('/drivers/earnings/today').then(r => {
        setEarnings({
          today:  r.data?.today_earnings ?? 340,
          trips:  r.data?.today_trips    ?? 5,
          rating: r.data?.rating         ?? 4.9,
        });
      }).catch(() => {});
    }, [driver])
  );

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

  return (
    <View style={s.root}>
      <StatusBar style="dark" />

      {/* ════ MAP SECTION ════ */}
      <View style={s.mapSection}>
        <View style={s.mapBg}>
          <View style={s.mapGrid}>
            {[0.2, 0.4, 0.6, 0.8].map(v => (
              <View key={`h${v}`} style={[s.gridLineH, { top: `${v * 100}%` }]} />
            ))}
            {[0.2, 0.4, 0.6, 0.8].map(v => (
              <View key={`v${v}`} style={[s.gridLineV, { left: `${v * 100}%` }]} />
            ))}
            <View style={s.ringRoad1} />
            <View style={s.ringRoad2} />
          </View>
        </View>
        <View style={s.mapGradient} />

        {/* Online status indicator on map */}
        {isOnline && (
          <View style={s.mapOnlinePill}>
            <View style={s.mapOnlineDot} />
            <Text style={s.mapOnlineText}>LIVE</Text>
          </View>
        )}

        {/* Driver icon */}
        <View style={s.driverIconContainer}>
          <Animated.View style={[s.glowPulse, { transform: [{ scale: pulseAnim }] }]} />
          <View style={[s.driverCircle, isOnline && s.driverCircleOnline]}>
            <Image
              source={require('../../../assets/car.png')}
              style={[s.driverCarIcon, isOnline && s.driverCarIconOnline]}
              resizeMode="contain"
            />
          </View>
          <View style={s.youLabelWrap}>
            <View style={[s.youLabelBg, isOnline && s.youLabelBgOnline]}>
              <Text style={s.youLabelText}>YOU</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ════ TOP APP BAR ════ */}
      <View style={[s.topBar, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <TouchableOpacity style={s.hamburgerBtn} onPress={() => setSidebarOpen(true)} activeOpacity={0.8}>
          <View style={s.hamburgerIcon}>
            <View style={s.hamburgerLine} />
            <View style={s.hamburgerLine} />
            <View style={[s.hamburgerLine, { width: 12 }]} />
          </View>
        </TouchableOpacity>

        {/* Earnings chip */}
        <View style={s.earningsChip}>
          <Text style={s.earningsChipLabel}>Today</Text>
          <Text style={s.earningsChipSep}>·</Text>
          <Text style={s.earningsChipValue}>₹{earnings.today}</Text>
        </View>
      </View>

      {/* ════ BOTTOM SHEET ════ */}
      <View style={s.bottomSheet}>
        <View style={s.handle} />

        <ScrollView contentContainerStyle={s.bottomSheetScroll} showsVerticalScrollIndicator={false}>

          {/* ── Toggle Pill ── */}
          <View style={s.toggleSection}>
            <View style={s.togglePill}>
              <Animated.View style={[s.toggleThumb, isOnline && s.toggleThumbRight,
                isOnline && s.toggleThumbOnline]} />
              <TouchableOpacity
                style={s.toggleOption}
                onPress={() => isOnline ? handleToggle() : null}
                activeOpacity={0.8}
              >
                <Text style={[s.toggleText, !isOnline && s.toggleTextActive]}>OFFLINE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.toggleOption}
                onPress={() => !isOnline ? handleToggle() : null}
                activeOpacity={0.8}
                disabled={statusLoading}
              >
                <Text style={[s.toggleText, isOnline && s.toggleTextActiveOnline, !isOnline && s.toggleTextDim]}>
                  ONLINE
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Status Card (Online / Offline) ── */}
          {isOnline ? (
            <OnlineStatusCard
              earnings={earnings}
              onGoOffline={handleToggle}
              statusLoading={statusLoading}
              countdown={sessionSecs}
            />
          ) : (
            <OfflineCard onGoOnline={handleToggle} />
          )}

          {/* ── Quick Actions ── */}
          <QuickActions navigation={navigation} />

          {/* ── Subscription Banner ── */}
          <View style={s.subBanner}>
            <Text style={s.subIcon}>🔒</Text>
            <View style={s.subTextStack}>
              <Text style={s.subTitle}>Unlock Subscription Rides</Text>
              <Text style={s.subSubtitle}>Complete payment to get priority guaranteed rides</Text>
            </View>
            <TouchableOpacity
              style={s.subCta}
              onPress={() => navigation.navigate('PaymentPlans')}
              activeOpacity={0.8}
            >
              <Text style={s.subCtaText}>Pay →</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>

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

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // ── Map ──
  mapSection: { width: '100%', height: 420, backgroundColor: '#E8E1F5', overflow: 'hidden', position: 'relative' },
  mapBg:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#E8E1F5' },
  mapGrid:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  gridLineH:  { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(190,163,216,0.25)' },
  gridLineV:  { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(190,163,216,0.25)' },
  ringRoad1:  { position: 'absolute', width: 200, height: 200, borderRadius: 100, left: '50%', top: '50%', marginLeft: -100, marginTop: -100, borderWidth: 1, borderColor: 'rgba(190,163,216,0.35)' },
  ringRoad2:  { position: 'absolute', width: 340, height: 340, borderRadius: 170, left: '50%', top: '50%', marginLeft: -170, marginTop: -170, borderWidth: 1, borderColor: 'rgba(190,163,216,0.20)' },
  mapGradient:{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(245,240,255,0.20)' },

  // LIVE badge on map
  mapOnlinePill: {
    position: 'absolute', top: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(5,150,105,0.12)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(5,150,105,0.25)',
  },
  mapOnlineDot:  { width: 7, height: 7, borderRadius: 3.5, backgroundColor: GREEN },
  mapOnlineText: { fontSize: 10, fontWeight: '800', color: GREEN, letterSpacing: 1 },

  // Driver icon on map
  driverIconContainer: {
    position: 'absolute', left: '50%', top: '45%',
    marginLeft: -32, marginTop: -47, alignItems: 'center',
  },
  glowPulse: {
    position: 'absolute', width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(190,163,216,0.12)', left: -16, top: 0, zIndex: 0,
  },
  driverCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: WHITE, borderWidth: 2, borderColor: 'rgba(190,163,216,0.25)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10, shadowRadius: 15, elevation: 8, zIndex: 2,
  },
  driverCircleOnline: {
    borderColor: 'rgba(16,185,129,0.4)',
    shadowColor: GREEN, shadowOpacity: 0.2,
  },
  driverCarIcon:       { width: 33, height: 30, tintColor: PURPLE },
  driverCarIconOnline: { tintColor: GREEN },
  youLabelWrap:   { paddingTop: 8, zIndex: 1 },
  youLabelBg:     { backgroundColor: PURPLE, borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 6, elevation: 3 },
  youLabelBgOnline:{ backgroundColor: GREEN },
  youLabelText:   { fontSize: 10, fontWeight: '700', color: WHITE, textTransform: 'uppercase', letterSpacing: 1, lineHeight: 15 },

  // ── Top Bar ──
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 12, zIndex: 10,
  },
  hamburgerBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: WHITE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: DEEP, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  hamburgerIcon: { width: 18, height: 12, gap: 4, justifyContent: 'space-between' },
  hamburgerLine: { height: 2, backgroundColor: PURPLE, borderRadius: 1, width: 18 },

  earningsChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, gap: 6,
    backgroundColor: WHITE, borderRadius: 14, height: 38,
    shadowColor: DEEP, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  earningsChipLabel: { fontSize: 12, fontWeight: '500', color: MUTED },
  earningsChipSep:   { fontSize: 12, color: '#DDD7EA' },
  earningsChipValue: { fontSize: 14, fontWeight: '800', color: PURPLE, letterSpacing: -0.4 },

  // ── Bottom Sheet ──
  bottomSheet: {
    flex: 1, backgroundColor: WHITE,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    shadowColor: DEEP, shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 10,
    position: 'relative',
  },
  handle: {
    position: 'absolute', top: 10, zIndex: 10,
    width: 40, height: 4, borderRadius: 9999, backgroundColor: '#E5E0EF',
    alignSelf: 'center', left: '50%', marginLeft: -20,
  },
  bottomSheetScroll: {
    paddingTop: 36, paddingHorizontal: 20,
    paddingBottom: 100, gap: 20,
  },

  // ── Toggle Pill ──
  toggleSection: { alignItems: 'center' },
  togglePill: {
    width: SCREEN_W - 80, height: 52,
    backgroundColor: BG, borderRadius: 9999,
    flexDirection: 'row', alignItems: 'center',
    position: 'relative', overflow: 'hidden',
  },
  toggleThumb: {
    position: 'absolute', width: '50%', height: 40,
    left: '2%', top: 6,
    backgroundColor: WHITE,
    borderRadius: 9999,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  toggleThumbRight:  { left: '48%' },
  toggleThumbOnline: { backgroundColor: 'rgba(16,185,129,0.15)' },
  toggleOption:      { flex: 1, alignItems: 'center', justifyContent: 'center', height: 52, zIndex: 1 },
  toggleText:        { fontSize: 13, fontWeight: '700', color: 'rgba(74,68,85,0.35)' },
  toggleTextActive:  { color: DARK },
  toggleTextActiveOnline: { color: GREEN },
  toggleTextDim:     { color: 'rgba(74,68,85,0.35)' },

  // ── Subscription Banner ──
  subBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 16,
  },
  subIcon:      { fontSize: 20 },
  subTextStack: { flex: 1, gap: 2 },
  subTitle:     { fontSize: 13, fontWeight: '700', color: '#92400E', lineHeight: 18 },
  subSubtitle:  { fontSize: 11, fontWeight: '400', color: 'rgba(146,64,14,0.6)', lineHeight: 16 },
  subCta: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, backgroundColor: AMBER,
  },
  subCtaText: { fontSize: 12, fontWeight: '800', color: WHITE },
});
