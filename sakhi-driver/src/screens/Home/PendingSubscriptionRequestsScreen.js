import React from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSocket } from '../../context/SocketContext';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Design tokens ─────────────────────────────────────────────────────────────
const AMBER   = '#D97706';
const AMBER_L = '#FEF3C7';
const AMBER_B = '#FDE68A';
const DARK    = '#1E1B2E';
const MUTED   = '#6B7280';
const WHITE   = '#FFFFFF';

// ── Single pending request row ─────────────────────────────────────────────────
function RequestRow({ item, onAccept }) {
  return (
    <View style={s.row}>
      <View style={s.rowLeft}>
        <View style={s.calIcon}>
          <MaterialCommunityIcons name="calendar-clock" size={20} color={AMBER} />
        </View>
        <View style={s.rowText}>
          <Text style={s.rowTitle} numberOfLines={1}>
            {item.pickup_address || 'Pickup'} → {item.dropoff_address || item.drop_address || 'Dropoff'}
          </Text>
          <Text style={s.rowSub}>
            {item.schedule_label || 'Recurring subscription'} · ₹{item.fare ?? '—'}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={s.acceptChip} onPress={() => onAccept(item)} activeOpacity={0.8}>
        <Text style={s.acceptChipText}>Accept</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function PendingSubscriptionRequestsScreen({ onGoOffline, onDismiss }) {
  const insets = useSafeAreaInsets();
  const { pendingSubRequests, clearPendingSubRequests, acceptRide, clearIncomingRide } = useSocket();

  const handleAccept = async (item) => {
    try {
      await acceptRide(item.ride_id);
      clearIncomingRide();
      clearPendingSubRequests();
      onDismiss?.();
    } catch {
      // Stay on screen — driver can try again or go offline anyway
    }
  };

  const handleGoOfflineAnyway = () => {
    clearPendingSubRequests();
    onGoOffline?.();
  };

  return (
    <View style={[s.root, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 24) }]}>

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerIconWrap}>
          <MaterialCommunityIcons name="bell-badge" size={28} color={AMBER} />
        </View>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Pending Subscription Requests</Text>
          <Text style={s.headerSub}>
            You have {pendingSubRequests.length} snoozed request{pendingSubRequests.length !== 1 ? 's' : ''}.
            Accept before going offline or they'll be re-assigned.
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={s.divider} />

      {/* List */}
      <FlatList
        data={pendingSubRequests}
        keyExtractor={(item) => item.ride_id}
        renderItem={({ item }) => <RequestRow item={item} onAccept={handleAccept} />}
        contentContainerStyle={s.list}
        ItemSeparatorComponent={() => <View style={s.separator} />}
        showsVerticalScrollIndicator={false}
      />

      {/* Footer actions */}
      <View style={s.footer}>
        <TouchableOpacity style={s.offlineBtn} onPress={handleGoOfflineAnyway} activeOpacity={0.8}>
          <Feather name="power" size={16} color="#DC2626" />
          <Text style={s.offlineBtnText}>Go Offline Anyway</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.stayOnlineBtn} onPress={onDismiss} activeOpacity={0.85}>
          <Text style={s.stayOnlineBtnText}>Stay Online</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFBEB',
    zIndex: 10000,
    paddingHorizontal: 24,
  },

  header: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 20,
  },
  headerIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: AMBER_L, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: AMBER_B,
  },
  headerText: { flex: 1, gap: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: DARK, letterSpacing: -0.4, lineHeight: 24 },
  headerSub:   { fontSize: 13, fontWeight: '400', color: MUTED, lineHeight: 20 },

  divider: { height: 1, backgroundColor: AMBER_B, marginBottom: 20 },

  list: { gap: 0 },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: WHITE, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: AMBER_B,
    shadowColor: AMBER, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  calIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: AMBER_L, alignItems: 'center', justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: DARK },
  rowSub:   { fontSize: 12, fontWeight: '400', color: MUTED },

  acceptChip: {
    backgroundColor: AMBER, borderRadius: 9999,
    paddingVertical: 7, paddingHorizontal: 14,
    marginLeft: 8,
  },
  acceptChipText: { fontSize: 13, fontWeight: '700', color: WHITE },

  separator: { height: 12 },

  footer: { gap: 12, marginTop: 24 },

  offlineBtn: {
    height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(220,38,38,0.3)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(254,242,242,0.9)',
  },
  offlineBtnText: { fontSize: 15, fontWeight: '600', color: '#DC2626', letterSpacing: 0.2 },

  stayOnlineBtn: {
    height: 52, borderRadius: 12, backgroundColor: AMBER,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: AMBER, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  stayOnlineBtnText: { fontSize: 16, fontWeight: '700', color: WHITE },
});
