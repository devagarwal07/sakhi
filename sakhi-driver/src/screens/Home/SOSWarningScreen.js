import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerSOS } from '../../api/endpoints';

// ── Design tokens ─────────────────────────────────────────────────────────────
const RED    = '#DC2626';
const DKRED  = '#991B1B';
const WHITE  = '#FFFFFF';
const YELLOW = '#FCD34D';

const COUNTDOWN_SECS = 5;

/**
 * SOSWarningScreen
 *
 * Shows a 5-second countdown before auto-sending the SOS alert.
 * Driver can cancel during the countdown, or trigger immediately.
 *
 * route.params:
 *   location   { latitude, longitude } — driver's current GPS coords
 */
export default function SOSWarningScreen({ navigation, route }) {
  const insets  = useSafeAreaInsets();
  const { location } = route.params ?? {};

  const [count, setCount] = useState(COUNTDOWN_SECS);
  const [fired, setFired] = useState(false);

  // Pulsing ring animation
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.7)).current;

  // Progress arc — scale shrinks as countdown progresses
  const progressAnim = useRef(new Animated.Value(1)).current;

  const firedRef = useRef(false);

  useEffect(() => {
    // Start pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale,   { toValue: 1.35, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.0,  duration: 700, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale,   { toValue: 1,    duration: 0,   useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.7,  duration: 0,   useNativeDriver: true }),
        ]),
      ]),
    ).start();

    // Progress bar animation
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: COUNTDOWN_SECS * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Countdown timer
    const interval = setInterval(() => {
      setCount(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          // Use setTimeout to escape the setState call stack
          setTimeout(() => handleSendSOS(), 0);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSendSOS = async () => {
    if (firedRef.current) return;
    firedRef.current = true;
    setFired(true);
    try {
      await triggerSOS(location);
    } catch {
      // Best-effort: still navigate to active screen
    }
    navigation.replace('SOSActive', { location });
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[s.root, { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 32) }]}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Emergency SOS</Text>
      </View>

      {/* Central countdown ring */}
      <View style={s.centerSection}>
        {/* Pulsing ring */}
        <Animated.View style={[s.pulseRing, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />

        {/* Inner countdown circle */}
        <View style={s.countCircle}>
          <Text style={s.countNumber}>{count}</Text>
          <Text style={s.countLabel}>seconds</Text>
        </View>
      </View>

      {/* Title & description */}
      <View style={s.textSection}>
        <Text style={s.title}>SOS Sending in {count}s</Text>
        <Text style={s.subtitle}>
          Your location and trip details will be sent to your emergency contacts and the Sakhi Safety Team.
        </Text>
      </View>

      {/* Progress bar */}
      <View style={s.progressTrack}>
        <Animated.View style={[s.progressFill, { width: progressWidth }]} />
      </View>

      {/* Action buttons */}
      <View style={s.actionsSection}>
        {/* Send now */}
        <TouchableOpacity
          style={s.sendNowBtn}
          onPress={handleSendSOS}
          activeOpacity={0.85}
        >
          <Text style={s.sendNowIcon}>⚡</Text>
          <Text style={s.sendNowText}>Send SOS Now</Text>
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity
          style={s.cancelBtn}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <Text style={s.cancelText}>CANCEL — I'M SAFE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: DKRED,
    alignItems: 'center', paddingHorizontal: 24,
  },

  header: { alignSelf: 'stretch', alignItems: 'center', marginBottom: 32 },
  headerTitle: {
    fontSize: 18, fontWeight: '900', color: WHITE, letterSpacing: -0.5,
  },

  centerSection: {
    width: 200, height: 200,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 32,
  },
  pulseRing: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  countCircle: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: RED,
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3, shadowRadius: 32, elevation: 16,
  },
  countNumber: {
    fontSize: 72, fontWeight: '900', color: WHITE, lineHeight: 80,
  },
  countLabel: {
    fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },

  textSection: { alignItems: 'center', gap: 12, marginBottom: 32, paddingHorizontal: 8 },
  title:   { fontSize: 26, fontWeight: '900', color: WHITE, letterSpacing: -0.65, textAlign: 'center' },
  subtitle:{ fontSize: 15, fontWeight: '400', color: 'rgba(255,255,255,0.80)', textAlign: 'center', lineHeight: 24 },

  progressTrack: {
    alignSelf: 'stretch', height: 5, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 40, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: WHITE, borderRadius: 3,
  },

  actionsSection: { alignSelf: 'stretch', gap: 16 },
  sendNowBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', height: 60,
    backgroundColor: WHITE, borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20, shadowRadius: 16, elevation: 8,
  },
  sendNowIcon: { fontSize: 20 },
  sendNowText: { fontSize: 18, fontWeight: '800', color: RED },

  cancelBtn: {
    alignItems: 'center', paddingVertical: 14,
  },
  cancelText: {
    fontSize: 12, fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
});
