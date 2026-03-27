import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, Alert, Dimensions, Image,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import { useSocket } from '../../context/SocketContext';

const TIMER_SECONDS = 15;
const { height: SCREEN_H } = Dimensions.get('window');
const MAP_STYLE = [
  { featureType: 'all', stylers: [{ saturation: -70 }] },
  { featureType: 'road', stylers: [{ color: '#e8e1f5' }] },
  { featureType: 'water', stylers: [{ color: '#c8bef0' }] },
];

// ─── Depleting timer bar ────────────────────────────────────────────────────
function TimerBar({ seconds, onExpire }) {
  const width = useRef(new Animated.Value(1)).current; // 1 = 100%
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    Animated.timing(width, {
      toValue: 0,
      duration: seconds * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) onExpire?.();
    });

    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(interval); return 0; }
        return r - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const barColor = width.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: ['#EF4444', '#F59E0B', Colors.primaryContainer],
  });

  return (
    <View style={timerStyles.wrap}>
      <View style={timerStyles.track}>
        <Animated.View
          style={[
            timerStyles.fill,
            { flex: width, backgroundColor: barColor },
          ]}
        />
      </View>
      <Text style={timerStyles.countdown}>{remaining}s</Text>
    </View>
  );
}

const timerStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  track: {
    flex: 1, height: 6, backgroundColor: Colors.surfaceContainer,
    borderRadius: 3, overflow: 'hidden', flexDirection: 'row',
  },
  fill: { height: '100%', borderRadius: 3 },
  countdown: { fontSize: 13, fontWeight: '800', color: Colors.primaryContainer, minWidth: 28 },
});

// ─── Main overlay ───────────────────────────────────────────────────────────
export default function IncomingRideRequestScreen({ navigation }) {
  const { incomingRide, acceptRide, rejectRide, clearIncomingRide } = useSocket();

  // Pulse animation for bell
  const bellPulse = useRef(new Animated.Value(1)).current;
  const slideUp   = useRef(new Animated.Value(SCREEN_H * 0.55)).current;
  const [accepting, setAccepting] = useState(false);

  // ── Slide up & pulse on mount ───────────────────────────────────────────
  useEffect(() => {
    Animated.spring(slideUp, { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bellPulse, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(bellPulse, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  // ── Handle expire ───────────────────────────────────────────────────────
  const handleExpire = useCallback(() => {
    rejectRide(incomingRide?.ride_id);
  }, [incomingRide?.ride_id]);

  // ── Accept ──────────────────────────────────────────────────────────────
  const handleAccept = async () => {
    if (accepting) return;
    try {
      setAccepting(true);
      await acceptRide(incomingRide.ride_id);
      clearIncomingRide();
      navigation.navigate('ActiveTrip', { ride: incomingRide });
    } catch (err) {
      Alert.alert('Oops', err.message ?? 'Could not accept ride.');
      setAccepting(false);
    }
  };

  // ── Decline ─────────────────────────────────────────────────────────────
  const handleDecline = () => {
    rejectRide(incomingRide?.ride_id);
    clearIncomingRide();
  };

  if (!incomingRide) return null;

  const {
    rider_name       = 'Rider',
    rider_photo      = null,
    rider_rating     = 4.5,
    fare             = 0,
    pickup_address   = '—',
    dropoff_address  = '—',
    distance_to_pickup_km = 0,
    eta_to_pickup_min     = 0,
    pickup_coords    = { latitude: 28.61, longitude: 77.20 },
    dropoff_coords   = { latitude: 28.63, longitude: 77.22 },
  } = incomingRide;

  const mapRegion = {
    latitude:        (pickup_coords.latitude  + dropoff_coords.latitude)  / 2,
    longitude:       (pickup_coords.longitude + dropoff_coords.longitude) / 2,
    latitudeDelta:   Math.abs(pickup_coords.latitude  - dropoff_coords.latitude)  * 2.5 + 0.01,
    longitudeDelta:  Math.abs(pickup_coords.longitude - dropoff_coords.longitude) * 2.5 + 0.01,
  };

  return (
    <View style={styles.root}>
      {/* ── MAP (top 50%) ─────────────────────────────────────────────── */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={mapRegion}
        customMapStyle={MAP_STYLE}
        scrollEnabled={false}
        zoomEnabled={false}
        pointerEvents="none"
      >
        {/* Pickup marker */}
        <Marker coordinate={pickup_coords}>
          <View style={styles.pickupDot} />
        </Marker>

        {/* Dropoff marker */}
        <Marker coordinate={dropoff_coords}>
          <View style={styles.dropoffPin}>
            <Text style={{ fontSize: 18 }}>📍</Text>
          </View>
        </Marker>

        {/* Dashed route line */}
        <Polyline
          coordinates={[pickup_coords, dropoff_coords]}
          strokeColor={Colors.primaryContainer}
          strokeWidth={4}
          lineDashPattern={[10, 8]}
        />
      </MapView>

      {/* ── BOTTOM SHEET ──────────────────────────────────────────────── */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideUp }] }]}>
        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Pulsing bell header */}
        <View style={styles.headerRow}>
          <Animated.View style={[styles.bellWrap, { transform: [{ scale: bellPulse }] }]}>
            <Text style={styles.bellIcon}>🔔</Text>
          </Animated.View>
          <Text style={styles.headline}>New Ride Request</Text>
        </View>

        {/* Depleting timer */}
        <TimerBar seconds={TIMER_SECONDS} onExpire={handleExpire} />

        {/* Ride card */}
        <View style={styles.rideCard}>
          {/* Rider row */}
          <View style={styles.riderRow}>
            <View style={styles.avatarWrap}>
              {rider_photo
                ? <Image source={{ uri: rider_photo }} style={styles.avatar} />
                : <Text style={styles.avatarFallback}>👤</Text>
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.riderName}>{rider_name}</Text>
              <Text style={styles.riderRating}>⭐ {Number(rider_rating).toFixed(1)}</Text>
            </View>
            <Text style={styles.fare}>₹{fare}</Text>
          </View>

          <View style={styles.rowDivider} />

          {/* Route info */}
          <View style={styles.routeCol}>
            {/* Pickup */}
            <View style={styles.routeRow}>
              <View style={styles.greenDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.routeLabel}>PICKUP</Text>
                <Text style={styles.routeAddress} numberOfLines={1}>{pickup_address}</Text>
              </View>
            </View>
            <View style={styles.routeLine} />
            {/* Dropoff */}
            <View style={styles.routeRow}>
              <Text style={{ fontSize: 14, color: Colors.primaryContainer }}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.routeLabel}>DROP-OFF</Text>
                <Text style={styles.routeAddress} numberOfLines={1}>{dropoff_address}</Text>
              </View>
            </View>
          </View>

          <View style={styles.rowDivider} />

          {/* Distance + ETA */}
          <View style={styles.metaRow}>
            <Text style={styles.metaItem}>🛣  {distance_to_pickup_km} km to pickup</Text>
            <Text style={styles.metaItem}>⏱  ETA ~{eta_to_pickup_min} min</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.acceptBtn, accepting && styles.acceptBtnDisabled]}
            onPress={handleAccept}
            disabled={accepting}
            activeOpacity={0.85}
          >
            <Text style={styles.acceptText}>
              {accepting ? 'Accepting…' : '✅  Accept Ride'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.declineBtn}
            onPress={handleDecline}
            activeOpacity={0.8}
          >
            <Text style={styles.declineText}>✖  Decline</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 800 },

  // Map
  map: { width: '100%', height: '50%' },
  pickupDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: Colors.online,
    borderWidth: 2.5, borderColor: Colors.white,
  },
  dropoffPin: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
  },

  // Sheet
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: Spacing.base, paddingTop: 16, paddingBottom: 24,
    ...Shadows.lavender,
  },
  handle: {
    alignSelf: 'center', width: 36, height: 4,
    backgroundColor: Colors.outlineVariant, borderRadius: 2, marginBottom: 16,
  },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  bellWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: `${Colors.primaryContainer}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  bellIcon: { fontSize: 20 },
  headline: { fontSize: 18, fontWeight: '800', color: Colors.onSurface, letterSpacing: -0.3 },

  // Ride card
  rideCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    padding: Spacing.md, marginBottom: 14, ...Shadows.card,
  },
  riderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatarWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.surfaceLow,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', borderWidth: 1.5, borderColor: Colors.outlineVariant,
  },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: { fontSize: 24 },
  riderName: { fontSize: 15, fontWeight: '700', color: Colors.onSurface },
  riderRating: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 1 },
  fare: { fontSize: 26, fontWeight: '900', color: Colors.primaryContainer, letterSpacing: -1 },

  rowDivider: { height: 1, backgroundColor: Colors.surfaceLow, marginVertical: 10 },

  // Route
  routeCol: { gap: 0 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  greenDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.online, marginTop: 4 },
  routeLine: { width: 1.5, height: 20, backgroundColor: Colors.outlineVariant, marginLeft: 4, marginVertical: 2 },
  routeLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: Colors.onSurfaceVariant },
  routeAddress: { fontSize: 13, fontWeight: '600', color: Colors.onSurface, marginTop: 1 },

  // Meta
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaItem: { fontSize: 11, color: Colors.onSurfaceVariant, fontWeight: '500' },

  // Buttons
  actions: { gap: 10 },
  acceptBtn: {
    height: 56, borderRadius: Radius.lg,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center', ...Shadows.lavender,
  },
  acceptBtnDisabled: { backgroundColor: Colors.outlineVariant },
  acceptText: { fontSize: 16, fontWeight: '800', color: Colors.white },
  declineBtn: {
    height: 52, borderRadius: Radius.lg,
    borderWidth: 2, borderColor: '#EF4444',
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  declineText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});
