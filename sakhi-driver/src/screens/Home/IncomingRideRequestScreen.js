import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Alert, Dimensions, Platform, ScrollView
} from 'react-native';

import SmartMapView from '../../components/SmartMapView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSocket } from '../../context/SocketContext';
import MonogramAvatar from '../../components/MonogramAvatar';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

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
      Alert.alert('Oops', err.message ?? t('ride.couldNotAccept'));
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

      {/* TOP 50%: Map */}
      <View style={s.mapWrapper}>
        <SmartMapView
          style={StyleSheet.absoluteFill}
          center={{ latitude: mapRegion.latitude, longitude: mapRegion.longitude }}
          zoom={13}
          scrollEnabled={false}
          zoomEnabled={false}
          pointerEvents="none"
          markers={[
            { id: 'pickup', latitude: pickup_coords.latitude, longitude: pickup_coords.longitude, color: '#10B981' },
            { id: 'dropoff', latitude: dropoff_coords.latitude, longitude: dropoff_coords.longitude, color: isSubscription ? '#D97706' : '#9D58E0' },
          ]}
          polylines={[{
            coords: [pickup_coords, dropoff_coords],
            color: isSubscription ? '#D97706' : '#9D58E0',
            width: 4,
            dashed: true,
          }]}
        />
      </View>

      {/* TOP APP BAR */}
      <View style={[s.topAppBar, { paddingTop: Math.max(insets.top, 16), backgroundColor: theme.headerBg }]}>
        <TouchableOpacity style={s.iconBtn}>
          <Feather name="menu" size={24} color={theme.accentColor} />
        </TouchableOpacity>
        <Text style={[s.topAppTitle, { color: isSubscription ? '#92400E' : '#0F172A' }]}>
          {t(theme.titleKey)}
        </Text>
        <TouchableOpacity style={s.iconBtn}>
          <MaterialCommunityIcons name="history" size={24} color={theme.accentColor} />
        </TouchableOpacity>
      </View>

      {/* BOTTOM SHEET */}
      <Animated.View style={[s.bottomSheet, { backgroundColor: theme.sheetBg, transform: [{ translateY: slideUp }] }]}>
        <View style={[s.handle, { backgroundColor: isSubscription ? '#FCD34D' : '#E5E0EF' }]} />

        <ScrollView contentContainerStyle={s.bottomSheetContent} showsVerticalScrollIndicator={false}>

          {/* ── Subscription distinguishing header strip ── */}
          {isSubscription && (
            <View style={s.subHeaderStrip}>
              <View style={s.subHeaderLeft}>
                <MaterialCommunityIcons name="calendar-repeat" size={22} color="#92400E" />
                <View>
                  <Text style={s.subHeaderBadge}>{t('ride.subscriptionBadge')}</Text>
                  <Text style={s.subHeaderNote}>{t('ride.notRegularRide')}</Text>
                </View>
              </View>
            </View>
          )}

          {isSubscription && (
            <View style={s.subBanner}>
              <MaterialCommunityIcons name="repeat" size={14} color="#92400E" />
              <Text style={s.subBannerText}>
                {t('ride.recurringRide', { schedule: schedule_label ? ` · ${schedule_label}` : '' })}
              </Text>
            </View>
          )}

          {/* Countdown + Pulse Header */}
          <View style={s.pulseHeaderWrap}>
            {/* Countdown ring */}
            <View style={[
              s.countdownRing,
              { borderColor: countdown > 8 ? '#10B981' : countdown > 4 ? '#F59E0B' : '#EF4444' }
            ]}>
              <Animated.View style={[s.pulseIconWrap, { transform: [{ scale: bellPulse }] }]}>
                <View style={[s.pulseIconBg, { backgroundColor: theme.pulseIconBg }]} />
                <MaterialCommunityIcons name={theme.icon} size={20} color={theme.accentColor} />
              </Animated.View>
              <Text style={[s.countdownText, { color: countdown > 8 ? '#10B981' : countdown > 4 ? '#F59E0B' : '#EF4444' }]}>
                {countdown}s
              </Text>
            </View>
            <Text style={[s.pulseTitle, { color: isSubscription ? '#92400E' : '#1E1B2E' }]}>
              {t(isSubscription ? 'ride.subscriptionRequest' : 'ride.newRideRequest')}
            </Text>
            {/* Night fare badge */}
            {is_night_fare && (
              <View style={s.nightBadge}>
                <Text style={s.nightBadgeText}>{t('ride.nightFare')}</Text>
              </View>
            )}
          </View>

          {/* Ride Card */}
          <View style={[s.rideCard, isSubscription && s.rideCardSub]}>

            {/* Rider Row */}
            <View style={s.riderRow}>
              <View style={s.riderLeft}>
                <View style={[s.avatarBorder, isSubscription && { borderColor: '#FDE68A' }]}>
                  <MonogramAvatar uri={rider_photo} name={rider_name} size={52} radius={14} />
                </View>
                <View style={s.riderInfo}>
                  <Text style={s.riderName}>{rider_name}</Text>
                  <View style={s.ratingRow}>
                    <MaterialIcons name="star" size={14} color="#F59E0B" />
                    <Text style={s.ratingText}>{Number(rider_rating).toFixed(1)}</Text>
                  </View>
                </View>
              </View>
              <Text style={[s.fareValue, { color: theme.accentColor }]}>₹{fare}</Text>
            </View>

            {/* Route Info */}
            <View style={s.routeInfoBox}>
              <View style={s.routeNodes}>
                <View style={s.pickupNode} />
                <View style={s.routeLine} />
                <View style={s.dropoffNodeInner}>
                  <Feather name="map-pin" size={14} color={theme.accentColor} />
                </View>
              </View>
              <View style={s.routeTexts}>
                <View style={s.routeStop}>
                  <Text style={s.routeLabel}>{t('ride.pickup')}</Text>
                  <Text style={s.routeAddress} numberOfLines={1}>{pickup_address}</Text>
                </View>
                <View style={s.routeStop}>
                  <Text style={s.routeLabel}>{t('ride.dropOff')}</Text>
                  <Text style={s.routeAddress} numberOfLines={1}>{displayDropAddress}</Text>
                </View>
              </View>
            </View>

            {/* Trip Stats */}
            <View style={s.tripStatsRow}>
              <View style={s.statBox}>
                <Feather name="git-commit" size={16} color="#1E1B2E" style={{ transform: [{ rotate: '90deg' }] }} />
                <Text style={s.statText}>{t('ride.kmToPickup', { dist: distance_to_pickup_km })}</Text>
              </View>
              <View style={s.statBox}>
                <Feather name="clock" size={16} color="#1E1B2E" />
                <Text style={s.statText}>{t('ride.etaMin', { min: eta_to_pickup_min })}</Text>
              </View>
              {distance_km && (
                <View style={s.statBox}>
                  <Feather name="map" size={16} color="#1E1B2E" />
                  <Text style={s.statText}>{t('ride.kmTrip', { dist: distance_km })}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Accept Button */}
          <TouchableOpacity
            style={[s.acceptBtn, { backgroundColor: theme.accentColor }, accepting && { opacity: 0.7 }]}
            onPress={handleAccept}
            disabled={accepting || snoozing}
            activeOpacity={0.8}
          >
            <Text style={s.acceptBtnText}>{accepting ? t('common.accepting') : t('common.accept')}</Text>
          </TouchableOpacity>

          {/* Secondary: See Later (sub) or Decline (regular) */}
          {isSubscription ? (
            <TouchableOpacity
              style={s.seeLaterBtn}
              onPress={handleSeeLater}
              disabled={snoozing || accepting}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="clock-outline" size={16} color="#92400E" />
              <View>
                <Text style={s.seeLaterBtnText}>{snoozing ? t('ride.noted') : t('ride.seeLater')}</Text>
                <Text style={s.seeLaterBtnSub}>{t('ride.seeLaterSub')}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={s.declineBtn}
              onPress={handleDecline}
              disabled={accepting}
              activeOpacity={0.7}
            >
              <Text style={s.declineBtnText}>{t('common.decline')}</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: '#F5F0FF', zIndex: 9999 },
  mapWrapper: { width: '100%', height: '50%', position: 'absolute', top: 0, left: 0, right: 0 },

  topAppBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 90,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24,
    shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
  },
  iconBtn: { padding: 8 },
  topAppTitle: { fontFamily: 'Inter', fontWeight: '600', fontSize: 18, letterSpacing: -0.45 },

  bottomSheet: {
    position: 'absolute', left: 0, right: 0, top: '50%', bottom: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: -16 },
    shadowOpacity: 0.08, shadowRadius: 32, elevation: 16,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  bottomSheetContent: { paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center' },

  subHeaderStrip: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
  },
  subHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  subHeaderBadge: {
    fontSize: 13, fontWeight: '800', color: '#92400E',
    letterSpacing: 0.3, lineHeight: 18,
  },
  subHeaderNote: {
    fontSize: 11, fontWeight: '400', color: '#B45309',
    lineHeight: 16, marginTop: 1,
  },

  subBanner: {
    width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF9E8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 16, borderWidth: 1, borderColor: '#FDE68A',
  },
  subBannerText: { fontFamily: 'Inter', fontWeight: '600', fontSize: 12, color: '#92400E', flex: 1 },

  pulseHeaderWrap: { flexDirection: 'column', alignItems: 'center', marginBottom: 20, gap: 8 },
  countdownRing: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 3, alignItems: 'center', justifyContent: 'center', gap: 2,
    backgroundColor: '#FAFAFA',
  },
  countdownText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  pulseIconWrap: { position: 'relative', width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  pulseIconBg: { position: 'absolute', width: 32, height: 32, borderRadius: 16 },
  pulseTitle: { fontFamily: 'Inter', fontWeight: '800', fontSize: 20, letterSpacing: -0.5, marginTop: 4 },
  nightBadge: {
    backgroundColor: '#EDE9FE', borderRadius: 9999,
    paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)',
  },
  nightBadgeText: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },

  rideCard: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08, shadowRadius: 32, elevation: 6, marginBottom: 20,
  },
  rideCardSub: { borderWidth: 1.5, borderColor: '#FDE68A', shadowColor: 'rgba(217,119,6,0.5)' },

  riderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  riderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBorder: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#EDE9FA',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  riderInfo: { justifyContent: 'center' },
  riderName: { fontFamily: 'Inter', fontWeight: '700', fontSize: 16, lineHeight: 24, color: '#1E1B2E' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontFamily: 'Inter', fontWeight: '400', fontSize: 12, lineHeight: 16, color: '#1E1B2E' },
  fareValue: { fontFamily: 'Inter', fontWeight: '900', fontSize: 24, letterSpacing: -1.2 },

  routeInfoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 16 },
  routeNodes: { alignItems: 'center', width: 14, marginTop: 4 },
  pickupNode: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  routeLine: { width: 2, height: 32, backgroundColor: '#E5E0EF', marginVertical: 4 },
  dropoffNodeInner: { marginTop: -2, justifyContent: 'center', alignItems: 'center' },
  routeTexts: { flex: 1, gap: 12 },
  routeStop: { gap: 2 },
  routeLabel: { fontFamily: 'Inter', fontWeight: '500', fontSize: 12, color: '#1E1B2E', letterSpacing: 1.2, textTransform: 'uppercase' },
  routeAddress: { fontFamily: 'Inter', fontWeight: '600', fontSize: 14, color: '#1E1B2E' },

  tripStatsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statText: { fontFamily: 'Inter', fontWeight: '500', fontSize: 12, color: '#1E1B2E' },

  acceptBtn: {
    width: '100%', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15,
    elevation: 4, marginBottom: 12,
  },
  acceptBtnText: { fontFamily: 'Inter', fontWeight: '700', fontSize: 16, color: '#FFFFFF', letterSpacing: 0.5 },

  seeLaterBtn: {
    width: '100%', minHeight: 52, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    flexDirection: 'row', gap: 10,
    backgroundColor: '#FEF3C7', borderWidth: 1.5, borderColor: '#FDE68A', marginBottom: 20,
    paddingVertical: 10, paddingHorizontal: 16,
  },
  seeLaterBtnText: { fontFamily: 'Inter', fontWeight: '700', fontSize: 15, color: '#92400E', letterSpacing: 0.3 },
  seeLaterBtnSub: { fontFamily: 'Inter', fontWeight: '400', fontSize: 11, color: '#B45309', letterSpacing: 0.1, marginTop: 1 },

  declineBtn: {
    width: '100%', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', marginBottom: 20,
  },
  declineBtnText: { fontFamily: 'Inter', fontWeight: '600', fontSize: 15, color: '#EF4444', letterSpacing: 0.3 },
});
