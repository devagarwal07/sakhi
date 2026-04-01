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

// ── Stat Card ─────────────────────────────────────────────────────────────────
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

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function DriverHomeScreen({ navigation }) {
  const { driver, updateDriver } = useAuth();
  const insets = useSafeAreaInsets();

  const [isOnline,      setIsOnline]      = useState(driver?.is_online ?? false);
  const [earnings,      setEarnings]      = useState({ today: 340, rides: 5, rating: 4.9 });
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [location,      setLocation]      = useState(null);
  const [locGranted,    setLocGranted]    = useState(false);

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

  // ── Sync earnings on focus ─────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    client.get('/drivers/earnings/today')
      .then(r => {
        if (r.data) {
          setEarnings({ today: r.data.today_earnings ?? 340, rides: r.data.today_trips ?? 5, rating: r.data.rating ?? 4.9 });
        }
      })
      .catch(() => {});
  }, []));

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

          {/* Status */}
          <Text style={s.statusHeading}>
            {isOnline ? 'You are Online 🟢' : 'You are Offline'}
          </Text>
          <Text style={s.statusSub}>
            {isOnline ? 'Waiting for ride requests…' : 'Go online to receive rides'}
          </Text>

          {/* Stats */}
          <View style={s.statsRow}>
            <StatCard value={`₹${earnings.today}`} label="Today" />
            <StatCard value={earnings.rides}          label="Trips" />
            <StatCard value={`${earnings.rating}★`}   label="Rating" />
          </View>

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
