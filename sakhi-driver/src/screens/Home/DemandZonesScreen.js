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
      let currentLoc = { latitude: 12.9716, longitude: 77.5946 }; // Default Bangalore
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          currentLoc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        }
      } catch (err) {
        console.warn('Could not fetch location for demand zones:', err?.message);
      }
      setLocation(currentLoc);

      // Generate mock demand zones around the user's location
      setZones([
        { latitude: currentLoc.latitude + 0.004, longitude: currentLoc.longitude + 0.004, radius: 600, intensity: 0.9 }, // High (Red)
        { latitude: currentLoc.latitude - 0.006, longitude: currentLoc.longitude + 0.002, radius: 800, intensity: 0.5 }, // Medium (Amber)
        { latitude: currentLoc.latitude + 0.002, longitude: currentLoc.longitude - 0.007, radius: 1000, intensity: 0.2 }, // Low (Green)
        { latitude: currentLoc.latitude - 0.008, longitude: currentLoc.longitude - 0.005, radius: 500, intensity: 0.8 }, // High
      ]);
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
            zoom={13}
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
