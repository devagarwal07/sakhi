import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';

export default function AccountApprovedScreen({ navigation }) {
  const { driver } = useAuth();
  const scale = useRef(new Animated.Value(0.5)).current;
  const glow  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  const handleContinue = () => {
    navigation.reset({ index: 0, routes: [{ name: 'RootShell' }] });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account Status</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Success icon */}
        <View style={styles.iconWrap}>
          <Animated.View style={[styles.glowCircle, { opacity: glowOpacity }]} />
          <Animated.View style={[styles.checkCircle, { transform: [{ scale }] }]}>
            <Text style={styles.checkEmoji}>✅</Text>
          </Animated.View>
        </View>

        <Text style={styles.headline}>You're Approved! 🎉</Text>
        <Text style={styles.subline}>Your Sakhi driver account is active and ready.</Text>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryMeta}>DRIVER NAME</Text>
              <Text style={styles.summaryValue}>{driver?.name ?? 'Driver'}</Text>
            </View>
            <View style={styles.personIcon}>
              <Text style={{ fontSize: 22 }}>🧑‍✈️</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.vehicleRow}>
            <Text style={styles.vehicleEmoji}>🛺</Text>
            <View>
              <Text style={styles.summaryMeta}>VEHICLE</Text>
              <Text style={styles.summaryValue}>
                {driver?.vehicle_model ?? 'Auto'} · {driver?.registration_number ?? '—'}
              </Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.badgeRow}>
            <View>
              <Text style={styles.summaryMeta}>KYC STATUS</Text>
              <Text style={styles.greenBadge}>Verified ✓</Text>
            </View>
            <View>
              <Text style={styles.summaryMeta}>ACCOUNT</Text>
              <Text style={[styles.greenBadge, { textAlign: 'right' }]}>Active ✓</Text>
            </View>
          </View>
        </View>

        {/* Welcome quote */}
        <Text style={styles.quote}>
          "Welcome to the Sakhi family.{'\n'}Your first ride awaits! 💜"
        </Text>
      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.ctaBtn} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.ctaText}>Continue to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceLow },
  header: { paddingTop: Spacing.md, paddingBottom: Spacing.sm, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: Colors.onSurface },
  scroll: { paddingHorizontal: Spacing.base, paddingBottom: 120, alignItems: 'center' },

  iconWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 24 },
  glowCircle: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#22C55E20',
  },
  checkCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', ...Shadows.lavender,
  },
  checkEmoji: { fontSize: 46 },

  headline: {
    fontSize: 28, fontWeight: '800', color: Colors.onSurface,
    letterSpacing: -0.5, textAlign: 'center', marginBottom: 8,
  },
  subline: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', marginBottom: 24 },

  summaryCard: { width: '100%', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, ...Shadows.card, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryMeta: { fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 1.5 },
  summaryValue: { fontSize: 16, fontWeight: '600', color: Colors.onSurface, marginTop: 2 },
  personIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.surfaceLow,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryDivider: { height: 1, backgroundColor: Colors.surfaceLow, marginVertical: 12 },
  vehicleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  vehicleEmoji: { fontSize: 22, marginTop: 2 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  greenBadge: { fontSize: 13, fontWeight: '700', color: '#16A34A', marginTop: 2 },

  quote: {
    fontSize: 13, color: Colors.onSurfaceVariant, textAlign: 'center',
    fontStyle: 'italic', lineHeight: 22, paddingHorizontal: Spacing.md,
  },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.base, paddingBottom: 36, paddingTop: 16,
    backgroundColor: `${Colors.white}E0`,
  },
  ctaBtn: {
    height: 60, borderRadius: Radius.lg,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center', ...Shadows.lavender,
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
