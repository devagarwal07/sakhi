import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Alert, Dimensions, Image, Platform
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import { useSocket } from '../../context/SocketContext';

const { height: SCREEN_H } = Dimensions.get('window');

const MAP_STYLE = [
  { featureType: 'all', stylers: [{ saturation: -70 }] },
  { featureType: 'road', stylers: [{ color: '#e8e1f5' }] },
  { featureType: 'water', stylers: [{ color: '#c8bef0' }] },
];

export default function IncomingRideRequestScreen({ navigation }) {
  const { incomingRide, acceptRide, rejectRide, clearIncomingRide } = useSocket();
  const insets = useSafeAreaInsets();

  const bellPulse = useRef(new Animated.Value(1)).current;
  const slideUp = useRef(new Animated.Value(SCREEN_H)).current;
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    Animated.spring(slideUp, { 
      toValue: 0, 
      tension: 60, 
      friction: 12, 
      useNativeDriver: true 
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bellPulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(bellPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    ).start();

    // Auto-decline timer fallback (e.g. 15s)
    const timeout = setTimeout(() => {
      handleDecline();
    }, 15000);

    return () => clearTimeout(timeout);
  }, []);

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

  const handleDecline = () => {
    rejectRide(incomingRide?.ride_id);
    clearIncomingRide();
  };

  if (!incomingRide) return null;

  const {
    rider_name = 'Priya S.',
    rider_photo = null,
    rider_rating = 4.7,
    fare = 87,
    pickup_address = 'Versova Metro Station',
    dropoff_address = 'Oberoi Mall, Goregaon',
    distance_to_pickup_km = 3.2,
    eta_to_pickup_min = 6,
    pickup_coords = { latitude: 28.61, longitude: 77.20 },
    dropoff_coords = { latitude: 28.63, longitude: 77.22 },
  } = incomingRide;

  const mapRegion = {
    latitude: (pickup_coords.latitude + dropoff_coords.latitude) / 2,
    longitude: (pickup_coords.longitude + dropoff_coords.longitude) / 2,
    latitudeDelta: Math.abs(pickup_coords.latitude - dropoff_coords.latitude) * 2.5 + 0.01,
    longitudeDelta: Math.abs(pickup_coords.longitude - dropoff_coords.longitude) * 2.5 + 0.01,
  };

  return (
    <View style={styles.root}>
      {/* MAP BACKGROUND */}
      <MapView
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        customMapStyle={MAP_STYLE}
        region={mapRegion}
        scrollEnabled={false}
        zoomEnabled={false}
        pointerEvents="none"
      >
        <Marker coordinate={pickup_coords}>
          <View style={styles.pickupDot} />
        </Marker>
        <Marker coordinate={dropoff_coords}>
          <MaterialCommunityIcons name="map-marker" size={32} color="#9D58E0" />
        </Marker>
        <Polyline
          coordinates={[pickup_coords, dropoff_coords]}
          strokeColor="#9D58E0"
          strokeWidth={4}
          lineDashPattern={[10, 8]}
        />
      </MapView>

      {/* TOP APP BAR */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity style={styles.iconBtn}>
          <Feather name="menu" size={24} color="#BEA3D8" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>New Request</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <MaterialIcons name="history" size={24} color="#BEA3D8" />
        </TouchableOpacity>
      </View>

      {/* BOTTOM SHEET */}
      <Animated.View style={[
        styles.bottomSheet, 
        { transform: [{ translateY: slideUp }], paddingBottom: insets.bottom + 24 }
      ]}>
        
        {/* Pulse Header */}
        <View style={styles.pulseHeader}>
          <Animated.View style={[styles.pulseIconBg, { transform: [{ scale: bellPulse }] }]}>
            <MaterialCommunityIcons name="bell-ring" size={22} color="#BEA3D8" />
          </Animated.View>
          <Text style={styles.pulseTitle}>New Ride Request 🔔</Text>
        </View>

        {/* Ride Info Card */}
        <View style={styles.rideCard}>
          {/* Rider Profile Row */}
          <View style={styles.riderRow}>
            <View style={styles.riderProfileBox}>
              {rider_photo ? (
                <Image source={{ uri: rider_photo }} style={styles.riderAvatar} />
              ) : (
                <View style={[styles.riderAvatar, { backgroundColor: '#F0ECFA', justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ fontSize: 24 }}>🙎‍♀️</Text>
                </View>
              )}
              <View>
                <Text style={styles.riderName}>{rider_name}</Text>
                <View style={styles.ratingBox}>
                  <MaterialIcons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingText}>{Number(rider_rating).toFixed(1)}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.fareText}>₹{fare}</Text>
          </View>

          {/* Route Info */}
          <View style={styles.routeBox}>
            <View style={styles.routeColNav}>
              <View style={styles.routeDotGreen} />
              <View style={styles.routeLineVertical} />
              <MaterialCommunityIcons name="map-marker-outline" size={16} color="#BEA3D8" />
            </View>
            <View style={styles.routeContent}>
              <View style={styles.routeRow}>
                <Text style={styles.routeLabel}>PICKUP</Text>
                <Text style={styles.routeAddress} numberOfLines={1}>{pickup_address}</Text>
              </View>
              <View style={styles.routeRow}>
                <Text style={styles.routeLabel}>DROP-OFF</Text>
                <Text style={styles.routeAddress} numberOfLines={1}>{dropoff_address}</Text>
              </View>
            </View>
          </View>

          {/* Trip Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="map-marker-distance" size={16} color="#1C1A25" />
              <Text style={styles.statText}>{distance_to_pickup_km} km to pickup</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#1C1A25" />
              <Text style={styles.statText}>ETA ~{eta_to_pickup_min} min</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons Stacked */}
        <View style={styles.actionsBox}>
          <TouchableOpacity
            style={[styles.acceptBtn, accepting && { opacity: 0.7 }]}
            onPress={handleAccept}
            disabled={accepting}
            activeOpacity={0.85}
          >
            <Text style={styles.acceptBtnText}>
              {accepting ? 'Accepting...' : 'Accept Ride'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.declineBtn}
            onPress={handleDecline}
            disabled={accepting}
            activeOpacity={0.8}
          >
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>
        </View>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FCF8FF',
  },
  pickupDot: {
    width: 20,
    height: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#10B981',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    zIndex: 10,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 5,
  },
  iconBtn: {
    padding: 8,
    marginLeft: -8,
    marginRight: -8,
  },
  topBarTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 18,
    color: '#0F172A',
    letterSpacing: -0.45,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: -16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 16,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  pulseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pulseIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pulseTitle: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 22,
    color: '#1C1A25',
    letterSpacing: -0.5,
  },
  rideCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0ECFA',
    marginBottom: 24,
  },
  riderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  riderProfileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  riderAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#F0ECFA',
  },
  riderName: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#1C1A25',
    marginBottom: 4,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 13,
    color: '#1C1A25',
  },
  fareText: {
    fontFamily: 'Inter',
    fontWeight: '900',
    fontSize: 28,
    color: '#BEA3D8',
    letterSpacing: -1.2,
  },
  routeBox: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  routeColNav: {
    alignItems: 'center',
    width: 20,
    marginRight: 12,
    marginTop: 6,
  },
  routeDotGreen: {
    width: 10,
    height: 10,
    backgroundColor: '#10B981',
    borderRadius: 5,
  },
  routeLineVertical: {
    width: 2,
    height: 36,
    backgroundColor: '#E5E0EF',
    marginVertical: 4,
  },
  routeContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  routeRow: {
    marginBottom: 16,
  },
  routeLabel: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#6B7280',
    marginBottom: 2,
  },
  routeAddress: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 15,
    color: '#1C1A25',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F0FF',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 13,
    color: '#1C1A25',
  },
  actionsBox: {
    width: '100%',
    gap: 12,
  },
  acceptBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#BEA3D8',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#BEA3D8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  acceptBtnText: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 17,
    color: '#FFFFFF',
  },
  declineBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F87171',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineBtnText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 17,
    color: '#F87171',
  },
});
