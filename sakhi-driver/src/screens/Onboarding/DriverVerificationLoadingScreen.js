import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';

export default function DriverVerificationLoadingScreen({ navigation }) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();

    // Auto-navigate to DocumentUnderReview after a short delay
    const t = setTimeout(() => navigation.replace('DocumentUnderReview'), 3000);
    return () => clearTimeout(t);
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        {/* Spinning ring */}
        <View style={styles.spinnerWrap}>
          <Animated.View style={[styles.ring, { transform: [{ rotate }] }]} />
          {/* Center icon */}
          <Animated.View style={[styles.iconCircle, { transform: [{ scale: pulse }] }]}>
            <Text style={styles.iconEmoji}>📄</Text>
          </Animated.View>
        </View>

        <Text style={styles.headline}>Submitting Documents…</Text>
        <Text style={styles.subline}>
          We're securely uploading your documents.{'\n'}This will only take a moment.
        </Text>

        {/* Steps */}
        {['Uploading KYC...', 'Sending for review...', 'Almost done!'].map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepDot} />
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceLow },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },

  spinnerWrap: { width: 128, height: 128, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  ring: {
    position: 'absolute', width: 128, height: 128, borderRadius: 64,
    borderWidth: 4,
    borderColor: `${Colors.primaryContainer}30`,
    borderTopColor: Colors.primaryContainer,
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', ...Shadows.lavender,
  },
  iconEmoji: { fontSize: 38 },

  headline: {
    fontSize: 22, fontWeight: '800', color: Colors.onSurface,
    letterSpacing: -0.5, marginBottom: 10, textAlign: 'center',
  },
  subline: {
    fontSize: 14, color: Colors.onSurfaceVariant,
    textAlign: 'center', lineHeight: 22, marginBottom: 32,
  },

  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  stepDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.primaryContainer,
  },
  stepText: { fontSize: 13, color: Colors.onSurfaceVariant },
});
