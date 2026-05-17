import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Alert, ActivityIndicator,
  PanResponder, Animated, Modal,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as Location from 'expo-location';

import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import client from '../../api/client';
import {
  startLocationTracking,
  stopLocationTracking,
} from '../../services/locationTask';
import BottomNavBar from '../../components/BottomNavBar';
import DriverSidebarMenu from '../../components/DriverSidebarMenu';
import SmartMapView from '../../components/SmartMapView';
import PendingSubscriptionRequestsScreen from './PendingSubscriptionRequestsScreen';
import { requestOverlayPermission } from '../../services/notificationService';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Snap positions (Y from top of screen where sheet starts) ─────────────────
const SNAP_PEEK = SCREEN_H * 0.72;   // Most of map visible
const SNAP_DEFAULT = SCREEN_H * 0.50;   // 50/50 split
const SNAP_EXPANDED = SCREEN_H * 0.18;   // Sheet nearly full screen
const SNAP_POINTS = [SNAP_PEEK, SNAP_DEFAULT, SNAP_EXPANDED];

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
  card: { flex: 1, backgroundColor: '#EDE9FE', borderRadius: 16, paddingVertical: 16, alignItems: 'center', gap: 4 },
  value: { fontSize: 22, fontWeight: '800', color: '#5B21B6', letterSpacing: -0.5 },
  label: { fontSize: 10, fontWeight: '700', color: '#6B7280', letterSpacing: 1, textTransform: 'uppercase' },
});

// ── Subscription Countdown strip ─────────────────────────────────────────────
function SubscriptionCountdown({ expiry }) {
  if (!expiry) return null;

  const now = new Date();
  const msLeft = expiry - now;
  const totalMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  const progress = Math.max(0, Math.min(1, msLeft / totalMs));

  const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minsLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));

  // Urgency scale
  const { t } = useTranslation();
  let accent, bgColor, label, icon;
  if (msLeft <= 0) {
    accent = '#EF4444'; bgColor = '#FFF2F0'; icon = <Feather name="alert-circle" size={16} color={accent} />;
    label = t('home.subscriptionExpired');
  } else if (daysLeft < 1) {
    accent = '#EF4444'; bgColor = '#FFF2F0'; icon = <Feather name="alert-triangle" size={16} color={accent} />;
    label = t('home.expiresIn', { hours: hoursLeft, mins: minsLeft });
  } else if (daysLeft <= 2) {
    accent = '#F59E0B'; bgColor = '#FFFBEB'; icon = <Feather name="alert-triangle" size={16} color={accent} />;
    label = t('home.daysRemaining', { days: daysLeft, hours: hoursLeft });
  } else {
    accent = '#10B981'; bgColor = '#F0FDF4'; icon = <Feather name="calendar" size={16} color={accent} />;
    label = t('home.daysLeft', { days: daysLeft });
  }

  const barFill = `${Math.round(progress * 100)}%`;

  return (
    <View style={[sub.wrap, { backgroundColor: bgColor, borderColor: accent + '33' }]}>
      {/* Label row */}
      <View style={sub.labelRow}>
        {icon}
        <View style={sub.textStack}>
          <Text style={sub.caption}>{t('home.weeklyPlan')}</Text>
          <Text style={[sub.label, { color: accent }]}>{label}</Text>
        </View>
        <View style={sub.expDateWrap}>
          <Text style={sub.expDateLbl}>{t('home.expires')}</Text>
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
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { fontSize: 16 },
  textStack: { flex: 1, gap: 1 },
  caption: { fontSize: 8, fontWeight: '700', color: '#94A3B8', letterSpacing: 1.2, textTransform: 'uppercase' },
  label: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  expDateWrap: { alignItems: 'flex-end', gap: 1 },
  expDateLbl: { fontSize: 8, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8 },
  expDateVal: { fontSize: 13, fontWeight: '800', letterSpacing: -0.3 },
  barTrack: { height: 5, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 9999, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 9999 },
});

// ── Online Status Card ── Sakhi-themed card (purple/lavender) ─────────────────
function OnlineStatusCard({ earnings, onGoOffline, statusLoading, sessionSecs, subscriptionExpiry }) {
  const { t } = useTranslation();
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, damping: 16, stiffness: 160, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
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
          <Text style={oc.liveBadgeText}>{t('home.liveNow')}</Text>
        </View>
        <TouchableOpacity
          style={oc.offlineBtn}
          onPress={onGoOffline}
          disabled={statusLoading}
          activeOpacity={0.7}
        >
          <Text style={oc.offlineBtnText}>{statusLoading ? '···' : t('home.goOffline')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Row 2: Heading + session timer ── */}
      <View style={oc.headingRow}>
        <View>
          <Text style={oc.headingMain}>{t('home.youreOnline')}</Text>
          <Text style={oc.headingSub}>{t('home.activelySearching')}</Text>
        </View>
        <View style={oc.sessionPill}>
          <Text style={oc.sessionVal}>{fmtTime(sessionSecs)}</Text>
          <Text style={oc.sessionLbl}>{t('home.session')}</Text>
        </View>
      </View>

      {/* ── Row 3: Earnings display ── */}
      <View style={oc.earningsCard}>
        <Text style={oc.earningsCaption}>{t('home.todaysEarnings')}</Text>
        <View style={oc.earningsRow}>
          <Text style={oc.earningsCurrency}>₹</Text>
          <Text style={oc.earningsAmount}>{earnings.today}</Text>
        </View>
      </View>

      {/* ── Row 4: Stat chips ── */}
      <View style={oc.statsRow}>
        <View style={oc.statChip}>
          <Text style={oc.statVal}>{earnings.rides}</Text>
          <Text style={oc.statLbl}>{t('home.trips')}</Text>
        </View>
        <View style={[oc.statChip, oc.statChipAccent]}>
          <Text style={[oc.statVal, oc.statValAccent]}>{Number(earnings.rating).toFixed(1)} ★</Text>
          <Text style={[oc.statLbl, { color: 'rgba(255,255,255,0.75)' }]}>{t('home.rating')}</Text>
        </View>
      </View>

      {/* ── Row 5: Info pills ── */}
      <View style={oc.pillsRow}>
        <View style={oc.pill}>
          <Feather name="wifi" size={12} color="#059669" />
          <Text style={oc.pillText}>{t('home.gpsConnected')}</Text>
        </View>
        <View style={oc.pill}>
          <Feather name="search" size={12} color="#BEA3D8" />
          <Text style={oc.pillText}>{t('home.searchingRides')}</Text>
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
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F0FDF4', borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#BEA3D8' },

  liveBadgeText: { fontSize: 10, fontWeight: '800', color: '#059669', letterSpacing: 1.5 },
  offlineBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(190,163,216,0.4)', backgroundColor: '#F5F0FF' },
  offlineBtnText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  // Heading row
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headingMain: { fontSize: 18, fontWeight: '800', color: '#1E1B2E', letterSpacing: -0.5, lineHeight: 25 },
  headingSub: { fontSize: 12, fontWeight: '400', color: '#94A3B8', lineHeight: 18, marginTop: 2 },
  sessionPill: { backgroundColor: '#F5F0FF', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(190,163,216,0.25)' },
  sessionVal: { fontSize: 15, fontWeight: '800', color: '#BEA3D8', letterSpacing: -0.5, lineHeight: 20 },
  sessionLbl: { fontSize: 8, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 },
  // Earnings card inner block
  earningsCard: { backgroundColor: '#F5F0FF', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(190,163,216,0.2)' },
  earningsCaption: { fontSize: 9, fontWeight: '700', color: '#94A3B8', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  earningsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 2 },
  earningsCurrency: { fontSize: 20, fontWeight: '600', color: '#BEA3D8', marginTop: 5, lineHeight: 34 },
  earningsAmount: { fontSize: 44, fontWeight: '900', color: '#BEA3D8', letterSpacing: -2.5, lineHeight: 52 },
  // Stat chips
  statsRow: { flexDirection: 'row', gap: 10 },
  statChip: { flex: 1, backgroundColor: '#F5F0FF', borderRadius: 14, paddingVertical: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(190,163,216,0.2)' },
  statChipAccent: { backgroundColor: '#BEA3D8', borderColor: '#BEA3D8' },
  statVal: { fontSize: 18, fontWeight: '800', color: '#BEA3D8', letterSpacing: -0.5, lineHeight: 24 },
  statValAccent: { color: '#FFFFFF' },
  statLbl: { fontSize: 8, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.2 },
  // Info pills
  pillsRow: { flexDirection: 'row', gap: 8 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#F5F0FF', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(190,163,216,0.2)' },
  pillIcon: { fontSize: 12 },
  pillText: { fontSize: 11, fontWeight: '600', color: '#64748B', letterSpacing: 0.1 },
});

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function DriverHomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { driver, updateDriver } = useAuth();
  const { pendingSubRequests, subAlert, clearSubAlert } = useSocket();
  const insets = useSafeAreaInsets();

  const [isOnline, setIsOnline] = useState(driver?.is_online ?? false);
  const [earnings, setEarnings] = useState({ today: 340, rides: 5, rating: 4.9 });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPendingSubModal, setShowPendingSubModal] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [locGranted, setLocGranted] = useState(false);
  const [sessionSecs, setSessionSecs] = useState(0);
  const [subscriptionExpiry, setSubscriptionExpiry] = useState(null); // Date | null

  const mapRef = useRef(null);


  // ── Bottom sheet drag state ───────────────────────────────────────────────
  const sheetY = useRef(new Animated.Value(SNAP_DEFAULT)).current;
  const lastY = useRef(SNAP_DEFAULT);
  const isDragging = useRef(false);

  // ── Pan responder for the HANDLE BAR — always captures on start ─────────
  const handlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        isDragging.current = true;
        sheetY.stopAnimation(val => { lastY.current = val; });
        sheetY.setOffset(lastY.current);
        sheetY.setValue(0);
      },
      onPanResponderMove: (_, { dy }) => {
        const next = lastY.current + dy;
        const clamped = Math.max(SNAP_EXPANDED - 20, Math.min(SNAP_PEEK + 20, next));
        sheetY.setValue(clamped - lastY.current);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        sheetY.flattenOffset();
        isDragging.current = false;
        const currentY = lastY.current + dy;
        let target;
        if (vy < -0.5)      target = SNAP_EXPANDED;
        else if (vy > 0.5)  target = SNAP_PEEK;
        else                target = snapToNearest(currentY);
        lastY.current = target;
        Animated.spring(sheetY, { toValue: target, useNativeDriver: false, tension: 68, friction: 12 }).start();
      },
    })
  ).current;

  // ── Pan responder for the SHEET CONTENT — activates on vertical swipe ────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dy, dx }) => Math.abs(dy) > 5 && Math.abs(dy) > Math.abs(dx),
      onMoveShouldSetPanResponderCapture: (_, { dy, dx }) => Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.5,
      onPanResponderGrant: () => {
        isDragging.current = true;
        sheetY.stopAnimation(val => { lastY.current = val; });
        sheetY.setOffset(lastY.current);
        sheetY.setValue(0);
      },
      onPanResponderMove: (_, { dy }) => {
        const next = lastY.current + dy;
        const clamped = Math.max(SNAP_EXPANDED - 20, Math.min(SNAP_PEEK + 20, next));
        sheetY.setValue(clamped - lastY.current);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        sheetY.flattenOffset();
        isDragging.current = false;
        const currentY = lastY.current + dy;
        let target;
        if (vy < -0.5)      target = SNAP_EXPANDED;
        else if (vy > 0.5)  target = SNAP_PEEK;
        else                target = snapToNearest(currentY);
        lastY.current = target;
        Animated.spring(sheetY, { toValue: target, useNativeDriver: false, tension: 68, friction: 12 }).start();
      },
    })
  ).current;

  // ── Location permission & Prominent Disclosure ─────────────────────────────
  const [showDisclosure, setShowDisclosure] = useState(false);

  useEffect(() => {
    (async () => {
      // Check if disclosure was already accepted
      const { status } = await Location.getForegroundPermissionsAsync();
      const hasAccepted = await AsyncStorage.getItem('location_disclosure_accepted');
      
      if (status !== 'granted' && !hasAccepted) {
        // Show prominent disclosure first
        setShowDisclosure(true);
        return;
      }
      
      // Already granted or accepted disclosure previously, proceed with request
      requestAndStartLocation();
    })();
  }, []);

  const requestAndStartLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      
      setLocGranted(true);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coord = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setLocation(coord);

    } catch {
      // ignore
    }
  };

  const handleAcceptDisclosure = async () => {
    await AsyncStorage.setItem('location_disclosure_accepted', 'true');
    setShowDisclosure(false);
    requestAndStartLocation();
  };

  const handleDeclineDisclosure = () => {
    setShowDisclosure(false);
    Alert.alert(
      t('common.error', 'Permission Denied'), 
      t('home.locationRequiredMsg', 'The Sakhi Driver app requires location access to assign rides to you. Please enable it in settings.')
    );
  };

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
    if (driver?.is_online) {
      startLocationTracking('Sakhi Driver', 'Searching for nearby rides...');
      // Ask for "Display over other apps" permission — shown once, naturally
      // timed to when the driver first goes online and needs ride popups.
      requestOverlayPermission();
    }
  }, [driver?.is_online]);


  // ── Session timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOnline) { setSessionSecs(0); return; }
    const t = setInterval(() => setSessionSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isOnline]);

  // ── Sync earnings + subscription expiry on focus ───────────────────────────
  useFocusEffect(useCallback(() => {
    // Earnings — backend returns { rides_completed, gross_earnings, net_earnings }
    client.get('/drivers/earnings/today')
      .then((r) => {
        if (r.data) {
          setEarnings({
            today: r.data.net_earnings ?? 0,
            rides: r.data.rides_completed ?? 0,
            rating: driver?.avg_rating ?? 4.9,
          });
        }
      })
      .catch(() => { });

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

  // ── Mark OFFLINE — check pending subscription requests first ─────────────
  const handleGoOffline = async () => {
    // If there are snoozed subscription requests, show reminder screen first
    if (pendingSubRequests?.length > 0) {
      setShowPendingSubModal(true);
      return;
    }
    await _doGoOffline();
  };

  const _doGoOffline = async () => {
    try {
      setStatusLoading(true);
      await client.patch('/drivers/status', { is_online: false });
      updateDriver({ is_online: false });
      setIsOnline(false);
      await stopLocationTracking();
    } catch {
      Alert.alert(t('common.error'), t('home.couldNotGoOffline'));
    } finally {
      setStatusLoading(false);
    }
  };


  // ── Mark ONLINE (stays on this screen, rejoins ride pool) ─────────────────
  const handleGoOnline = async () => {
    // If subscription has expired, send to payment
    if (subscriptionExpiry && new Date() > subscriptionExpiry) {
      navigation.navigate('PaymentPlans');
      return;
    }
    try {
      setStatusLoading(true);
      // Pass current location so backend can immediately upsert driver_locations
      const body = { is_online: true };
      if (location) {
        body.lat = location.latitude;
        body.lng = location.longitude;
      }
      await client.patch('/drivers/status', body);
      updateDriver({ is_online: true });
      setIsOnline(true);
      await startLocationTracking();
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? t('home.couldNotGoOnline');
      Alert.alert(t('common.error'), msg);
    } finally {
      setStatusLoading(false);
    }
  };

  // Days remaining on subscription
  const daysLeft = subscriptionExpiry
    ? Math.max(0, Math.ceil((subscriptionExpiry - new Date()) / (1000 * 60 * 60 * 24)))
    : null;
  const subscriptionExpired = daysLeft !== null && daysLeft === 0;
  const subscriptionExpiring = daysLeft !== null && daysLeft <= 2 && daysLeft > 0;

  const statusBarH = RNStatusBar.currentHeight ?? insets.top;

  return (
    <View style={s.root}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* ── FULL-SCREEN MAP (background) ── */}
      <View style={StyleSheet.absoluteFill}>
        {location ? (
          <SmartMapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            center={location}
            zoom={15}
            showsTraffic={isOnline}
            markers={[
              { id: 'driver', latitude: location.latitude, longitude: location.longitude, color: isOnline ? '#BEA3D8' : '#5B21B6', label: 'YOU' },
            ]}
          />

        ) : (
          <View style={s.mapLoading}>
            <ActivityIndicator size="large" color="#5B21B6" />
            <Text style={s.mapLoadingText}>{t('home.gettingLocation')}</Text>
          </View>
        )}

        {/* Top bar overlay on map */}
        <View style={[s.topBar, { paddingTop: Math.max(statusBarH, insets.top) + 8 }]}>
          <TouchableOpacity style={s.hamburgerBtn} onPress={() => setSidebarOpen(true)} activeOpacity={0.8}>
            <Feather name="menu" size={20} color="#5B21B6" />
          </TouchableOpacity>
          {/* Commission expiry pill */}
          {daysLeft !== null && (
            <TouchableOpacity
              style={[s.earningsPill, subscriptionExpired && s.earningsPillExpired, subscriptionExpiring && s.earningsPillWarning]}
              onPress={() => subscriptionExpired ? navigation.navigate('PaymentPlans') : navigation.navigate('MyEarnings')}
              activeOpacity={0.85}
            >
              <Text style={[s.earningsPillLabel, (subscriptionExpired || subscriptionExpiring) && { color: subscriptionExpired ? '#991B1B' : '#92400E' }]}>
                {subscriptionExpired ? <Text><Feather name="alert-circle" size={11} color="#991B1B" /> Expired — </Text> : subscriptionExpiring ? <Text><Feather name="clock" size={11} color="#92400E" /> {daysLeft}d left · </Text> : `${daysLeft}d · `}
              </Text>
              <Text style={[s.earningsPillValue, subscriptionExpired && { color: '#DC2626' }, subscriptionExpiring && { color: '#B45309' }]}>
                {subscriptionExpired ? 'Renew Now' : `₹${earnings.today}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>


      {/* ── SUBSCRIPTION ALERT BANNER ── */}
      {subAlert && (
        <View style={[
          s.subAlertBanner,
          subAlert.type === 'cancelled' ? s.subAlertBannerRed : s.subAlertBannerAmber,
        ]}>
          <Feather
            name={subAlert.type === 'cancelled' ? 'x-circle' : 'pause-circle'}
            size={24}
            color={subAlert.type === 'cancelled' ? '#991B1B' : '#92400E'}
            style={s.subAlertIcon}
          />
          <View style={s.subAlertTextCol}>
            <Text style={[
              s.subAlertTitle,
              subAlert.type === 'cancelled' ? { color: '#991B1B' } : { color: '#92400E' },
            ]}>
              {subAlert.type === 'cancelled'
                ? t('home.subscriptionCancelled')
                : t('home.subscriptionPaused')}
            </Text>
            <Text style={s.subAlertMsg}>{subAlert.message}</Text>
          </View>
          <TouchableOpacity onPress={clearSubAlert} style={s.subAlertClose} activeOpacity={0.7}>
            <Text style={s.subAlertCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── DRAGGABLE BOTTOM SHEET ── */}
      <Animated.View style={[s.sheet, { top: sheetY }]} {...panResponder.panHandlers}>

        {/* ── Drag handle — dedicated pan responder, always captures ── */}
        <View style={s.handleArea} {...handlePanResponder.panHandlers}>
          <View style={s.handleHint} />
          <View style={s.handle} />
          <View style={s.handleHint} />
        </View>

        {/* ── Scrollable content ── */}
        <View style={s.sheetContent}>
          {/* OFFLINE / ONLINE TOGGLE */}
          <View style={s.toggleWrap}>
            <TouchableOpacity
              style={[s.toggleBtn, !isOnline && s.toggleBtnActive]}
              onPress={isOnline ? handleGoOffline : undefined}
              disabled={statusLoading || !isOnline}
              activeOpacity={0.9}
            >
              {statusLoading && !isOnline
                ? <ActivityIndicator size="small" color="#5B21B6" />
                : (
                  <>
                    <View style={[s.toggleDot, !isOnline && s.toggleDotOffline]} />
                    <Text style={!isOnline ? s.toggleTextActive : s.toggleText}>{t('home.offline')}</Text>
                  </>
                )
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.toggleBtn, isOnline && s.toggleBtnActive, isOnline && s.toggleBtnOnline]}
              onPress={!isOnline ? handleGoOnline : undefined}
              disabled={statusLoading || isOnline}
              activeOpacity={0.9}
            >
              {statusLoading && isOnline
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : (
                  <>
                    <View style={[s.toggleDot, isOnline && s.toggleDotOnline]} />
                    <Text style={isOnline ? s.toggleTextOnline : s.toggleText}>{t('home.online')}</Text>
                  </>
                )
              }
            </TouchableOpacity>
          </View>

          {/* ── Status section ── */}
          {isOnline ? (
            <OnlineStatusCard
              earnings={earnings}
              onGoOffline={handleGoOffline}
              statusLoading={statusLoading}
              sessionSecs={sessionSecs}
              subscriptionExpiry={subscriptionExpiry}
            />
          ) : (
            <>
              <Text style={s.statusHeading}>{t('home.goodDay')}</Text>
              <Text style={s.statusSub}>{t('home.allSet')}</Text>
              {/* Stats (offline summary) */}
              <View style={s.statsRow}>
                <StatCard value={`₹${earnings.today}`} label={t('earnings.today')} />
                <StatCard value={earnings.rides} label={t('earnings.trips')} />
                <StatCard value={`${earnings.rating}★`} label={t('earnings.rating')} />
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
                <Text style={s.upcomingSubTitle}>{t('home.upcomingSubscriptions')}</Text>
                <Text style={s.upcomingSubDesc}>{t('home.scheduledRides', { count: 2 })}</Text>
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

      {/* ── PENDING SUBSCRIPTION REQUESTS REMINDER (shown before driver goes offline) ── */}
      {showPendingSubModal && (
        <PendingSubscriptionRequestsScreen
          onGoOffline={() => {
            setShowPendingSubModal(false);
            _doGoOffline();
          }}
          onDismiss={() => setShowPendingSubModal(false)}
        />
      )}

      {/* ── PROMINENT DISCLOSURE MODAL ── */}
      <Modal visible={showDisclosure} transparent animationType="fade">
        <View style={s.disclosureOverlay}>
          <View style={s.disclosureCard}>
            <View style={s.disclosureIconBg}>
              <Feather name="map-pin" size={24} color="#BEA3D8" />
            </View>
            <Text style={s.disclosureTitle}>Use your location</Text>
            <Text style={s.disclosureText}>
              Sakhi Driver collects location data to enable assigning nearby ride requests and to track your trips for accurate earnings even when the app is closed or not in use.
            </Text>
            <View style={s.disclosureActions}>
              <TouchableOpacity style={s.disclosureBtnSecondary} onPress={handleDeclineDisclosure}>
                <Text style={s.disclosureBtnSecondaryText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.disclosureBtnPrimary} onPress={handleAcceptDisclosure}>
                <Text style={s.disclosureBtnPrimaryText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Custom map style ──────────────────────────────────────────────────────────
const CUSTOM_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#ede9f5' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7c6fa0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f0ff' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#d8d0ea' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c4b5e8' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#ddd8f0' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E5E0EF' },

  // Map overlays
  mapLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#EDE9FE' },
  mapLoadingText: { fontSize: 14, color: '#7C6FA0', fontWeight: '500' },

  // Driver marker
  driverMarker: { alignItems: 'center' },
  driverMarkerInner: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#5B21B6', shadowColor: '#5B21B6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6 },
  driverMarkerOnline: { backgroundColor: '#5B21B6', borderColor: '#5B21B6' },
  markerLabel: { backgroundColor: '#5B21B6', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9999, marginTop: 4 },
  markerLabelOnline: { backgroundColor: '#BEA3D8' },

  markerLabelText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1.5 },

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

  // Handle area — wider, taller hit target with visible pill
  handleArea: {
    width: '100%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    cursor: 'grab',
  },
  // Invisible spacer strips above/below the pill to expand hit area
  handleHint: {
    width: '100%',
    height: 8,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#C4B5E9',
  },

  sheetContent: { paddingHorizontal: 24, paddingBottom: 24 },

  // Toggle
  toggleWrap: { flexDirection: 'row', backgroundColor: '#F3F0FA', borderRadius: 9999, padding: 3, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 9999, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  toggleBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#5B21B6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  toggleBtnOnline: { backgroundColor: '#BEA3D8' },

  toggleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#9CA3AF' },
  toggleDotOffline: { backgroundColor: '#94A3B8' },
  toggleDotOnline: { backgroundColor: '#FFFFFF' },
  toggleText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 },
  toggleTextActive: { fontSize: 12, fontWeight: '800', color: '#1E1B2E', letterSpacing: 0.5 },
  toggleTextOnline: { fontSize: 12, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },

  // Status
  statusHeading: { fontSize: 26, fontWeight: '800', color: '#1E1B2E', textAlign: 'center', letterSpacing: -0.5, marginBottom: 6 },
  statusSub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 24 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },

  // Upcoming Subscription Preview
  upcomingSubCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: '#EDE9FE', shadowColor: '#5B21B6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  upcomingSubIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#BEA3D8', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  upcomingSubTextCol: { flex: 1, gap: 2 },
  upcomingSubTitle: { fontSize: 14, fontWeight: '700', color: '#1E1B2E' },
  upcomingSubDesc: { fontSize: 12, color: '#6B7280' },

  // Subscription expiry pill variants
  earningsPillExpired: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  earningsPillWarning: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },

  // Prominent Disclosure
  disclosureOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  disclosureCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  disclosureIconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F5F0FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  disclosureTitle: { fontSize: 20, fontWeight: '800', color: '#1E1B2E', marginBottom: 12, textAlign: 'center' },
  disclosureText: { fontSize: 14, fontWeight: '500', color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  disclosureActions: { flexDirection: 'row', gap: 12, width: '100%' },
  disclosureBtnSecondary: { flex: 1, height: 52, borderRadius: 14, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  disclosureBtnSecondaryText: { fontSize: 15, fontWeight: '700', color: '#64748B' },
  disclosureBtnPrimary: { flex: 1, height: 52, borderRadius: 14, backgroundColor: '#BEA3D8', justifyContent: 'center', alignItems: 'center' },
  disclosureBtnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // ── Subscription alert banner ───────────────────────────────────────────────
  subAlertBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 100, // sits just above the bottom nav bar
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 999,
  },
  subAlertBannerAmber: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  subAlertBannerRed: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1.5,
    borderColor: '#FECDD3',
  },
  subAlertIcon: { fontSize: 22, marginTop: 1 },
  subAlertTextCol: { flex: 1, gap: 3 },
  subAlertTitle: { fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  subAlertMsg: { fontSize: 12, fontWeight: '400', color: '#64748B', lineHeight: 18 },
  subAlertClose: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  subAlertCloseText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
});
