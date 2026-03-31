import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Clock, ChevronRight, Ticket } from 'lucide-react-native';
import client from '../../api/client';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const BG      = '#F6F1FF';
const WHITE   = '#FFFFFF';
const PURPLE  = '#BEA3D8';
const DEEP    = '#7C3AED';
const DARK    = '#1E1B2E';
const MUTED   = '#6B7280';
const BORDER  = 'rgba(204, 195, 216, 0.3)';

const CARD_SHADOW = {
  shadowColor: '#7C3AED',
  shadowOffset: { width: 0, height: 16 },
  shadowOpacity: 0.08,
  shadowRadius: 32,
  elevation: 4,
};

// ─── Status badge config ────────────────────────────────────────────────────────
const STATUS = {
  open:        { label: 'OPEN',        bg: '#FFF7ED', text: '#EA580C' },
  in_progress: { label: 'IN PROGRESS', bg: '#F5F0FF', text: '#BEA3D8' },
  resolved:    { label: 'RESOLVED',    bg: '#F0FDF4', text: '#16A34A' },
};

// ─── Filter pills ───────────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all',         label: 'All'         },
  { key: 'open',        label: 'Open'        },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved',    label: 'Resolved'    },
];

// ─── Seed / fallback data ───────────────────────────────────────────────────────
const SEED = [
  {
    id: 'T-2041',
    status: 'open',
    title: 'Commission Dispute',
    snippet: 'The commission for my ride on Friday was...',
    date: '15 Mar',
    updated: 'Updated 2 hours ago',
  },
  {
    id: 'T-1998',
    status: 'in_progress',
    title: 'App Navigation Error',
    snippet: 'The map is not loading the correct routes...',
    date: '12 Mar',
    updated: 'Updated 1 day ago',
  },
  {
    id: 'T-1850',
    status: 'resolved',
    title: 'Payment Not Received',
    snippet: 'My weekly payout is still pending for...',
    date: '08 Mar',
    updated: 'Updated 5 days ago',
  },
];

// ─── Complaint card ─────────────────────────────────────────────────────────────
function ComplaintCard({ item, onPress }) {
  const s = STATUS[item.status] ?? STATUS.open;
  const isResolved = item.status === 'resolved';

  return (
    <TouchableOpacity
      style={[card.root, isResolved && card.rootResolved]}
      onPress={() => onPress(item)}
      activeOpacity={0.85}
    >
      {/* Left content */}
      <View style={card.body}>

        {/* Top row: ticket ID + date */}
        <View style={card.topRow}>
          <Text style={card.ticketId}>#{item.id}</Text>
          <Text style={card.date}>{item.date}</Text>
        </View>

        {/* Title + snippet */}
        <View style={card.textBlock}>
          <Text style={card.title} numberOfLines={1}>{item.title}</Text>
          <Text style={card.snippet} numberOfLines={1}>{item.snippet}</Text>
        </View>

        {/* Status + updated row */}
        <View style={card.bottomRow}>
          {/* Status badge */}
          <View style={[card.badge, { backgroundColor: s.bg }]}>
            <Text style={[card.badgeText, { color: s.text }]}>{s.label}</Text>
            {/* Checkmark for resolved */}
            {isResolved && (
              <Text style={[card.checkmark, { color: s.text }]}> ✓</Text>
            )}
          </View>

          {/* Updated timestamp */}
          <View style={card.updatedRow}>
            <Clock size={11} color={MUTED} strokeWidth={2} />
            <Text style={card.updatedText}>{item.updated}</Text>
          </View>
        </View>
      </View>

      {/* Chevron */}
      <View style={card.chevronWrap}>
        <ChevronRight size={12} color="#CCC3D8" strokeWidth={2.5} />
      </View>
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 20,
    ...CARD_SHADOW,
  },
  rootResolved: {
    opacity: 0.8,
  },
  body: {
    flex: 1,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketId: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.55,
    textTransform: 'uppercase',
    color: MUTED,
  },
  date: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 11,
    lineHeight: 16,
    color: MUTED,
  },
  textBlock: {
    gap: 4,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 24,
    color: DARK,
  },
  snippet: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
    paddingRight: 16,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  badgeText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  checkmark: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
  },
  updatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  updatedText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 10,
    lineHeight: 15,
    color: MUTED,
  },
  chevronWrap: {
    paddingLeft: 8,
    alignSelf: 'center',
  },
});

// ─── Empty state ────────────────────────────────────────────────────────────────
function EmptyState({ onRaise }) {
  return (
    <View style={empty.root}>
      {/* Divider with label */}
      <View style={empty.dividerRow}>
        <View style={empty.dividerLine} />
        <Text style={empty.dividerLabel}>PREVIEW: EMPTY STATE</Text>
        <View style={empty.dividerLine} />
      </View>

      {/* Icon circle */}
      <View style={empty.iconCircle}>
        <Ticket size={40} color="#A78BFA" strokeWidth={1.5} style={{ opacity: 0.6 }} />
      </View>

      {/* Message */}
      <Text style={empty.message}>No complaints raised</Text>

      {/* CTA */}
      <TouchableOpacity style={empty.btn} onPress={onRaise} activeOpacity={0.85}>
        <Text style={empty.btnText}>Raise a Complaint</Text>
      </TouchableOpacity>
    </View>
  );
}

const empty = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingTop: 32,
    gap: 24,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(204, 195, 216, 0.2)',
  },
  dividerLabel: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: MUTED,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 9999,
    backgroundColor: '#F5F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 24,
    color: MUTED,
    textAlign: 'center',
  },
  btn: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: DEEP,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.20,
    shadowRadius: 15,
    elevation: 6,
  },
  btnText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 24,
    color: WHITE,
    textAlign: 'center',
  },
});

// ─── Bottom nav tab ─────────────────────────────────────────────────────────────
function NavTab({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity style={nav.tab} onPress={onPress} activeOpacity={0.7}>
      <View style={[nav.iconWrap, active && nav.iconWrapActive]}>
        {icon}
      </View>
      <Text style={[nav.label, active && nav.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const nav = StyleSheet.create({
  tab:           { alignItems: 'center', justifyContent: 'center', gap: 4 },
  iconWrap:      { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  iconWrapActive:{ backgroundColor: '#F5F0FF' },
  label:         { fontFamily: 'Inter', fontWeight: '500', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: MUTED, lineHeight: 15 },
  labelActive:   { color: PURPLE },
});

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function MyComplaintsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [activeFilter, setActiveFilter] = useState('all');
  const [complaints, setComplaints]     = useState(SEED);
  const [loading, setLoading]           = useState(false);
  const [refreshing, setRefreshing]     = useState(false);

  // ── Fetch from API ──────────────────────────────────────────────────────────
  const fetchComplaints = useCallback(async (filter = activeFilter) => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const { data } = await client.get('/drivers/complaints', { params });
      if (Array.isArray(data?.complaints) && data.complaints.length > 0) {
        setComplaints(data.complaints);
      }
      // if API returns empty keep seed for dev preview
    } catch {
      // silently keep seed data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => { fetchComplaints(activeFilter); }, [activeFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchComplaints(activeFilter);
  };

  const handleFilterChange = (key) => {
    setActiveFilter(key);
    setLoading(true);
    fetchComplaints(key);
  };

  // ── Filtered list ───────────────────────────────────────────────────────────
  const displayed = activeFilter === 'all'
    ? complaints
    : complaints.filter((c) => c.status === activeFilter);

  const handleCardPress = (item) => {
    // Future: navigate to complaint detail
    // navigation.navigate('ComplaintDetail', { complaint: item });
  };

  const handleNewComplaint = () => {
    navigation.navigate('RaiseAComplaint');
  };

  return (
    <View style={s.root}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={s.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.headerBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={16} color={PURPLE} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>My Complaints</Text>
        </View>

        <TouchableOpacity style={s.newBtn} onPress={handleNewComplaint} activeOpacity={0.85}>
          <Plus size={13} color={WHITE} strokeWidth={2.5} />
          <Text style={s.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* ── Filter Pills ────────────────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterScroll}
        contentContainerStyle={s.filterRow}
      >
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.chip, isActive && s.chipActive]}
              onPress={() => handleFilterChange(f.key)}
              activeOpacity={0.8}
            >
              <Text style={[s.chipText, isActive && s.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: Math.max(insets.bottom, 24) + 77 + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />
        }
      >
        {loading ? (
          <View style={s.loader}>
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        ) : (
          <>
            {/* Complaint cards */}
            {displayed.length > 0 && (
              <View style={s.cardList}>
                {displayed.map((item) => (
                  <ComplaintCard key={item.id} item={item} onPress={handleCardPress} />
                ))}
              </View>
            )}

            {/* Empty state — always shown below cards (or alone when filtered) */}
            <EmptyState onRaise={handleNewComplaint} />
          </>
        )}
      </ScrollView>

      {/* ── Bottom Nav ──────────────────────────────────────────────────────── */}
      <View style={[s.bottomNav, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <NavTab
          icon={<View style={[s.navIcon, { width: 16, height: 18 }]} />}
          label="HOME"
          active={false}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'DriverHome' }] })}
        />
        <NavTab
          icon={<View style={[s.navIcon, { width: 22, height: 16 }]} />}
          label="EARNINGS"
          active={false}
          onPress={() => navigation.navigate('MyEarnings')}
        />
        <NavTab
          icon={<View style={[s.navIcon, { width: 19, height: 18, backgroundColor: PURPLE }]} />}
          label="WALLET"
          active={true}
          onPress={() => {}}
        />
        <NavTab
          icon={<View style={[s.navIcon, { width: 16, height: 16 }]} />}
          label="ACCOUNT"
          active={false}
          onPress={() => navigation.navigate('MyProfile')}
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: 'rgba(245, 240, 255, 0.8)',
    ...Platform.select({
      ios: {
        shadowColor: DEEP,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
      },
      android: { elevation: 4 },
    }),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: -0.45,
    color: DARK,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: PURPLE,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  newBtnText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 20,
    color: WHITE,
  },

  // ── Filter pills ────────────────────────────────────────────────────────────
  filterScroll: {
    flexGrow: 0,
    height: 54,
  },
  filterRow: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 24,
    paddingVertical: 9,
    borderRadius: 9999,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  chipText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },
  chipTextActive: {
    fontWeight: '600',
    color: WHITE,
  },

  // ── Content ─────────────────────────────────────────────────────────────────
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 24,
  },
  loader: {
    paddingTop: 64,
    alignItems: 'center',
  },
  cardList: {
    gap: 16,
  },

  // ── Bottom Nav ──────────────────────────────────────────────────────────────
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 77,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 33,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: DEEP,
        shadowOffset: { width: 0, height: -16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
      },
      android: { elevation: 10 },
    }),
  },
  navIcon: {
    backgroundColor: MUTED,
    borderRadius: 3,
  },
});
