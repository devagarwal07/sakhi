import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, Vibration, Image, ActivityIndicator,
  Animated, Dimensions,
} from 'react-native';

import SmartMapView from '../../components/SmartMapView';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { patchRideStatus } from '../../api/endpoints';
import ChatModal from '../../components/ChatModal';
import { useSocket } from '../../context/SocketContext';
import MonogramAvatar from '../../components/MonogramAvatar';
import { useTranslation } from 'react-i18next';

const MAP_STYLE = [
  { featureType: 'all', stylers: [{ saturation: -70 }] },
  { featureType: 'road', stylers: [{ color: '#e8e1f5' }] },
  { featureType: 'water', stylers: [{ color: '#c8bef0' }] },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TripInProgressScreen({ navigation, route }) {
  const { ride } = route.params ?? {};
  const rideId = ride?.ride_id ?? ride?.id;
  const { emit, on, off, incomingRide, acceptRide, rejectRide } = useSocket();
  const mapRef = useRef(null);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [myLocation, setMyLocation]       = useState(null);
  const [completing, setCompleting]       = useState(false);
  const [chatVisible, setChatVisible]     = useState(false);

  // Pre-dispatch state — shown when driver is ~5 min from dropoff
  const [preDispatch, setPreDispatch]     = useState(null);   // { eta_min, dist_to_dropoff_km }

  // Incoming ride request countdown (30 s)
  const [countdown, setCountdown]         = useState(30);
  const countdownRef                      = useRef(null);
  const slideAnim                         = useRef(new Animated.Value(300)).current;

  const dropoff = ride?.dropoff_coords ?? { latitude: 28.6280, longitude: 77.2300 };

  // ── Incoming request card slide-in animation ──────────────────────────────
  const showRequestCard = (show) => {
    Animated.spring(slideAnim, {
      toValue: show ? 0 : 300,
      useNativeDriver: true,
      tension: 80, friction: 12,
    }).start();
  };

  // ── Pre-dispatch eligible listener ────────────────────────────────────────
  useEffect(() => {
    const handler = (data) => setPreDispatch(data);
    on('pre_dispatch_eligible', handler);
    return () => off('pre_dispatch_eligible', handler);
  }, [on, off]);

  // ── Incoming ride request during active trip ──────────────────────────────
  useEffect(() => {
    if (incomingRide) {
      setCountdown(30);
      showRequestCard(true);
      Vibration.vibrate([0, 300, 100, 300]);
      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(countdownRef.current);
            showRequestCard(false);
            // timeout — matching engine will move to next driver automatically
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      clearInterval(countdownRef.current);
      showRequestCard(false);
    }
    return () => clearInterval(countdownRef.current);
  }, [incomingRide]);

  // ── Handle accept while in_progress ──────────────────────────────────────
  const handleAcceptNextRide = async () => {
    if (!incomingRide) return;
    clearInterval(countdownRef.current);
    showRequestCard(false);
    try {
      await acceptRide(incomingRide.ride_id);
      // Show a brief confirmation chip — driver stays on current trip
      Alert.alert(
        'Next Ride Queued ✓',
        `You will be navigated to ${incomingRide.pickup_address} after this trip ends.`,
        [{ text: 'OK' }],
      );
    } catch (err) {
      Alert.alert('Could not accept', err.message);
    }
  };

  const handleDeclineNextRide = () => {
    if (!incomingRide) return;
    clearInterval(countdownRef.current);
    rejectRide(incomingRide.ride_id);
    showRequestCard(false);
  };

  // ── GPS location tracking ─────────────────────────────────────────────────
  useEffect(() => {
    let locSubscription;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        locSubscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 20 },
          (loc) => {
            setMyLocation(loc.coords);
            // Stream live location to rider via socket
            emit('driver:location_update', {
              ride_id: rideId,
              lat:     loc.coords.latitude,
              lng:     loc.coords.longitude,
              heading: loc.coords.heading ?? 0,
              speed:   loc.coords.speed   ?? 0,
            });
          },
        );
      } catch {
        // silently ignore emulator location errors
      }
    })();
    return () => { locSubscription?.remove(); };
  }, [rideId]);

  const region = myLocation
    ? {
        latitude: (myLocation.latitude + dropoff.latitude) / 2,
        longitude: (myLocation.longitude + dropoff.longitude) / 2,
        latitudeDelta: Math.abs(myLocation.latitude - dropoff.latitude) * 2.5 + 0.01,
        longitudeDelta: Math.abs(myLocation.longitude - dropoff.longitude) * 2.5 + 0.01,
      }
    : { ...dropoff, latitudeDelta: 0.02, longitudeDelta: 0.02 };

  const recenter = () => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(region, 500);
    }
  };

  const handleComplete = () => {
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
              // PATCH status — backend records final coords + creates driver_earnings row
              await patchRideStatus(rideId, 'completed');
              emit('ride:complete', { ride_id: rideId });
              Vibration.vibrate(200);
              navigation.replace('PaymentDetails', { ride });
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error?.message ?? 'Could not complete trip.');
              setCompleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <>
    <View style={s.root}>

      {/* ── MAP SECTION (Top 62%) ── */}
      <View style={s.mapSection}>
        <SmartMapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          center={myLocation ?? dropoff}
          zoom={14}
          markers={[
            ...(myLocation ? [{ id: 'driver', latitude: myLocation.latitude, longitude: myLocation.longitude, color: '#964ADF', pulse: true }] : []),
            { id: 'dropoff', latitude: dropoff.latitude, longitude: dropoff.longitude, color: '#10B981', label: '⚑' },
          ]}
          polylines={myLocation ? [{
            coords: [myLocation, dropoff],
            color: '#964ADF',
            width: 6,
          }] : []}
        />

        {/* ── OVERLAYS ── */}
        <View style={s.mapOverlays} pointerEvents="box-none">

          {/* Top Navigation Banner */}
          <View style={[s.topNavBanner, { marginTop: Math.max(insets.top, 16) }]}>
            <View style={s.topNavLeft}>
              <View style={s.topNavIconBg}>
                <Feather name="navigation" size={16} color="#BEA3D8" style={{ transform: [{ rotate: '45deg' }] }} />
              </View>
              <View style={s.topNavTextBox}>
                <Text style={s.topNavTitle} numberOfLines={2}>
                  {ride?.dropoff_address || 'Navigating to Destination'}
                </Text>
                {/* Pre-dispatch chip — shown when <1.7 km from dropoff */}
                {preDispatch ? (
                  <View style={s.preDispatchChip}>
                    <Text style={s.preDispatchChipText}>
                      🔔 Next ride incoming in ~{preDispatch.eta_min} min
                    </Text>
                  </View>
                ) : (
                  <Text style={s.topNavSub}>Heading to drop-off</Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.closeBtnBox}>
              <Feather name="x" size={14} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* SOS Floating Pill */}
          <TouchableOpacity
            style={s.sosBtn}
            activeOpacity={0.8}
            onPress={() => {
              const loc = myLocation ?? dropoff;
              navigation.navigate('SOSWarning', {
                location: { latitude: loc.latitude, longitude: loc.longitude, ride_id: rideId },
              });
            }}
          >
            <Feather name="alert-circle" size={13} color="#FFFFFF" />
            <Text style={s.sosText}>SOS</Text>
          </TouchableOpacity>

        </View>
      </View>

      {/* ── BOTTOM SHEET (Bottom 38%) ── */}
      <View style={s.bottomSheet}>

        <View style={s.dragHandleWrap}><View style={s.dragHandle} /></View>

        {/* Rider & Status Row */}
        <View style={s.riderRow}>
          <View style={s.riderLeft}>
            <View style={s.avatarContainer}>
              <MonogramAvatar uri={ride?.rider_photo} name={ride?.rider_name} size={54} radius={14} />
              <View style={s.ratingBadge}>
                <MaterialIcons name="star" size={9} color="#F59E0B" />
                <Text style={s.ratingBadgeText}>{Number(ride?.rider_rating || 4.7).toFixed(1)}</Text>
              </View>
            </View>
            <View style={s.riderInfo}>
              <Text style={s.riderName} numberOfLines={1} ellipsizeMode="tail">
                {ride?.rider_name || 'Priya S.'}
              </Text>
              <View style={s.tripStatusPill}>
                <Text style={s.tripStatusText}>{t('ride.tripInProgress')}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={s.chatBtn} activeOpacity={0.8} onPress={() => setChatVisible(true)}>
            <MaterialCommunityIcons name="chat-outline" size={20} color="#BEA3D8" />
          </TouchableOpacity>
        </View>

        {/* Trip Details Card */}
        <View style={s.tripDetailsSection}>
          <View style={s.destinationCard}>
            <View style={s.destIconBox}>
              <MaterialIcons name="location-on" size={20} color="#BEA3D8" />
            </View>
            <View style={s.destTextBox}>
              <Text style={s.destLabel}>{t('ride.destination')}</Text>
              <Text style={s.destAddress} numberOfLines={1} ellipsizeMode="tail">
                {ride?.dropoff_address || 'MG Road Metro Station'}
              </Text>
            </View>
          </View>
        </View>

        {/* Complete Trip Button */}
        <TouchableOpacity
          style={[s.primaryBtn, completing && { opacity: 0.7 }]}
          onPress={handleComplete}
          disabled={completing}
          activeOpacity={0.85}
        >
          {completing
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={s.primaryBtnText}>{t('ride.completeTrip')}</Text>
          }
        </TouchableOpacity>

      </View>
    </View>

    {/* ── INCOMING NEXT RIDE REQUEST OVERLAY (pre-dispatch) ── */}
    {incomingRide && (
      <Animated.View style={[s.nextRideOverlay, { transform: [{ translateY: slideAnim }] }]}>
        {/* Header */}
        <View style={s.nextRideHeader}>
          <View style={s.nextRidePill}>
            {incomingRide.is_pre_dispatch
              ? <Text style={s.nextRidePillText}>🕐 NEXT RIDE — IN {incomingRide.eta_to_finish_min ?? '~5'} MIN</Text>
              : <Text style={s.nextRidePillText}>⚡ NEW RIDE REQUEST</Text>
            }
          </View>
          {/* Countdown ring */}
          <View style={s.countdownCircle}>
            <Text style={s.countdownText}>{countdown}</Text>
          </View>
        </View>

        {/* Route info */}
        <View style={s.nextRideRoute}>
          <View style={s.routeRow}>
            <View style={s.routeDot} />
            <Text style={s.routeAddress} numberOfLines={2}>{incomingRide.pickup_address}</Text>
          </View>
          <View style={s.routeConnector} />
          <View style={s.routeRow}>
            <View style={[s.routeDot, s.routeDotDrop]} />
            <Text style={s.routeAddress} numberOfLines={2}>{incomingRide.drop_address}</Text>
          </View>
        </View>

        {/* Stats strip */}
        <View style={s.nextRideStats}>
          <View style={s.statItem}>
            <Text style={s.statValue}>₹{incomingRide.estimated_fare ?? '—'}</Text>
            <Text style={s.statLabel}>Fare</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>{incomingRide.distance_km ?? '—'} km</Text>
            <Text style={s.statLabel}>Distance</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>~{incomingRide.total_wait_min ?? '—'} min</Text>
            <Text style={s.statLabel}>Your wait</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={s.nextRideActions}>
          <TouchableOpacity style={s.declineBtn} onPress={handleDeclineNextRide} activeOpacity={0.8}>
            <Feather name="x" size={20} color="#BA1A1A" />
            <Text style={s.declineBtnText}>{t('common.decline')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.acceptBtn} onPress={handleAcceptNextRide} activeOpacity={0.85}>
            <Feather name="check" size={20} color="#FFFFFF" />
            <Text style={s.acceptBtnText}>
              {incomingRide.is_pre_dispatch ? 'Queue Ride' : 'Accept'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    )}

    {chatVisible && (
      <ChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        rideId={ride?.ride_id}
        riderName={ride?.rider_name}
      />
    )}
    </>
  );
}


const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },

  // ── MAP SECTION (62%) ──
  mapSection: {
    position: 'absolute',
    left: 0, right: 0,
    top: '0%', bottom: '38%',
    backgroundColor: '#DCD8E6',
  },
  mapOverlays: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },

  // Driver marker ring
  driverRing: {
    width: 26, height: 26,
    borderRadius: 13,
    borderWidth: 6, borderColor: '#964ADF',
    alignItems: 'center', justifyContent: 'center',
  },
  driverDot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: '#964ADF',
  },

  // Dropoff marker
  dropoffMarker: {
    width: 36, height: 36,
    backgroundColor: '#10B981',
    borderRadius: 18,
    borderWidth: 3, borderColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },

  // Top Navigation Banner — 104px, two-line
  topNavBanner: {
    position: 'absolute',
    left: 16, right: 16,
    height: 104,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
  },
  topNavLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  topNavIconBg: {
    width: 40, height: 40,
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  topNavTextBox: {
    flex: 1,
    gap: 4,
  },
  topNavTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 28,
    color: '#4C1D95',
    letterSpacing: -0.45,
  },
  topNavSub: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
  },
  closeBtnBox: {
    width: 40, height: 40,
    borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },

  // SOS Pill — absolute bottom-left of map
  sosBtn: {
    position: 'absolute',
    left: 24, bottom: 24,
    width: 80, height: 32,
    backgroundColor: '#BA1A1A',
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#BA1A1A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 4,
  },
  sosText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  // ── BOTTOM SHEET (38%) ──
  bottomSheet: {
    position: 'absolute',
    left: 0, right: 0,
    top: '62%', bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: -16 },
    shadowOpacity: 0.12,
    shadowRadius: 48,
    elevation: 20,
    paddingHorizontal: 32,
  },

  // Drag handle
  dragHandleWrap: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  dragHandle: {
    width: 48, height: 4,
    backgroundColor: '#E5E0EF',
    borderRadius: 9999,
  },

  // Rider Row
  riderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 32,
  },
  riderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    width: 56, height: 56,
    borderRadius: 16,
    backgroundColor: '#EDE9FA',
    position: 'relative',
    overflow: 'visible',
  },
  avatar: {
    width: 56, height: 56,
    borderRadius: 16,
  },
  avatarFallback: {
    width: 56, height: 56,
    borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#EDE9FA',
  },
  // Gray rating badge overlapping avatar bottom-right
  ratingBadge: {
    position: 'absolute',
    right: -4, bottom: -4,
    backgroundColor: '#E5E0EF',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  ratingBadgeText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    lineHeight: 15,
    color: '#64748B',
    textAlign: 'center',
  },
  riderInfo: {
    flex: 1,
    gap: 4,
  },
  riderName: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 20,
    lineHeight: 28,
    color: '#1E1B2E',
    letterSpacing: -0.5,
  },
  tripStatusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 9999,
    paddingVertical: 2,
    paddingHorizontal: 10,
  },
  tripStatusText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    lineHeight: 15,
    color: '#059669',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chatBtn: {
    width: 48, height: 48,
    backgroundColor: '#F5F0FF',
    borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },

  // Trip Details Card
  tripDetailsSection: {
    width: '100%',
    marginBottom: 32,
  },
  destinationCard: {
    width: '100%',
    height: 72,
    backgroundColor: '#F5F0FF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 16,
  },
  destIconBox: {
    width: 40, height: 40,
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  destTextBox: { flex: 1 },
  destLabel: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    lineHeight: 15,
    color: '#94A3B8',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  destAddress: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    color: '#1E1B2E',
  },

  // Primary Action Button — 56px height, 12px radius per spec
  primaryBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#BEA3D8',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  primaryBtnText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // ── Pre-dispatch chip (shown in top nav when ~5 min from dropoff) ──────────
  preDispatchChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    marginTop: 2,
  },
  preDispatchChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },

  // ── Next-ride incoming card (slides up from bottom) ───────────────────────
  nextRideOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    shadowColor: 'rgba(124,58,237,1)',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 24,
    gap: 16,
  },
  nextRideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextRidePill: {
    backgroundColor: '#EDE9FE',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  nextRidePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4C1D95',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  countdownCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#BEA3D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4C1D95',
  },

  // Route rows
  nextRideRoute: { gap: 6 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  routeDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#10B981', marginTop: 4, flexShrink: 0,
  },
  routeDotDrop: { backgroundColor: '#BEA3D8' },
  routeConnector: {
    width: 2, height: 12, backgroundColor: '#E5E0EF',
    marginLeft: 4, marginVertical: -2,
  },
  routeAddress: {
    flex: 1, fontSize: 13, fontWeight: '600', color: '#1E1B2E', lineHeight: 20,
  },

  // Stats strip
  nextRideStats: {
    flexDirection: 'row',
    backgroundColor: '#F5F0FF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '800', color: '#1E1B2E' },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#94A3B8', marginTop: 2, textTransform: 'uppercase' },
  statDivider: { width: 1, height: 28, backgroundColor: '#E5E0EF' },

  // Accept / Decline
  nextRideActions: { flexDirection: 'row', gap: 12 },
  declineBtn: {
    flex: 1, height: 52, borderRadius: 14,
    backgroundColor: '#FFF2F0', borderWidth: 1.5, borderColor: 'rgba(186,26,26,0.2)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  declineBtnText: { fontSize: 15, fontWeight: '700', color: '#BA1A1A' },
  acceptBtn: {
    flex: 2, height: 52, borderRadius: 14,
    backgroundColor: '#BEA3D8',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#BEA3D8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  acceptBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
