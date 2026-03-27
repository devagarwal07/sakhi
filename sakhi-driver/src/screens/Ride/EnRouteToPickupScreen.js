import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, Linking, Image,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import { useSocket } from '../../context/SocketContext';
import client from '../../api/client';

const MAP_STYLE = [
  { featureType: 'all', stylers: [{ saturation: -65 }] },
  { featureType: 'road.arterial', stylers: [{ color: '#e0d8f5' }] },
  { featureType: 'water', stylers: [{ color: '#c8bef0' }] },
];

export default function EnRouteToPickupScreen({ navigation, route }) {
  const { ride } = route.params ?? {};
  const { emit } = useSocket();
  const mapRef = useRef(null);

  const [myLocation, setMyLocation] = useState(null);

  const pickup = ride?.pickup_coords ?? { latitude: 28.6139, longitude: 77.2090 };

  // ── Current location ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setMyLocation(loc.coords);
    })();
  }, []);

  // ── Map region to fit both points ───────────────────────────────────────
  const region = myLocation
    ? {
        latitude:       (myLocation.latitude  + pickup.latitude)  / 2,
        longitude:      (myLocation.longitude + pickup.longitude) / 2,
        latitudeDelta:  Math.abs(myLocation.latitude  - pickup.latitude)  * 2.5 + 0.01,
        longitudeDelta: Math.abs(myLocation.longitude - pickup.longitude) * 2.5 + 0.01,
      }
    : { ...pickup, latitudeDelta: 0.02, longitudeDelta: 0.02 };

  // ── Call rider ──────────────────────────────────────────────────────────
  const handleCall = () => {
    if (ride?.rider_phone) {
      Linking.openURL(`tel:${ride.rider_phone}`);
    } else {
      Alert.alert('No number', 'Rider phone number is unavailable.');
    }
  };

  // ── Arrived ─────────────────────────────────────────────────────────────
  const handleArrived = async () => {
    try {
      emit('ride:arrived', { ride_id: ride?.ride_id });
      navigation.replace('ArrivedWaiting', { ride });
    } catch (err) {
      Alert.alert('Error', 'Could not update arrival status.');
    }
  };

  // ── Re-center button ─────────────────────────────────────────────────────
  const recenter = () => {
    if (myLocation && mapRef.current) {
      mapRef.current.animateToRegion(region, 500);
    }
  };

  return (
    <View style={styles.root}>
      {/* ── MAP ─────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        customMapStyle={MAP_STYLE}
      >
        {/* Driver marker */}
        {myLocation && (
          <Marker coordinate={myLocation}>
            <View style={styles.driverMarker}>
              <Text style={styles.driverEmoji}>🛺</Text>
            </View>
          </Marker>
        )}

        {/* Pickup marker */}
        <Marker coordinate={pickup}>
          <View style={styles.pickupMarker}>
            <View style={styles.greenDot} />
          </View>
        </Marker>

        {/* Polyline route */}
        {myLocation && (
          <Polyline
            coordinates={[myLocation, pickup]}
            strokeColor={Colors.primaryContainer}
            strokeWidth={5}
            lineDashPattern={[12, 8]}
          />
        )}
      </MapView>

      {/* ── FLOATING HEADER ─────────────────────────────────────────── */}
      <SafeAreaView style={styles.headerOverlay} pointerEvents="box-none">
        <View style={styles.navBanner}>
          <View style={styles.navIconBox}>
            <Text style={{ fontSize: 22 }}>🧭</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.navDirectionLabel}>EN ROUTE TO PICKUP</Text>
            <Text style={styles.navDistance}>{ride?.distance_to_pickup_km ?? '—'} km away</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── SOS ─────────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.sosBtn} activeOpacity={0.85}
        onPress={() => Alert.alert('SOS', 'Emergency services will be contacted.')}>
        <Text style={styles.sosBtnText}>🆘  SOS</Text>
      </TouchableOpacity>

      {/* ── RE-CENTER ───────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.recenterBtn} onPress={recenter} activeOpacity={0.8}>
        <Text style={{ fontSize: 18 }}>📍</Text>
      </TouchableOpacity>

      {/* ── BOTTOM SHEET ────────────────────────────────────────────── */}
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {/* Status pill */}
        <View style={styles.pillRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>En Route to Pickup</Text>
          </View>
        </View>

        {/* Rider row */}
        <View style={styles.riderRow}>
          <View style={styles.avatarWrap}>
            {ride?.rider_photo
              ? <Image source={{ uri: ride.rider_photo }} style={styles.avatar} />
              : <Text style={styles.avatarFallback}>👤</Text>
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.riderName}>{ride?.rider_name ?? 'Rider'}</Text>
            <Text style={styles.riderRating}>⭐ {ride?.rider_rating?.toFixed(1) ?? '4.5'}</Text>
          </View>
          {/* Call button */}
          <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.8}>
            <Text style={{ fontSize: 20 }}>📞</Text>
          </TouchableOpacity>
        </View>

        {/* Arrived CTA */}
        <TouchableOpacity style={styles.arrivedBtn} onPress={handleArrived} activeOpacity={0.85}>
          <Text style={styles.arrivedBtnText}>📍  I've Arrived at Pickup</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  map: { width: '100%', height: '62%' },

  driverMarker: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.primaryContainer, ...Shadows.card,
  },
  driverEmoji: { fontSize: 24 },
  pickupMarker: { alignItems: 'center', justifyContent: 'center', padding: 4 },
  greenDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.online, borderWidth: 3, borderColor: Colors.white,
  },

  // Header overlay
  headerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md,
  },
  navBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: `${Colors.white}E8`, borderRadius: Radius.lg,
    paddingHorizontal: 14, paddingVertical: 12, gap: 10, ...Shadows.card,
  },
  navIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  navDirectionLabel: { fontSize: 9, fontWeight: '700', color: Colors.primaryContainer, letterSpacing: 1.5 },
  navDistance: { fontSize: 16, fontWeight: '800', color: Colors.onSurface },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surfaceLow,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, color: Colors.onSurfaceVariant },

  // Floating buttons
  sosBtn: {
    position: 'absolute', bottom: '40%', left: Spacing.md,
    backgroundColor: '#EF4444', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, ...Shadows.card,
  },
  sosBtnText: { color: Colors.white, fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  recenterBtn: {
    position: 'absolute', bottom: '40%', right: Spacing.md,
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: `${Colors.white}E8`,
    alignItems: 'center', justifyContent: 'center', ...Shadows.card,
  },

  // Bottom sheet
  sheet: {
    flex: 1, backgroundColor: Colors.white,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: Spacing.base, paddingTop: 12, paddingBottom: 24,
    ...Shadows.lavender,
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4,
    backgroundColor: Colors.outlineVariant, borderRadius: 2, marginBottom: 14,
  },
  pillRow: { alignItems: 'center', marginBottom: 16 },
  pill: {
    backgroundColor: `${Colors.primaryContainer}18`,
    paddingHorizontal: 16, paddingVertical: 5,
    borderRadius: Radius.full,
  },
  pillText: { fontSize: 11, fontWeight: '700', color: Colors.primaryContainer, letterSpacing: 1 },

  riderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  avatarWrap: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: Colors.surfaceLow, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
  },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: { fontSize: 30 },
  riderName: { fontSize: 18, fontWeight: '800', color: Colors.onSurface },
  riderRating: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  callBtn: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: `${Colors.primaryContainer}15`,
    alignItems: 'center', justifyContent: 'center',
  },

  arrivedBtn: {
    height: 60, borderRadius: Radius.lg,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center', ...Shadows.lavender,
  },
  arrivedBtnText: { color: Colors.white, fontSize: 17, fontWeight: '800' },
});
