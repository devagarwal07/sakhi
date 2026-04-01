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
  driverMarkerOnline: { backgroundColor: '#5B21B6', borderColor: '#5B21B6' },
  markerLabel:        { backgroundColor: '#5B21B6', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9999, marginTop: 4 },
  markerLabelOnline:  { backgroundColor: '#059669' },
  markerLabelText:    { fontSize: 9, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1.5 },
});
