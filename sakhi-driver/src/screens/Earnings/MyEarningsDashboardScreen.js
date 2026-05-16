import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';
import ScreenHeader, { HEADER_HEIGHT } from '../../components/ScreenHeader';
import SakhiDateRangePicker from '../../components/SakhiDateRangePicker';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';

// ── Mini bar chart ───────────────────────────────────────────────────────────
function BarChart({ bars = [], maxValue = 1, days = [], bestDayLabel }) {
  const MAX_BAR_H = 96;
  return (
    <View style={chartStyles.wrap}>
      <View style={chartStyles.barsRow}>
        {days.map((day, i) => {
          const val = bars[i] ?? 0;
          const ratio = maxValue > 0 ? val / maxValue : 0;
          const isMax = val === maxValue && val > 0;
          return (
            <View key={i} style={chartStyles.barCol}>
              <View style={[chartStyles.barTrack, { height: MAX_BAR_H }]}>
                <View
                  style={[
                    chartStyles.bar,
                    { height: ratio * MAX_BAR_H },
                    isMax && chartStyles.barHighlight,
                    val === 0 && chartStyles.barEmpty,
                  ]}
                />
              </View>
              <Text style={[chartStyles.dayLabel, isMax && chartStyles.dayLabelActive]}>
                {day}
              </Text>
            </View>
          );
        })}
      </View>
      {maxValue > 0 && (
        <Text style={chartStyles.bestDay}>
          {bestDayLabel}{' '}
          <Text style={{ color: Colors.primaryContainer, fontWeight: '800' }}>
            ₹{maxValue}
          </Text>
        </Text>
      )}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  wrap: { paddingTop: 8 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 110 },
  barCol: { alignItems: 'center', flex: 1, gap: 6 },
  barTrack: { width: '70%', justifyContent: 'flex-end' },
  bar: {
    width: '100%', borderRadius: 4,
    backgroundColor: Colors.primaryContainer, minHeight: 4,
  },
  barHighlight: { backgroundColor: Colors.primary, opacity: 1 },
  barEmpty: {
    backgroundColor: 'transparent', borderWidth: 1.5,
    borderColor: Colors.outlineVariant, borderStyle: 'dashed', minHeight: 16,
  },
  dayLabel: { fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant },
  dayLabelActive: { color: Colors.primaryContainer },
  bestDay: { textAlign: 'center', fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 10 },
});

// ── Main screen ──────────────────────────────────────────────────────────────
export default function MyEarningsDashboardScreen({ navigation }) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('weekly');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);

  const customTabLabel = () => {
    if (!customStart) return t('earnings.periodCustom');
    const fmt = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    if (customEnd && customEnd.getTime() !== customStart.getTime()) {
      return `${fmt(customStart)} – ${fmt(customEnd)}`;
    }
    return fmt(customStart);
  };

  const daysShort = t('earnings.daysShort', { returnObjects: true });
  const chartDays = Array.isArray(daysShort) && daysShort.length === 7
    ? daysShort
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const periods = [
    { label: t('earnings.periodToday'), value: 'today' },
    { label: t('earnings.periodThisWeek'), value: 'weekly' },
    { label: t('earnings.periodMonthly'), value: 'monthly' },
    { label: t('earnings.periodAllTime'), value: 'all' },
    { label: t('earnings.periodCustom'), value: 'custom' },
  ];

  const fetchEarnings = useCallback(async (p = period, start = customStart, end = customEnd) => {
    try {
      let res;

      if (p === 'today') {
        // { rides_completed, gross_earnings, net_earnings }
        const { data } = await client.get('/drivers/earnings/today');
        res = {
          net_earnings: data.net_earnings ?? 0,
          ride_count: data.rides_completed ?? 0,
          average_rating: 0,      // not returned by this endpoint
          days_online: 1,
          take_home: data.net_earnings ?? 0,
          platform_fee: data.gross_earnings - data.net_earnings || 0,
          daily_earnings: [],
          pending_commission: 0,
        };
      } else if (p === 'weekly') {
        // { breakdown: [{ date, gross, commission, net, rides }] }
        const { data } = await client.get('/drivers/earnings/weekly');
        const breakdown = data.breakdown || [];
        const totals = breakdown.reduce(
          (acc, day) => ({
            net: acc.net + day.net,
            gross: acc.gross + day.gross,
            rides: acc.rides + day.rides,
            commission: acc.commission + day.commission,
          }),
          { net: 0, gross: 0, rides: 0, commission: 0 }
        );
        // Build 7-bar array Mon..Sun aligned to current week
        const today = new Date();
        const dow = (today.getDay() + 6) % 7; // Mon=0
        const bars = Array(7).fill(0);
        breakdown.forEach((d) => {
          const dayDate = new Date(d.date);
          const diff = Math.round((today - dayDate) / 86400000);
          const idx = dow - diff;
          if (idx >= 0 && idx < 7) bars[idx] = d.net;
        });
        res = {
          net_earnings: +totals.net.toFixed(2),
          ride_count: totals.rides,
          average_rating: 0,
          days_online: breakdown.filter((d) => d.rides > 0).length,
          take_home: +totals.net.toFixed(2),
          platform_fee: +totals.commission.toFixed(2),
          daily_earnings: bars,
          pending_commission: 0,
        };
      } else {
        // monthly / all / ledger → /drivers/earnings/ledger
        // { month, ledger, total_active_days, loyalty }
        const { data } = await client.get('/drivers/earnings/ledger');
        const ledger = data.ledger || [];
        const netTotal = ledger.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
        res = {
          net_earnings: +netTotal.toFixed(2),
          ride_count: ledger.length,
          average_rating: 0,
          days_online: data.total_active_days ?? 0,
          take_home: +netTotal.toFixed(2),
          platform_fee: 0,
          daily_earnings: [],
          pending_commission: ledger.filter((l) => !l.paid).reduce((s, r) => s + parseFloat(r.amount || 0), 0),
        };
      }

      setData(res);
    } catch (err) {
      console.warn('[Earnings]', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, customStart, customEnd]);

  useEffect(() => { fetchEarnings(period); }, [period]);

  const onRefresh = () => { setRefreshing(true); fetchEarnings(period); };

  // Derived values
  const netEarnings = data?.net_earnings ?? 0;
  const rideCount = data?.ride_count ?? 0;
  const avgRating = data?.average_rating ?? 0;
  const daysOnline = data?.days_online ?? 0;
  const onDemand = data?.on_demand ?? 0;
  const subscription = data?.subscription ?? 0;
  const waitCharges = data?.wait_charges ?? 0;
  const commission = data?.platform_fee ?? 0;
  const takeHome = data?.take_home ?? 0;
  const dailyBars = data?.daily_earnings ?? [480, 560, 320, 680, 520, 0, 0];
  const maxBar = Math.max(...dailyBars, 1);
  const pendingComm = data?.pending_commission ?? 0;

  return (
    <>
      <View style={styles.safe}>
        <ScreenHeader title={t('sidebar.myEarnings')} onBack={() => navigation.goBack()} />

        <View style={[styles.tabsWrap, {}]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}
          >
            {periods.map((p) => {
              const isActive = period === p.value;
              const lbl = p.value === 'custom' ? customTabLabel() : p.label;
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.tab, isActive && styles.tabActive]}
                  onPress={() => {
                    if (p.value === 'custom') { setShowCalendar(true); return; }
                    setPeriod(p.value);
                    setLoading(true);
                    fetchEarnings(p.value, null, null);
                  }}
                  activeOpacity={0.7}
                >
                  {p.value === 'custom' && (
                    <Feather name="calendar" size={12} color={isActive ? Colors.primaryContainer : Colors.onSurfaceVariant} />
                  )}
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {lbl}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={Colors.primaryContainer} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryContainer} />}
          >
            {/* Hero Card */}
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>
                {t('earnings.periodEarnings', {
                  period: period === 'custom' && customStart
                    ? customTabLabel()
                    : (periods.find((p) => p.value === period)?.label ?? ''),
                })}
              </Text>
              <Text style={styles.heroAmount}>₹{netEarnings.toLocaleString('en-IN')}</Text>
              <View style={styles.heroMeta}>
                <Text style={styles.metaItem}>{rideCount} {t('earnings.ridesLabel')}</Text>
                <View style={styles.metaDot} />
                <Text style={styles.metaItem}>{avgRating.toFixed(1)} ★ {t('earnings.avgLabel')}</Text>
                <View style={styles.metaDot} />
                <Text style={styles.metaItem}>{daysOnline} {t('earnings.daysOnlineLabel')}</Text>
              </View>
            </View>

            {/* Bar Chart (weekly only) */}
            {period === 'weekly' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('earnings.dailyEarnings')}</Text>
                <BarChart
                  bars={dailyBars}
                  maxValue={maxBar}
                  days={chartDays}
                  bestDayLabel={t('earnings.bestDayThisWeek')}
                />
              </View>
            )}

            {/* Breakdown */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('earnings.breakdown')}</Text>
              {[
                { label: t('earnings.onDemandRides'), value: onDemand, sub: `${data?.on_demand_count ?? 0} ${t('earnings.ridesLabel')}`, accent: false },
                { label: t('earnings.subscriptionRides'), value: subscription, sub: `${data?.subscription_count ?? 0} ${t('earnings.ridesLabel')}`, accent: true },
                { label: t('earnings.waitingCharges'), value: waitCharges, sub: t('earnings.cumulative'), accent: false },
              ].map((row) => (
                <View key={row.label} style={styles.breakRow}>
                  <View>
                    <Text style={[styles.breakLabel, row.accent && styles.breakLabelAccent]}>{row.label}</Text>
                    <Text style={styles.breakSub}>{row.sub}</Text>
                  </View>
                  <Text style={[styles.breakValue, row.accent && styles.breakValueAccent]}>
                    ₹{row.value.toLocaleString('en-IN')}
                  </Text>
                </View>
              ))}

              <View style={styles.divider} />
              <View style={styles.breakRow}>
                <Text style={styles.netLabel}>{t('earnings.netEarnings')}</Text>
                <Text style={styles.netValue}>₹{netEarnings.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            {/* Commission summary */}
            <View style={[styles.card, styles.cardLast]}>
              <View style={styles.commRow}>
                <Text style={styles.commLabel}>{t('earnings.platformFee')}</Text>
                <Text style={styles.commFee}>₹{commission}</Text>
              </View>
              <View style={styles.commRow}>
                <Text style={styles.takeHomeLabel}>{t('earnings.netTakeHome')}</Text>
                <Text style={styles.takeHomeValue}>₹{takeHome.toLocaleString('en-IN')}</Text>
              </View>
              {pendingComm > 0 && (
                <TouchableOpacity
                  style={styles.payCommBtn}
                  onPress={() => navigation.navigate('DailyCommissionPayment', { amount: pendingComm })}
                  activeOpacity={0.85}
                >
                  <Text style={styles.payCommText}>
                    ⚠️  {t('earnings.payCommissionDue', { amount: pendingComm })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        )}
      </View>

      <SakhiDateRangePicker
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        initialStart={customStart}
        initialEnd={customEnd}
        onApply={(start, end) => {
          setCustomStart(start);
          setCustomEnd(end);
          setPeriod('custom');
          setShowCalendar(false);
          setLoading(true);
          fetchEarnings('custom', start, end);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceLow },

  tabsWrap: { paddingHorizontal: Spacing.base, paddingTop: Spacing.base, paddingBottom: Spacing.sm },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg, padding: 4, ...Shadows.card,
  },
  tab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: Radius.md, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.surfaceLow },
  tabText: { fontSize: 11, fontWeight: '600', color: Colors.onSurfaceVariant },
  tabTextActive: { fontWeight: '800', color: Colors.primaryContainer },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: 32, gap: 14 },

  // Hero
  heroCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.lg, alignItems: 'center',
    borderLeftWidth: 4, borderLeftColor: Colors.primaryContainer,
    ...Shadows.lavender,
  },
  heroLabel: { fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 1.5, marginBottom: 8 },
  heroAmount: { fontSize: 52, fontWeight: '900', color: Colors.primaryContainer, letterSpacing: -3, lineHeight: 60 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  metaItem: { fontSize: 12, color: Colors.onSurfaceVariant, fontWeight: '500' },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.outlineVariant },

  // Cards
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, ...Shadows.card },
  cardLast: {},
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.onSurface, marginBottom: 14 },

  // Breakdown
  breakRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  breakLabel: { fontSize: 13, fontWeight: '600', color: Colors.onSurface },
  breakLabelAccent: { color: Colors.primaryContainer },
  breakSub: { fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 2 },
  breakValue: { fontSize: 13, fontWeight: '700', color: Colors.onSurface },
  breakValueAccent: { color: Colors.primaryContainer },
  divider: { height: 1, backgroundColor: Colors.surfaceLow, marginBottom: 12 },
  netLabel: { fontSize: 15, fontWeight: '700', color: Colors.onSurface },
  netValue: { fontSize: 20, fontWeight: '900', color: Colors.primaryContainer },

  // Commission strip
  commRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  commLabel: { fontSize: 12, color: Colors.onSurfaceVariant },
  commFee: { fontSize: 12, fontWeight: '600', color: Colors.onSurfaceVariant },
  takeHomeLabel: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  takeHomeValue: { fontSize: 16, fontWeight: '900', color: Colors.online },
  payCommBtn: {
    marginTop: 10, backgroundColor: '#FEF2F2',
    borderRadius: Radius.md, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#FECACA',
  },
  payCommText: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
});
