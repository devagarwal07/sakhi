import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Linking, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';

const STATUS_COLORS = {
  upcoming:  { bg: `${Colors.primaryContainer}18`, text: Colors.primaryContainer },
  completed: { bg: '#D1FAE5',                       text: '#059669'               },
  scheduled: { bg: Colors.surfaceContainer,          text: Colors.onSurfaceVariant },
};

export default function SubscriptionAssignmentDetailsScreen({ navigation, route }) {
  const { subscription: sub } = route.params ?? {};
  const [initiating, setInitiating] = useState(false);

  // ── Initiate scheduled pickup ─────────────────────────────────────────────
  const handleInitiatePickup = async () => {
    Alert.alert(
      'Start Pickup?',
      'Confirm you are heading to the rider\'s pickup location.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            try {
              setInitiating(true);
              await client.post(`/rides/subscription/${sub?.id}/initiate`);
              navigation.navigate('EnRouteToPickup', {
                ride: {
                  ride_id:          sub?.id,
                  rider_name:       sub?.rider_name,
                  rider_photo:      sub?.rider_photo,
                  rider_rating:     sub?.rider_rating,
                  rider_phone:      sub?.rider_phone,
                  pickup_address:   sub?.pickup_address,
                  dropoff_address:  sub?.dropoff_address,
                  pickup_coords:    sub?.pickup_coords,
                  dropoff_coords:   sub?.dropoff_coords,
                  distance_to_pickup_km: sub?.distance_km,
                  eta_to_pickup_min:     sub?.eta_min,
                },
              });
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message ?? 'Could not initiate pickup.');
              setInitiating(false);
            }
          },
        },
      ],
    );
  };

  // ── Call rider ────────────────────────────────────────────────────────────
  const handleCall = () => {
    if (sub?.rider_phone) Linking.openURL(`tel:${sub.rider_phone}`);
    else Alert.alert('No number', 'Rider number unavailable.');
  };

  const completedRides = sub?.completed_rides ?? 18;
  const totalRides     = sub?.total_rides     ?? 30;
  const progress       = totalRides > 0 ? completedRides / totalRides : 0;
  const sc = STATUS_COLORS[sub?.status ?? 'upcoming'];

  // ── Upcoming rides list ────────────────────────────────────────────────────
  const upcomingRides = sub?.upcoming_dates ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Rider Card */}
        <View style={styles.riderCard}>
          <View style={styles.riderLeft}>
            <View style={styles.avatarWrap}>
              {sub?.rider_photo
                ? <Image source={{ uri: sub.rider_photo }} style={styles.avatar} />
                : <Text style={styles.avatarFallback}>👤</Text>
              }
            </View>
            <View>
              <Text style={styles.riderName}>{sub?.rider_name ?? 'Rider'}</Text>
              <View style={styles.riderMeta}>
                <Text style={styles.riderRating}>⭐ {sub?.rider_rating?.toFixed(1) ?? '4.5'}</Text>
                <View style={styles.regularBadge}>
                  <Text style={styles.regularBadgeText}>Regular Rider</Text>
                </View>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.chatBtn} onPress={handleCall} activeOpacity={0.8}>
            <Text style={{ fontSize: 20 }}>📞</Text>
          </TouchableOpacity>
        </View>

        {/* Route Card */}
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={styles.greenDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>PICKUP</Text>
              <Text style={styles.routeAddress}>{sub?.pickup_address ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.routeDash} />
          <View style={styles.routeRow}>
            <Text style={{ fontSize: 18, color: Colors.primaryContainer }}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>DROP</Text>
              <Text style={styles.routeAddress}>{sub?.dropoff_address ?? '—'}</Text>
            </View>
          </View>
        </View>

        {/* Plan info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View>
              <Text style={styles.infoLabel}>Subscription Plan</Text>
              <Text style={styles.infoPrimary}>{totalRides} Rides</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.infoLabel}>Frequency</Text>
              <Text style={styles.infoValue}>{sub?.frequency ?? 'Mon–Fri'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View>
              <Text style={styles.infoLabel}>Morning Pickup</Text>
              <Text style={styles.infoValue}>☀️  {sub?.morning_time ?? '8:30 AM'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.infoLabel}>Return Pickup</Text>
              <Text style={styles.infoValue}>🌙  {sub?.evening_time ?? '6:00 PM'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View>
              <Text style={styles.infoLabel}>Start Date</Text>
              <Text style={styles.infoValue}>{sub?.start_date ?? '—'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.infoLabel}>End Date</Text>
              <Text style={styles.infoValue}>{sub?.end_date ?? '—'}</Text>
            </View>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <Text style={styles.progressTitle}>Rides Completed</Text>
            <Text style={styles.progressCount}>{completedRides} / {totalRides}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { flex: progress }]} />
          </View>
          <Text style={styles.progressSub}>{totalRides - completedRides} rides remaining in this cycle</Text>
        </View>

        {/* Upcoming rides */}
        {upcomingRides.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>📅  Upcoming Rides</Text>
            <View style={styles.upcomingList}>
              {upcomingRides.map((r, i) => (
                <View key={i} style={[styles.upcomingCard, i === 0 && styles.upcomingCardFirst]}>
                  <View style={[styles.dateBox, i === 0 && styles.dateBoxFirst]}>
                    <Text style={[styles.dateMon, i === 0 && styles.dateMonFirst]}>{r.month}</Text>
                    <Text style={[styles.dateDay, i === 0 && styles.dateDayFirst]}>{r.day}</Text>
                  </View>
                  <View>
                    <Text style={styles.upcomingDayName}>{r.day_name ?? 'Day'}</Text>
                    <Text style={styles.upcomingTimes}>{r.times ?? '—'}</Text>
                  </View>
                  <View style={[styles.upBadge, i === 0 && styles.upBadgeFirst]}>
                    <Text style={[styles.upBadgeText, i === 0 && styles.upBadgeTextFirst]}>
                      {i === 0 ? 'Next' : 'Upcoming'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.8}>
          <Text style={styles.callBtnText}>📞  Contact Rider</Text>
        </TouchableOpacity>
        <Text style={styles.callNote}>Calls are masked for privacy</Text>

        {sub?.status === 'upcoming' && (
          <TouchableOpacity
            style={[styles.startBtn, initiating && styles.startBtnDisabled]}
            onPress={handleInitiatePickup}
            disabled={initiating}
            activeOpacity={0.85}
          >
            {initiating
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.startBtnText}>🛺  Start Pickup</Text>
            }
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceLow },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 22, color: Colors.primaryContainer },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.onSurface },

  scroll: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, gap: 14 },

  // Rider
  riderCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, ...Shadows.card,
  },
  riderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: {
    width: 56, height: 56, borderRadius: 28, overflow: 'hidden',
    backgroundColor: Colors.surfaceLow, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: `${Colors.primaryContainer}25`,
  },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: { fontSize: 30 },
  riderName: { fontSize: 17, fontWeight: '700', color: Colors.onSurface },
  riderMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  riderRating: { fontSize: 13, color: Colors.onSurfaceVariant },
  regularBadge: {
    backgroundColor: Colors.surfaceLow, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: Radius.full,
  },
  regularBadgeText: { fontSize: 9, fontWeight: '700', color: Colors.primaryContainer, letterSpacing: 0.5 },
  chatBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: `${Colors.primaryContainer}10`,
    alignItems: 'center', justifyContent: 'center',
  },

  // Route
  routeCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, gap: 4, ...Shadows.card,
  },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  greenDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.online, marginTop: 4 },
  routeDash: { width: 2, height: 20, backgroundColor: Colors.outlineVariant, marginLeft: 6, marginVertical: 2 },
  routeLabel: { fontSize: 9, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 1.5 },
  routeAddress: { fontSize: 14, fontWeight: '700', color: Colors.onSurface, marginTop: 2 },

  // Info
  infoCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, gap: 12, ...Shadows.card,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 9, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 1.5, marginBottom: 4 },
  infoPrimary: { fontSize: 20, fontWeight: '900', color: Colors.primaryContainer },
  infoValue: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  divider: { height: 1, backgroundColor: Colors.surfaceContainer },

  // Progress
  progressCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, gap: 8, ...Shadows.card,
  },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  progressCount: { fontSize: 18, fontWeight: '900', color: Colors.primaryContainer },
  progressTrack: {
    height: 12, backgroundColor: Colors.surfaceContainer,
    borderRadius: 6, overflow: 'hidden', flexDirection: 'row',
  },
  progressFill: { height: '100%', backgroundColor: Colors.primaryContainer, borderRadius: 6 },
  progressSub: { fontSize: 11, color: Colors.onSurfaceVariant, textAlign: 'center' },

  // Upcoming
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.onSurface, marginBottom: 4 },
  upcomingList: { gap: 8 },
  upcomingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, ...Shadows.card, opacity: 0.85,
  },
  upcomingCardFirst: { opacity: 1 },
  dateBox: {
    width: 48, height: 48, borderRadius: 10,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  dateBoxFirst: { backgroundColor: `${Colors.primaryContainer}18` },
  dateMon: { fontSize: 9, fontWeight: '700', color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  dateMonFirst: { color: Colors.primaryContainer },
  dateDay: { fontSize: 18, fontWeight: '900', color: Colors.onSurfaceVariant },
  dateDayFirst: { color: Colors.primaryContainer },
  upcomingDayName: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  upcomingTimes: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 2 },
  upBadge: {
    marginLeft: 'auto', backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
  },
  upBadgeFirst: { backgroundColor: `${Colors.primaryContainer}18` },
  upBadgeText: { fontSize: 9, fontWeight: '800', color: Colors.onSurfaceVariant, letterSpacing: 1, textTransform: 'uppercase' },
  upBadgeTextFirst: { color: Colors.primaryContainer },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base, paddingBottom: 32, paddingTop: 12,
    gap: 8, ...Shadows.lavender,
  },
  callBtn: {
    height: 52, borderRadius: Radius.lg,
    borderWidth: 2, borderColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  callBtnText: { fontSize: 15, fontWeight: '700', color: Colors.primaryContainer },
  callNote: { fontSize: 10, color: Colors.onSurfaceVariant, textAlign: 'center', letterSpacing: 0.5 },
  startBtn: {
    height: 56, borderRadius: Radius.lg,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center', ...Shadows.lavender,
  },
  startBtnDisabled: { backgroundColor: Colors.outlineVariant },
  startBtnText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
});
