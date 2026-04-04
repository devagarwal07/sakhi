import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Animated, Platform, Image, Modal,
} from 'react-native';

import SmartMapView from '../../components/SmartMapView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSocket } from '../../context/SocketContext';
import { patchRideStatus } from '../../api/endpoints';
import ChatModal from '../../components/ChatModal';
import MonogramAvatar from '../../components/MonogramAvatar';

const FREE_WAIT_SECONDS = 180; // 3 minutes free waiting

const MAP_STYLE = [
  { featureType: 'all', stylers: [{ saturation: -70 }] },
  { featureType: 'road', stylers: [{ color: '#e8e1f5' }] },
  { featureType: 'water', stylers: [{ color: '#c8bef0' }] },
];

export default function ArrivedWaitingScreen({ navigation, route }) {
  const { ride } = route.params ?? {};
  const rideId = ride?.ride_id ?? ride?.id;
  const { emit } = useSocket();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const pickup = ride?.pickup_coords ?? { latitude: 28.6139, longitude: 77.2090 };

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const freeRemaining = Math.max(0, FREE_WAIT_SECONDS - elapsed);
  const isUrgent = freeRemaining < 60;

  // Countdown display
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString();
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  const waitProgressString = `${Math.max(0, (freeRemaining / FREE_WAIT_SECONDS) * 100)}%`;

  const handleStartTrip = async () => {
    try {
      setLoading(true);
      // REST PATCH — backend records in_progress, broadcasts ride:status_update to rider
      await patchRideStatus(rideId, 'in_progress');
      emit('ride:start', { ride_id: rideId });
      navigation.replace('TripInProgress', { ride });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error?.message ?? 'Could not start trip.');
    } finally {
      setLoading(false);
    }
  };

  const recenter = () => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({ ...pickup, latitudeDelta: 0.008, longitudeDelta: 0.008 }, 500);
    }
  };

  return (
    <>
    <View style={s.root}>
      {/* ── MAP SECTION (62%) ── */}
      <View style={s.mapSection}>
        <SmartMapView
          style={StyleSheet.absoluteFill}
          center={pickup}
          zoom={16}
          scrollEnabled={false}
          markers={[
            { id: 'pickup', latitude: pickup.latitude, longitude: pickup.longitude, color: '#BEA3D8', pulse: true },
          ]}
        />

        {/* ── OVERLAYS ── */}
        <View style={s.mapOverlays} pointerEvents="box-none">

          {/* Top Navigation Shell */}
          <View style={[s.topNavShell, { marginTop: Math.max(insets.top, 16) }]}>
            <View style={s.topNavLeft}>
              <Feather name="navigation" size={16} color="#BEA3D8" style={{ transform: [{ rotate: '45deg' }] }} />
              <Text style={s.topNavTitle} numberOfLines={1}>
                {ride?.pickup_address || 'Arrived at Pickup Point'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.closeBtn}>
              <Feather name="x" size={18} color="#BEA3D8" />
            </TouchableOpacity>
          </View>

          {/* Arrived Top Banner */}
          <View style={[s.arrivedBanner, { top: Math.max(insets.top, 16) + 80 }]}>
            <View style={s.arrivedIconBg}>
              <MaterialIcons name="location-on" size={24} color="#FFFFFF" />
            </View>
            <View style={s.arrivedTextBox}>
              <Text style={s.currentPointLabel}>CURRENT POINT</Text>
              <Text style={s.arrivedAtPickupText}>Arrived at Pickup</Text>
            </View>
          </View>

          {/* Bottom Map Controls */}
          <View style={s.bottomMapControls} pointerEvents="box-none">
            {/* SOS Floating Pill */}
            <TouchableOpacity 
              style={s.sosBtn} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('SOSWarning', {
                location: {
                  latitude: pickup.latitude,
                  longitude: pickup.longitude,
                  ride_id: rideId,
                },
              })}
            >
              <Feather name="alert-circle" size={14} color="#FFFFFF" />
              <Text style={s.sosText}>SOS</Text>
            </TouchableOpacity>

            {/* Recenter Map Layer Control */}
            <TouchableOpacity style={s.recenterBtn} onPress={recenter} activeOpacity={0.8}>
              <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#BEA3D8" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── BOTTOM SHEET (38%) ── */}
      <View style={s.bottomSheet}>
        {/* Drag Handle */}
        <View style={s.dragHandleWrap}>
           <View style={s.dragHandle} />
        </View>

        {/* Rider Row */}
        <View style={s.riderRow}>
          <View style={s.riderLeft}>
             <View style={s.avatarContainer}>
               <MonogramAvatar
                 uri={ride?.rider_photo}
                 name={ride?.rider_name}
                 size={56}
                 radius={14}
               />
               {/* Chat Badge Overlapping Avatar */}
               <TouchableOpacity style={s.chatBadge} onPress={() => setChatVisible(true)} activeOpacity={0.8}>
                 <MaterialCommunityIcons name="message-text-outline" size={10} color="#FFFFFF" />
               </TouchableOpacity>
             </View>
             
             <View style={s.riderDetails}>
                <Text style={s.riderName} numberOfLines={1} ellipsizeMode="tail">
                  {ride?.rider_name || 'Priya S.'}
                </Text>
                <View style={s.ratingRow}>
                  <MaterialIcons name="star" size={14} color="#F59E0B" />
                  <Text style={s.riderRating}>4.7</Text>
                </View>
             </View>
          </View>

          {/* ARRIVED Tag */}
          <View style={s.arrivedTag}>
            <View style={s.arrivedDot} />
            <Text style={s.arrivedTagText}>ARRIVED</Text>
          </View>
        </View>

        {/* Waiting Timer Card */}
        <View style={s.waitingTimerCard}>
          <View style={s.waitTopRow}>
            <Text style={[s.waitLabel, isUrgent && { color: '#EF4444' }]}>FREE WAITING REMAINING</Text>
            <Text style={[s.waitTimeText, isUrgent && { color: '#EF4444' }]}>{formatTime(freeRemaining)}</Text>
          </View>
          <View style={s.depletingBarContainer}>
            <View style={[s.depletingBar, 
              { right: `${100 - (freeRemaining / FREE_WAIT_SECONDS * 100)}%` },
              isUrgent && { backgroundColor: '#EF4444' }
            ]} />
          </View>
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity 
          style={s.primaryBtn} 
          onPress={handleStartTrip} 
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
             <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="play" size={24} color="#FFFFFF" />
              <Text style={s.primaryBtnText}>Start Trip</Text>
            </>
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
    backgroundColor: '#F5F0FF',
  },
  
  // ── MAP SECTION (62%) ──
  mapSection: {
    width: '100%',
    height: '62%',
  },
  mapOverlays: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },

  // Stationary Marker
  markerWrap: {
    width: 50, height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerPulseBg: {
    position: 'absolute',
    width: 48, height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(190, 163, 216, 0.3)',
  },
  markerInnerBg: {
    width: 40, height: 40,
    backgroundColor: '#BEA3D8',
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  // Top Nav Shell
  topNavShell: {
    position: 'absolute',
    left: 16, right: 16,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
  },
  topNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topNavTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 17,
    color: '#BEA3D8',
    letterSpacing: -0.45,
  },
  closeBtn: {
    padding: 4,
  },

  // Arrived Top Banner
  arrivedBanner: {
    position: 'absolute',
    left: '5%', right: '5%',
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 16,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 6,
  },
  arrivedIconBg: {
    width: 48, height: 48,
    backgroundColor: '#BEA3D8',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrivedTextBox: {
    flex: 1,
    justifyContent: 'center',
  },
  currentPointLabel: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    color: '#BEA3D8',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  arrivedAtPickupText: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 20,
    color: '#1E1B2E',
  },

  // Bottom Map Controls
  bottomMapControls: {
    position: 'absolute',
    bottom: 24,
    left: 24, right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sosBtn: {
    width: 80, height: 36,
    backgroundColor: '#BA1A1A',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#BA1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
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
  recenterBtn: {
    width: 48, height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // ── BOTTOM SHEET (38%) ──
  bottomSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: -16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 20,
    alignItems: 'center',
  },
  dragHandleWrap: {
    paddingTop: 12,
    paddingBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  dragHandle: {
    width: 48, height: 6,
    backgroundColor: '#E5E0EF',
    borderRadius: 3,
  },

  // Rider Row
  riderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24, // pull down closer to timer
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
  },
  avatar: {
    width: '100%', height: '100%',
    borderRadius: 16,
  },
  avatarFallback: {
    width: '100%', height: '100%',
    borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  chatBadge: {
    position: 'absolute',
    right: -6, bottom: -6,
    width: 22, height: 22,
    backgroundColor: '#BEA3D8',
    borderWidth: 2, borderColor: '#FFFFFF',
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  riderDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  riderName: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    color: '#1E1B2E',
    marginBottom: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  riderRating: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 14,
    color: '#64748B',
  },

  // ARRIVED Tag
  arrivedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1, borderColor: 'rgba(209, 250, 229, 0.5)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  arrivedDot: {
    width: 6, height: 6,
    backgroundColor: '#BEA3D8',
    borderRadius: 3,
  },
  arrivedTagText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 11,
    color: '#BEA3D8',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // Waiting Timer Card
  waitingTimerCard: {
    width: '100%',
    height: 76,
    backgroundColor: '#F5F0FF',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  waitTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waitLabel: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    color: '#64748B',
    letterSpacing: -0.3,
    textTransform: 'uppercase',
  },
  waitTimeText: {
    fontFamily: 'Inter',
    fontWeight: '900',
    fontSize: 18,
    color: '#BEA3D8',
  },
  depletingBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E0EF',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  depletingBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    backgroundColor: '#BEA3D8',
    opacity: 0.8,
    borderRadius: 4,
  },

  // Primary Button
  primaryBtn: {
    width: '100%',
    height: 64,
    backgroundColor: '#BEA3D8',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#10B981', // green tinted shadow optionally? or map #BEA3D8
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
    marginTop: 'auto',
    marginBottom: 30, // push up
  },
  primaryBtnText: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.45,
  },
});
