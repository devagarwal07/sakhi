import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';

const VIEW_TABS = [
  { label: 'Today',     value: 'today'  },
  { label: 'This Week', value: 'weekly' },
  { label: 'All',       value: 'all'    },
];

const STATUS_COLORS = {
  upcoming:  { bg: `${Colors.primaryContainer}18`, text: Colors.primaryContainer },
  completed: { bg: '#D1FAE5',                       text: '#059669'               },
  missed:    { bg: '#FEE2E2',                        text: '#DC2626'               },
};

// ── Ride card ────────────────────────────────────────────────────────────────
function RideCard({ ride, onPress }) {
  const status = ride.status ?? 'upcoming';
  const sc     = STATUS_COLORS[status] ?? STATUS_COLORS.upcoming;
  const isUpcoming = status === 'upcoming';

  return (
    <TouchableOpacity
      style={[styles.rideCard, isUpcoming && styles.rideCardActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.timeCol}>
        <Text style={[styles.timeHour, !isUpcoming && styles.timeHourInactive]}>
          {ride.time_display ?? '—'}
        </Text>
        <Text style={[styles.timePeriod, !isUpcoming && styles.timePeriodInactive]}>
          {ride.period ?? ''}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rideRoute} numberOfLines={1}>{ride.route ?? '—'}</Text>
        <Text style={styles.riderName}>{ride.rider_name ?? ''}</Text>
        {ride.ride_label && <Text style={styles.rideLabel}>{ride.ride_label}</Text>}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
        <Text style={[styles.statusText, { color: sc.text }]}>{status}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function SubscriptionRidesOverviewScreen({ navigation }) {
  const [tab, setTab]               = useState('today');
  const [optedIn, setOptedIn]       = useState(true);
  const [rides, setRides]           = useState([]);
  const [nextRide, setNextRide]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRides = useCallback(async (t = tab) => {
    try {
      const { data } = await client.get(`/drivers/subscriptions?view=${t}`);
      setRides(data.rides ?? []);
      setNextRide(data.next_ride ?? null);
      setOptedIn(data.opted_in ?? true);
    } catch (err) {
      console.warn('[Subscriptions]', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => { fetchRides(tab); }, [tab]);

  const onRefresh = () => { setRefreshing(true); fetchRides(tab); };

  const handleOptToggle = async (val) => {
    try {
      setOptedIn(val);
      await client.patch('/drivers/subscriptions/opt-in', { opted_in: val });
    } catch {
      setOptedIn(!val); // revert
      Alert.alert('Error', 'Could not update preference.');
    }
  };

  const minutesUntilNext = nextRide
    ? Math.max(0, Math.round((new Date(nextRide.scheduled_at) - Date.now()) / 60000))
    : null;
  const showLockBanner = minutesUntilNext !== null && minutesUntilNext <= 60;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Rides</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryContainer} />}
      >
        {/* Opt-in toggle card */}
        <View style={styles.optCard}>
          <View style={styles.optLeft}>
            <View style={styles.optIconBox}>
              <Text style={{ fontSize: 22 }}>🔄</Text>
            </View>
            <View>
              <Text style={styles.optTitle}>Accept Subscription Rides</Text>
              <Text style={styles.optSub}>Priority matching + guaranteed earnings</Text>
            </View>
          </View>
          <Switch
            value={optedIn}
            onValueChange={handleOptToggle}
            trackColor={{ false: Colors.outlineVariant, true: Colors.primaryContainer }}
            thumbColor={Colors.white}
          />
        </View>

        {/* Opted-in banner */}
        {optedIn && (
          <View style={styles.greenBanner}>
            <Text style={{ fontSize: 16 }}>✅</Text>
            <Text style={styles.greenBannerText}>
              You are opted in. Subscription rides will be assigned to you.
            </Text>
          </View>
        )}

        {/* Lock/countdown banner */}
        {showLockBanner && (
          <View style={styles.lockBanner}>
            <View style={styles.lockLeft}>
              <Text style={{ fontSize: 16 }}>🔒</Text>
              <Text style={styles.lockText}>
                Subscription ride in {minutesUntilNext} mins. On-demand paused.
              </Text>
            </View>
            <View style={styles.lockTimer}>
              <Text style={styles.lockTimerText}>
                {Math.floor(minutesUntilNext / 60).toString().padStart(2, '0')}:
                {(minutesUntilNext % 60).toString().padStart(2, '0')}
              </Text>
            </View>
          </View>
        )}

        {/* View tabs */}
        <Text style={styles.sectionTitle}>SCHEDULE</Text>
        <View style={styles.tabsRow}>
          {VIEW_TABS.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.tab, tab === t.value && styles.tabActive]}
              onPress={() => setTab(t.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, tab === t.value && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Weekly calendar shortcut */}
        {tab === 'weekly' && (
          <TouchableOpacity
            style={styles.calendarBtn}
            onPress={() => navigation.navigate('WeeklyCalendarView')}
            activeOpacity={0.8}
          >
            <Text style={styles.calendarBtnText}>📅  View Weekly Calendar</Text>
          </TouchableOpacity>
        )}

        {/* Ride list */}
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primaryContainer} style={{ marginTop: 40 }} />
        ) : rides.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No rides scheduled</Text>
            <Text style={styles.emptySub}>When subscriptions are assigned, they'll appear here.</Text>
          </View>
        ) : (
          <View style={styles.rideList}>
            {rides.map((ride, i) => (
              <RideCard
                key={ride.id ?? i}
                ride={ride}
                onPress={() => navigation.navigate('SubscriptionAssignmentDetails', { subscription: ride })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceLow },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    backgroundColor: `${Colors.surfaceLow}E0`,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 22, color: Colors.primaryContainer },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.onSurface },

  scroll: { paddingHorizontal: Spacing.base, paddingBottom: 32, gap: 12 },

  // Opt-in
  optCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, ...Shadows.card,
  },
  optLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  optIconBox: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  optTitle: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  optSub: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 2 },

  greenBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#ECFDF5', borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: '#A7F3D0',
  },
  greenBannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#065F46' },

  lockBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF7ED', borderRadius: Radius.lg,
    padding: Spacing.md, borderLeftWidth: 4, borderLeftColor: '#F97316',
  },
  lockLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  lockText: { fontSize: 12, fontWeight: '600', color: '#9A3412', flex: 1 },
  lockTimer: {
    backgroundColor: Colors.white, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.md,
  },
  lockTimerText: { fontSize: 15, fontWeight: '800', color: '#F97316', fontVariant: ['tabular-nums'] },

  sectionTitle: { fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 1.5 },
  tabsRow: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: Radius.md,
    backgroundColor: Colors.white, alignItems: 'center', ...Shadows.card,
  },
  tabActive: { backgroundColor: Colors.primaryContainer },
  tabText: { fontSize: 12, fontWeight: '600', color: Colors.onSurfaceVariant },
  tabTextActive: { color: Colors.white, fontWeight: '800' },

  calendarBtn: {
    backgroundColor: `${Colors.primaryContainer}12`, borderRadius: Radius.lg,
    padding: Spacing.md, alignItems: 'center',
    borderWidth: 1.5, borderColor: `${Colors.primaryContainer}25`,
  },
  calendarBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primaryContainer },

  rideList: { gap: 10 },
  rideCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, borderLeftWidth: 4, borderLeftColor: Colors.outlineVariant,
    ...Shadows.card,
  },
  rideCardActive: { borderLeftColor: Colors.primaryContainer },
  timeCol: { alignItems: 'center', minWidth: 36 },
  timeHour: { fontSize: 18, fontWeight: '900', color: Colors.primaryContainer, lineHeight: 20 },
  timeHourInactive: { color: Colors.onSurfaceVariant },
  timePeriod: { fontSize: 9, fontWeight: '700', color: Colors.primaryContainer, letterSpacing: 0.5 },
  timePeriodInactive: { color: Colors.onSurfaceVariant },
  rideRoute: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  riderName: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  rideLabel: { fontSize: 10, color: Colors.onSurfaceVariant, fontStyle: 'italic', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.onSurface },
  emptySub: { fontSize: 13, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20 },
});
