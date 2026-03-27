import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';

const TYPE_CONFIG = {
  credit:       { icon: '💸', color: Colors.online          },
  debit:        { icon: '💳', color: '#DC2626'              },
  commission:   { icon: '📊', color: '#D97706'              },
  payout:       { icon: '🏦', color: Colors.primaryContainer},
  subscription: { icon: '🔄', color: Colors.primaryContainer},
};

function TxnCard({ item }) {
  const cfg = TYPE_CONFIG[item.type] ?? { icon: '💰', color: Colors.onSurface };
  const isCredit = item.amount > 0;
  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: `${cfg.color}12` }]}>
        <Text style={{ fontSize: 22 }}>{cfg.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.txnTitle}>{item.title}</Text>
        <Text style={styles.txnId} numberOfLines={1}>#{item.txn_id ?? '—'}</Text>
        <Text style={styles.txnDate}>{item.date_label ?? ''}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.amount, { color: isCredit ? Colors.online : '#DC2626' }]}>
          {isCredit ? '+' : '-'}₹{Math.abs(item.amount).toLocaleString('en-IN')}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: item.status === 'completed' ? '#DCFCE7' : '#FFF7ED' }]}>
          <Text style={[styles.statusText, { color: item.status === 'completed' ? '#15803D' : '#D97706' }]}>
            {item.status ?? 'completed'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function TransactionHistoryScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [summary, setSummary]           = useState(null);

  const fetchTxns = useCallback(async () => {
    try {
      const { data } = await client.get('/drivers/transactions');
      setTransactions(data.transactions ?? []);
      setSummary(data.summary ?? null);
    } catch { setTransactions([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchTxns(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchTxns(); };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={Colors.primaryContainer} /></View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item, i) => item.id ?? String(i)}
          renderItem={({ item }) => <TxnCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryContainer} />}
          ListHeaderComponent={summary && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Earned</Text>
                <Text style={[styles.summaryValue, { color: Colors.online }]}>
                  ₹{(summary.total_earned ?? 0).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Commission Paid</Text>
                <Text style={[styles.summaryValue, { color: '#D97706' }]}>
                  ₹{(summary.total_commission ?? 0).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Net Take-Home</Text>
                <Text style={[styles.summaryValue, { color: Colors.primaryContainer }]}>
                  ₹{(summary.net_take_home ?? 0).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🧾</Text>
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySub}>Your earnings and payments will appear here.</Text>
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

  list: { paddingHorizontal: Spacing.base, paddingBottom: 40, paddingTop: 8 },

  summaryCard: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: 14, ...Shadows.card,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 0.5 },
  summaryValue: { fontSize: 17, fontWeight: '900' },
  summaryDivider: { width: 1, backgroundColor: Colors.outlineVariant, marginHorizontal: 6 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, ...Shadows.card,
  },
  iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txnTitle: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  txnId: { fontSize: 10, color: Colors.onSurfaceVariant, marginTop: 2, fontFamily: 'monospace' },
  txnDate: { fontSize: 10, color: Colors.onSurfaceVariant, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800' },
  statusPill: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  statusText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.onSurface },
  emptySub: { fontSize: 13, color: Colors.onSurfaceVariant, textAlign: 'center' },
});
