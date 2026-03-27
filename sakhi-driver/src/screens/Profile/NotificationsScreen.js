import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';

const ICON_MAP = {
  ride_completed:   '🛺',
  payment_received: '💸',
  commission_due:   '⚠️',
  system:           '📣',
  subscription:     '🔄',
};

function NotifCard({ item }) {
  return (
    <View style={[styles.card, !item.read && styles.cardUnread]}>
      <View style={[styles.iconBox, !item.read && styles.iconBoxUnread]}>
        <Text style={{ fontSize: 22 }}>{ICON_MAP[item.type] ?? '🔔'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.time}>{item.time_label}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </View>
  );
}

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await client.get('/drivers/notifications');
      setNotifications(data.notifications ?? []);
    } catch { setNotifications([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchNotifications(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchNotifications(); };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={Colors.primaryContainer} /></View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item, i) => item.id ?? String(i)}
          renderItem={({ item }) => <NotifCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryContainer} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔕</Text>
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySub}>You're all caught up!</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
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
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  list: { paddingHorizontal: Spacing.base, paddingBottom: 40, paddingTop: 4 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, ...Shadows.card,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: Colors.primaryContainer },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.surfaceLow, alignItems: 'center', justifyContent: 'center',
  },
  iconBoxUnread: { backgroundColor: `${Colors.primaryContainer}15` },
  title: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  body: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2, lineHeight: 18 },
  time: { fontSize: 10, color: Colors.onSurfaceVariant, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primaryContainer, marginTop: 4 },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.onSurface },
  emptySub: { fontSize: 13, color: Colors.onSurfaceVariant },
});
