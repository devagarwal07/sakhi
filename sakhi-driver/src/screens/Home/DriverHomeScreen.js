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
        const clamped = Math.max(SNAP_EXPANDED - 20, Math.min(SNAP_PEEK + 20, next));
        sheetY.setValue(clamped - lastY.current);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        sheetY.flattenOffset();
        isDragging.current = false;
        const currentY = lastY.current + dy;
        let target;
        if (vy < -0.5) target = SNAP_EXPANDED;
        else if (vy > 0.5) target = SNAP_PEEK;
        else target = snapToNearest(currentY);

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

  // ... (location effects omitted for brevity in targetContent match if needed, but I'll keep them)

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
      </View>

      {/* ── DRAGGABLE BOTTOM SHEET ── */}
      <Animated.View style={[s.sheet, { top: sheetY }]}>
        {/* ── Drag handle (pan area) ── */}
        <View style={s.handleArea} {...panResponder.panHandlers}>
          <View style={s.handle} />
        </View>

        <View style={s.sheetContent}>
          {/* Content will go here in next commit */}
        </View>
      </Animated.View>
    </View>
  );
}

const CUSTOM_MAP_STYLE = []; // Placeholder

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E5E0EF' },
  mapLoading:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#EDE9FE' },
  mapLoadingText: { fontSize: 14, color: '#7C6FA0', fontWeight: '500' },
  driverMarker:       { alignItems: 'center' },
  driverMarkerInner:  { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#5B21B6' },
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
});
