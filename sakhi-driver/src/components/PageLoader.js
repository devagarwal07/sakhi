import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

/**
 * PageLoader
 * A minimal, on-brand loading overlay shown during navigation transitions.
 * Three dots that wave in sequence — clean, smooth, themed.
 */
export default function PageLoader() {
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const animateDot = (dot, delay) =>
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, {
          toValue: 1,
          duration: 380,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dot, {
          toValue: 0,
          duration: 380,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(760 - delay),
      ])
    );

  useEffect(() => {
    // Fade overlay in
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();

    // Staggered dot wave
    const a1 = animateDot(dot1, 0);
    const a2 = animateDot(dot2, 160);
    const a3 = animateDot(dot3, 320);
    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, []);

  const dotStyle = (anim) => ({
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.35, 1, 0.35],
    }),
  });

  return (
    <Animated.View style={[s.overlay, { opacity: overlayOpacity }]}>
      <View style={s.card}>
        <Animated.View style={[s.dot, dotStyle(dot1)]} />
        <Animated.View style={[s.dot, s.dotMid, dotStyle(dot2)]} />
        <Animated.View style={[s.dot, dotStyle(dot3)]} />
      </View>
    </Animated.View>
  );
}

const DOT = 10;

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245, 240, 255, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 50,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: '#BEA3D8',
  },
  dotMid: {
    marginHorizontal: 10,
    backgroundColor: '#9B72CF',
  },
});
