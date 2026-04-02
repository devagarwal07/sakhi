import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';
import ScreenHeader, { HEADER_HEIGHT } from '../../components/ScreenHeader';
import SakhiDateRangePicker from '../../components/SakhiDateRangePicker';

// ─── Icon components (no SVG library needed) ──────────────────────────────────

/** ‹ back chevron */
const BackIcon = () => (
  <View style={ico.backWrap}>
    <Text style={ico.backArrow}>{'‹'}</Text>
  </View>
);

/** Horizontal filter lines */
const FilterIcon = () => (
  <View style={ico.filterWrap}>
    {[18, 13, 8].map((w, i) => (
      <View key={i} style={[ico.filterBar, { width: w }]} />
    ))}
  </View>
);

/** Tiny calendar grid */
const CalendarIcon = () => (
  <View style={ico.calOuter}>
    <View style={ico.calTop} />
    <View style={ico.calDots}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={ico.calDot} />
      ))}
    </View>
  </View>
);

/** ∨ chevron */
const ChevronDown = () => (
  <View style={ico.chevWrap}>
    <View style={ico.chevLine} />
  </View>
);

/** ↑↓ export arrow */
const ExportIcon = () => (
  <View style={ico.expWrap}>
    <View style={ico.expArrow} />
    <View style={ico.expBase} />
  </View>
);

const ico = StyleSheet.create({
  backWrap:   { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  backArrow:  { fontSize: 28, color: '#BEA3D8', lineHeight: 32, marginTop: -2 },
  filterWrap: { width: 18, height: 12, gap: 3, alignItems: 'flex-end', justifyContent: 'center' },
  filterBar:  { height: 2, backgroundColor: '#BEA3D8', borderRadius: 1, alignSelf: 'flex-end' },
  calOuter:   { width: 11, height: 11, borderRadius: 2, borderWidth: 1.2, borderColor: '#BEA3D8', overflow: 'hidden' },
  calTop:     { height: 3, backgroundColor: '#BEA3D8' },
  calDots:    { flexDirection: 'row', flexWrap: 'wrap', padding: 1, gap: 1 },
  calDot:     { width: 2, height: 2, borderRadius: 1, backgroundColor: '#BEA3D8' },
  chevWrap:   { width: 7, height: 5, alignItems: 'center', justifyContent: 'center' },
  chevLine:   { width: 7, height: 7, borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: '#4A4455', transform: [{ rotate: '45deg' }], marginTop: -4 },
  expWrap:    { width: 12, height: 10, alignItems: 'center', justifyContent: 'center' },
  expArrow:   { width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomWidth: 5, borderBottomColor: '#fff', marginBottom: 1 },
  expBase:    { width: 8, height: 4, borderWidth: 1.5, borderColor: '#fff', borderTopWidth: 0 },
});

// ─── Category icon bubble ─────────────────────────────────────────────────────
const TYPE_THEME = {
  ride:         { bg: '#ECFDF5', color: '#059669' },
  subscription: { bg: '#F6F1FF', color: '#BEA3D8' },
  commission:   { bg: '#FEF2F2', color: '#EF4444' },
};

function CategoryBubble({ type }) {
  const th = TYPE_THEME[type] ?? { bg: '#F5F0FF', color: '#BEA3D8' };

  const renderInner = () => {
    if (type === 'ride') {
      return (
        <View style={{ alignItems: 'center' }}>
          {/* simplified van silhouette */}
          <View style={[bub.vanBody, { borderColor: th.color }]}>
            <View style={[bub.vanCab, { backgroundColor: th.color }]} />
          </View>
          <View style={bub.wheels}>
            <View style={[bub.wheel, { backgroundColor: th.color }]} />
            <View style={[bub.wheel, { backgroundColor: th.color }]} />
          </View>
        </View>
      );
    }
    if (type === 'subscription') {
      return (
        <View style={[bub.cycleRing, { borderColor: th.color }]}>
          <View style={[bub.cycleTop,    { borderColor: th.color }]} />
          <View style={[bub.cycleBottom, { borderColor: th.color }]} />
        </View>
      );
    }
    // commission → ₹
    return <Text style={[bub.rupee, { color: th.color }]}>₹</Text>;
  };

  return (
    <View style={[bub.bg, { backgroundColor: th.bg }]}>
      {renderInner()}
    </View>
  );
}

const bub = StyleSheet.create({
  bg:          { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  vanBody:     { width: 20, height: 10, borderWidth: 1.5, borderRadius: 2, overflow: 'visible', position: 'relative' },
  vanCab:      { position: 'absolute', top: -5, left: 2, width: 9, height: 5, borderRadius: 2 },
  wheels:      { flexDirection: 'row', justifyContent: 'space-between', width: 15, marginTop: 1 },
  wheel:       { width: 5, height: 5, borderRadius: 2.5 },
  cycleRing:   { width: 16, height: 16, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  cycleTop:    { position: 'absolute', top: -1, right: -1, width: 6, height: 6, borderRightWidth: 2, borderTopWidth: 2, transform: [{ rotate: '45deg' }] },
  cycleBottom: { position: 'absolute', bottom: -1, left: -1, width: 6, height: 6, borderLeftWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '45deg' }] },
  rupee:       { fontSize: 18, fontWeight: '700' },
});

// ─── Static / fallback data ───────────────────────────────────────────────────
const FALLBACK_SECTIONS = [
  {
    date: 'SATURDAY, 15 MAR 2026',
    dayTotal: 'Day total: +₹640',
    rows: [
      { id: 'tx1', type: 'ride',         title: 'Ride Fare Collected',        time: '10:30 AM', rawAmount: 87,   isCredit: true  },
      { id: 'tx2', type: 'subscription', title: 'Subscription Ride Earnings', time: '08:30 AM', rawAmount: 450,  isCredit: true  },
      { id: 'tx3', type: 'commission',   title: 'Commission Paid',            time: '07:00 AM', rawAmount: 350,  isCredit: false },
    ],
  },
  {
    date: 'FRIDAY, 14 MAR 2026',
    dayTotal: 'Day total: +₹110',
    rows: [
      { id: 'tx4', type: 'ride', title: 'Ride Fare Collected', time: '05:45 PM', rawAmount: 110, isCredit: true },
    ],
  },
  {
    date: 'THURSDAY, 13 MAR 2026',
    dayTotal: 'Day total: +₹225',
    rows: [
      { id: 'tx5', type: 'ride',         title: 'Ride Fare Collected',        time: '03:10 PM', rawAmount: 160, isCredit: true  },
      { id: 'tx6', type: 'commission',   title: 'Commission Paid',            time: '09:00 AM', rawAmount: 75,  isCredit: false },
      { id: 'tx7', type: 'subscription', title: 'Subscription Ride Earnings', time: '07:30 AM', rawAmount: 140, isCredit: true  },
    ],
  },
];

const TYPE_FILTERS = ['All', 'Ride', 'Subscription', 'Commission'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatAmount(raw, isCredit) {
  const sign = isCredit ? '+' : '−';
  return `${sign}₹${Math.abs(raw).toLocaleString('en-IN')}`;
}

function groupApiData(txns = []) {
  const map = {};
  txns.forEach((t) => {
    const key = t.date_label ?? 'Unknown';
    if (!map[key]) map[key] = { date: key.toUpperCase(), dayTotal: '', rows: [] };
    map[key].rows.push({
      id:        String(t.id),
      type:      t.type === 'credit' ? 'ride' : t.type,
      title:     t.title ?? t.type,
      time:      t.time_label ?? '',
      rawAmount: Math.abs(t.amount ?? 0),
      isCredit:  (t.amount ?? 0) > 0,
    });
  });
  // compute day totals
  Object.values(map).forEach((s) => {
    const tot = s.rows.reduce((acc, r) => acc + (r.isCredit ? r.rawAmount : -r.rawAmount), 0);
    s.dayTotal = `Day total: ${tot >= 0 ? '+' : ''}₹${Math.abs(tot)}`;
  });
  return Object.values(map);
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function TxRow({ item }) {
  const amtColor = item.isCredit ? '#059669' : '#EF4444';
  const display  = formatAmount(item.rawAmount, item.isCredit);
  const multiline = item.rawAmount >= 100 && item.type === 'subscription';

  return (
    <View style={row.card}>
      <View style={row.left}>
        <CategoryBubble type={item.type} />
        <View style={row.info}>
          <Text style={row.title}>{item.title}</Text>
          <Text style={row.time}>{item.time}</Text>
        </View>
      </View>
      <Text style={[row.amount, { color: amtColor }]}>{display}</Text>
    </View>
  );
}

const row = StyleSheet.create({
  card:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, ...Shadows.card },
  left:   { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1, marginRight: 8 },
  info:   { flex: 1 },
  title:  { fontSize: 16, fontWeight: '700', color: '#1C1A25', lineHeight: 24 },
  time:   { fontSize: 12, fontWeight: '500', color: '#7B7487', lineHeight: 16, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '700', lineHeight: 24, textAlign: 'right' },
});

function DaySection({ section }) {
  return (
    <View style={ds.wrap}>
      <View style={ds.header}>
        <Text style={ds.date}>{section.date}</Text>
        <Text style={ds.total}>{section.dayTotal}</Text>
      </View>
      <View style={ds.rows}>
        {section.rows.map((r) => <TxRow key={r.id} item={r} />)}
      </View>
    </View>
  );
}

const ds = StyleSheet.create({
  wrap:   { gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date:   { fontSize: 11, fontWeight: '700', color: '#7B7487', letterSpacing: 1.1, textTransform: 'uppercase' },
  total:  { fontSize: 11, fontWeight: '700', color: '#7B7487' },
  rows:   { gap: 16 },
});

function PickerModal({ visible, title, options, selected, onSelect, onClose }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={pm.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={pm.sheet}>
          <View style={pm.pill} />
          <Text style={pm.title}>{title}</Text>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={pm.option}
              onPress={() => { onSelect(opt); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={[pm.optText, opt === selected && pm.optActive]}>{opt}</Text>
              {opt === selected && <Text style={pm.tick}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const pm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.28)', justifyContent: 'flex-end' },
  sheet:    { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
  pill:     { width: 36, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:    { fontSize: 11, fontWeight: '700', color: '#7B7487', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 16 },
  option:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F0FF' },
  optText:  { fontSize: 15, fontWeight: '500', color: '#1C1A25' },
  optActive:{ fontWeight: '700', color: '#7C3AED' },
  tick:     { fontSize: 16, color: '#7C3AED', fontWeight: '700' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TransactionHistoryScreen({ navigation }) {
  const [sections,       setSections]       = useState(FALLBACK_SECTIONS);
  const [loading,        setLoading]        = useState(false);
  const [refreshing,     setRefreshing]     = useState(false);
  const [typeFilter,     setTypeFilter]     = useState('All');
  const [customStart,    setCustomStart]    = useState(null);
  const [customEnd,      setCustomEnd]      = useState(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showCalendar,   setShowCalendar]   = useState(false);

  const dateRangeLabel = () => {
    if (!customStart) return 'Date Range';
    const fmt = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    if (customEnd && customEnd.getTime() !== customStart.getTime()) {
      return `${fmt(customStart)} – ${fmt(customEnd)}`;
    }
    return fmt(customStart);
  };

  const fetchData = useCallback(async () => {
    try {
      const params = {};
      if (customStart) {
        params.start_date = customStart.toISOString().split('T')[0];
        params.end_date   = (customEnd ?? customStart).toISOString().split('T')[0];
      }
      const { data } = await client.get('/drivers/transactions', { params });
      const grouped  = groupApiData(data.transactions ?? []);
      if (grouped.length) setSections(grouped);
    } catch {
      // keep fallback data if API unavailable
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customStart, customEnd]);

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // Apply client-side type filter
  const filtered = sections
    .map((sec) => ({
      ...sec,
      rows: sec.rows.filter((r) =>
        typeFilter === 'All' || r.type === typeFilter.toLowerCase()
      ),
    }))
    .filter((sec) => sec.rows.length > 0);

  return (
    <View style={[s.safe, { flex: 1 }]}>

      <ScreenHeader
        title="Transactions"
        onBack={() => navigation?.goBack()}
        rightSlot={
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={s.filterIconBtn}>
            <FilterIcon />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={[s.loader, {}]}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.scroll, { }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />
          }
        >

          {/* ── Filter Row ── */}
          <View style={s.filterRow}>
            {/* Date Range Pill — opens real calendar */}
            <TouchableOpacity
              style={[s.pill, customStart && s.pillActive]}
              onPress={() => setShowCalendar(true)}
              activeOpacity={0.8}
            >
              <CalendarIcon />
              <Text style={[s.pillText, customStart && s.pillTextActive]} numberOfLines={1}>
                {dateRangeLabel()}
              </Text>
            </TouchableOpacity>

            {/* Type Pill */}
            <TouchableOpacity style={s.pill} onPress={() => setShowTypePicker(true)} activeOpacity={0.8}>
              <Text style={s.pillText}>Type: {typeFilter}</Text>
              <ChevronDown />
            </TouchableOpacity>

            {/* Export */}
            <TouchableOpacity style={s.exportBtn} activeOpacity={0.8}>
              <ExportIcon />
              <Text style={s.exportText}>Export</Text>
            </TouchableOpacity>
          </View>

          {/* ── Transaction Groups ── */}
          <View style={s.groups}>
            {filtered.length === 0 ? (
              <View style={s.emptyWrap}>
                <Text style={s.emptyEmoji}>🧾</Text>
                <Text style={s.emptyTitle}>No transactions found</Text>
                <Text style={s.emptySub}>Try changing the filter or date range.</Text>
              </View>
            ) : (
              filtered.map((sec) => <DaySection key={sec.date} section={sec} />)
            )}
          </View>

        </ScrollView>
      )}

      {/* ── Modals ── */}
      <PickerModal
        visible={showTypePicker}
        title="Filter by Type"
        options={TYPE_FILTERS}
        selected={typeFilter}
        onSelect={setTypeFilter}
        onClose={() => setShowTypePicker(false)}
      />

      <SakhiDateRangePicker
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        initialStart={customStart}
        initialEnd={customEnd}
        onApply={(start, end) => {
          setCustomStart(start);
          setCustomEnd(end);
          setShowCalendar(false);
        }}
      />

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F0FF' },

  // Scroll
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 24, paddingTop: 0, paddingBottom: 60 },

  // Filter row  ——————————————————————————————————————————————————————————————
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 64,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    ...Shadows.card,
  },
  pillActive:     { backgroundColor: '#BEA3D8' },
  pillText:       { fontSize: 14, fontWeight: '500', color: '#1C1A25', lineHeight: 20 },
  pillTextActive: { color: '#FFFFFF', fontWeight: '700' },

  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#BEA3D8',
    borderRadius: 9999,
    marginLeft: 'auto',
    ...Platform.select({
      ios: { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16 },
      android: { elevation: 5 },
    }),
  },
  exportText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', lineHeight: 20 },

  // Content  ——————————————————————————————————————————————————————————————————
  groups: { gap: 32, paddingBottom: 8 },

  // Empty    ——————————————————————————————————————————————————————————————————
  emptyWrap:  { alignItems: 'center', paddingVertical: 72 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1C1A25' },
  emptySub:   { fontSize: 13, fontWeight: '400', color: '#7B7487', marginTop: 4 },
});
