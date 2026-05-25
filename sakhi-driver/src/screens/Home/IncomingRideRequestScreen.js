import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated,  Dimensions, Platform, ScrollView
} from 'react-native';

import SmartMapView from '../../components/SmartMapView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSocket } from '../../context/SocketContext';
import MonogramAvatar from '../../components/MonogramAvatar';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import CustomAlert from '../../utils/CustomAlert';

const { height: SCREEN_H } = Dimensions.get('window');

// ── Theme per ride type ───────────────────────────────────────────────────────
const THEME = {
  regular: {
    headerBg: 'rgba(255,255,255,0.85)',
    sheetBg: '#FFFFFF',
    accentColor: '#BEA3D8',
    accentDark: '#7C3AED',
    icon: 'bell-ring',
    titleKey: 'ride.newRideRequest',
    pulseIconBg: 'rgba(190,163,216,0.2)',
  },
  subscription: {
    headerBg: 'rgba(255,251,235,0.92)',
    sheetBg: '#FFFBEB',
    accentColor: '#D97706',
    accentDark: '#92400E',
    icon: 'calendar-clock',
    titleKey: 'ride.subscriptionRequest',
    pulseIconBg: 'rgba(217,119,6,0.15)',
  },
};

export default function IncomingRideRequestScreen({ navigationRef }) {
  const { incomingRide, acceptRide, rejectRide, clearIncomingRide, snoozeRide } = useSocket();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const bellPulse = useRef(new Animated.Value(1)).current;
  const slideUp = useRef(new Animated.Value(SCREEN_H)).current;
  const [accepting, setAccepting] = useState(false);
  const [snoozing, setSnoozing] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const isSubscription = incomingRide?.ride_type === 'subscription';
  const theme = isSubscription ? THEME.subscription : THEME.regular;

  useEffect(() => {
    if (!incomingRide) {
      slideUp.setValue(SCREEN_H);
      setCountdown(0);
      return;
    }

    const totalSecs = isSubscription ? 20 : 15;
    setCountdown(totalSecs);

    Animated.spring(slideUp, {
      toValue: 0, tension: 60, friction: 12, useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bellPulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(bellPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    ).start();

    // Countdown ticker
    const ticker = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    // Auto-decline timer
    const timeout = setTimeout(() => {
      if (incomingRide?.ride_id) rejectRide(incomingRide.ride_id);
      clearIncomingRide();
      clearInterval(ticker);
    }, totalSecs * 1000);

    return () => { clearTimeout(timeout); clearInterval(ticker); };
  }, [incomingRide]);

  // ── Accept ────────────────────────────────────────────────────────────────
  const handleAccept = async () => {
    if (accepting) return;
    try {
      setAccepting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => { });
      await acceptRide(incomingRide.ride_id);
      clearIncomingRide();
      if (navigationRef.isReady()) {
        navigationRef.navigate('EnRouteToPickup', { ride: incomingRide });
      }
    } catch (err) {
      CustomAlert.alert('Oops', err.message ?? t('ride.couldNotAccept'));
      setAccepting(false);
    }
  };

  // ── See Later (subscription snooze) ──────────────────────────────────────
  const handleSeeLater = () => {
    if (snoozing) return;
    setSnoozing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    snoozeRide?.(incomingRide.ride_id);
    clearIncomingRide();
  };

  // ── Decline (regular rides) ───────────────────────────────────────────────
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
    drop_address,
    distance_to_pickup_km = 3.2,
    distance_km = null,
    eta_to_pickup_min = 6,
    schedule_label,
    is_night_fare = false,
  } = incomingRide;

  const normaliseCoord = (coord) =>
    coord
      ? { latitude: coord.latitude ?? coord.lat ?? 28.61, longitude: coord.longitude ?? coord.lng ?? 77.20 }
      : { latitude: 28.61, longitude: 77.20 };

  const pickup_coords = normaliseCoord(incomingRide.pickup_coords);
  const dropoff_coords = normaliseCoord(incomingRide.dropoff_coords);
  const displayDropAddress = dropoff_address || drop_address || t('ride.destination');

  const mapRegion = {
    latitude: (pickup_coords.latitude + dropoff_coords.latitude) / 2,
    longitude: (pickup_coords.longitude + dropoff_coords.longitude) / 2,
    latitudeDelta: Math.abs(pickup_coords.latitude - dropoff_coords.latitude) * 2.5 + 0.01,
    longitudeDelta: Math.abs(pickup_coords.longitude - dropoff_coords.longitude) * 2.5 + 0.01,
  };

  return (
    <View style={s.root}>
      {/* Backdrop */}
      <View style={s.backdrop} />

      {/* BOTTOM SHEET */}
      <Animated.View style={[s.bottomSheet, { transform: [{ translateY: slideUp }] }]}>
        
        <ScrollView contentContainerStyle={s.bottomSheetContent} showsVerticalScrollIndicator={false} bounces={false}>
          
          {/* Header Section (Bell + Title) */}
          <View style={s.pulseHeaderWrap}>
            <Animated.View style={[s.pulseIconWrap, { transform: [{ scale: bellPulse }] }]}>
              <View style={s.pulseIconBg} />
              <MaterialCommunityIcons name="bell-ring" size={24} color="#BEA3D8" />
            </Animated.View>
            <Text style={s.pulseTitle}>
              {isSubscription ? t('ride.subscriptionRequest') : 'New Ride Request 🔔'}
            </Text>
          </View>

          {/* Inner Ride Card */}
          <View style={s.rideCard}>
            {/* Rider Row */}
            <View style={s.riderRow}>
              <View style={s.riderLeft}>
                <View style={s.avatarBorder}>
                  <MonogramAvatar uri={rider_photo} name={rider_name} size={48} radius={24} />
                </View>
                <View style={s.riderInfo}>
                  <Text style={s.riderName}>{rider_name || 'Priya S.'}</Text>
                  <View style={s.ratingRow}>
                    <MaterialIcons name="star" size={14} color="#F59E0B" />
                    <Text style={s.ratingText}>{Number(rider_rating || 4.7).toFixed(1)}</Text>
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
                  <Text style={s.routeAddress} numberOfLines={1}>{displayDropAddress}</Text>
                </View>
              </View>
            </View>

            {/* Trip Stats */}
            <View style={s.tripStatsRow}>
              <View style={s.statBox}>
                <MaterialCommunityIcons name="map-marker-distance" size={16} color="#475569" />
                <Text style={s.statText}>{distance_to_pickup_km} km to pickup</Text>
              </View>
              <View style={s.statBox}>
                <MaterialCommunityIcons name="clock-outline" size={16} color="#475569" />
                <Text style={s.statText}>ETA ~{eta_to_pickup_min} min</Text>
              </View>
            </View>
          </View>

          {/* Accept Button */}
          <TouchableOpacity
            style={[s.acceptBtn, accepting && { opacity: 0.7 }]}
            onPress={handleAccept}
            disabled={accepting || snoozing}
            activeOpacity={0.8}
          >
            <Text style={s.acceptBtnText}>{accepting ? 'Accepting...' : 'Accept Ride'}</Text>
          </TouchableOpacity>

          {/* Secondary: Decline / See Later */}
          {isSubscription ? (
             <TouchableOpacity style={s.declineBtnTextWrap} onPress={handleSeeLater} disabled={snoozing || accepting}>
               <Text style={s.declineBtnTextPlain}>{snoozing ? 'Noted' : 'See Later'}</Text>
             </TouchableOpacity>
          ) : (
             <TouchableOpacity style={s.declineBtnTextWrap} onPress={handleDecline} disabled={accepting}>
               <Text style={s.declineBtnTextPlain}>Decline</Text>
             </TouchableOpacity>
          )}

        </ScrollView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { 
    ...StyleSheet.absoluteFillObject, 
    justifyContent: 'flex-end',
    zIndex: 9999 
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  
  bottomSheet: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 20,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  bottomSheetContent: { 
    paddingHorizontal: 24, 
    alignItems: 'center' 
  },

  pulseHeaderWrap: { 
    flexDirection: 'column', 
    alignItems: 'center', 
    marginBottom: 24, 
    gap: 12 
  },
  pulseIconWrap: { 
    position: 'relative', 
    width: 56, 
    height: 56, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  pulseIconBg: { 
    position: 'absolute', 
    width: 56, 
    height: 56, 
    borderRadius: 28,
    backgroundColor: '#F3E8FF' 
  },
  pulseTitle: { 
    fontFamily: 'Inter', 
    fontWeight: '800', 
    fontSize: 20, 
    color: '#1E293B',
    letterSpacing: -0.5 
  },

  rideCard: {
    width: '100%', 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, 
    marginBottom: 24,
    borderWidth: 1, borderColor: '#F1F5F9'
  },

  riderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 24 
  },
  riderLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  avatarBorder: {
    width: 48, height: 48, borderRadius: 24, 
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  riderInfo: { justifyContent: 'center' },
  riderName: { fontFamily: 'Inter', fontWeight: '700', fontSize: 16, color: '#0F172A' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontFamily: 'Inter', fontWeight: '600', fontSize: 12, color: '#475569' },
  fareValue: { fontFamily: 'Inter', fontWeight: '800', fontSize: 26, color: '#BEA3D8', letterSpacing: -0.5 },

  routeInfoBox: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    gap: 16, 
    marginBottom: 24 
  },
  routeNodes: { alignItems: 'center', width: 14, marginTop: 6 },
  pickupNode: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  routeLine: { width: 1, height: 36, backgroundColor: '#E2E8F0', marginVertical: 4 },
  dropoffNodeInner: { justifyContent: 'center', alignItems: 'center' },
  routeTexts: { flex: 1, gap: 16 },
  routeStop: { gap: 2 },
  routeLabel: { fontFamily: 'Inter', fontWeight: '700', fontSize: 10, color: '#64748B', letterSpacing: 1.2 },
  routeAddress: { fontFamily: 'Inter', fontWeight: '600', fontSize: 14, color: '#1E293B' },

  tripStatsRow: { 
    flexDirection: 'row', 
    justifyContent: 'flex-start', 
    gap: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontFamily: 'Inter', fontWeight: '500', fontSize: 12, color: '#475569' },

  acceptBtn: {
    width: '100%', height: 56, borderRadius: 16, 
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#BEA3D8',
    marginBottom: 16,
  },
  acceptBtnText: { fontFamily: 'Inter', fontWeight: '700', fontSize: 16, color: '#FFFFFF', letterSpacing: 0.5 },

  declineBtnTextWrap: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  declineBtnTextPlain: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 15,
    color: '#94A3B8',
  }
});
