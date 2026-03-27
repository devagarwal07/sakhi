import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Animated,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';

const FREE_WAIT_SECONDS = 180; // 3 minutes free waiting

export default function ArrivedWaitingScreen({ navigation, route }) {
  const { ride } = route.params ?? {};

  const [otp, setOtp]             = useState(['', '', '', '']);
  const [elapsed, setElapsed]     = useState(0);
  const [loading, setLoading]     = useState(false);
  const otpRefs = [useRef(), useRef(), useRef(), useRef()];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const pickup = ride?.pickup_coords ?? { latitude: 28.6139, longitude: 77.2090 };

  // ── Waiting timer ────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Pulse animation for arrived dot ─────────────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const freeRemaining = Math.max(0, FREE_WAIT_SECONDS - elapsed);
  const waitProgress  = Math.max(0, 1 - elapsed / FREE_WAIT_SECONDS);

  // ── OTP input handler ────────────────────────────────────────────────────
  const handleOtpChange = (val, idx) => {
    if (!/^\d*$/.test(val)) return;
    const updated = [...otp];
    updated[idx] = val.slice(-1);
    setOtp(updated);
    if (val && idx < 3) otpRefs[idx + 1].current?.focus();
  };

  const handleOtpKeyPress = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs[idx - 1].current?.focus();
    }
  };

  const otpComplete = otp.every((d) => d !== '');

  // ── Start Trip ────────────────────────────────────────────────────────────
  const handleStartTrip = async () => {
    if (!otpComplete) return;
    try {
      setLoading(true);
      await client.post(`/rides/${ride?.ride_id}/start`, { otp: otp.join('') });
      navigation.replace('TripInProgress', { ride });
    } catch (err) {
      Alert.alert(
        'OTP Error',
        err.response?.data?.message ?? 'Incorrect OTP. Ask the rider for the correct code.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* ── MAP ────────────────────────────────────────────────────── */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={{ ...pickup, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
        scrollEnabled={false}
        zoomEnabled={false}
      >
        <Marker coordinate={pickup}>
          <View style={styles.markerWrap}>
            <Animated.View style={[styles.markerPulse, { transform: [{ scale: pulseAnim }] }]} />
            <View style={styles.markerInner}>
              <Text style={{ fontSize: 18 }}>🛺</Text>
            </View>
          </View>
        </Marker>
      </MapView>

      {/* ── Arrived Banner (floating over map) ──────────────────────── */}
      <SafeAreaView style={styles.arrivedBannerWrap} pointerEvents="none">
        <View style={styles.arrivedBanner}>
          <View style={styles.arrivedIconBox}>
            <Text style={{ fontSize: 20 }}>📍</Text>
          </View>
          <View>
            <Text style={styles.arrivedLabel}>CURRENT POINT</Text>
            <Text style={styles.arrivedTitle}>Arrived at Pickup</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* ── SOS ────────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.sosBtn}
        onPress={() => Alert.alert('SOS', 'Emergency services will be contacted.')}>
        <Text style={styles.sosBtnText}>🆘  SOS</Text>
      </TouchableOpacity>

      {/* ── BOTTOM SHEET ─────────────────────────────────────────── */}
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {/* Rider row */}
        <View style={styles.riderRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.riderName}>{ride?.rider_name ?? 'Rider'}</Text>
            <Text style={styles.riderRating}>⭐ {ride?.rider_rating?.toFixed(1) ?? '4.5'}</Text>
          </View>
          <View style={styles.arrivedBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.arrivedBadgeText}>Arrived</Text>
          </View>
        </View>

        {/* Waiting timer card */}
        <View style={styles.waitCard}>
          <View style={styles.waitTop}>
            <Text style={styles.waitLabel}>FREE WAITING TIME</Text>
            <Text style={styles.waitTime}>{formatTime(freeRemaining)}</Text>
          </View>
          <View style={styles.waitTrack}>
            <View style={[styles.waitFill, { flex: waitProgress }]} />
          </View>
          {elapsed >= FREE_WAIT_SECONDS && (
            <Text style={styles.waitCharge}>⚠️  Wait charges now applying</Text>
          )}
        </View>

        {/* OTP Entry */}
        <Text style={styles.otpLabel}>Enter OTP from Rider</Text>
        <View style={styles.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={otpRefs[idx]}
              style={[styles.otpBox, digit && styles.otpBoxFilled]}
              value={digit}
              onChangeText={(v) => handleOtpChange(v, idx)}
              onKeyPress={(e) => handleOtpKeyPress(e, idx)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Start Trip CTA */}
        <TouchableOpacity
          style={[styles.startBtn, (!otpComplete || loading) && styles.startBtnDisabled]}
          onPress={handleStartTrip}
          disabled={!otpComplete || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.startBtnText}>▶  Start Trip</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  map: { width: '100%', height: '50%' },

  markerWrap: { alignItems: 'center', justifyContent: 'center', width: 60, height: 60 },
  markerPulse: {
    position: 'absolute',
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: `${Colors.primaryContainer}25`,
  },
  markerInner: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.primaryContainer, ...Shadows.card,
  },

  arrivedBannerWrap: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md,
  },
  arrivedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: `${Colors.white}EC`, borderRadius: Radius.lg,
    padding: 14, ...Shadows.card,
  },
  arrivedIconBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  arrivedLabel: { fontSize: 9, fontWeight: '700', color: Colors.primaryContainer, letterSpacing: 1.5 },
  arrivedTitle: { fontSize: 18, fontWeight: '800', color: Colors.onSurface },

  sosBtn: {
    position: 'absolute', bottom: '52%', left: Spacing.md,
    backgroundColor: '#EF4444', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, ...Shadows.card,
  },
  sosBtnText: { color: Colors.white, fontWeight: '800', fontSize: 12, letterSpacing: 1 },

  sheet: {
    flex: 1, backgroundColor: Colors.white,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: Spacing.base, paddingTop: 12, paddingBottom: 28,
    ...Shadows.lavender,
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4,
    backgroundColor: Colors.outlineVariant, borderRadius: 2, marginBottom: 14,
  },

  riderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatarCircle: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: Colors.surfaceLow,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
  },
  avatarEmoji: { fontSize: 30 },
  riderName: { fontSize: 17, fontWeight: '800', color: Colors.onSurface },
  riderRating: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  arrivedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.full, borderWidth: 1, borderColor: '#D1FAE5',
  },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.online },
  arrivedBadgeText: { fontSize: 11, fontWeight: '700', color: '#059669' },

  // Wait timer
  waitCard: {
    backgroundColor: Colors.surfaceLow, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: 16,
  },
  waitTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  waitLabel: { fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 1.5 },
  waitTime: { fontSize: 20, fontWeight: '900', color: Colors.primaryContainer },
  waitTrack: {
    height: 8, backgroundColor: Colors.surfaceContainer,
    borderRadius: 4, overflow: 'hidden', flexDirection: 'row',
  },
  waitFill: { height: '100%', backgroundColor: Colors.primaryContainer, borderRadius: 4 },
  waitCharge: { fontSize: 11, color: '#D97706', marginTop: 6, fontWeight: '600' },

  // OTP
  otpLabel: {
    fontSize: 13, fontWeight: '700', color: Colors.onSurface,
    textAlign: 'center', letterSpacing: 0.2, marginBottom: 10,
  },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
  otpBox: {
    width: 58, height: 64, borderRadius: Radius.lg,
    borderWidth: 2, borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceLow,
    fontSize: 28, fontWeight: '900', color: Colors.onSurface,
    textAlign: 'center',
  },
  otpBoxFilled: { borderColor: Colors.primaryContainer, backgroundColor: `${Colors.primaryContainer}08` },

  startBtn: {
    height: 60, borderRadius: Radius.lg,
    backgroundColor: Colors.online,
    alignItems: 'center', justifyContent: 'center', ...Shadows.card,
  },
  startBtnDisabled: { backgroundColor: Colors.outlineVariant },
  startBtnText: { color: Colors.white, fontSize: 18, fontWeight: '800' },
});
