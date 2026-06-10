import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import SmartMapView from '../../components/SmartMapView';

export default function DemandZonesScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState(null);
  const [zones, setZones] = useState([]);

  useEffect(() => {
    (async () => {
      // 12.9716, 77.5946 is the center of Bengaluru (Vidhana Soudha area)
      const blrCenter = { latitude: 12.9716, longitude: 77.5946 };
      setLocation(blrCenter);

      // We don't wait for GPS location because we want to see the whole city by default,
      // but we will fetch it just to show the 'YOU' marker if they are in Bangalore.
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          // Only snap to user if they are roughly in Bangalore bounding box
          if (Math.abs(pos.coords.latitude - blrCenter.latitude) < 0.5 &&
              Math.abs(pos.coords.longitude - blrCenter.longitude) < 0.5) {
            setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          }
        }
      } catch (err) {
        console.warn('Could not fetch location for demand zones:', err?.message);
      }

      // Generate fully dynamic demand zones across all of Bengaluru
      // We use the current hour to slightly shift intensities to make it dynamic
      const hour = new Date().getHours();
      
      const baseZones = [
        { name: 'Koramangala', lat: 12.9352, lng: 77.6245, baseIntensity: 0.9, radius: 1500 },
        { name: 'Indiranagar', lat: 12.9784, lng: 77.6408, baseIntensity: 0.8, radius: 1200 },
        { name: 'Whitefield', lat: 12.9698, lng: 77.7499, baseIntensity: 0.7, radius: 2000 },
        { name: 'HSR Layout', lat: 12.9121, lng: 77.6446, baseIntensity: 0.85, radius: 1600 },
        { name: 'Malleshwaram', lat: 13.0031, lng: 77.5643, baseIntensity: 0.4, radius: 1200 },
        { name: 'Jayanagar', lat: 12.9299, lng: 77.5824, baseIntensity: 0.6, radius: 1400 },
        { name: 'Electronic City', lat: 12.8452, lng: 77.6602, baseIntensity: 0.75, radius: 1800 },
        { name: 'Hebbal', lat: 13.0354, lng: 77.5988, baseIntensity: 0.5, radius: 1500 },
        { name: 'Marathahalli', lat: 12.9569, lng: 77.7011, baseIntensity: 0.9, radius: 1200 },
        { name: 'BTM Layout', lat: 12.9166, lng: 77.6101, baseIntensity: 0.8, radius: 1300 },
        { name: 'Yelahanka', lat: 13.1007, lng: 77.5963, baseIntensity: 0.3, radius: 2000 },
        { name: 'Banashankari', lat: 12.9255, lng: 77.5468, baseIntensity: 0.45, radius: 1400 },
      ];

      const dynamicZones = baseZones.map(z => {
        // Pseudo-random dynamic shift based on the hour of the day
        const dynamicShift = (Math.sin(hour + z.lat) * 0.2); 
        let finalIntensity = z.baseIntensity + dynamicShift;
        
        // Clamp between 0.1 and 1.0
        finalIntensity = Math.max(0.1, Math.min(1.0, finalIntensity));
        
        return {
          latitude: z.lat,
          longitude: z.lng,
          radius: z.radius,
          intensity: finalIntensity
        };
      });

      setZones(dynamicZones);
    })();
  }, []);

  return (
    <View style={s.root}>
      <StatusBar style="dark" />

      {/* ── MAP AREA ── */}
      <View style={StyleSheet.absoluteFill}>
        {location ? (
          <SmartMapView
            style={StyleSheet.absoluteFill}
            center={location}
            zoom={11.5}
            demandZones={zones}
            markers={[
              { id: 'driver', latitude: location.latitude, longitude: location.longitude, color: '#BEA3D8', label: 'YOU' }
            ]}
          />
        ) : (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color="#BEA3D8" />
            <Text style={s.loadingText}>Locating Demand Zones...</Text>
          </View>
        )}
      </View>

      {/* ── TOP BACK BUTTON ── */}
      <TouchableOpacity
        style={[s.backBtn, { top: Math.max(insets.top, 20) + 10 }]}
        onPress={() => navigation.navigate('DriverOnlineDashboard')}
        activeOpacity={0.8}
      >
        <Feather name="arrow-left" size={24} color="#1E1B2E" />
      </TouchableOpacity>

      {/* ── DEMAND LEGEND (Optional Floating Card) ── */}
      <View style={[s.legendCard, { top: Math.max(insets.top, 20) + 10 }]}>
        <Text style={s.legendTitle}>Demand Heatmap</Text>
        <View style={s.legendRow}>
          <View style={[s.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={s.legendText}>High Demand</Text>
        </View>
        <View style={s.legendRow}>
          <View style={[s.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={s.legendText}>Moderate</Text>
        </View>
        <View style={s.legendRow}>
          <View style={[s.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={s.legendText}>Low</Text>
        </View>
      </View>

      {/* ── BOTTOM FORWARD OVERLAY ── */}
      <View style={[s.bottomOverlay, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
        <TouchableOpacity
          style={s.forwardBtn}
          onPress={() => navigation.navigate('DriverHome')}
          activeOpacity={0.8}
        >
          <Text style={s.forwardBtnText}>Go to Online Page</Text>
          <Feather name="arrow-right" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F0FF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16, fontWeight: '600', color: '#BEA3D8' },
  
  backBtn: {
    position: 'absolute',
    left: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E1B2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },

  legendCard: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#1E1B2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    gap: 8,
  },
  legendTitle: { fontSize: 14, fontWeight: '800', color: '#1E1B2E', marginBottom: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: '500', color: '#64748B' },

  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 40,
    // Gradient effect could go here, but transparent background works fine
  },
  forwardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#BEA3D8',
    height: 56,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#BEA3D8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  forwardBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
