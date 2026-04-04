import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

export default function DriverVerificationLoadingScreen({ navigation }) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();

    // Auto-navigate to DocumentUnderReview after a short delay
    const t = setTimeout(() => navigation.replace('DocumentUnderReview'), 4000);
    return () => clearTimeout(t);
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Editorial Glows */}
      <View style={styles.glowBottomLeft} />
      <View style={styles.glowTopRight} />

      <View style={styles.mainCanvas}>
        <View style={styles.verificationCore}>
          {/* Spinner and Shield */}
          <View style={styles.spinnerWrapper}>
            <Animated.View style={[styles.spinnerRing, { transform: [{ rotate }] }]} />
            <Animated.View style={[styles.shieldCircle, { transform: [{ scale: pulse }] }]}>
              <MaterialCommunityIcons name="shield-account" size={44} color="#BEA3D8" />
            </Animated.View>
          </View>

          {/* Heading and Subtext */}
          <View style={styles.textStack}>
            <Text style={styles.headline}>Verifying Your Documents...</Text>
            <Text style={styles.subline}>
              Auto-checking your documents.{'\n'}This takes a few seconds.
            </Text>
          </View>
        </View>

        {/* Quote Card Section */}
        <View style={styles.quoteSection}>
          <View style={styles.quoteCard}>
            <View style={styles.quoteDecoShape} />
            <Text style={styles.quoteText}>
              "Every great driver starts with a single journey."
            </Text>
          </View>

          {/* Pagination Dots */}
          <View style={styles.paginationRow}>
            <View style={styles.dotActive} />
            <View style={styles.dotInactive} />
            <View style={styles.dotInactive} />
            <View style={styles.dotInactive} />
          </View>
        </View>
      </View>

      {/* Bottom Warning/Info */}
      <View style={styles.bottomInfo}>
        <Feather name="lock" size={14} color="#6B7280" />
        <Text style={styles.bottomInfoText}>Do not close the app</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowBottomLeft: {
    position: 'absolute',
    width: 256,
    height: 256,
    left: -96,
    bottom: -96,
    backgroundColor: 'rgba(190, 163, 216, 0.15)',
    borderRadius: 9999,
    // Blur is natively complex without modules, soft opacity overlay mimics it
  },
  glowTopRight: {
    position: 'absolute',
    width: 192,
    height: 192,
    right: -48,
    top: -48,
    backgroundColor: 'rgba(190, 163, 216, 0.15)',
    borderRadius: 9999,
  },
  mainCanvas: {
    flex: 1,
    width: '100%',
    maxWidth: 390,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  verificationCore: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 60,
  },
  spinnerWrapper: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  spinnerRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'transparent',
    borderTopColor: '#BEA3D8',
    borderRightColor: 'rgba(190, 163, 216, 0.2)',
  },
  shieldCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 8,
  },
  textStack: {
    alignItems: 'center',
    width: '100%',
  },
  headline: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 24,
    lineHeight: 32,
    color: '#1E1B2E',
    letterSpacing: -0.6,
    textAlign: 'center',
    marginBottom: 12,
  },
  subline: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 23,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 240,
  },
  quoteSection: {
    alignItems: 'center',
    width: '100%',
  },
  quoteCard: {
    width: '100%',
    minHeight: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 6,
    overflow: 'hidden',
    marginBottom: 24,
  },
  quoteDecoShape: {
    position: 'absolute',
    width: 96,
    height: 96,
    right: -24,
    top: -24,
    backgroundColor: 'rgba(245, 240, 255, 0.5)',
    borderRadius: 48,
  },
  quoteText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 26,
    color: '#1E1B2E',
    textAlign: 'center',
    zIndex: 2,
  },
  paginationRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dotActive: {
    width: 24,
    height: 6,
    backgroundColor: '#BEA3D8',
    borderRadius: 3,
  },
  dotInactive: {
    width: 6,
    height: 6,
    backgroundColor: '#CCC3D8',
    borderRadius: 3,
  },
  bottomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 40,
  },
  bottomInfoText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 12,
    color: '#6B7280',
    letterSpacing: 0.4,
  },
});
