import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Alert, ActivityIndicator,
  PanResponder, Animated,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import {
  startLocationTracking,
  stopLocationTracking,
} from '../../services/locationTask';
import BottomNavBar from '../../components/BottomNavBar';
import DriverSidebarMenu from '../../components/DriverSidebarMenu';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Snap positions (Y from top of screen where sheet starts) ─────────────────
const SNAP_PEEK      = SCREEN_H * 0.72;   // Most of map visible
const SNAP_DEFAULT   = SCREEN_H * 0.50;   // 50/50 split
const SNAP_EXPANDED  = SCREEN_H * 0.18;   // Sheet nearly full screen
const SNAP_POINTS    = [SNAP_PEEK, SNAP_DEFAULT, SNAP_EXPANDED];

function snapToNearest(y) {
  return SNAP_POINTS.reduce((prev, curr) =>
    Math.abs(curr - y) < Math.abs(prev - y) ? curr : prev
  );
}

// ── Stat Card (offline view) ──────────────────────────────────────────────────
function StatCard({ value, label }) {
  return (
    <View style={sc.card}>
      <Text style={sc.value}>{value}</Text>
      <Text style={sc.label}>{label}</Text>
    </View>
  );
}
const sc = StyleSheet.create({
  card:  { flex: 1, backgroundColor: '#EDE9FE', borderRadius: 16, paddingVertical: 16, alignItems: 'center', gap: 4 },
  value: { fontSize: 22, fontWeight: '800', color: '#5B21B6', letterSpacing: -0.5 },
  label: { fontSize: 10, fontWeight: '700', color: '#6B7280', letterSpacing: 1, textTransform: 'uppercase' },
});

// ── Subscription Countdown strip ─────────────────────────────────────────────
function SubscriptionCountdown({ expiry }) {
  if (!expiry) return null;

  const now        = new Date();
  const msLeft     = expiry - now;
  const totalMs    = 7 * 24 * 60 * 60 * 1000; // 7 days
  const progress   = Math.max(0, Math.min(1, msLeft / totalMs));

  const daysLeft   = Math.floor(msLeft / (1000 * 60 * 60 * 24));
  const hoursLeft  = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minsLeft   = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));

  // Urgency scale
  let accent, bgColor, label, icon;
  if (msLeft <= 0) {
    accent  = '#EF4444'; bgColor = '#FFF2F0'; icon = '🔴';
    label   = 'Subscription expired';
  } else if (daysLeft < 1) {
    accent  = '#EF4444'; bgColor = '#FFF2F0'; icon = '⚠️';
    label   = `Expires in ${hoursLeft}h ${minsLeft}m`;
  } else if (daysLeft <= 2) {
    accent  = '#F59E0B'; bgColor = '#FFFBEB'; icon = '⚠️';
    label   = `${daysLeft}d ${hoursLeft}h remaining`;
  } else {
    accent  = '#10B981'; bgColor = '#F0FDF4'; icon = '📅';
    label   = `${daysLeft} days remaining`;
  }

  const barFill = `${Math.round(progress * 100)}%`;

  return (
    <View style={[sub.wrap, { backgroundColor: bgColor, borderColor: accent + '33' }]}>
      {/* Label row */}
      <View style={sub.labelRow}>
        <Text style={sub.icon}>{icon}</Text>
        <View style={sub.textStack}>
          <Text style={sub.caption}>WEEKLY PLAN</Text>
          <Text style={[sub.label, { color: accent }]}>{label}</Text>
        </View>
        <View style={sub.expDateWrap}>
          <Text style={sub.expDateLbl}>Expires</Text>
          <Text style={[sub.expDateVal, { color: accent }]}>
            {expiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
      </View>
      {/* Progress bar */}
      <View style={sub.barTrack}>
        <View style={[sub.barFill, { width: barFill, backgroundColor: accent }]} />
      </View>
    </View>
  );
}

const sub = StyleSheet.create({
  wrap: {
    borderRadius: 14, padding: 12, gap: 10,
    borderWidth: 1,
  },
  labelRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon:        { fontSize: 16 },
  textStack:   { flex: 1, gap: 1 },
  caption:     { fontSize: 8, fontWeight: '700', color: '#7B7487', letterSpacing: 1.2, textTransform: 'uppercase' },
  label:       { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  expDateWrap: { alignItems: 'flex-end', gap: 1 },
  expDateLbl:  { fontSize: 8, fontWeight: '600', color: '#7B7487', textTransform: 'uppercase', letterSpacing: 0.8 },
  expDateVal:  { fontSize: 13, fontWeight: '800', letterSpacing: -0.3 },
  barTrack:    { height: 5, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 9999, overflow: 'hidden' },
  barFill:     { height: 5, borderRadius: 9999 },
});

// ── Online Status Card ── Sakhi-themed card (purple/lavender) ─────────────────
function OnlineStatusCard({ earnings, onGoOffline, statusLoading, sessionSecs, subscriptionExpiry }) {
  const glowAnim  = useRef(new Animated.Value(0.5)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 1800, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, damping: 16, stiffness: 160, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const fmtTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}h ${m}m` : `${m}:${s}`;
  };

  return (
    <Animated.View style={[oc.root, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Soft purple accent blobs */}
      <Animated.View style={[oc.blobTL, { opacity: glowAnim }]} />
      <Animated.View style={[oc.blobBR, { opacity: glowAnim }]} />

      {/* ── Row 1: LIVE badge + Go Offline ── */}
      <View style={oc.topRow}>
        <View style={oc.liveBadge}>
          <View style={oc.liveDot} />
          <Text style={oc.liveBadgeText}>LIVE NOW</Text>
        </View>
        <TouchableOpacity
          style={oc.offlineBtn}
          onPress={onGoOffline}
          disabled={statusLoading}
          activeOpacity={0.7}
        >
          <Text style={oc.offlineBtnText}>{statusLoading ? '···' : 'Go Offline'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Row 2: Heading + session timer ── */}
      <View style={oc.headingRow}>
        <View>
          <Text style={oc.headingMain}>You're Online ✨</Text>
          <Text style={oc.headingSub}>Actively searching for rides</Text>
        </View>
        <View style={oc.sessionPill}>
          <Text style={oc.sessionVal}>{fmtTime(sessionSecs)}</Text>
          <Text style={oc.sessionLbl}>session</Text>
        </View>
      </View>

      {/* ── Row 3: Earnings display ── */}
      <View style={oc.earningsCard}>
        <Text style={oc.earningsCaption}>TODAY'S EARNINGS</Text>
        <View style={oc.earningsRow}>
          <Text style={oc.earningsCurrency}>₹</Text>
          <Text style={oc.earningsAmount}>{earnings.today}</Text>
        </View>
      </View>

      {/* ── Row 4: Stat chips ── */}
      <View style={oc.statsRow}>
        <View style={oc.statChip}>
          <Text style={oc.statVal}>{earnings.rides}</Text>
          <Text style={oc.statLbl}>TRIPS</Text>
        </View>
        <View style={[oc.statChip, oc.statChipAccent]}>
          <Text style={[oc.statVal, oc.statValAccent]}>{Number(earnings.rating).toFixed(1)} ★</Text>
          <Text style={[oc.statLbl, { color: 'rgba(255,255,255,0.75)' }]}>RATING</Text>
        </View>
      </View>

      {/* ── Row 5: Info pills ── */}
      <View style={oc.pillsRow}>
        <View style={oc.pill}>
          <Text style={oc.pillIcon}>📡</Text>
          <Text style={oc.pillText}>GPS · Connected</Text>
        </View>
        <View style={oc.pill}>
          <Text style={oc.pillIcon}>🔍</Text>
          <Text style={oc.pillText}>Searching rides</Text>
        </View>
      </View>

      {/* ── Row 6: Subscription countdown ── */}
      <SubscriptionCountdown expiry={subscriptionExpiry} />
    </Animated.View>
  );
}

const oc = StyleSheet.create({
  // White card with purple border glow
  root: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22, padding: 20, gap: 16,
    overflow: 'hidden', marginBottom: 8,
    borderWidth: 1.5, borderColor: 'rgba(190,163,216,0.30)',
    shadowColor: '#BEA3D8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.20, shadowRadius: 24, elevation: 8,
  },
  // Decorative lavender blobs
  blobTL: { position: 'absolute', top: -28, left: -28, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(190,163,216,0.13)' },
  blobBR: { position: 'absolute', bottom: -32, right: -20, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(245,240,255,0.85)' },
  // Top row
  topRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F0FDF4', borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  liveDot:       { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10B981' },
  liveBadgeText: { fontSize: 10, fontWeight: '800', color: '#059669', letterSpacing: 1.5 },
  offlineBtn:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(190,163,216,0.4)', backgroundColor: '#F5F0FF' },
  offlineBtnText:{ fontSize: 12, fontWeight: '700', color: '#7B7487' },
  // Heading row
  headingRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headingMain: { fontSize: 18, fontWeight: '800', color: '#1C1A25', letterSpacing: -0.5, lineHeight: 25 },
  headingSub:  { fontSize: 12, fontWeight: '400', color: '#7B7487', lineHeight: 18, marginTop: 2 },
  sessionPill: { backgroundColor: '#F5F0FF', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(190,163,216,0.25)' },
  sessionVal:  { fontSize: 15, fontWeight: '800', color: '#BEA3D8', letterSpacing: -0.5, lineHeight: 20 },
  sessionLbl:  { fontSize: 8, fontWeight: '600', color: '#7B7487', textTransform: 'uppercase', letterSpacing: 1 },
  // Earnings card inner block
  earningsCard:     { backgroundColor: '#F5F0FF', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(190,163,216,0.2)' },
  earningsCaption:  { fontSize: 9, fontWeight: '700', color: '#7B7487', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  earningsRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 2 },
  earningsCurrency: { fontSize: 20, fontWeight: '600', color: '#BEA3D8', marginTop: 5, lineHeight: 34 },
  earningsAmount:   { fontSize: 44, fontWeight: '900', color: '#7C3AED', letterSpacing: -2.5, lineHeight: 52 },
  // Stat chips
  statsRow:       { flexDirection: 'row', gap: 10 },
  statChip:       { flex: 1, backgroundColor: '#F5F0FF', borderRadius: 14, paddingVertical: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(190,163,216,0.2)' },
  statChipAccent: { backgroundColor: '#BEA3D8', borderColor: '#BEA3D8' },
  statVal:        { fontSize: 18, fontWeight: '800', color: '#BEA3D8', letterSpacing: -0.5, lineHeight: 24 },
  statValAccent:  { color: '#FFFFFF' },
  statLbl:        { fontSize: 8, fontWeight: '700', color: '#7B7487', textTransform: 'uppercase', letterSpacing: 1.2 },
  // Info pills
  pillsRow: { flexDirection: 'row', gap: 8 },
  pill:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#F5F0FF', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(190,163,216,0.2)' },
  pillIcon: { fontSize: 12 },
  pillText: { fontSize: 11, fontWeight: '600', color: '#4A4455', letterSpacing: 0.1 },
});

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function DriverHomeScreen({ navigation }) {
  const { driver, updateDriver } = useAuth();
  const insets = useSafeAreaInsets();

  const [isOnline,          setIsOnline]          = useState(driver?.is_online ?? false);
  const [earnings,          setEarnings]          = useState({ today: 340, rides: 5, rating: 4.9 });
  const [sidebarOpen,       setSidebarOpen]       = useState(false);
  const [statusLoading,     setStatusLoading]     = useState(false);
  const [location,          setLocation]          = useState(null);
  const [locGranted,        setLocGranted]        = useState(false);
  const [sessionSecs,       setSessionSecs]       = useState(0);
  const [subscriptionExpiry, setSubscriptionExpiry] = useState(null); // Date | null

  const mapRef  = useRef(null);

  // ── Bottom sheet drag state ───────────────────────────────────────────────
  const sheetY     = useRef(new Animated.Value(SNAP_DEFAULT)).current;
  const lastY      = useRef(SNAP_DEFAULT);
  const isDragging = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:        () => true,
      onMoveShouldSetPanResponder:         (_, { dy }) => Math.abs(dy) > 5,
      onPanResponderGrant: () => {
        isDragging.current = true;
        sheetY.stopAnimation(val => { lastY.current = val; });
        sheetY.setOffset(lastY.current);
        sheetY.setValue(0);
      },
      onPanResponderMove: (_, { dy }) => {
        const next = lastY.current + dy;
        // Clamp within snap range with resistance at extremes
        const clamped = Math.max(SNAP_EXPANDED - 20, Math.min(SNAP_PEEK + 20, next));
        sheetY.setValue(clamped - lastY.current);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        sheetY.flattenOffset();
        isDragging.current = false;
        const currentY = lastY.current + dy;

        // Use velocity to pick snap point
        let target;
        if (vy < -0.5) {
          target = SNAP_EXPANDED;         // Flick up → expand
        } else if (vy > 0.5) {
          target = SNAP_PEEK;             // Flick down → peek
        } else {
          target = snapToNearest(currentY);
        }

        lastY.current = target;
        Animated.spring(sheetY, {
          toValue: target,
          useNativeDriver: false,
          tension: 68,
          friction: 12,
        }).start();
      },
    })
  ).current;

  // ── Location permission + initial position ────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      setLocGranted(true);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    })();
  }, []);

  // ── Keep location updated ──────────────────────────────────────────────────
  useEffect(() => {
    if (!locGranted) return;
    const sub = Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 20 },
      (pos) => {
        const coord = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocation(coord);
        mapRef.current?.animateToRegion({ ...coord, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 800);
      }
    );
    return () => { sub.then(s => s.remove()); };
  }, [locGranted]);

  // ── Sync online state whenever AuthContext changes ─────────────────────────
  useEffect(() => {
    setIsOnline(driver?.is_online ?? false);
  }, [driver?.is_online]);

  // ── Session timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOnline) { setSessionSecs(0); return; }
    const t = setInterval(() => setSessionSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isOnline]);

  // ── Sync earnings + subscription expiry on focus ───────────────────────────
  useFocusEffect(useCallback(() => {
    // Earnings
    client.get('/drivers/earnings/today')
      .then(r => {
        if (r.data) {
          setEarnings({ today: r.data.today_earnings ?? 340, rides: r.data.today_trips ?? 5, rating: r.data.rating ?? 4.9 });
        }
      })
      .catch(() => {});

    // Subscription expiry — driver.subscription_expiry from profile or separate endpoint
    const expiryFromContext = driver?.subscription_expiry;
    if (expiryFromContext) {
      setSubscriptionExpiry(new Date(expiryFromContext));
    } else {
      // Fallback: fetch from API
      client.get('/drivers/subscription')
        .then(r => {
          const expStr = r.data?.expiry_date ?? r.data?.subscription_expiry;
          if (expStr) setSubscriptionExpiry(new Date(expStr));
          else {
            // Dev mock: 5 days from now for weekly plan demo
            const mock = new Date();
            mock.setDate(mock.getDate() + 5);
            setSubscriptionExpiry(mock);
          }
        })
        .catch(() => {
          // Dev mock fallback
          const mock = new Date();
          mock.setDate(mock.getDate() + 5);
          setSubscriptionExpiry(mock);
        });
    }
  }, [driver]));

  // ── Toggle ────────────────────────────────────────────────────────────────
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

  const statusBarH = RNStatusBar.currentHeight ?? insets.top;

  return (
    <View style={s.root}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* ── FULL-SCREEN MAP (background) ── */}
      <View style={StyleSheet.absoluteFill}>
        {location ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            initialRegion={{ ...location, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={false}
            showsTraffic={isOnline}
            customMapStyle={CUSTOM_MAP_STYLE}
          >
            <Marker coordinate={location} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={s.driverMarker}>
                <View style={[s.driverMarkerInner, isOnline && s.driverMarkerOnline]}>
                  <Feather name="truck" size={18} color={isOnline ? '#FFFFFF' : '#5B21B6'} />
                </View>
                <View style={[s.markerLabel, isOnline && s.markerLabelOnline]}>
                  <Text style={s.markerLabelText}>YOU</Text>
                </View>
              </View>
            </Marker>
          </MapView>
        ) : (
          <View style={s.mapLoading}>
            <ActivityIndicator size="large" color="#5B21B6" />
            <Text style={s.mapLoadingText}>Getting your location…</Text>
          </View>
        )}

        {/* Top bar overlay on map */}
        <View style={[s.topBar, { paddingTop: Math.max(statusBarH, insets.top) + 8 }]}>
          <TouchableOpacity style={s.hamburgerBtn} onPress={() => setSidebarOpen(true)} activeOpacity={0.8}>
            <Feather name="menu" size={20} color="#5B21B6" />
          </TouchableOpacity>
          <TouchableOpacity style={s.earningsPill} onPress={() => navigation.navigate('MyEarnings')} activeOpacity={0.85}>
            <Text style={s.earningsPillLabel}>Today: </Text>
            <Text style={s.earningsPillValue}>₹{earnings.today}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── DRAGGABLE BOTTOM SHEET ── */}
      <Animated.View style={[s.sheet, { top: sheetY }]}>

        {/* ── Drag handle (pan area) ── */}
        <View style={s.handleArea} {...panResponder.panHandlers}>
          <View style={s.handle} />
        </View>

        {/* ── Scrollable content ── */}
        <View style={s.sheetContent}>
          {/* OFFLINE / ONLINE TOGGLE */}
          <View style={s.toggleWrap}>
            <TouchableOpacity
              style={[s.toggleBtn, !isOnline && s.toggleBtnActive]}
              onPress={!isOnline ? undefined : handleToggle}
              disabled={statusLoading}
              activeOpacity={0.9}
            >
              {statusLoading && !isOnline
                ? <ActivityIndicator size="small" color="#5B21B6" />
                : <Text style={!isOnline ? s.toggleTextActive : s.toggleText}>OFFLINE</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.toggleBtn, isOnline && s.toggleBtnActive, isOnline && s.toggleBtnOnline]}
              onPress={isOnline ? undefined : handleToggle}
              disabled={statusLoading}
              activeOpacity={0.9}
            >
              {statusLoading && isOnline
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={isOnline ? s.toggleTextOnline : s.toggleText}>ONLINE</Text>
              }
            </TouchableOpacity>
          </View>

          {/* ── Status section ── */}
          {isOnline ? (
            <OnlineStatusCard
              earnings={earnings}
              onGoOffline={handleToggle}
              statusLoading={statusLoading}
              sessionSecs={sessionSecs}
              subscriptionExpiry={subscriptionExpiry}
            />
          ) : (
            <>
              <Text style={s.statusHeading}>You are Offline</Text>
              <Text style={s.statusSub}>Go online to receive rides</Text>
              {/* Stats (offline summary) */}
              <View style={s.statsRow}>
                <StatCard value={`₹${earnings.today}`} label="Today" />
                <StatCard value={earnings.rides}        label="Trips" />
                <StatCard value={`${earnings.rating}★`} label="Rating" />
              </View>
            </>
          )}

          {/* Upcoming Subscriptions Preview (Offline Only) */}
          {!isOnline && (
            <TouchableOpacity 
              style={s.upcomingSubCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('SubscriptionRides')}
            >
              <View style={s.upcomingSubIconWrap}>
                <Feather name="calendar" size={18} color="#FFFFFF" />
              </View>
              <View style={s.upcomingSubTextCol}>
                <Text style={s.upcomingSubTitle}>Upcoming Subscriptions</Text>
                <Text style={s.upcomingSubDesc}>You have 2 scheduled rides</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <View style={{ flex: 1 }} />
      {/* ── BOTTOM NAV ── */}
      <BottomNavBar navigation={navigation} activeTab="home" />

      {/* ── SIDEBAR ── */}
      {sidebarOpen && (
        <DriverSidebarMenu
          navigation={navigation}
          onClose={() => setSidebarOpen(false)}
          activeRoute="DriverHome"
        />
      )}
    </View>
  );
}

// ── Custom map style ──────────────────────────────────────────────────────────
const CUSTOM_MAP_STYLE = [
  { elementType: 'geometry',           stylers: [{ color: '#ede9f5' }] },
  { elementType: 'labels.text.fill',   stylers: [{ color: '#7c6fa0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f0ff' }] },
  { featureType: 'road', elementType: 'geometry',         stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke',  stylers: [{ color: '#d8d0ea' }] },
  { featureType: 'water', elementType: 'geometry',        stylers: [{ color: '#c4b5e8' }] },
  { featureType: 'poi',  elementType: 'geometry',         stylers: [{ color: '#ddd8f0' }] },
  { featureType: 'poi',  elementType: 'labels',           stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels',        stylers: [{ visibility: 'off' }] },
];

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E5E0EF' },

  // Map overlays
  mapLoading:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#EDE9FE' },
  mapLoadingText: { fontSize: 14, color: '#7C6FA0', fontWeight: '500' },

  // Driver marker
  driverMarker:       { alignItems: 'center' },
  driverMarkerInner:  { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#5B21B6', shadowColor: '#5B21B6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6 },
  driverMarkerOnline: { backgroundColor: '#5B21B6', borderColor: '#5B21B6' },
  markerLabel:        { backgroundColor: '#5B21B6', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9999, marginTop: 4 },
  markerLabelOnline:  { backgroundColor: '#059669' },
  markerLabelText:    { fontSize: 9, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1.5 },

  // Top bar
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingBottom: 12, zIndex: 10,
  },
  hamburgerBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#5B21B6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  earningsPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 9999, shadowColor: '#5B21B6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  earningsPillLabel: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  earningsPillValue: { fontSize: 16, fontWeight: '800', color: '#5B21B6' },

  // ── Bottom sheet ──────────────────────────────────────────────────────────
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#5B21B6',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 20,
  },

  // Handle area — entire width, taller hit target for easier dragging
  handleArea: {
    width: '100%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1C4E9',
  },

  sheetContent:  { paddingHorizontal: 24, paddingBottom: 24 },

  // Toggle
  toggleWrap: { flexDirection: 'row', backgroundColor: '#F3F0FA', borderRadius: 9999, padding: 4, marginBottom: 24 },
  toggleBtn:       { flex: 1, paddingVertical: 14, borderRadius: 9999, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#5B21B6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  toggleBtnOnline: { backgroundColor: '#059669' },
  toggleText:       { fontSize: 14, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 },
  toggleTextActive: { fontSize: 14, fontWeight: '800', color: '#1C1A25', letterSpacing: 0.5 },
  toggleTextOnline: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },

  // Status
  statusHeading: { fontSize: 26, fontWeight: '800', color: '#1C1A25', textAlign: 'center', letterSpacing: -0.5, marginBottom: 6 },
  statusSub:     { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 24 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },

  // Upcoming Subscription Preview
  upcomingSubCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: '#EDE9FE', shadowColor: '#5B21B6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  upcomingSubIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#BEA3D8', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  upcomingSubTextCol: { flex: 1, gap: 2 },
  upcomingSubTitle: { fontSize: 14, fontWeight: '700', color: '#1C1A25' },
  upcomingSubDesc: { fontSize: 12, color: '#6B7280' },
});
