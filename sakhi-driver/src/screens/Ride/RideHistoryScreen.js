import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, Platform, TextInput, ActivityIndicator,
  RefreshControl, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius } from '../../utils/theme';
import client from '../../api/client';
import { ArrowLeft, Search, MapPin, Flag, ChevronRight, BarChart2 } from 'lucide-react-native';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PURPLE   = '#BEA3D8';
const DEEP     = '#7C3AED';
const DARK     = '#1E1B2E';
const MUTED    = '#6B7280';
const GREEN    = '#10B981';
const RED      = '#BA1A1A';
const WHITE    = '#FFFFFF';
const BG       = '#F5F0FF';
const CARD_SHD = {
  shadowColor: '#7C3AED',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.04,
  shadowRadius: 24,
  elevation: 3,
};

// ─── Filter options ───────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all',       label: 'All'        },
  { key: 'today',     label: 'Today'      },
  { key: 'this_week', label: 'This Week'  },
  { key: 'this_month',label: 'This Month' },
  { key: 'custom',    label: 'Custom'     },
];

// ─── Seed / fallback data ─────────────────────────────────────────────────────
const SEED_SUMMARY = {
  label:      'This Week: 34 Rides · ₹3,240',
  rides:      34,
  earnings:   3240,
};

const SEED_RIDES = [
  {
    id: 'r1',
    type: 'subscription',
    pickup:   'Koramangala 4th Block',
    dropoff:  'MG Road Metro',
    dateLabel:'Today, 09:45 AM',
    fare:     0,
    fareLabel:'₹0',
    subLabel: 'Subscription',
    cancelled: false,
  },
  {
    id: 'r2',
    type: 'on_demand',
    pickup:   'Indiranagar 100ft Rd',
    dropoff:  'Domlur',
    dateLabel:'Yesterday, 06:12 PM',
    fare:     87,
    fareLabel:'₹87',
    subLabel: 'On-Demand',
    cancelled: false,
  },
  {
    id: 'r3',
    type: 'on_demand',
    pickup:   'HSR Layout',
    dropoff:  'Bellandur',
    dateLabel:'12 Oct, 08:30 AM',
    fare:     120,
    fareLabel:'₹120',
    subLabel: 'On-Demand',
    cancelled: true,
  },
];

// ─── Vertical route line (subscription card) ──────────────────────────────────
function RouteColumn() {
  return (
    <View style={rc.col}>
      {/* Green dot */}
      <View style={rc.dotGreen}>
        <View style={rc.dotGreenGlow} />
      </View>
      {/* Dashed connector */}
      <View style={rc.dash} />
      {/* Purple dot */}
      <View style={rc.dotPurple}>
        <View style={rc.dotPurpleGlow} />
      </View>
    </View>
  );
}
const rc = StyleSheet.create({
  col:          { width: 10, alignItems: 'center', paddingVertical: 4, gap: 0 },
  dotGreen:     { width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN, position: 'relative' },
  dotGreenGlow: { position: 'absolute', inset: -4, width: 10, height: 10, borderRadius: 5, top: -4, left: -4, borderWidth: 4, borderColor: '#ECFDF5', zIndex: -1 },
  dash:         { flex: 1, width: 0, borderLeftWidth: 2, borderLeftColor: 'rgba(204,195,216,0.5)', borderStyle: 'dashed', marginVertical: 4 },
  dotPurple:    { width: 10, height: 10, borderRadius: 5, backgroundColor: PURPLE, position: 'relative' },
  dotPurpleGlow:{ position: 'absolute', inset: -4, width: 10, height: 10, borderRadius: 5, top: -4, left: -4, borderWidth: 4, borderColor: '#FAF5FF', zIndex: -1 },
});

// ─── SUB corner badge ─────────────────────────────────────────────────────────
function SubCornerBadge() {
  return (
    <View style={scb.wrap}>
      <Text style={scb.text}>SUB</Text>
    </View>
  );
}
const scb = StyleSheet.create({
  wrap: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: BG, borderBottomLeftRadius: 16,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  text: { fontSize: 10, fontWeight: '700', color: PURPLE, letterSpacing: 1, textTransform: 'uppercase' },
});

// ─── Card 1: Subscription ride ────────────────────────────────────────────────
function SubscriptionCard({ ride, onPress }) {
  return (
    <TouchableOpacity style={[s.card, s.cardSub]} onPress={() => onPress(ride)} activeOpacity={0.8}>
      <SubCornerBadge />

      {/* Route section */}
      <View style={s.subRouteRow}>
        <RouteColumn />
        <View style={s.subAddresses}>
          {/* Pickup */}
          <View style={s.subStop}>
            <Text style={s.stopMeta}>PICKUP</Text>
            <Text style={s.stopAddr}>{ride.pickup}</Text>
          </View>
          {/* Drop */}
          <View style={s.subStop}>
            <Text style={s.stopMeta}>DROP</Text>
            <Text style={[s.stopAddr, s.stopAddrMuted]}>{ride.dropoff}</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={s.cardFooter}>
        <View>
          <Text style={s.footerDate}>{ride.dateLabel}</Text>
          <View style={s.subBadge}>
            <Text style={s.subBadgeText}>SUBSCRIPTION</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.fareAmount}>{ride.fareLabel}</Text>
          <Text style={s.fareSubLabel}>Subscription</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Card 2: On-demand ride ───────────────────────────────────────────────────
function OnDemandCard({ ride, onPress }) {
  const dotColor = ride.cancelled ? '#7B7487' : GREEN;
  const flagColor = ride.cancelled ? '#7B7487' : PURPLE;

  return (
    <TouchableOpacity
      style={[s.card, ride.cancelled && s.cardCancelled]}
      onPress={() => onPress(ride)}
      activeOpacity={0.8}
    >
      {/* Routes */}
      <View style={s.odBody}>
        <View style={s.odRoutes}>
          {/* Pickup */}
          <View style={s.odStop}>
            <MapPin size={9.33} color={dotColor} fill={dotColor} strokeWidth={0} style={{ marginTop: 4 }} />
            <Text style={s.odPickup}>{ride.pickup}</Text>
          </View>
          {/* Drop */}
          <View style={s.odStop}>
            <Flag size={8.75} color={flagColor} fill={flagColor} strokeWidth={0} style={{ marginTop: 4 }} />
            <Text style={s.odDrop}>{ride.dropoff}</Text>
          </View>
        </View>

        {/* Fare */}
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={[
            s.odFare,
            ride.cancelled && s.odFareCancelled,
          ]}>
            {ride.fareLabel}
          </Text>
          {ride.cancelled ? (
            <View style={s.cancelledBadge}>
              <Text style={s.cancelledBadgeText}>Cancelled</Text>
            </View>
          ) : (
            <Text style={s.odSubLabel}>ON-DEMAND</Text>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={s.odFooter}>
        <Text style={s.footerDate}>{ride.dateLabel}</Text>
        {!ride.cancelled && (
          <ChevronRight size={12} color="#CCC3D8" strokeWidth={2.5} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function RideHistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [activeFilter, setActiveFilter] = useState('all');
  const [rides,        setRides]        = useState(SEED_RIDES);
  const [summary,      setSummary]      = useState(SEED_SUMMARY);
  const [loading,      setLoading]      = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [showSearch,   setShowSearch]   = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [page,         setPage]         = useState(1);
  const [hasMore,      setHasMore]      = useState(true);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchRides = useCallback(async (filter = activeFilter, pg = 1, append = false) => {
    try {
      const { data } = await client.get('/drivers/rides', {
        params: { period: filter, page: pg, limit: 20, q: searchQuery || undefined },
      });
      const newRides = data.rides ?? [];
      setRides((prev) => append ? [...prev, ...newRides] : newRides);
      setSummary(data.summary ?? SEED_SUMMARY);
      setHasMore(newRides.length === 20);
      setPage(pg);
    } catch {
      // keep seed data if API unavailable
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [activeFilter, searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRides(activeFilter, 1, false);
  };

  const onLoadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchRides(activeFilter, page + 1, true);
  };

  const handleFilterChange = (key) => {
    setActiveFilter(key);
    setPage(1);
    setHasMore(true);
    setLoading(true);
    fetchRides(key, 1, false);
  };

  // ── Navigate to detail ────────────────────────────────────────────────────
  const handleRidePress = (ride) => {
    if (ride.cancelled) return;
    if (ride.type === 'subscription') {
      navigation.navigate('SubscriptionAssignmentDetails', { subscription: ride });
    } else {
      navigation.navigate('CompletedRideDetails', { ride });
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const displayRides = searchQuery
    ? rides.filter((r) =>
        r.pickup?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.dropoff?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : rides;

  return (
    <View style={[s.root, { paddingTop: 0 }]}>

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={s.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            style={s.headerBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={16} color={PURPLE} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Ride History</Text>
        </View>
        <TouchableOpacity
          style={s.searchBtn}
          onPress={() => setShowSearch((v) => !v)}
          activeOpacity={0.8}
        >
          <Search size={18} color={PURPLE} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* ── Search bar (conditional) ── */}
      {showSearch && (
        <View style={s.searchBar}>
          <Search size={15} color={MUTED} strokeWidth={2} />
          <TextInput
            style={s.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search pickup or drop location…"
            placeholderTextColor="#C0B8CC"
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 16, color: MUTED }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 24) + 72 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />
        }
      >

        {/* ── Filter Chips (horizontal scroll) ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filtersRow}
          style={s.filtersScroll}
        >
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[s.filterChip, active && s.filterChipActive]}
                onPress={() => handleFilterChange(f.key)}
                activeOpacity={0.8}
              >
                <Text style={[s.filterChipText, active && s.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Summary Pill ── */}
        <View style={s.summaryPill}>
          <BarChart2 size={15} color={PURPLE} strokeWidth={2} />
          <Text style={s.summaryText}>{summary.label}</Text>
        </View>

        {/* ── Ride Cards ── */}
        {loading ? (
          <View style={s.loader}>
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        ) : displayRides.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyEmoji}>🛺</Text>
            <Text style={s.emptyTitle}>No rides found</Text>
            <Text style={s.emptySub}>Try a different filter or date range.</Text>
          </View>
        ) : (
          <View style={s.list}>
            {displayRides.map((ride) =>
              ride.type === 'subscription'
                ? <SubscriptionCard key={ride.id} ride={ride} onPress={handleRidePress} />
                : <OnDemandCard     key={ride.id} ride={ride} onPress={handleRidePress} />
            )}
          </View>
        )}

        {/* ── Load More ── */}
        {!loading && hasMore && displayRides.length > 0 && (
          <TouchableOpacity style={s.loadMoreBtn} onPress={onLoadMore} activeOpacity={0.8}>
            {loadingMore
              ? <ActivityIndicator size="small" color={PURPLE} />
              : <Text style={s.loadMoreText}>Load More Rides</Text>
            }
          </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingBottom: 14,
    backgroundColor: 'rgba(245, 240, 255, 0.88)',
    ...Platform.select({
      ios: { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32 },
      android: { elevation: 4 },
    }),
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerBtn:   { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: DARK, letterSpacing: -0.45, lineHeight: 28 },
  searchBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center', ...Shadows.card },

  // ── Search bar ────────────────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 8, paddingHorizontal: 16,
    height: 48, backgroundColor: WHITE, borderRadius: 14, ...Shadows.card,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', color: DARK },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scroll: { paddingHorizontal: 16, paddingTop: 16, gap: 24 },

  // ── Filters ───────────────────────────────────────────────────────────────
  filtersScroll: { flexGrow: 0 },
  filtersRow:    { paddingRight: 8, gap: 8, height: 58, alignItems: 'center' },
  filterChip: {
    height: 42, paddingHorizontal: 24, borderRadius: 9999,
    backgroundColor: WHITE, borderWidth: 1, borderColor: 'rgba(204,195,216,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  filterChipActive:     { backgroundColor: PURPLE, borderColor: PURPLE },
  filterChipText:       { fontSize: 14, fontWeight: '500', color: MUTED, lineHeight: 20 },
  filterChipTextActive: { fontWeight: '600', color: WHITE },

  // ── Summary Pill ──────────────────────────────────────────────────────────
  summaryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 16,
    backgroundColor: WHITE, borderRadius: 16, ...Shadows.card,
  },
  summaryText: { fontSize: 16, fontWeight: '700', color: PURPLE, lineHeight: 24, flex: 1 },

  // ── List ──────────────────────────────────────────────────────────────────
  list:   { gap: 16 },
  loader: { paddingVertical: 64, alignItems: 'center' },

  // ── Shared card ───────────────────────────────────────────────────────────
  card: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 20,
    gap: 16,
    overflow: 'hidden',
    position: 'relative',
    ...CARD_SHD,
  },
  cardSub:       { gap: 24 },
  cardCancelled: { opacity: 0.8 },

  // ── Subscription card internals ───────────────────────────────────────────
  subRouteRow: { flexDirection: 'row', gap: 16, alignItems: 'stretch', minHeight: 102 },
  subAddresses: { flex: 1, gap: 16 },
  subStop:      { flex: 1, gap: 2 },
  stopMeta:     { fontSize: 11, fontWeight: '500', color: MUTED, letterSpacing: 0.55, textTransform: 'uppercase', lineHeight: 16 },
  stopAddr:     { fontSize: 16, fontWeight: '700', color: DARK, lineHeight: 24 },
  stopAddrMuted:{ fontWeight: '500', color: MUTED },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F6F1FF',
    marginTop: -8,
  },
  footerDate:   { fontSize: 12, fontWeight: '400', color: MUTED, lineHeight: 18, marginBottom: 4 },
  subBadge:     { backgroundColor: BG, borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' },
  subBadgeText: { fontSize: 10, fontWeight: '700', color: PURPLE, textTransform: 'uppercase', lineHeight: 15 },
  fareAmount:   { fontSize: 18, fontWeight: '800', color: DARK, lineHeight: 28, textAlign: 'right' },
  fareSubLabel: { fontSize: 10, fontWeight: '500', color: MUTED, lineHeight: 15, textAlign: 'right' },

  // ── On-demand card internals ──────────────────────────────────────────────
  odBody:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  odRoutes: { flex: 1, gap: 16, paddingRight: 12 },
  odStop:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  odPickup: { fontSize: 14, fontWeight: '700', color: DARK, lineHeight: 20, flex: 1 },
  odDrop:   { fontSize: 14, fontWeight: '500', color: MUTED, lineHeight: 20, flex: 1 },
  odFare:         { fontSize: 20, fontWeight: '800', color: PURPLE, lineHeight: 28, textAlign: 'right' },
  odFareCancelled:{ color: RED, textDecorationLine: 'line-through', fontSize: 18, fontWeight: '700' },
  odSubLabel: { fontSize: 9, fontWeight: '400', color: MUTED, letterSpacing: -0.45, textTransform: 'uppercase', textAlign: 'right', lineHeight: 14 },

  cancelledBadge:     { backgroundColor: '#FFDAD6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  cancelledBadgeText: { fontSize: 10, fontWeight: '700', color: RED, textAlign: 'right', lineHeight: 15 },

  odFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F6F1FF',
    marginTop: -4,
  },

  // ── Load More ─────────────────────────────────────────────────────────────
  loadMoreBtn: {
    height: 56, borderRadius: 16,
    borderWidth: 2, borderColor: 'rgba(190,163,216,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  loadMoreText: { fontSize: 14, fontWeight: '700', color: PURPLE, lineHeight: 20 },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyWrap:  { alignItems: 'center', paddingVertical: 64, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: DARK },
  emptySub:   { fontSize: 13, fontWeight: '400', color: MUTED, textAlign: 'center' },
});
