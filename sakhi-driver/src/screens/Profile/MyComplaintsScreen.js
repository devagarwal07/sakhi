import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';

const FILTERS = ['All', 'Open', 'In Progress', 'Resolved'];

const STATUS_STYLES = {
  open:        { bg: '#FFF7ED', text: '#D97706', label: 'Open'        },
  in_progress: { bg: `${Colors.primaryContainer}18`, text: Colors.primaryContainer, label: 'In Progress' },
  resolved:    { bg: '#DCFCE7', text: '#15803D', label: 'Resolved ✓'  },
};

function TicketCard({ ticket, onPress }) {
  const s = STATUS_STYLES[ticket.status] ?? STATUS_STYLES.open;
  const isResolved = ticket.status === 'resolved';
  return (
    <TouchableOpacity
      style={[styles.ticketCard, isResolved && styles.ticketCardFaded]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={{ flex: 1, gap: 8 }}>
        <View style={styles.ticketTop}>
          <Text style={styles.ticketId}>#{ticket.ticket_id ?? 'T-???'}</Text>
          <Text style={styles.ticketDate}>{ticket.created_date ?? ''}</Text>
        </View>
        <Text style={styles.ticketTitle}>{ticket.title ?? 'Support Ticket'}</Text>
        <Text style={styles.ticketSnippet} numberOfLines={1}>{ticket.description ?? ''}</Text>
        <View style={styles.ticketMeta}>
          <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusPillText, { color: s.text }]}>{s.label}</Text>
          </View>
          <Text style={styles.updatedAt}>🕐 {ticket.updated_at_label ?? ''}</Text>
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function MyComplaintsScreen({ navigation }) {
  const [filter, setFilter]         = useState('All');
  const [tickets, setTickets]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      const q = filter === 'All' ? '' : `?status=${filter.toLowerCase().replace(' ', '_')}`;
      const { data } = await client.get(`/drivers/complaints${q}`);
      setTickets(data.tickets ?? []);
    } catch { setTickets([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter]);

  useEffect(() => { fetchTickets(); }, [filter]);
  const onRefresh = () => { setRefreshing(true); fetchTickets(); };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Complaints</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => navigation.navigate('RaiseAComplaint')}
          activeOpacity={0.8}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterStrip}
        contentContainerStyle={styles.filterStripContent}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, filter === f && styles.filterPillActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, filter === f && styles.filterPillTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={Colors.primaryContainer} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryContainer} />}
        >
          {tickets.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎫</Text>
              <Text style={styles.emptyTitle}>No complaints raised</Text>
              <Text style={styles.emptySub}>You're all clear! Raise a complaint if you have an issue.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('RaiseAComplaint')}>
                <Text style={styles.emptyBtnText}>Raise a Complaint</Text>
              </TouchableOpacity>
            </View>
          ) : (
            tickets.map((ticket, i) => (
              <TicketCard key={ticket.id ?? i} ticket={ticket} onPress={() => {}} />
            ))
          )}
        </ScrollView>
      )}
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
  newBtn: {
    backgroundColor: Colors.primaryContainer, paddingHorizontal: 14,
    paddingVertical: 7, borderRadius: Radius.full,
  },
  newBtnText: { color: Colors.white, fontSize: 13, fontWeight: '700' },

  filterStrip: { flexGrow: 0 },
  filterStripContent: { paddingHorizontal: Spacing.base, paddingVertical: 8, gap: 8 },
  filterPill: {
    paddingHorizontal: Spacing.base, paddingVertical: 8,
    borderRadius: Radius.full, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  filterPillActive: { backgroundColor: Colors.primaryContainer, borderColor: Colors.primaryContainer },
  filterPillText: { fontSize: 13, fontWeight: '600', color: Colors.onSurfaceVariant },
  filterPillTextActive: { color: Colors.white, fontWeight: '700' },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: Spacing.base, paddingBottom: 40, gap: 12, paddingTop: 4 },

  ticketCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, ...Shadows.card,
  },
  ticketCardFaded: { opacity: 0.8 },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between' },
  ticketId: { fontSize: 11, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 0.5 },
  ticketDate: { fontSize: 11, color: Colors.onSurfaceVariant },
  ticketTitle: { fontSize: 15, fontWeight: '700', color: Colors.onSurface },
  ticketSnippet: { fontSize: 13, color: Colors.onSurfaceVariant },
  ticketMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  statusPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  updatedAt: { fontSize: 10, color: Colors.onSurfaceVariant },
  chevron: { fontSize: 22, color: Colors.outlineVariant },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.onSurface },
  emptySub: { fontSize: 13, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 8, backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: Radius.lg, ...Shadows.lavender,
  },
  emptyBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});
