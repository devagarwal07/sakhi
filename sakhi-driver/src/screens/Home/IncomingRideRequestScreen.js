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
        {/* Drag Handle */}
        <View style={s.dragHandleWrap}><View style={s.dragHandle} /></View>

        <ScrollView
          contentContainerStyle={s.sheetContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header row: bell icon + title + countdown ring */}
          <View style={s.headerRow}>
            <Animated.View style={[s.bellWrap, { transform: [{ scale: bellPulse }] }]}>
              <MaterialCommunityIcons name="bell-ring" size={22} color="#7C3AED" />
            </Animated.View>
            <Text style={s.headerTitle}>
              {isSubscription ? t('ride.subscriptionRequest', 'Subscription Ride') : 'New Ride Request'}
            </Text>
            <View style={s.countdownRing}>
              <Text style={s.countdownText}>{countdown}</Text>
            </View>
          </View>

          {/* Fare chip — full-width prominent */}
          <View style={s.fareChip}>
            <View style={s.fareLeft}>
              <Text style={s.fareLabel}>ESTIMATED FARE</Text>
              <Text style={s.fareValue} numberOfLines={1} adjustsFontSizeToFit>₹{fare}</Text>
            </View>
            {distance_km != null && (
              <View style={s.fareRight}>
                <Text style={s.fareLabel}>TRIP DISTANCE</Text>
                <Text style={s.fareDistValue}>{distance_km} km</Text>
              </View>
            )}
            {is_night_fare && (
              <View style={s.nightBadge}>
                <MaterialCommunityIcons name="weather-night" size={12} color="#F59E0B" />
                <Text style={s.nightBadgeText}>NIGHT</Text>
              </View>
            )}
          </View>

          {/* Rider row — avatar + name + rating */}
          <View style={s.riderRow}>
            <View style={s.avatarBorder}>
              <MonogramAvatar uri={rider_photo} name={rider_name} size={44} radius={22} />
            </View>
            <View style={s.riderInfo}>
              <Text style={s.riderName} numberOfLines={1}>{rider_name || 'Rider'}</Text>
              <View style={s.ratingRow}>
                <MaterialIcons name="star" size={13} color="#F59E0B" />
                <Text style={s.ratingText}>{Number(rider_rating || 4.7).toFixed(1)} rating</Text>
              </View>
            </View>
            {/* ETA pill */}
            <View style={s.etaPill}>
              <MaterialCommunityIcons name="clock-outline" size={13} color="#7C3AED" />
              <Text style={s.etaText}>~{eta_to_pickup_min} min</Text>
            </View>
          </View>

          {/* Route card */}
          <View style={s.routeCard}>
            {/* Pickup */}
            <View style={s.routeRow}>
              <View style={s.routeNodeCol}>
                <View style={s.pickupDot} />
                <View style={s.routeLine} />
              </View>
              <View style={s.routeTextCol}>
                <Text style={s.routeLabel}>PICKUP · {distance_to_pickup_km} km away</Text>
                <Text style={s.routeAddress} numberOfLines={2}>{pickup_address}</Text>
              </View>
            </View>
            {/* Drop-off */}
            <View style={s.routeRow}>
              <View style={s.routeNodeCol}>
                <View style={s.dropDot} />
              </View>
              <View style={s.routeTextCol}>
                <Text style={s.routeLabel}>DROP-OFF</Text>
                <Text style={s.routeAddress} numberOfLines={2}>{displayDropAddress}</Text>
              </View>
            </View>
          </View>

          {/* Accept Button */}
          <TouchableOpacity
            style={[s.acceptBtn, accepting && { opacity: 0.7 }]}
            onPress={handleAccept}
            disabled={accepting || snoozing}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
            <Text style={s.acceptBtnText}>{accepting ? 'Accepting...' : 'Accept Ride'}</Text>
          </TouchableOpacity>

          {/* Decline / See Later */}
          {isSubscription ? (
            <TouchableOpacity style={s.declineBtn} onPress={handleSeeLater} disabled={snoozing || accepting}>
              <Text style={s.declineBtnText}>{snoozing ? 'Noted' : 'See Later'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.declineBtn} onPress={handleDecline} disabled={accepting}>
              <Text style={s.declineBtnText}>Decline</Text>
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
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  // Bottom sheet
  bottomSheet: {
    width: '100%',
    maxHeight: SCREEN_H * 0.88,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 24,
    paddingTop: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 40, height: 4,
    backgroundColor: '#DDD6FE',
    borderRadius: 2,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: 'stretch',
  },

  // Header row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  bellWrap: {
    width: 40, height: 40,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 17,
    color: '#1E1B2E',
    letterSpacing: -0.4,
  },
  countdownRing: {
    width: 42, height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
  },
  countdownText: {
    fontFamily: 'Inter',
    fontWeight: '900',
    fontSize: 15,
    color: '#7C3AED',
  },

  // Fare chip
  fareChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 14,
    gap: 0,
  },
  fareLeft: {
    flex: 1,
  },
  fareRight: {
    alignItems: 'flex-end',
    paddingLeft: 12,
  },
  fareLabel: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    color: '#8B5CF6',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  fareValue: {
    fontFamily: 'Inter',
    fontWeight: '900',
    fontSize: 30,
    color: '#4C1D95',
    letterSpacing: -1,
    includeFontPadding: false,
  },
  fareDistValue: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    color: '#5B21B6',
  },
  nightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  nightBadgeText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    color: '#92400E',
    letterSpacing: 0.5,
  },

  // Rider row
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 12,
  },
  avatarBorder: {
    width: 44, height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  riderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  riderName: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 12,
    color: '#6B7280',
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDE9FE',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  etaText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    color: '#5B21B6',
  },

  // Route card
  routeCard: {
    backgroundColor: '#F8F5FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  routeNodeCol: {
    width: 14,
    alignItems: 'center',
    paddingTop: 4,
  },
  pickupDot: {
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  routeLine: {
    width: 1.5,
    height: 22,
    backgroundColor: '#C4B5FD',
    marginTop: 3,
  },
  dropDot: {
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: '#7C3AED',
  },
  routeTextCol: {
    flex: 1,
    gap: 2,
  },
  routeLabel: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    color: '#8B5CF6',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  routeAddress: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
  },

  // Accept button
  acceptBtn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 8,
  },
  acceptBtnText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Decline button
  declineBtn: {
    width: '100%',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineBtnText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#94A3B8',
  },
});
