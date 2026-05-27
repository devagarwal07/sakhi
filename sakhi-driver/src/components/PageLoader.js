import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Colors, Shadows } from '../utils/theme';

/**
 * PageLoader
 * A minimal, premium, on-brand loading overlay shown during navigation transitions.
 * Perfectly circular, immune to flex squishing, soft lavender themed.
 */
export default function PageLoader() {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Fade and scale in smoothly
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[s.overlay, { opacity: overlayOpacity }]}>
      <Animated.View style={[s.card, { transform: [{ scale: scaleAnim }] }]}>
        <ActivityIndicator size="large" color="#9B72CF" />
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245, 240, 255, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 50,
  },
  card: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
});

