import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Shadows } from '../../utils/theme';

const { width, height } = Dimensions.get('window');

export default function DriverSplashScreen({ navigation }) {
  const logoScale = new Animated.Value(0.5);
  const logoOpacity = new Animated.Value(0);
  const taglineOpacity = new Animated.Value(0);

  useEffect(() => {
    // Animate logo in
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after splash
    const timer = setTimeout(() => {
      navigation.replace('RootShell');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Background gradient blobs */}
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      {/* Logo area */}
      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        {/* Auto/rickshaw vehicle icon placeholder */}
        <View style={styles.iconCircle}>
          <Text style={styles.vehicleEmoji}>🛺</Text>
        </View>

        <Text style={styles.appName}>Sakhi Driver</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PARTNER APP</Text>
          </View>
        </View>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={[styles.taglineContainer, { opacity: taglineOpacity }]}>
        <Text style={styles.tagline}>Drive safe. Earn more. Every day.</Text>
      </Animated.View>

      {/* Bottom loader dots */}
      <View style={styles.loaderContainer}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryContainer,  // violet-600
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Background decorative blobs
  blobTopRight: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    ...Shadows.lavender,
  },
  vehicleEmoji: {
    fontSize: 56,
  },
  appName: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -1,
    marginTop: 8,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // Tagline
  taglineContainer: {
    position: 'absolute',
    bottom: height * 0.18,
    alignItems: 'center',
  },
  tagline: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Loader dots
  loaderContainer: {
    position: 'absolute',
    bottom: height * 0.10,
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: Colors.white,
    width: 24,
    borderRadius: 4,
  },
});
