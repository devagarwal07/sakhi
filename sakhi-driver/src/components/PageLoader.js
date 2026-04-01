import React, { useEffect, useRef } from 'react';
import {
  View, Image, StyleSheet, Animated, Easing,
} from 'react-native';

/**
 * PageLoader
 * A full-screen animated loading overlay shown during navigation transitions.
 * Uses the Sakhi favicon.png as the logo with a pulse + spin animation.
 */
export default function PageLoader() {
  const pulse   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const spin    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(opacity, {
      toValue: 1, duration: 200, useNativeDriver: true,
    }).start();

    // Pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Slow spin
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[s.overlay, { opacity }]}>
      {/* Outer spinning ring */}
      <Animated.View style={[s.ring, { transform: [{ rotate }] }]} />

      {/* Logo pulse */}
      <Animated.View style={[s.logoWrap, { transform: [{ scale: pulse }] }]}>
        <Image
          source={require('../../assets/icon.png')}
          style={s.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const LOGO_SIZE = 90;
const RING_SIZE = LOGO_SIZE + 28;

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245, 240, 255, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 50,
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 3,
    borderColor: '#BEA3D8',
    borderTopColor: '#5B21B6',
    borderRightColor: '#5B21B6',
  },
  logoWrap: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B21B6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: {
    width: LOGO_SIZE * 0.72,
    height: LOGO_SIZE * 0.72,
  },
});
