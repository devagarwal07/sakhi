import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Animated, BackHandler, Modal, TextInput} from 'react-native';

import SmartMapView from '../../components/SmartMapView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSocket } from '../../context/SocketContext';
import { patchRideStatus, cancelRide } from '../../api/endpoints';
import ChatModal from '../../components/ChatModal';
import MonogramAvatar from '../../components/MonogramAvatar';
import { useTranslation } from 'react-i18next';
import CustomAlert from '../../utils/CustomAlert';

const FREE_WAIT_SECONDS = 180; // 3 minutes free waiting

const MAP_STYLE = [
  { featureType: 'all', stylers: [{ saturation: -70 }] },
  { featureType: 'road', stylers: [{ color: '#e8e1f5' }] },
  { featureType: 'water', stylers: [{ color: '#c8bef0' }] },
];

export default function ArrivedWaitingScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { ride } = route.params ?? {};
  const rideId = ride?.ride_id ?? ride?.id;
  const { emit } = useSocket();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const pickup = ride?.pickup_coords ?? { latitude: 28.6139, longitude: 77.2090 };

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Lock navigation — prevent back button from exiting active screen
  useEffect(() => {
    const backAction = () => true;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
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
    if (enteredPin.length !== 4) {
      setPinError('Please enter a 4-digit PIN');
      return;
    }
    try {
      setLoading(true);
      setPinError('');
      // REST PATCH — backend records in_progress, broadcasts ride:status_update to rider
      await patchRideStatus(rideId, 'in_progress', { pin: enteredPin });
      setPinModalVisible(false);
      emit('ride:start', { ride_id: rideId });
      navigation.replace('TripInProgress', { ride });
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message ?? 'Could not start trip.';
      setPinError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRide = () => {
    CustomAlert.alert(
      t('ride.cancelTitle', 'Cancel Ride?'),
      t('ride.cancelConfirmMsg', 'Are you sure you want to cancel/reject this ride assignment?'),
      [
        { text: t('common.no', 'No'), style: 'cancel' },
        {
          text: t('common.yes', 'Yes, Cancel'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelRide(rideId, 'Driver cancelled after arriving');
              navigation.reset({ index: 0, routes: [{ name: 'DriverHome' }] });
            } catch (err) {
              CustomAlert.alert('Error', err.response?.data?.error?.message ?? 'Could not cancel ride.');
            }
          }
        }
      ]
    );
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
            <TouchableOpacity onPress={handleCancelRide} style={s.closeBtn}>
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

      {/* ── BOTTOM SHEET — scrollable ── */}
      <View style={s.bottomSheet}>
        <View style={s.dragHandleWrap}>
          <View style={s.dragHandle} />
        </View>

        <ScrollView
          style={{ width: '100%' }}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Rider Row */}
          <View style={s.riderCard}>
            <View style={s.riderLeft}>
              <View style={s.avatarContainer}>
                <MonogramAvatar
                  uri={ride?.rider_photo}
                  name={ride?.rider_name}
                  size={48}
                  radius={12}
                />
                <TouchableOpacity style={s.chatBadge} onPress={() => setChatVisible(true)} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="message-text-outline" size={10} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <View style={s.riderDetails}>
                <Text style={s.riderName} numberOfLines={1}>{ride?.rider_name || 'Rider'}</Text>
                <View style={s.ratingRow}>
                  <MaterialIcons name="star" size={13} color="#F59E0B" />
                  <Text style={s.riderRating}>4.7 · Premium</Text>
                </View>
              </View>
            </View>
            <View style={s.arrivedTag}>
              <View style={s.arrivedDot} />
              <Text style={s.arrivedTagText}>ARRIVED</Text>
            </View>
          </View>

          {/* Waiting Timer Card */}
          <View style={s.waitingTimerCard}>
            <View style={s.waitTopRow}>
              <View>
                <Text style={s.waitLabelSmall}>FREE WAITING</Text>
                <Text style={[s.waitLabel, isUrgent && { color: '#EF4444' }]}>REMAINING</Text>
              </View>
              <Text style={[s.waitTimeText, isUrgent && { color: '#EF4444' }]}>{formatTime(freeRemaining)}</Text>
            </View>
            <View style={s.depletingBarContainer}>
              <View style={[
                s.depletingBar,
                { width: `${(freeRemaining / FREE_WAIT_SECONDS * 100).toFixed(1)}%` },
                isUrgent && { backgroundColor: '#EF4444' },
              ]} />
            </View>
          </View>

          {/* Primary Action */}
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => { setPinModalVisible(true); setEnteredPin(''); setPinError(''); }}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="play" size={20} color="#FFFFFF" />
                <Text style={s.primaryBtnText}>Start Trip</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity style={s.cancelBtn} onPress={handleCancelRide} activeOpacity={0.8}>
            <Text style={s.cancelBtnText}>{t('ride.cancelRide', 'Cancel Ride')}</Text>
          </TouchableOpacity>
        </ScrollView>
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

    {/* ── PIN VERIFICATION MODAL ── */}
    <Modal
      visible={pinModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setPinModalVisible(false)}
    >
      <View style={s.modalOverlay}>
        <View style={s.modalContainer}>
          <TouchableOpacity 
            style={s.modalCloseBtn} 
            onPress={() => setPinModalVisible(false)}
          >
            <Feather name="x" size={20} color="#6B7280" />
          </TouchableOpacity>

          <View style={s.modalHeader}>
            <View style={s.modalIconBg}>
              <MaterialCommunityIcons name="shield-check" size={28} color="#7C3AED" />
            </View>
            <Text style={s.modalTitle}>{t('ride.enterPinTitle', 'Enter Start PIN')}</Text>
            <Text style={s.modalSubtitle}>
              {t('ride.enterPinDesc', 'Ask the rider for the 4-digit PIN shown on their screen to start the trip.')}
            </Text>
          </View>

          <TextInput
            style={[s.pinTextInput, pinError !== '' && { borderColor: '#EF4444', color: '#EF4444' }]}
            value={enteredPin}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
              setEnteredPin(cleaned);
              if (cleaned.length === 4) {
                setPinError('');
              }
            }}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="0 0 0 0"
            placeholderTextColor="#DDD6FE"
            secureTextEntry={false}
            autoFocus={true}
          />

          {pinError !== '' && (
            <Text style={s.pinErrorText}>{pinError}</Text>
          )}

          <View style={s.modalActions}>
            <TouchableOpacity
              style={[s.modalSubmitBtn, loading && { opacity: 0.6 }]}
              onPress={handleStartTrip}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={s.modalSubmitBtnText}>{t('ride.startTripBtn', 'Verify & Start Trip')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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

  // ── BOTTOM SHEET ──
  bottomSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 20,
    alignItems: 'center',
  },
  dragHandleWrap: {
    paddingTop: 10,
    paddingBottom: 4,
    width: '100%',
    alignItems: 'center',
  },
  dragHandle: {
    width: 40, height: 4,
    backgroundColor: '#DDD6FE',
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },

  // Rider card
  riderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F5FF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  riderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 48, height: 48,
    borderRadius: 12,
    backgroundColor: '#EDE9FA',
    position: 'relative',
    overflow: 'visible',
  },
  chatBadge: {
    position: 'absolute',
    right: -6, bottom: -6,
    width: 22, height: 22,
    backgroundColor: '#7C3AED',
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
    fontSize: 16,
    color: '#1E1B2E',
    marginBottom: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  riderRating: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 12,
    color: '#6B7280',
  },

  // ARRIVED Tag
  arrivedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    gap: 5,
  },
  arrivedDot: {
    width: 6, height: 6,
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  arrivedTagText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 11,
    color: '#059669',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Waiting Timer Card
  waitingTimerCard: {
    width: '100%',
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  waitTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  waitLabelSmall: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 10,
    color: '#8B5CF6',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  waitLabel: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 11,
    color: '#4C1D95',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  waitTimeText: {
    fontFamily: 'Inter',
    fontWeight: '900',
    fontSize: 32,
    color: '#7C3AED',
    letterSpacing: -1,
  },
  depletingBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#DDD6FE',
    borderRadius: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  depletingBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    backgroundColor: '#7C3AED',
    borderRadius: 3,
  },

  // Primary Button
  primaryBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 10,
  },
  primaryBtnText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#FFFFFF',
  },
  cancelBtn: {
    width: '100%',
    height: 46,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#DC2626',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 46, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    position: 'relative',
    shadowColor: '#1E1B2E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 10,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  modalHeader: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  modalIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 20,
    color: '#1E1B2E',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  pinTextInput: {
    width: '70%',
    height: 64,
    backgroundColor: '#F9F8FF',
    borderWidth: 2,
    borderColor: '#E9D5FF',
    borderRadius: 16,
    textAlign: 'center',
    fontSize: 32,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 12,
    paddingLeft: 12,
    marginVertical: 16,
    alignSelf: 'center',
  },
  pinErrorText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalActions: {
    width: '100%',
  },
  modalSubmitBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modalSubmitBtnText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
