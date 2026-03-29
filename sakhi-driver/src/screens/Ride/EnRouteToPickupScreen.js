import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, Linking, Image, Dimensions, Platform
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSocket } from '../../context/SocketContext';

const { height: SCREEN_H } = Dimensions.get('window');

const MAP_STYLE = [
  { featureType: 'all', stylers: [{ saturation: -70 }] },
  { featureType: 'road', stylers: [{ color: '#e8e1f5' }] },
  { featureType: 'water', stylers: [{ color: '#c8bef0' }] },
];

export default function EnRouteToPickupScreen({ navigation, route }) {
  const { ride } = route.params ?? {};
  const { emit } = useSocket();
  const mapRef = useRef(null);
  const insets = useSafeAreaInsets();

  const [myLocation, setMyLocation] = useState(null);

  const pickup = ride?.pickup_coords ?? { latitude: 28.6139, longitude: 77.2090 };

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

  const region = myLocation
    ? {
        latitude: (myLocation.latitude + pickup.latitude) / 2,
        longitude: (myLocation.longitude + pickup.longitude) / 2,
        latitudeDelta: Math.abs(myLocation.latitude - pickup.latitude) * 2.5 + 0.01,
        longitudeDelta: Math.abs(myLocation.longitude - pickup.longitude) * 2.5 + 0.01,
      }
    : { ...pickup, latitudeDelta: 0.02, longitudeDelta: 0.02 };

  const handleCall = () => {
    if (ride?.rider_phone) {
      Linking.openURL(`tel:${ride.rider_phone}`);
    } else {
      Alert.alert('No number', 'Rider phone number is unavailable.');
    }
  };

  const handleArrived = async () => {
    try {
      emit('ride:arrived', { ride_id: ride?.ride_id });
      navigation.replace('ArrivedWaiting', { ride });
    } catch (err) {
      Alert.alert('Error', 'Could not update arrival status.');
    }
  };

  const recenter = () => {
    if (myLocation && mapRef.current) {
      mapRef.current.animateToRegion(region, 500);
    }
  };

  return (
    <View style={styles.root}>
      {/* MAP SECTION (Top bound to avoid overlapping Bottom Sheet logic) */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          customMapStyle={MAP_STYLE}
          region={region}
        >
          {myLocation && (
            <Marker coordinate={myLocation}>
              <View style={styles.driverMarker}>
                <View style={styles.driverDot} />
              </View>
            </Marker>
          )}

          <Marker coordinate={pickup}>
             <MaterialCommunityIcons name="map-marker" size={32} color="#10B981" />
          </Marker>

          {myLocation && (
            <Polyline
              coordinates={[myLocation, pickup]}
              strokeColor="#BEA3D8"
              strokeWidth={5}
            />
          )}
        </MapView>

        {/* OVERLAYS ON MAP */}
        <View style={styles.mapOverlays} pointerEvents="box-none">

          {/* Top Address Nav Shell */}
          <View style={[styles.topNavShell, { marginTop: Math.max(insets.top, 16) }]}>
            <View style={styles.topNavIconBox}>
              <Feather name="navigation" size={16} color="#BEA3D8" />
            </View>
            <Text style={styles.topNavTitle}>Heading North on Broadway</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
              <Feather name="x" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Turn Instruction Banner */}
          <View style={styles.turnBanner}>
            <View style={styles.turnIconBg}>
              <MaterialCommunityIcons name="arrow-u-left-top" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.turnTextBox}>
              <Text style={styles.turnInstruction}>Turn left onto MG Road</Text>
              <Text style={styles.turnDistance}>200M</Text>
            </View>
          </View>

          <View style={styles.floatingControlsRow}>
            {/* SOS Button */}
            <TouchableOpacity 
              style={styles.sosBtn} 
              activeOpacity={0.8}
              onPress={() => Alert.alert('SOS', 'Emergency services will be contacted.')}
            >
              <Feather name="alert-triangle" size={14} color="#FFFFFF" />
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>

            {/* Recenter Map Control */}
            <TouchableOpacity style={styles.recenterBtn} onPress={recenter} activeOpacity={0.8}>
              <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#BEA3D8" />
            </TouchableOpacity>
          </View>

        </View>
      </View>

      {/* BOTTOM SHEET (38% approximate) */}
      <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.sheetHandle} />

        <View style={styles.sheetContent}>
          {/* Status Pill */}
          <View style={styles.pillContainer}>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>EN ROUTE TO PICKUP</Text>
            </View>
          </View>

          {/* Rider Profile Card */}
          <View style={styles.riderRow}>
            {/* Avatar block with star overlap */}
            <View style={styles.avatarMainBox}>
              <View style={styles.avatarWrap}>
                {ride?.rider_photo ? (
                  <Image source={{ uri: ride.rider_photo }} style={styles.avatarImage} />
                ) : (
                  <Image source={{ uri: 'https://i.pravatar.cc/150?u=priya' }} style={styles.avatarImage} />
                )}
              </View>
              <View style={styles.starBadge}>
                <MaterialCommunityIcons name="star" size={10} color="#FFFFFF" />
              </View>
            </View>

            {/* Name and Rating/Class */}
            <View style={styles.riderInfoCol}>
              <Text style={styles.riderName}>{ride?.rider_name || 'Priya S.'}</Text>
              <View style={styles.riderMetaRow}>
                <Text style={styles.ratingText}>{Number(ride?.rider_rating || 4.7).toFixed(1)}</Text>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.classText}>Premium Class</Text>
              </View>
            </View>

            {/* Call Button */}
            <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.85}>
              <MaterialCommunityIcons name="phone" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleArrived} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>I've Arrived at Pickup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
  driverMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(190, 163, 216, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BEA3D8'
  },
  driverDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#BEA3D8',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  mapOverlays: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 24, // Matches floating button distance
  },

  // -- FLOATING HEADER ELEMENTS --
  topNavShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  topNavIconBox: {
    marginRight: 12,
  },
  topNavTitle: {
    flex: 1,
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    color: '#4C1D95',
    letterSpacing: -0.45,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9', // light gray
  },

  turnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16, // spaced down from topNav
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 6,
  },
  turnIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#BEA3D8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  turnTextBox: {
    flex: 1,
    justifyContent: 'center',
  },
  turnInstruction: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    color: '#1C1A25',
    marginBottom: 4,
  },
  turnDistance: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#1C1A25',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },

  // -- FLOATING CONTROLS (BOTTOM MAP) --
  floatingControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
  },
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#BA1A1A',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  recenterBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },

  // -- BOTTOM SHEET --
  bottomSheet: {
    backgroundColor: '#F6F1FF',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 12,
    paddingHorizontal: 32,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: -16 },
    shadowOpacity: 0.12,
    shadowRadius: 48,
    elevation: 16,
  },
  sheetHandle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E0EF',
    alignSelf: 'center',
    marginBottom: 24,
  },
  sheetContent: {
    // container for interior items
  },
  pillContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  statusPill: {
    backgroundColor: 'rgba(171, 143, 254, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusPillText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    color: '#5A3F98',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  avatarMainBox: {
    position: 'relative',
    marginRight: 16,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  starBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EAB308',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  riderInfoCol: {
    flex: 1,
  },
  riderName: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 20,
    color: '#1C1A25',
    marginBottom: 4,
  },
  riderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 14,
    color: '#4A4455',
  },
  dotSeparator: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    color: '#7B7487',
  },
  classText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 14,
    color: '#4A4455',
  },
  callBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#AB8FFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  primaryBtn: {
    width: '100%',
    height: 68,
    backgroundColor: '#BEA3D8',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 6,
    marginBottom: 16,
  },
  primaryBtnText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    color: '#FFFFFF',
  },
});
