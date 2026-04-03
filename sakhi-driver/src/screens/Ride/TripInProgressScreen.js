import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, Vibration, Image, ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import SmartMapView from '../../components/SmartMapView';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import client from '../../api/client';
import ChatModal from '../../components/ChatModal';
import { useSocket } from '../../context/SocketContext';
import MonogramAvatar from '../../components/MonogramAvatar';

const MAP_STYLE = [
  { featureType: 'all', stylers: [{ saturation: -70 }] },
  { featureType: 'road', stylers: [{ color: '#e8e1f5' }] },
  { featureType: 'water', stylers: [{ color: '#c8bef0' }] },
];

export default function TripInProgressScreen({ navigation, route }) {
  const { ride } = route.params ?? {};
  const { emit } = useSocket();
  const mapRef = useRef(null);
  const insets = useSafeAreaInsets();

  const [myLocation, setMyLocation] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);

  const dropoff = ride?.dropoff_coords ?? { latitude: 28.6280, longitude: 77.2300 };

  useEffect(() => {
    let locSubscription;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        locSubscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 20 },
          (loc) => setMyLocation(loc.coords),
        );
      } catch {
        // silently ignore emulator location errors
      }
    })();
    return () => { locSubscription?.remove(); };
  }, []);

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
              emit('ride:complete', { ride_id: ride?.ride_id });
              const coords = myLocation ?? dropoff;
              await client.post(`/rides/${ride?.ride_id}/complete`, {
                final_latitude: coords.latitude,
                final_longitude: coords.longitude,
              }).catch(() => {});
              Vibration.vibrate(200);
              navigation.replace('PaymentDetails', { ride });
            } catch (err) {
              Alert.alert('Error', 'Could not complete trip.');
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

          {/* Top Navigation Banner — 104px tall, two lines */}
          <View style={[s.topNavBanner, { marginTop: Math.max(insets.top, 16) }]}>
            {/* Left: icon + two-line text */}
            <View style={s.topNavLeft}>
              <View style={s.topNavIconBg}>
                <Feather name="navigation" size={16} color="#BEA3D8" style={{ transform: [{ rotate: '45deg' }] }} />
              </View>
              <View style={s.topNavTextBox}>
                <Text style={s.topNavTitle} numberOfLines={2}>
                  {ride?.dropoff_address || 'Navigating to Destination'}
                </Text>
                <Text style={s.topNavSub}>Heading to drop-off</Text>
              </View>
            </View>
            {/* Right: X close */}
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.closeBtnBox}>
              <Feather name="x" size={14} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* SOS Floating Pill — bottom-left of map */}
          <TouchableOpacity
            style={s.sosBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('SOSWarning', { location: myLocation })}
          >
            <Feather name="alert-circle" size={13} color="#FFFFFF" />
            <Text style={s.sosText}>SOS</Text>
          </TouchableOpacity>

        </View>
      </View>

      {/* ── BOTTOM SHEET (Bottom 38%) ── */}
      <View style={s.bottomSheet}>

        {/* Drag Handle */}
        <View style={s.dragHandleWrap}>
          <View style={s.dragHandle} />
        </View>

        {/* Rider & Status Row */}
        <View style={s.riderRow}>
          <View style={s.riderLeft}>

            {/* Avatar with rating badge */}
            <View style={s.avatarContainer}>
              <MonogramAvatar
                uri={ride?.rider_photo}
                name={ride?.rider_name}
                size={54}
                radius={14}
              />
              <View style={s.ratingBadge}>
                <MaterialIcons name="star" size={9} color="#F59E0B" />
                <Text style={s.ratingBadgeText}>{Number(ride?.rider_rating || 4.7).toFixed(1)}</Text>
              </View>
            </View>

            {/* Name + status pill */}
            <View style={s.riderInfo}>
              <Text style={s.riderName} numberOfLines={1} ellipsizeMode="tail">
                {ride?.rider_name || 'Priya S.'}
              </Text>
              <View style={s.tripStatusPill}>
                <Text style={s.tripStatusText}>TRIP IN PROGRESS</Text>
              </View>
            </View>

          </View>

          {/* Chat Button */}
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
              <Text style={s.destLabel}>DESTINATION</Text>
              <Text style={s.destAddress} numberOfLines={1} ellipsizeMode="tail">
                {ride?.dropoff_address || 'MG Road Metro Station'}
              </Text>
            </View>
          </View>
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity
          style={[s.primaryBtn, completing && { opacity: 0.7 }]}
          onPress={handleComplete}
          disabled={completing}
          activeOpacity={0.85}
        >
          {completing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.primaryBtnText}>Complete Trip</Text>
          )}
        </TouchableOpacity>

      </View>
    </View>

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
    backgroundColor: '#FCF8FF',
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
    shadowColor: '#7C3AED',
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
    backgroundColor: '#F0ECFA',
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
    backgroundColor: '#F0ECFA',
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
    color: '#4A4455',
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
    color: '#1C1A25',
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
    color: '#047857',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chatBtn: {
    width: 48, height: 48,
    backgroundColor: '#F6F1FF',
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
    backgroundColor: '#F6F1FF',
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
    color: '#7B7487',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  destAddress: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    color: '#1C1A25',
  },

  // Primary Action Button — 56px height, 12px radius per spec
  primaryBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#BEA3D8',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#630ED4',
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
});
