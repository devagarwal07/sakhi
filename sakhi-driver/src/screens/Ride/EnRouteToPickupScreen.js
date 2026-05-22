import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, Linking, Image, Dimensions, Platform, Modal, ActivityIndicator, BackHandler,
} from 'react-native';

import SmartMapView from '../../components/SmartMapView';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSocket } from '../../context/SocketContext';
import { patchRideStatus, callRider, cancelRide } from '../../api/endpoints';
import ChatModal from '../../components/ChatModal';
import MonogramAvatar from '../../components/MonogramAvatar';
import { useTranslation } from 'react-i18next';
import { startLocationTracking } from '../../services/locationTask';
import StartNavigationButton from '../../components/StartNavigationButton';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

const MAP_STYLE = [
  { featureType: 'all', stylers: [{ saturation: -70 }] },
  { featureType: 'road', stylers: [{ color: '#e8e1f5' }] },
  { featureType: 'water', stylers: [{ color: '#c8bef0' }] },
];

export default function EnRouteToPickupScreen({ navigation, route }) {
  const { ride } = route.params ?? {};
  const { emit } = useSocket();
  const { t } = useTranslation();
  const mapRef = useRef(null);
  const insets = useSafeAreaInsets();

  const [myLocation, setMyLocation] = useState(null);
  const [chatVisible, setChatVisible] = useState(false);

  const pickup = ride?.pickup_coords
    ? {
        latitude:  ride.pickup_coords.latitude  ?? ride.pickup_coords.lat  ?? 28.6139,
        longitude: ride.pickup_coords.longitude ?? ride.pickup_coords.lng  ?? 77.2090,
      }
    : { latitude: 28.6139, longitude: 77.2090 };

  // Nav-service expects { lat, lng }
  const pickupNavCoords = { lat: pickup.latitude, lng: pickup.longitude };

  const rideId = ride?.ride_id ?? ride?.id;

  // Lock navigation — prevent back button from exiting active screen
  useEffect(() => {
    const backAction = () => true;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  // After accept, ride is `assigned` — backend requires `driver_en_route` before `arrived`
  useEffect(() => {
    if (!rideId) return;
    (async () => {
      try {
        await startLocationTracking('Navigation Active', 'Navigating to Pickup: ' + (ride?.pickup_address || ''));
        await patchRideStatus(rideId, 'driver_en_route');
      } catch {
        // Already transitioned or race — user can still try "I've arrived"
      }
    })();
  }, [rideId]);

  // ── Get initial location ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          setMyLocation(loc.coords);
        } catch {
          const last = await Location.getLastKnownPositionAsync();
          if (last) setMyLocation(last.coords);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // ── Live location stream → socket emit every 5s (rider sees driver moving) ───
  useEffect(() => {
    let locSubscription;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        locSubscription = await Location.watchPositionAsync(
          {
            accuracy:         Location.Accuracy.High,
            timeInterval:     5000,
            distanceInterval: 20,
          },
          (loc) => {
            setMyLocation(loc.coords);
            emit('driver:location_update', {
              ride_id: rideId,
              lat:     loc.coords.latitude,
              lng:     loc.coords.longitude,
              heading: loc.coords.heading ?? 0,
              speed:   loc.coords.speed   ?? 0,
            });
          }
        );
      } catch {
        // Location unavailable (emulator / permissions)
      }
    })();

    return () => { locSubscription?.remove(); };
  }, [rideId]);

  const region = myLocation
    ? {
        latitude: (myLocation.latitude + pickup.latitude) / 2,
        longitude: (myLocation.longitude + pickup.longitude) / 2,
        latitudeDelta: Math.abs(myLocation.latitude - pickup.latitude) * 2.5 + 0.01,
        longitudeDelta: Math.abs(myLocation.longitude - pickup.longitude) * 2.5 + 0.01,
      }
    : { ...pickup, latitudeDelta: 0.02, longitudeDelta: 0.02 };

  const [calling, setCalling] = useState(false);

  const handleCall = async () => {
    if (!rideId) {
      Alert.alert('Call Failed', 'No active ride to make a call on.');
      return;
    }
    setCalling(true);
    try {
      // Exotel masked call via driver endpoints
      await callRider(rideId);
      Alert.alert(
        '📞 Calling Rider',
        'Exotel will connect you to the rider via a masked number. Your number stays private.',
        [{ text: 'OK' }],
      );
    } catch (err) {
      const msg = err.response?.data?.error?.message;
      if (msg === 'Calling service is not configured.') {
        // Fallback to direct dial only if Exotel env vars are missing
        if (ride?.rider_phone) {
          Linking.openURL(`tel:${ride.rider_phone}`);
        } else {
          Alert.alert('Call Failed', 'Rider phone number is unavailable.');
        }
      } else {
        Alert.alert('Call Failed', msg ?? 'Could not connect call. Use in-app chat instead.');
      }
    } finally {
      setCalling(false);
    }
  };

  const handleArrived = async () => {
    try {
      // REST PATCH — triggers rideService.updateRideStatus which broadcasts to rider
      await patchRideStatus(rideId, 'arrived');
      emit('ride:arrived', { ride_id: rideId });
      navigation.replace('ArrivedWaiting', { ride });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error?.message ?? 'Could not update arrival status.');
    }
  };

  const handleCancelRide = () => {
    Alert.alert(
      t('ride.cancelTitle', 'Cancel Ride?'),
      t('ride.cancelConfirmMsg', 'Are you sure you want to cancel/reject this ride assignment?'),
      [
        { text: t('common.no', 'No'), style: 'cancel' },
        {
          text: t('common.yes', 'Yes, Cancel'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelRide(rideId, 'Driver cancelled during en route');
              navigation.reset({ index: 0, routes: [{ name: 'DriverHome' }] });
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error?.message ?? 'Could not cancel ride.');
            }
          }
        }
      ]
    );
  };

  const recenter = () => {
    if (myLocation && mapRef.current) {
      mapRef.current.animateToRegion(region, 500);
    }
  };

  return (
    <>
    <View style={s.root}>
      {/* Map Section (62%) */}
      <View style={s.mapSection}>
        <SmartMapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          center={myLocation ?? pickup}
          zoom={14}
          markers={[
            ...(myLocation ? [{ id: 'driver', markerType: 'auto', pulse: true, latitude: myLocation.latitude, longitude: myLocation.longitude, color: '#8031CC', bearing: myLocation.bearing || 0 }] : []),
            { id: 'pickup', markerType: 'pickup', latitude: pickup.latitude, longitude: pickup.longitude, color: '#10B981' },
          ]}
          polylines={myLocation ? [{
            coords: [myLocation, pickup],
            color: '#8031CC',
            width: 5,
            animated: true,
          }] : []}
        />

        {/* OVERLAYS */}
        <View style={s.mapOverlays} pointerEvents="box-none">
          
          {/* Top Navigation Shell */}
          <View style={[s.topNavShell, { marginTop: Math.max(insets.top, 16) }]}>
            <View style={s.topNavLeft}>
              <Feather name="navigation" size={16} color="#BEA3D8" style={{ transform: [{ rotate: '45deg' }] }} />
              <Text style={s.topNavTitle} numberOfLines={1}>
                {ride?.pickup_address || 'Navigating to Pickup'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.closeBtn}>
              <Feather name="x" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>



          {/* Floating Map Controls & SOS */}
          <View style={s.bottomMapControls} pointerEvents="box-none">
            
            {/* SOS Button */}
            <TouchableOpacity 
              style={s.sosBtn} 
              activeOpacity={0.8}
              onPress={() => {
                const loc = myLocation ?? pickup;
                navigation.navigate('SOSWarning', {
                  location: {
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    ride_id: rideId,
                  },
                });
              }}
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

      {/* Section - Bottom Sheet (38%) */}
      <View style={s.bottomSheet}>
        {/* Drag Handle */}
        <View style={s.dragHandleWrap}>
           <View style={s.dragHandle} />
        </View>

        {/* Status Pill */}
        <View style={s.statusRow}>
          <View style={s.statusPill}>
            <Text style={s.statusText}>{t('ride.enRouteToPickup')}</Text>
          </View>
        </View>

        {/* Rider Information Row */}
        <View style={s.riderRow}>
          <View style={s.riderLeft}>
             <View style={s.avatarContainer}>
               <MonogramAvatar
                 uri={ride?.rider_photo}
                 name={ride?.rider_name}
                 size={52}
                 radius={14}
               />
               <View style={s.starBadge}>
                 <MaterialIcons name="star" size={10} color="#EAB308" />
               </View>
             </View>
             
             <View style={s.riderDetails}>
                <Text style={s.riderName} numberOfLines={1} ellipsizeMode="tail">
                  {ride?.rider_name || 'Priya S.'}
                </Text>
                <Text style={s.riderSubtext} numberOfLines={1} ellipsizeMode="tail">
                  4.7 • Premium Class
                </Text>
             </View>
          </View>

          <View style={s.riderActions}>
            <TouchableOpacity style={[s.callBtn, calling && { opacity: 0.6 }]} onPress={handleCall} activeOpacity={0.8} disabled={calling}>
              {calling
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <MaterialIcons name="call" size={20} color="#FFFFFF" />
              }
            </TouchableOpacity>
            <TouchableOpacity style={s.chatBtn} onPress={() => setChatVisible(true)} activeOpacity={0.6}>
              <Feather name="message-circle" size={24} color="#AB8FFE" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Start Navigation Button — launches Google Maps to pickup */}
        <StartNavigationButton
          coords={pickupNavCoords}
          destinationLabel={ride?.pickup_address}
          rideId={rideId}
          mode="d"
          style={{ marginBottom: 12 }}
        />

        {/* Primary Action Button */}
        <TouchableOpacity style={s.primaryBtn} onPress={handleArrived} activeOpacity={0.8}>
          <Text style={s.primaryBtnText}>{t('ride.arrivedAtPickup')}</Text>
        </TouchableOpacity>

        {/* Cancel Ride Button */}
        <TouchableOpacity style={s.cancelBtn} onPress={handleCancelRide} activeOpacity={0.8}>
          <Text style={s.cancelBtnText}>{t('ride.cancelRide', 'Cancel Ride')}</Text>
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
  
  // MAP SECTION (62%)
  mapSection: {
    width: '100%',
    height: '62%',
  },
  driverMarker: {
    backgroundColor: 'rgba(190, 163, 216, 0.3)',
    borderRadius: 20,
    padding: 8,
  },
  driverDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#9D58E0',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  mapOverlays: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
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
    shadowOpacity: 0.1,
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
    color: '#4C1D95',
    letterSpacing: -0.45,
  },
  closeBtn: {
    padding: 4,
  },

  // Turn Banner
  turnBanner: {
    position: 'absolute',
    left: 16, right: 16,
    height: 87,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 6,
  },
  turnIconBg: {
    width: 42, height: 42,
    backgroundColor: '#BEA3D8',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  turnTextBox: {
    flex: 1,
    gap: 2,
  },
  turnInstruction: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 22,
    color: '#1E1B2E',
  },
  turnDistance: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 14,
    color: '#1E1B2E',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },

  // Bottom Map Controls
  bottomMapControls: {
    position: 'absolute',
    bottom: 24,
    left: 16, right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sosBtn: {
    width: 82, height: 32,
    backgroundColor: '#BA1A1A',
    borderRadius: 16,
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
    letterSpacing: 1.2,
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

  // BOTTOM SHEET (38%)
  bottomSheet: {
    flex: 1,
    backgroundColor: '#F5F0FF',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 32,
    paddingTop: 8,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: -16 },
    shadowOpacity: 0.12,
    shadowRadius: 48,
    elevation: 20,
    alignItems: 'center',
  },
  dragHandleWrap: {
    paddingVertical: 12,
    paddingBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  dragHandle: {
    width: 48, height: 6,
    backgroundColor: '#E5E0EF',
    borderRadius: 3,
  },
  
  // Status Pill
  statusRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusPill: {
    backgroundColor: 'rgba(171, 143, 254, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 9999,
  },
  statusText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    color: '#5A3F98',
    letterSpacing: 1.2,
  },

  // Rider Row
  riderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  riderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // slightly tighter gap to give text more room
    paddingRight: 8, // padding before actions
  },
  avatarContainer: {
    width: 52, height: 52, // slightly smaller avatar
    borderRadius: 16,
    backgroundColor: '#EDE9FA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
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
  starBadge: {
    position: 'absolute',
    right: -4, bottom: -4,
    width: 20, height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  riderDetails: {
    flex: 1, // allows text to shrink gracefully instead of pushing buttons
    justifyContent: 'center',
  },
  riderName: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 18, // slightly smaller font
    color: '#1E1B2E',
    marginBottom: 4,
  },
  riderSubtext: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 13, // slightly smaller font
    color: '#64748B',
  },
  riderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  callBtn: {
    width: 48, height: 48,
    backgroundColor: '#AB8FFE',
    borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  chatBtn: {
    padding: 8,
  },

  // Primary Button
  primaryBtn: {
    width: '100%',
    height: 68,
    backgroundColor: '#BEA3D8',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  primaryBtnText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    color: '#FFFFFF',
  },
  cancelBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFF5F5',
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  cancelBtnText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 15,
    color: '#EF4444',
  },
});
