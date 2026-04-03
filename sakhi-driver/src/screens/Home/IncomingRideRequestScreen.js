import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Alert, Dimensions, Image, Platform, ScrollView
} from 'react-native';

import SmartMapView from '../../components/SmartMapView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSocket } from '../../context/SocketContext';
import { navigationRef } from '../../../App';
import MonogramAvatar from '../../components/MonogramAvatar';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

const MAP_STYLE = [
  { featureType: 'all', stylers: [{ saturation: -70 }] },
  { featureType: 'road', stylers: [{ color: '#e8e1f5' }] },
  { featureType: 'water', stylers: [{ color: '#c8bef0' }] },
];

export default function IncomingRideRequestScreen() {
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
        Animated.timing(bellPulse, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(bellPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    ).start();

    // Auto-decline timer fallback (e.g. 15s)
    const timeout = setTimeout(() => {
      rejectRide(incomingRide?.ride_id);
      clearIncomingRide();
    }, 15000);

    return () => clearTimeout(timeout);
  }, []);

  const handleAccept = async () => {
    if (accepting) return;
    try {
      setAccepting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      await acceptRide(incomingRide.ride_id);
      clearIncomingRide();
      if (navigationRef.isReady()) {
        navigationRef.navigate('EnRouteToPickup', { ride: incomingRide });
      }
    } catch (err) {
      Alert.alert('Oops', err.message ?? 'Could not accept ride.');
      setAccepting(false);
    }
  };

  if (!incomingRide) return null;

  const {
    rider_name = 'Priya S.',
    rider_photo = null,
    rider_rating = 4.7,
    fare = 87,
    pickup_address = 'Versova Metro Station',
    dropoff_address = 'Oberoi Mall, Goregaon',
    drop_address,
    distance_to_pickup_km = 3.2,
    eta_to_pickup_min = 6,
  } = incomingRide;

  // Matching engine sends { lat, lng }; normalise to { latitude, longitude }
  const normaliseCoord = (coord) =
    coord
      ? {
          latitude:  coord.latitude  ?? coord.lat  ?? 28.61,
          longitude: coord.longitude ?? coord.lng  ?? 77.20,
        }
      : { latitude: 28.61, longitude: 77.20 };

  const pickup_coords  = normaliseCoord(incomingRide.pickup_coords);
  const dropoff_coords = normaliseCoord(incomingRide.dropoff_coords);
  const displayDropAddress = dropoff_address || drop_address || 'Destination';

  const mapRegion = {
    latitude: (pickup_coords.latitude + dropoff_coords.latitude) / 2,
    longitude: (pickup_coords.longitude + dropoff_coords.longitude) / 2,
    latitudeDelta: Math.abs(pickup_coords.latitude - dropoff_coords.latitude) * 2.5 + 0.01,
    longitudeDelta: Math.abs(pickup_coords.longitude - dropoff_coords.longitude) * 2.5 + 0.01,
  };

  return (
    <View style={s.root}>

      {/* TOP 50%: Map Section */}
      <View style={s.mapWrapper}>
        <SmartMapView
          style={StyleSheet.absoluteFill}
          center={{ latitude: mapRegion.latitude, longitude: mapRegion.longitude }}
          zoom={13}
          scrollEnabled={false}
          zoomEnabled={false}
          pointerEvents="none"
          markers={[
            { id: 'pickup',  latitude: pickup_coords.latitude,  longitude: pickup_coords.longitude,  color: '#10B981' },
            { id: 'dropoff', latitude: dropoff_coords.latitude, longitude: dropoff_coords.longitude, color: '#9D58E0' },
          ]}
          polylines={[{
            coords: [pickup_coords, dropoff_coords],
            color: '#9D58E0',
            width: 4,
            dashed: true,
          }]}
        />
      </View>

      {/* HEADER: TopAppBar */}
      <View style={[s.topAppBar, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={s.iconBtn}>
          <Feather name="menu" size={24} color="#BEA3D8" />
        </TouchableOpacity>
        <Text style={s.topAppTitle}>New Request</Text>
        <TouchableOpacity style={s.iconBtn}>
          <MaterialCommunityIcons name="history" size={24} color="#BEA3D8" />
        </TouchableOpacity>
      </View>

      {/* BOTTOM 50%: Bottom Sheet */}
      <Animated.View style={[s.bottomSheet, { transform: [{ translateY: slideUp }] }]}>
        
        {/* Handle */}
        <View style={s.handle} />

        <ScrollView contentContainerStyle={s.bottomSheetContent} showsVerticalScrollIndicator={false}>
        {/* Pulse Header */}
        <View style={s.pulseHeaderWrap}>
          <Animated.View style={[s.pulseIconWrap, { transform: [{ scale: bellPulse }] }]}>
            <View style={s.pulseIconBg} />
            <MaterialCommunityIcons name="bell-ring" size={20} color="#BEA3D8" style={s.pulseIcon} />
          </Animated.View>
          <Text style={s.pulseTitle}>New Ride Request</Text>
        </View>

        {/* Inner Ride Card */}
        <View style={s.rideCard}>
          {/* Rider Profile Row */}
          <View style={s.riderRow}>
            <View style={s.riderLeft}>
              <View style={s.avatarBorder}>
                <MonogramAvatar
                  uri={rider_photo}
                  name={rider_name}
                  size={52}
                  radius={14}
                />
              </View>
              <View style={s.riderInfo}>
                <Text style={s.riderName}>{rider_name}</Text>
                <View style={s.ratingRow}>
                  <MaterialIcons name="star" size={14} color="#F59E0B" />
                  <Text style={s.ratingText}>{Number(rider_rating).toFixed(1)}</Text>
                </View>
              </View>
            </View>
            <Text style={s.fareValue}>₹{fare}</Text>
          </View>

          {/* Route Info */}
          <View style={s.routeInfoBox}>
            <View style={s.routeNodes}>
              <View style={s.pickupNode} />
              <View style={s.routeLine} />
              <View style={s.dropoffNodeInner}>
                 <Feather name="map-pin" size={14} color="#BEA3D8" />
              </View>
            </View>
            <View style={s.routeTexts}>
              <View style={s.routeStop}>
                <Text style={s.routeLabel}>PICKUP</Text>
                <Text style={s.routeAddress} numberOfLines={1}>{pickup_address}</Text>
              </View>
              <View style={s.routeStop}>
                <Text style={s.routeLabel}>DROP-OFF</Text>
                <Text style={s.routeAddress} numberOfLines={1}>{dropoff_address}</Text>
              </View>
            </View>
          </View>

          {/* Trip Stats */}
          <View style={s.tripStatsRow}>
            <View style={s.statBox}>
              <Feather name="git-commit" size={16} color="#1C1A25" style={{ transform: [{ rotate: '90deg' }] }} />
              <Text style={s.statText}>{distance_to_pickup_km} km to pickup</Text>
            </View>
            <View style={s.statBox}>
              <Feather name="clock" size={16} color="#1C1A25" />
              <Text style={s.statText}>ETA ~{eta_to_pickup_min} min</Text>
            </View>
          </View>
        </View>

        {/* Accept Button */}
        <TouchableOpacity
          style={[s.acceptBtn, accepting && { opacity: 0.7 }]}
          onPress={handleAccept}
          disabled={accepting}
          activeOpacity={0.8}
        >
          <Text style={s.acceptBtnText}>
            {accepting ? 'Accepting...' : 'Accept Ride'}
          </Text>
        </TouchableOpacity>

        </ScrollView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FCF8FF',
    zIndex: 9999,
  },

  // Map Section (Top 50%)
  mapWrapper: {
    width: '100%',
    height: '50%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  pickupMarker: {
    width: 24, height: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  pickupDot: {
    width: 14, height: 14,
    backgroundColor: '#10B981',
    borderWidth: 2, borderColor: '#FFFFFF',
    borderRadius: 7,
  },
  dropoffMarker: {
    width: 16, height: 16,
    backgroundColor: '#9D58E0',
    borderWidth: 2, borderColor: '#FFFFFF',
    borderRadius: 8,
  },

  // Top App Bar
  topAppBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 90,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 4,
  },
  iconBtn: { padding: 8 },
  topAppTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 18,
    color: '#0F172A',
    letterSpacing: -0.45,
  },

  // Bottom Sheet (Bottom 50%)
  bottomSheet: {
    position: 'absolute',
    left: 0, right: 0,
    top: '50%', bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: -16 }, // adjust shadow upwards
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 16,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E0EF',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  bottomSheetContent: {
    paddingHorizontal: 24,
    paddingBottom: 40, // plenty of space to scroll
    alignItems: 'center',
  },

  // Pulse Header
  pulseHeaderWrap: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  pulseIconWrap: {
    position: 'relative',
    width: 40, height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseIconBg: {
    position: 'absolute',
    width: 40, height: 40,
    backgroundColor: 'rgba(190, 163, 216, 0.2)',
    borderRadius: 20,
  },
  pulseIcon: {
    // raw icon
  },
  pulseTitle: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 20,
    color: '#1C1A25',
    letterSpacing: -0.5,
    marginTop: 4,
  },

  // Inner Ride Card
  rideCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 6,
    marginBottom: 20, // push accept btn below
  },

  // Rider Row
  riderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  riderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBorder: {
    width: 48, height: 48,
    borderRadius: 24,
    borderWidth: 2, borderColor: '#F0ECFA',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0ECFA', justifyContent: 'center', alignItems: 'center' },
  riderInfo: { justifyContent: 'center' },
  riderName: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 24,
    color: '#1C1A25',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 16,
    color: '#1C1A25',
  },
  fareValue: {
    fontFamily: 'Inter',
    fontWeight: '900',
    fontSize: 24,
    color: '#BEA3D8',
    letterSpacing: -1.2,
  },

  // Route Info
  routeInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  routeNodes: {
    alignItems: 'center',
    width: 14,
    marginTop: 4,
  },
  pickupNode: {
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  routeLine: {
    width: 2, height: 32,
    backgroundColor: '#E5E0EF',
    marginVertical: 4,
  },
  dropoffNodeInner: {
    marginTop: -2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeTexts: {
    flex: 1,
    gap: 12,
  },
  routeStop: {
    gap: 2,
  },
  routeLabel: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 12,
    color: '#1C1A25',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  routeAddress: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#1C1A25',
  },

  // Stats Row
  tripStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 12,
    color: '#1C1A25',
  },

  // Accept Button
  acceptBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#BEA3D8',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
    marginTop: 'auto',
    marginBottom: 20
  },
  acceptBtnText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
