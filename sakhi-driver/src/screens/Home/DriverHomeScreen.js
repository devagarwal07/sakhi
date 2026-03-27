import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Alert, Switch, Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import DriverSidebarMenu from '../../components/DriverSidebarMenu';
import {
  requestLocationPermissions,
  startLocationTracking,
  stopLocationTracking,
} from '../../services/locationTask';

const { height: SCREEN_H } = Dimensions.get('window');
const MAP_STYLE = [
  { featureType: 'all', stylers: [{ saturation: -60 }, { lightness: 10 }] },
  { featureType: 'road.arterial', stylers: [{ color: '#e8e1f5' }] },
  { featureType: 'road.highway',  stylers: [{ color: '#d4c6f5' }] },
  { featureType: 'water',         stylers: [{ color: '#c8bef0' }] },
  { featureType: 'poi.park',      stylers: [{ color: '#ddd8f0' }] },
];

export default function DriverHomeScreen({ navigation }) {
  const { driver, updateDriver } = useAuth();

  // ── State ─────────────────────────────────────────────────────────────────
  const [isOnline, setIsOnline]           = useState(driver?.is_online ?? false);
  const [location, setLocation]           = useState(null);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [todayStats, setTodayStats]       = useState({ earnings: 0, trips: 0, rating: 4.9 });
  const [subRide, setSubRide]             = useState(null); // upcoming subscription ride
  const [statusLoading, setStatusLoading] = useState(false);

  // Pulse animation for online state
  const pulse = useRef(new Animated.Value(1)).current;
  const mapRef = useRef(null);

  // ── Initial location fetch ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(loc.coords);
    })();
  }, []);

  // ── Stats refresh on focus ────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, []),
  );

  const fetchStats = async () => {
    try {
      const { data } = await client.get('/drivers/dashboard');
      setTodayStats({
        earnings: data.today_earnings ?? 0,
        trips:    data.today_trips ?? 0,
        rating:   data.rating ?? 4.9,
      });
      setSubRide(data.upcoming_subscription_ride ?? null);
    } catch {
      // Ignore — stats are non-critical
    }
  };

  // ── Pulse animation ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isOnline) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.35, duration: 900, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
    }
  }, [isOnline]);

  // ── Toggle online/offline ─────────────────────────────────────────────────
  const handleToggle = async () => {
    const goOnline = !isOnline;

    if (goOnline) {
      // Must have location permissions before going online
      const granted = await requestLocationPermissions();
      if (!granted) {
        Alert.alert(
          'Location Required',
          'Background location permission is needed to receive rides while online.',
        );
        return;
      }
    }

    try {
      setStatusLoading(true);
      await client.post('/drivers/status', { is_online: goOnline });
      setIsOnline(goOnline);
      updateDriver({ is_online: goOnline });

      if (goOnline) {
        await startLocationTracking();
      } else {
        await stopLocationTracking();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Could not update status.');
    } finally {
      setStatusLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const region = location
    ? { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : { latitude: 28.6139, longitude: 77.2090, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  return (
    <View style={styles.root}>
      {/* ── MAP ─────────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        customMapStyle={MAP_STYLE}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {location && (
          <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }}>
            <View style={styles.markerWrap}>
              {isOnline && (
                <Animated.View style={[styles.markerPulse, { transform: [{ scale: pulse }] }]} />
              )}
              <View style={styles.markerCircle}>
                <Text style={styles.markerEmoji}>🛺</Text>
              </View>
              <View style={styles.markerLabel}>
                <Text style={styles.markerLabelText}>You</Text>
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* ── MAP HEADER OVERLAYS ─────────────────────────────────────────── */}
      <SafeAreaView style={styles.headerOverlay} pointerEvents="box-none">
        {/* Hamburger */}
        <TouchableOpacity style={styles.hamburger} onPress={() => setSidebarOpen(true)}>
          <Text style={styles.hamburgerIcon}>☰</Text>
        </TouchableOpacity>

        {/* Today's earnings pill */}
        <View style={styles.earningsPill}>
          <Text style={styles.earningsMeta}>Today:</Text>
          <Text style={styles.earningsValue}>₹{todayStats.earnings}</Text>
        </View>
      </SafeAreaView>

      {/* ── BOTTOM SHEET ────────────────────────────────────────────────── */}
      <View style={styles.sheet}>
        {/* Drag handle */}
        <View style={styles.handle} />

        {/* ── Online/Offline Segmented Toggle ── */}
        <TouchableOpacity
          style={styles.toggleTrack}
          onPress={handleToggle}
          disabled={statusLoading}
          activeOpacity={0.9}
        >
          <Animated.View style={[styles.toggleThumb, isOnline && styles.toggleThumbOnline]}>
            <Text style={[styles.toggleThumbText, isOnline && styles.toggleThumbTextOnline]}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </Animated.View>
          <Text style={[styles.toggleOtherLabel, !isOnline && styles.toggleOtherVisible]}>
            {isOnline ? 'OFFLINE' : 'ONLINE'}
          </Text>
        </TouchableOpacity>

        {/* Status headline */}
        <View style={styles.statusText}>
          <Text style={styles.statusHeadline}>
            {isOnline ? 'You are Online 🟢' : 'You are Offline'}
          </Text>
          <Text style={styles.statusSub}>
            {isOnline ? 'Looking for ride requests…' : 'Go online to receive rides'}
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{todayStats.earnings}</Text>
            <Text style={styles.statLabel}>TODAY</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{todayStats.trips}</Text>
            <Text style={styles.statLabel}>TRIPS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {todayStats.rating.toFixed(1)} ⭐
            </Text>
            <Text style={styles.statLabel}>RATING</Text>
          </View>
        </View>

        {/* Subscription Banner */}
        {subRide ? (
          <View style={styles.subBanner}>
            <Text style={styles.subIcon}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.subTitle}>Subscription Ride in {subRide.minutes_away} mins</Text>
              <Text style={styles.subSub}>New requests paused until completion</Text>
            </View>
            <Text style={styles.subTimer}>{String(subRide.minutes_away).padStart(2,'0')}:00</Text>
          </View>
        ) : (
          <View style={styles.subBannerEmpty}>
            <Text style={styles.subEmptyText}>💜  No upcoming subscription rides</Text>
          </View>
        )}
      </View>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <DriverSidebarMenu navigation={navigation} onClose={() => setSidebarOpen(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Map
  map: { width: '100%', height: '55%' },

  // Marker
  markerWrap: { alignItems: 'center', gap: 4 },
  markerPulse: {
    position: 'absolute',
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: `${Colors.primaryContainer}20`,
  },
  markerCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: `${Colors.primaryContainer}40`,
    ...Shadows.card,
  },
  markerEmoji: { fontSize: 28 },
  markerLabel: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: Radius.full,
  },
  markerLabelText: { fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 1 },

  // Header overlay
  headerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: Spacing.base, paddingTop: Spacing.md,
    pointerEvents: 'box-none',
  },
  hamburger: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', ...Shadows.card,
  },
  hamburgerIcon: { fontSize: 22, color: Colors.primaryContainer },
  earningsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.white,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: Radius.full, ...Shadows.card,
  },
  earningsMeta: { fontSize: 11, fontWeight: '500', color: Colors.onSurfaceVariant },
  earningsValue: { fontSize: 14, fontWeight: '800', color: Colors.primaryContainer },

  // Bottom sheet
  sheet: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: Spacing.base,
    paddingTop: 20, paddingBottom: 12,
    ...Shadows.lavender,
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4,
    backgroundColor: Colors.outlineVariant, borderRadius: 2, marginBottom: 20,
  },

  // Toggle
  toggleTrack: {
    alignSelf: 'center',
    width: 260, height: 56,
    backgroundColor: Colors.surfaceLow,
    borderRadius: 28,
    flexDirection: 'row', alignItems: 'center',
    padding: 4, marginBottom: 14,
    overflow: 'hidden', ...Shadows.card,
  },
  toggleThumb: {
    width: '48%', height: '100%',
    borderRadius: 24,
    backgroundColor: `${Colors.outlineVariant}60`,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleThumbOnline: {
    backgroundColor: Colors.online,
    marginLeft: 'auto',
  },
  toggleThumbText: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: Colors.onSurfaceVariant },
  toggleThumbTextOnline: { color: Colors.white },
  toggleOtherLabel: {
    fontSize: 12, fontWeight: '800', color: `${Colors.onSurfaceVariant}60`,
    letterSpacing: 1, marginLeft: 'auto', marginRight: 28,
  },
  toggleOtherVisible: { color: Colors.online },

  // Status text
  statusText: { alignItems: 'center', marginBottom: 20 },
  statusHeadline: { fontSize: 18, fontWeight: '800', color: Colors.onSurface, letterSpacing: -0.3 },
  statusSub: { fontSize: 13, color: Colors.onSurfaceVariant, marginTop: 3 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: Colors.surfaceLow,
    borderRadius: Radius.lg, paddingVertical: 12,
    alignItems: 'center', ...Shadows.card,
  },
  statValue: { fontSize: 17, fontWeight: '800', color: Colors.primaryContainer },
  statLabel: { fontSize: 9, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 1.2, marginTop: 3 },

  // Sub banner
  subBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 12,
    gap: 10, borderWidth: 1, borderColor: `${Colors.primaryContainer}15`,
  },
  subIcon: { fontSize: 20 },
  subTitle: { fontSize: 12, fontWeight: '700', color: Colors.onSurface },
  subSub: { fontSize: 10, color: Colors.onSurfaceVariant, marginTop: 2 },
  subTimer: { fontSize: 13, fontWeight: '800', color: Colors.primaryContainer, marginLeft: 'auto' },
  subBannerEmpty: {
    backgroundColor: Colors.surfaceLow, borderRadius: Radius.lg,
    paddingVertical: 14, alignItems: 'center',
  },
  subEmptyText: { fontSize: 13, color: Colors.onSurfaceVariant, fontWeight: '500' },
});
