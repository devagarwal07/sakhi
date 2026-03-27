import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, Linking, Vibration,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';

const MAP_STYLE = [
  { featureType: 'all', stylers: [{ saturation: -65 }] },
  { featureType: 'road.arterial', stylers: [{ color: '#e0d8f5' }] },
  { featureType: 'water', stylers: [{ color: '#c8bef0' }] },
];

export default function TripInProgressScreen({ navigation, route }) {
  const { ride } = route.params ?? {};
  const mapRef = useRef(null);

  const [myLocation, setMyLocation]     = useState(null);
  const [tripDuration, setTripDuration] = useState(0);
  const [completing, setCompleting]     = useState(false);

  const dropoff = ride?.dropoff_coords ?? { latitude: 28.6280, longitude: 77.2300 };

  // ── Live location + timer ────────────────────────────────────────────────
  useEffect(() => {
    let locSubscription;
    const timerInterval = setInterval(() => setTripDuration((d) => d + 1), 1000);

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      locSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 20 },
        (loc) => setMyLocation(loc.coords),
      );
    })();

    return () => {
      clearInterval(timerInterval);
      locSubscription?.remove();
    };
  }, []);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const region = myLocation
    ? {
        latitude:       (myLocation.latitude  + dropoff.latitude)  / 2,
        longitude:      (myLocation.longitude + dropoff.longitude) / 2,
        latitudeDelta:  Math.abs(myLocation.latitude  - dropoff.latitude)  * 2.5 + 0.01,
        longitudeDelta: Math.abs(myLocation.longitude - dropoff.longitude) * 2.5 + 0.01,
      }
    : { ...dropoff, latitudeDelta: 0.02, longitudeDelta: 0.02 };

  // ── Complete trip ────────────────────────────────────────────────────────
  const handleComplete = async () => {
    Alert.alert(
      'Complete Trip?',
      'Confirm you have dropped the rider at the destination.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              setCompleting(true);
              const coords = myLocation ?? dropoff;
              await client.post(`/rides/${ride?.ride_id}/complete`, {
                final_latitude:  coords.latitude,
                final_longitude: coords.longitude,
              });
              Vibration.vibrate(200);
              navigation.replace('PaymentDetails', { ride });
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message ?? 'Could not complete trip.');
              setCompleting(false);
            }
          },
        },
      ],
    );
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
        {myLocation && (
          <Marker coordinate={myLocation}>
            <View style={styles.driverMarker}>
              <Text style={styles.driverEmoji}>🛺</Text>
            </View>
          </Marker>
        )}
        <Marker coordinate={dropoff}>
          <Text style={{ fontSize: 24 }}>📍</Text>
        </Marker>
        {myLocation && (
          <Polyline
            coordinates={[myLocation, dropoff]}
            strokeColor={Colors.primaryContainer}
            strokeWidth={5}
            lineDashPattern={[10, 8]}
          />
        )}
      </MapView>

      {/* ── FLOATING HEADER ─────────────────────────────────────────── */}
      <SafeAreaView style={styles.headerOverlay} pointerEvents="box-none">
        <View style={styles.navBanner}>
          <View style={styles.navIcon}>
            <Text style={{ fontSize: 18 }}>🧭</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.navLabel}>HEADING TO DROP-OFF</Text>
            <Text style={styles.navDetail}>{ride?.dropoff_address ?? 'Destination'}</Text>
          </View>
          <Text style={styles.durationBadge}>{formatDuration(tripDuration)}</Text>
        </View>
      </SafeAreaView>

      {/* ── SOS ─────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.sosBtn}
        onPress={() => Alert.alert('SOS', 'Emergency services will be contacted.')}
      >
        <Text style={styles.sosBtnText}>🆘  SOS</Text>
      </TouchableOpacity>

      {/* ── BOTTOM SHEET ────────────────────────────────────────────── */}
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {/* Rider + status row */}
        <View style={styles.riderRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.riderName}>{ride?.rider_name ?? 'Rider'}</Text>
            <View style={styles.tripBadge}>
              <Text style={styles.tripBadgeText}>🟢 Trip In Progress</Text>
            </View>
          </View>
        </View>

        {/* Destination card */}
        <View style={styles.destCard}>
          <View style={styles.destIcon}>
            <Text style={{ fontSize: 18 }}>📍</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.destLabel}>DESTINATION</Text>
            <Text style={styles.destAddress} numberOfLines={2}>
              {ride?.dropoff_address ?? '—'}
            </Text>
          </View>
          <View>
            <Text style={styles.etaLabel}>ETA</Text>
            <Text style={styles.etaValue}>{ride?.eta_to_dropoff_min ?? '—'} min</Text>
          </View>
        </View>

        {/* Complete trip */}
        <TouchableOpacity
          style={[styles.completeBtn, completing && styles.completeBtnDisabled]}
          onPress={handleComplete}
          disabled={completing}
          activeOpacity={0.85}
        >
          <Text style={styles.completeBtnText}>
            {completing ? '⏳  Completing…' : '🏁  Complete Trip'}
          </Text>
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

  headerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md,
  },
  navBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: `${Colors.white}E8`, borderRadius: Radius.lg,
    paddingHorizontal: 14, paddingVertical: 12, ...Shadows.card,
  },
  navIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: `${Colors.primaryContainer}18`,
    alignItems: 'center', justifyContent: 'center',
  },
  navLabel: { fontSize: 9, fontWeight: '700', color: Colors.primaryContainer, letterSpacing: 1.5 },
  navDetail: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  durationBadge: {
    fontSize: 16, fontWeight: '900', color: Colors.primaryContainer,
    letterSpacing: -0.5, minWidth: 52, textAlign: 'right',
  },

  sosBtn: {
    position: 'absolute', bottom: '40%', left: Spacing.md,
    backgroundColor: '#EF4444', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, ...Shadows.card,
  },
  sosBtnText: { color: Colors.white, fontWeight: '800', fontSize: 12, letterSpacing: 1 },

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

  riderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatarCircle: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: Colors.surfaceLow,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
  },
  avatarEmoji: { fontSize: 30 },
  riderName: { fontSize: 18, fontWeight: '800', color: Colors.onSurface, marginBottom: 4 },
  tripBadge: {
    alignSelf: 'flex-start', backgroundColor: '#ECFDF5',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
  },
  tripBadgeText: { fontSize: 10, fontWeight: '700', color: '#059669', letterSpacing: 0.5 },

  destCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surfaceLow, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: 20,
  },
  destIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: `${Colors.primaryContainer}18`,
    alignItems: 'center', justifyContent: 'center',
  },
  destLabel: { fontSize: 9, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 1.5 },
  destAddress: { fontSize: 14, fontWeight: '600', color: Colors.onSurface, marginTop: 2 },
  etaLabel: { fontSize: 9, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 1, textAlign: 'right' },
  etaValue: { fontSize: 17, fontWeight: '900', color: Colors.primaryContainer, textAlign: 'right' },

  completeBtn: {
    height: 60, borderRadius: Radius.lg,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center', ...Shadows.lavender,
  },
  completeBtnDisabled: { backgroundColor: Colors.outlineVariant },
  completeBtnText: { color: Colors.white, fontSize: 17, fontWeight: '800' },
});
