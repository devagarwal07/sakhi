import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function DocumentUnderReviewScreen({ navigation }) {
  const { t } = useTranslation();
  const { checkAuth, driver } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const submittedAt = driver?.kyc_submitted_at
    ? new Date(driver.kyc_submitted_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Submitted';

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await checkAuth();
      // checkAuth will update driver.onboarding_status
      // if now 'approved', RootNavigator will switch to MainStack
      // if 'rejected', navigate to re-upload
      if (driver?.onboarding_status === 'rejected') {
        navigation.replace('DocumentReUpload', { rejections: driver?.document_rejections });
      }
    } catch {
      Alert.alert('Network Error', 'Could not refresh status. Check your connection.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Application Status</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Animated spinner area */}
        <View style={styles.spinnerWrap}>
          <View style={styles.ring} />
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>📄</Text>
          </View>
        </View>

        <Text style={styles.headline}>Document Under Review</Text>
        <Text style={styles.subline}>
          Our team is reviewing your documents.{'\n'}This usually takes up to 24 hours.
        </Text>

        {/* Status card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusIcon}>🕐</Text>
            <View>
              <Text style={styles.statusRowLabel}>SUBMITTED</Text>
              <Text style={styles.statusRowValue}>{submittedAt}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.statusRow}>
            <Text style={styles.statusIcon}>✅</Text>
            <View>
              <Text style={styles.statusRowLabel}>EXPECTED BY</Text>
              <Text style={styles.statusRowValue}>Within 24 hours</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.statusRow}>
            <Text style={[styles.statusIcon, { color: '#F59E0B' }]}>⏳</Text>
            <View>
              <Text style={styles.statusRowLabel}>CURRENT STATUS</Text>
              <Text style={[styles.statusRowValue, { color: '#D97706', fontWeight: '700' }]}>Under Manual Review</Text>
            </View>
          </View>
        </View>

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoEmoji}>ℹ️</Text>
          <Text style={styles.infoText}>You'll be notified once your profile is approved.</Text>
        </View>

        {/* Refresh button */}
        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={refreshing} activeOpacity={0.8}>
          {refreshing
            ? <ActivityIndicator color={Colors.primaryContainer} size="small" />
            : <Text style={styles.refreshText}>🔄  Refresh Status</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceLow },
  header: {
    paddingHorizontal: Spacing.base, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: Colors.onSurface },
  scroll: { paddingHorizontal: Spacing.base, paddingBottom: 40, alignItems: 'center' },

  spinnerWrap: { width: 128, height: 128, alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 28 },
  ring: {
    position: 'absolute', width: 128, height: 128, borderRadius: 64,
    borderWidth: 4, borderColor: `${Colors.primaryContainer}30`,
    borderTopColor: Colors.primaryContainer,
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...Shadows.lavender,
  },
  iconEmoji: { fontSize: 38 },

  headline: { fontSize: 22, fontWeight: '800', color: Colors.onSurface, textAlign: 'center', letterSpacing: -0.5, marginBottom: 8 },
  subline: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22, marginBottom: 24 },

  statusCard: { width: '100%', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, ...Shadows.card, marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 10 },
  statusIcon: { fontSize: 20 },
  statusRowLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: Colors.onSurfaceVariant, marginBottom: 2 },
  statusRowValue: { fontSize: 13, fontWeight: '500', color: Colors.onSurface },
  divider: { height: 1, backgroundColor: Colors.surfaceLow },

  infoBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: `${Colors.primaryContainer}12`,
    borderRadius: Radius.lg, padding: Spacing.md,
    width: '100%', gap: 10, marginBottom: 24,
  },
  infoEmoji: { fontSize: 18 },
  infoText: { flex: 1, fontSize: 12, color: Colors.onSurfaceVariant, lineHeight: 18 },

  refreshBtn: {
    width: '100%', height: 52, borderRadius: Radius.lg,
    borderWidth: 2, borderColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  refreshText: { fontSize: 15, fontWeight: '700', color: Colors.primaryContainer },
});
