import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import client from '../../api/client';
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

      // Fetch precise user location if possible (non-blocking)
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (Math.abs(pos.coords.latitude - blrCenter.latitude) < 0.5 &&
              Math.abs(pos.coords.longitude - blrCenter.longitude) < 0.5) {
            setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          }
        }
      } catch (err) {
        console.warn('Could not fetch location for demand zones:', err?.message);
      }

      // Fetch LIVE real-time demand zones from the backend API
      try {
        const res = await client.get('/drivers/demand-zones');
        if (res.data?.zones) {
          setZones(res.data.zones);
        }
      } catch (err) {
        console.warn('Failed to fetch real-time demand zones:', err?.message);
      }
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
