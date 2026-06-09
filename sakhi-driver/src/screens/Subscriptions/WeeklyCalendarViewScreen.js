import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';
import ScreenHeader, { HEADER_HEIGHT } from '../../components/ScreenHeader';
import { useTranslation } from 'react-i18next';
const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

// No dummy data — weekly calendar fetched from API or navigation params
const EMPTY_WEEK = (days) => days.map((d, i) => ({
  day: d,
  date: new Date(Date.now() + (i - TODAY_IDX) * 86400000).getDate(),
  rides: [],
}));

const STATUS_STYLE = {
  upcoming: { bg: `${Colors.primaryContainer}18`, text: Colors.primaryContainer },
  completed: { bg: '#ECFDF5', text: '#059669' },
  scheduled: { bg: Colors.surfaceContainer, text: Colors.onSurfaceVariant },
};

export default function WeeklyCalendarViewScreen({ navigation, route }) {
  const { t } = useTranslation();
  const daysShort = t('subscription.daysShort', { returnObjects: true });
  const days = Array.isArray(daysShort) && daysShort.length === 7
    ? daysShort
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const [week, setWeek] = useState(route.params?.week ?? EMPTY_WEEK(days));
  const [selectedDay, setSelectedDay] = useState(TODAY_IDX);
  const [loadingWeek, setLoadingWeek] = useState(!route.params?.week);

  // ── Fetch weekly calendar from API if not passed via params ──────────────
  useEffect(() => {
    if (route.params?.week) return;
    (async () => {
      try {
        const { data } = await client.get('/drivers/subscription/weekly-calendar');
        if (Array.isArray(data?.week) && data.week.length === 7) {
          setWeek(data.week);
        } else {
          setWeek(EMPTY_WEEK(days));
        }
      } catch {
        setWeek(EMPTY_WEEK(days));
      } finally {
        setLoadingWeek(false);
      }
    })();
  }, []);

  const dayData = week[selectedDay] ?? { day: days[selectedDay], date: '', rides: [] };

  const statusLabels = {
    upcoming: t('subscription.statusUpcoming'),
    completed: t('subscription.statusCompleted'),
    scheduled: t('subscription.statusScheduled'),
  };

  return (
    <View style={styles.safe}>
      {/* Header */}
      <ScreenHeader title={t('subscription.weeklyCalendarTitle')} onBack={() => navigation.goBack()} />

      {/* Day selector strip */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.dayStrip}
        contentContainerStyle={styles.dayStripContent}
      >
        {days.map((d, i) => {
          const dayInfo = week[i] ?? { day: d, date: i + 1, rides: [] };
          const isToday = i === TODAY_IDX;
          const isSel = i === selectedDay;
          const hasRides = (dayInfo.rides ?? []).length > 0;

          return (
            <TouchableOpacity
              key={d}
              style={[styles.dayBtn, isSel && styles.dayBtnActive]}
              onPress={() => setSelectedDay(i)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayLabel, isSel && styles.dayLabelActive]}>{d}</Text>
              <View style={[styles.dayNum, isSel && styles.dayNumActive, isToday && styles.dayNumToday]}>
                <Text style={[styles.dayNumText, isSel && styles.dayNumTextActive]}>
                  {dayInfo.date ?? i + 1}
                </Text>
              </View>
              {hasRides && <View style={[styles.rideDot, isSel && styles.rideDotActive]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Rides for selected day */}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>
          {dayData.day === days[TODAY_IDX]
            ? t('subscription.todaysRides')
            : t('subscription.ridesForDay', { day: dayData.day })}
        </Text>

        {(dayData.rides ?? []).length === 0 ? (
          <View style={styles.emptyDay}>
            <Feather name="sun" size={40} color="#BEA3D8" />
            <Text style={styles.emptyText}>{t('subscription.noRidesScheduled')}</Text>
          </View>
        ) : (
          dayData.rides.map((ride, i) => {
            const sc = STATUS_STYLE[ride.status] ?? STATUS_STYLE.scheduled;
            return (
              <View key={i} style={[styles.rideCard, ride.status === 'upcoming' && styles.rideCardActive]}>
                <View style={styles.timeCol}>
                  <Text style={styles.rideTime}>{ride.time}</Text>
                </View>
                <Text style={styles.rideRoute} numberOfLines={1}>{ride.route}</Text>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.text }]}>
                    {statusLabels[ride.status] ?? ride.status}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        {/* Summary strip */}
        <View style={styles.summaryStrip}>
          <Text style={styles.summaryText}>
            <Feather name="calendar" size={13} color="#BEA3D8" />  {t('subscription.totalRidesThisWeek', { count: week.reduce((acc, d) => acc + (d.rides?.length ?? 0), 0) })}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceLow },
  // Day strip
  dayStrip: { flexGrow: 0, borderBottomWidth: 1, borderColor: Colors.outlineVariant },
  dayStripContent: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, gap: 8 },
  dayBtn: {
    alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: Radius.lg, gap: 4,
  },
  dayBtnActive: { backgroundColor: `${Colors.primaryContainer}10` },
  dayLabel: { fontSize: 10, fontWeight: '600', color: Colors.onSurfaceVariant, letterSpacing: 0.5 },
  dayLabelActive: { color: Colors.primaryContainer, fontWeight: '800' },
  dayNum: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  dayNumActive: { backgroundColor: Colors.primaryContainer },
  dayNumToday: { borderWidth: 2, borderColor: Colors.primaryContainer },
  dayNumText: { fontSize: 15, fontWeight: '700', color: Colors.onSurface },
  dayNumTextActive: { color: Colors.white },
  rideDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.onSurfaceVariant },
  rideDotActive: { backgroundColor: Colors.primaryContainer },

  scroll: { paddingHorizontal: Spacing.base, paddingBottom: 40, paddingTop: Spacing.md, gap: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 1, marginBottom: 4 },

  rideCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, borderLeftWidth: 4, borderLeftColor: Colors.outlineVariant,
    ...Shadows.card,
  },
  rideCardActive: { borderLeftColor: Colors.primaryContainer },
  timeCol: { minWidth: 64 },
  rideTime: { fontSize: 13, fontWeight: '800', color: Colors.primaryContainer },
  rideRoute: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.onSurface },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },

  emptyDay: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 14, color: Colors.onSurfaceVariant },

  summaryStrip: {
    backgroundColor: `${Colors.primaryContainer}10`, borderRadius: Radius.lg,
    padding: Spacing.md, alignItems: 'center', marginTop: 10,
  },
  summaryText: { fontSize: 13, color: Colors.primaryContainer, fontWeight: '600' },
});
