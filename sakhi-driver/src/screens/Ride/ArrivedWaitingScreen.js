import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Animated, Platform, Image, Modal,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import client from '../../api/client';
import ChatModal from '../../components/ChatModal';

const FREE_WAIT_SECONDS = 180; // 3 minutes free waiting

const MAP_STYLE = [
  { featureType: 'all', stylers: [{ saturation: -70 }] },
  { featureType: 'road', stylers: [{ color: '#e8e1f5' }] },
  { featureType: 'water', stylers: [{ color: '#c8bef0' }] },
];

export default function ArrivedWaitingScreen({ navigation, route }) {
  const { ride } = route.params ?? {};
  const insets = useSafeAreaInsets();

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
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString();
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const freeRemaining = Math.max(0, FREE_WAIT_SECONDS - elapsed);
  const waitProgress = Math.max(0, 1 - (elapsed / FREE_WAIT_SECONDS));

  const handleStartTrip = async () => {
    try {
      setLoading(true);
      // Removed OTP based on Figma spec for Arrived screen layout
      await client.post(`/rides/${ride?.ride_id}/start`, { otp: '0000' }).catch(() => {});
      navigation.replace('TripInProgress', { ride });
    } catch (err) {
      Alert.alert('Error', 'Could not start trip.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <View style={styles.root}>
      {/* ── MAP CONTAINER ────────────────────────────────────────────── */}
      <View style={styles.mapContainer}>
        <MapView
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          customMapStyle={MAP_STYLE}
          region={{ ...pickup, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
          scrollEnabled={false}
          zoomEnabled={false}
          pointerEvents="none"
        >
          {/* Stationary Auto Icon at Pickup */}
          <Marker coordinate={pickup}>
            <View style={styles.markerWrap}>
              <Animated.View style={[styles.markerPulseBg, { transform: [{ scale: pulseAnim }] }]} />
              <View style={styles.markerInnerBg}>
                <MaterialCommunityIcons name="car-side" size={16} color="#FFFFFF" />
              </View>
            </View>
          </Marker>
        </MapView>

        {/* ── OVERLAYS ON MAP ──────────────────────────────────────── */}
        <View style={styles.mapOverlays} pointerEvents="box-none">

          {/* Top Nav Shell */}
          <View style={[styles.topNavShell, { marginTop: Math.max(insets.top, 16) }]}>
            <Feather name="navigation" size={16} color="#BEA3D8" style={{ marginRight: 12 }} />
            <Text style={styles.topNavTitle}>Heading North on Broadway</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
              <Feather name="x" size={16} color="#BEA3D8" />
            </TouchableOpacity>
          </View>

          {/* Arrived Top Banner */}
          <View style={styles.arrivedBanner}>
            <View style={styles.arrivedIconBg}>
              <MaterialIcons name="location-on" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.arrivedTextBox}>
              <Text style={styles.currentPointLabel}>CURRENT POINT</Text>
              <Text style={styles.arrivedAtPickupText}>Arrived at Pickup</Text>
            </View>
          </View>

          {/* SOS Floating Button */}
          <View style={styles.floatingControlsRow}>
            <TouchableOpacity 
              style={styles.sosBtn} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('SOSWarning', { location: null })}
            >
              <Feather name="alert-triangle" size={14} color="#FFFFFF" />
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── BOTTOM SHEET (Fixed Layout 38%) ──────────────────────────── */}
      <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.handle} />

        <View style={styles.sheetContent}>
          
          {/* Rider Row */}
          <View style={styles.riderRow}>
            <View style={styles.riderRowLeft}>
              <View style={styles.avatarMainBox}>
                <View style={styles.avatarWrap}>
                  {ride?.rider_photo ? (
                    <Image source={{ uri: ride.rider_photo }} style={styles.avatarImage} />
                  ) : (
                    <Image source={{ uri: 'https://i.pravatar.cc/150?u=priya' }} style={styles.avatarImage} />
                  )}
                </View>
                {/* Purple Chat Badge — tappable to open chat */}
                <TouchableOpacity
                  style={styles.chatBadge}
                  onPress={() => setChatVisible(true)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="chat-processing-outline" size={10} color="#BEA3D8" />
                </TouchableOpacity>
              </View>

              <View style={styles.riderInfoCol}>
                <Text style={styles.riderName}>{ride?.rider_name || 'Priya S.'}</Text>
                <View style={styles.riderMetaRow}>
                  <MaterialIcons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.ratingText}>{Number(ride?.rider_rating || 4.7).toFixed(1)}</Text>
                </View>
              </View>
            </View>

            {/* ARRIVED Status Pill */}
            <View style={styles.arrivedPill}>
              <View style={styles.arrivedPillDot} />
              <Text style={styles.arrivedPillText}>ARRIVED</Text>
            </View>
          </View>

          {/* Waiting Timer Card */}
          <View style={styles.waitingCard}>
            <View style={styles.waitingTopRow}>
              <Text style={styles.waitingLabel}>FREE WAITING</Text>
              <Text style={styles.waitingTimeValue}>{formatTime(freeRemaining)}</Text>
            </View>
            <View style={styles.waitingBarTrack}>
              <Animated.View style={[styles.waitingBarFill, { flex: waitProgress }]} />
            </View>
            {elapsed >= FREE_WAIT_SECONDS && (
              <Text style={{ fontSize: 11, color: '#D97706', marginTop: 8, fontWeight: '600' }}>
                Wait charges apply
              </Text>
            )}
          </View>

          {/* Primary Action Button */}
          <View style={styles.actionBlock}>
            <TouchableOpacity 
              style={styles.primaryBtn} 
              onPress={handleStartTrip} 
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="play" size={24} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Start Trip</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </View>

    {/* ── Chat Modal ── */}
    <Modal
      visible={chatVisible}
      animationType="slide"
      transparent={false}
      presentationStyle="pageSheet"
      onRequestClose={() => setChatVisible(false)}
    >
      <ChatModal rideId={ride?.ride_id} onClose={() => setChatVisible(false)} />
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FCF8FF',
  },
  
  // -- MAP --
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapOverlays: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 24, // spacing for SOS
  },

  // Stationary Auto Icon
  markerWrap: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPulseBg: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(190, 163, 216, 0.4)',
  },
  markerInnerBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#BEA3D8',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },

  // -- FLOATING HEADER ELEMENTS --
  topNavShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  topNavTitle: {
    flex: 1,
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    color: '#BEA3D8',
    letterSpacing: -0.45,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  arrivedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 6,
  },
  arrivedIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#BEA3D8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    marginBottom: 4,
  },
  arrivedAtPickupText: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 20,
    color: '#1C1A25',
  },

  // Floating controls absolute at bottom of map bounds
  floatingControlsRow: {
    position: 'absolute',
    bottom: 24,
    left: 16,
  },
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#BA1A1A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    shadowColor: '#BA1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    gap: 8,
  },
  sosText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  // -- BOTTOM SHEET --
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingHorizontal: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: -16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 16,
  },
  handle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E0EF',
    alignSelf: 'center',
    marginBottom: 24,
  },
  sheetContent: {
    paddingBottom: 24,
  },
  
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  riderRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarMainBox: {
    position: 'relative',
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  chatBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E0EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  riderInfoCol: {
    justifyContent: 'center',
  },
  riderName: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    color: '#1C1A25',
    marginBottom: 4,
  },
  riderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 14,
    color: '#4A4455',
  },
  
  arrivedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: 'rgba(209, 250, 229, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  arrivedPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#BEA3D8',
  },
  arrivedPillText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    color: '#BEA3D8',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  waitingCard: {
    backgroundColor: '#F6F1FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  waitingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  waitingLabel: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    color: '#4A4455',
    letterSpacing: -0.3,
    textTransform: 'uppercase',
  },
  waitingTimeValue: {
    fontFamily: 'Inter',
    fontWeight: '900',
    fontSize: 18,
    color: '#BEA3D8',
  },
  waitingBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E0EF',
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  waitingBarFill: {
    height: '100%',
    backgroundColor: '#BEA3D8',
    opacity: 0.8,
    borderRadius: 4,
  },

  actionBlock: {
    alignItems: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: 64,
    backgroundColor: '#BEA3D8',
    borderRadius: 16,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 6,
  },
  primaryBtnText: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.45,
  },
});
