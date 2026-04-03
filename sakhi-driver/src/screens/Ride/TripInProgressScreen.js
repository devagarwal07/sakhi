import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, Vibration, Image, Dimensions, Platform, Modal,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import client from '../../api/client';
import ChatModal from '../../components/ChatModal';

const { height: SCREEN_H } = Dimensions.get('window');

const MAP_STYLE = [
  { featureType: 'all', stylers: [{ saturation: -70 }] },
  { featureType: 'road', stylers: [{ color: '#e8e1f5' }] },
  { featureType: 'water', stylers: [{ color: '#c8bef0' }] },
];

export default function TripInProgressScreen({ navigation, route }) {
  const { ride } = route.params ?? {};
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

    return () => {
      locSubscription?.remove();
    };
  }, []);

  const region = myLocation
    ? {
        latitude: (myLocation.latitude + dropoff.latitude) / 2,
        longitude: (myLocation.longitude + dropoff.longitude) / 2,
        latitudeDelta: Math.abs(myLocation.latitude - dropoff.latitude) * 2.5 + 0.01,
        longitudeDelta: Math.abs(myLocation.longitude - dropoff.longitude) * 2.5 + 0.01,
      }
    : { ...dropoff, latitudeDelta: 0.02, longitudeDelta: 0.02 };

  const handleComplete = async () => {
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
    <View style={styles.root}>
      {/* ── MAP CONTAINER ────────────────────────────────────────────── */}
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
              <View style={styles.startMarker}>
                <View style={styles.startDot} />
              </View>
            </Marker>
          )}

          <Marker coordinate={dropoff}>
            <MaterialCommunityIcons name="map-marker-circle" size={32} color="#10B981" />
          </Marker>

          {myLocation && (
            <Polyline
              coordinates={[myLocation, dropoff]}
              strokeColor="#964ADF"
              strokeWidth={6}
            />
          )}
        </MapView>

        {/* ── OVERLAYS ON MAP ──────────────────────────────────────── */}
        <View style={styles.mapOverlays} pointerEvents="box-none">

          {/* Top Nav Shell */}
          <View style={[styles.topNavBanner, { marginTop: Math.max(insets.top, 16) }]}>
            <View style={styles.topNavIconBox}>
              <Feather name="navigation" size={16} color="#BEA3D8" />
            </View>
            <View style={styles.topNavTextBox}>
              <Text style={styles.topNavTitle}>Heading North on Broadway</Text>
              <Text style={styles.topNavSub}>Straight for 1.2km on Broadway</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
              <Feather name="x" size={14} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Floating SOS Controls */}
          <View style={styles.floatingControlsRow}>
            <TouchableOpacity 
              style={styles.sosBtn} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('SOSWarning', { location: myLocation })}
            >
              <Feather name="alert-triangle" size={14} color="#FFFFFF" />
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>

      {/* ── BOTTOM SHEET (38% Height bound) ───────────────────────── */}
      <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.sheetHandle} />

        <View style={styles.sheetContent}>
          
          {/* Rider & Status Row */}
          <View style={styles.riderRow}>
            <View style={styles.riderRowLeft}>
              
              <View style={styles.avatarMainBox}>
                <Image 
                  source={{ uri: ride?.rider_photo || 'https://i.pravatar.cc/150?u=priya' }} 
                  style={styles.avatarImage} 
                />
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingBadgeText}>{Number(ride?.rider_rating || 4.7).toFixed(1)}</Text>
                  <MaterialIcons name="star-outline" size={8} color="#4A4455" style={{ marginLeft: 2 }} />
                </View>
              </View>

              <View style={styles.riderInfoCol}>
                <Text style={styles.riderName}>{ride?.rider_name || 'Priya S.'}</Text>
                <View style={styles.tripStatusPill}>
                  <View style={styles.tripStatusDot} />
                  <Text style={styles.tripStatusText}>TRIP IN PROGRESS</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.chatBtn} activeOpacity={0.8} onPress={() => setChatVisible(true)}>
              <MaterialCommunityIcons name="chat-outline" size={20} color="#BEA3D8" />
            </TouchableOpacity>
          </View>

          {/* Trip Details Card */}
          <View style={styles.tripDetailsCard}>
            <View style={styles.destIconBox}>
              <MaterialIcons name="location-on" size={16} color="#BEA3D8" />
            </View>
            <View style={styles.destTextBox}>
              <Text style={styles.destLabel}>DESTINATION</Text>
              <Text style={styles.destAddress} numberOfLines={2}>
                {ride?.dropoff_address || 'MG Road Metro Station'}
              </Text>
            </View>
          </View>

          {/* Complete Trip Action Button */}
          <TouchableOpacity 
            style={[styles.primaryBtn, completing && { opacity: 0.7 }]} 
            onPress={handleComplete}
            disabled={completing}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {completing ? 'Completing...' : 'Complete Trip'}
            </Text>
          </TouchableOpacity>

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
  
  // -- MAP CONTAINER --
  mapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#DCD8E6',
  },
  mapOverlays: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  startMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  startDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 6,
    borderColor: '#964ADF',
  },

  // -- FLOATING OVERLAYS --
  topNavBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  topNavIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  topNavTextBox: {
    flex: 1,
    justifyContent: 'center',
  },
  topNavTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    color: '#4C1D95',
    letterSpacing: -0.45,
    marginBottom: 2,
  },
  topNavSub: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    color: '#64748B',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  floatingControlsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    marginBottom: 8,
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
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  // -- BOTTOM SHEET --
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
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
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E0EF',
    alignSelf: 'center',
    marginBottom: 24,
  },
  sheetContent: {
    paddingBottom: 8,
  },

  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  riderRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarMainBox: {
    position: 'relative',
    width: 56,
    height: 56,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  ratingBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 38,
    height: 20,
    backgroundColor: '#E5E0EF',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#4A4455',
  },
  riderInfoCol: {
    justifyContent: 'center',
  },
  riderName: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 20,
    color: '#1C1A25',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tripStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
    alignSelf: 'flex-start',
  },
  tripStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#BEA3D8',
  },
  tripStatusText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    color: '#047857',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chatBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F6F1FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  tripDetailsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F1FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    gap: 16,
  },
  destIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  destTextBox: {
    flex: 1,
  },
  destLabel: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    color: '#7B7487',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  destAddress: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 16,
    color: '#1C1A25',
  },

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
    elevation: 6,
  },
  primaryBtnText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
