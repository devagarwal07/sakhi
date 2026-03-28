import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    TouchableOpacity, ActivityIndicator, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../../src/utils/theme';
import { getRideHistory } from '../../src/api/endpoints';
import { format, parseISO } from 'date-fns';

export default function RideHistoryScreen() {
    const router = useRouter();
    const [rides, setRides] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        fetchRides(1);
    }, []);

    const fetchRides = async (pageNum) => {
        pageNum === 1 ? setLoading(true) : setLoadingMore(true);
        try {
            const { data } = await getRideHistory(pageNum);
            const fetched = data.rides || [];
            setRides((prev) => pageNum === 1 ? fetched : [...prev, ...fetched]);
            setHasMore(fetched.length === 10);
            setPage(pageNum);
        } catch (_) { } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const statusConfig = {
        completed: { emoji: '✅', color: Colors.success, label: 'Completed' },
        cancelled: { emoji: '❌', color: Colors.error, label: 'Cancelled' },
        in_progress: { emoji: '🚗', color: Colors.primaryContainer, label: 'In Progress' },
    };

    const RideCard = ({ item }) => {
        const cfg = statusConfig[item.status] || statusConfig.completed;
        const date = item.created_at
            ? format(parseISO(item.created_at), 'dd MMM, hh:mm a')
            : 'Unknown date';

        return (
            <Pressable
                style={styles.card}
                onPress={() => router.push({ pathname: '/ride-details', params: { id: item.id } })}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.cardDate}>{date}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${cfg.color}18` }]}>
                        <Text style={styles.statusEmoji}>{cfg.emoji}</Text>
                        <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                </View>
                <View style={styles.routeRow}>
                    <View style={styles.routeDotGreen} />
                    <Text style={styles.routeText} numberOfLines={1}>{item.pickup_address || 'Pickup'}</Text>
                </View>
                <View style={styles.routeDividerRow}>
                    <View style={styles.routeVertLine} />
                </View>
                <View style={styles.routeRow}>
                    <View style={styles.routeDotViolet} />
                    <Text style={styles.routeText} numberOfLines={1}>{item.dropoff_address || 'Destination'}</Text>
                </View>
                <View style={styles.cardFooter}>
                    <View style={styles.footerChip}>
                        <Text style={styles.footerChipText}>
                            {item.vehicle_type === 'auto' ? '🛺' : '🚗'} {item.vehicle_type || 'Auto'}
                        </Text>
                    </View>
                    {item.fare?.total != null && (
                        <Text style={styles.fareAmount}>₹{item.fare.total.toFixed(2)}</Text>
                    )}
                </View>
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backArrow}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Ride History</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primaryContainer} />
                </View>
            ) : rides.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>🛺</Text>
                    <Text style={styles.emptyTitle}>No rides yet</Text>
                    <Text style={styles.emptySubtitle}>Your completed rides will appear here.</Text>
                    <TouchableOpacity style={styles.bookBtn} onPress={() => router.replace('/(tabs)')}>
                        <Text style={styles.bookBtnText}>Book Your First Ride</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={rides}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <RideCard item={item} />}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    onEndReached={() => hasMore && fetchRides(page + 1)}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={
                        loadingMore
                            ? <ActivityIndicator size="small" color={Colors.primaryContainer} style={{ marginVertical: 20 }} />
                            : null
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0FF' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
        backgroundColor: 'rgba(245,240,255,0.95)',
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.surfaceContainer,
        alignItems: 'center', justifyContent: 'center',
    },
    backArrow: { fontSize: 20, color: Colors.primaryContainer, fontWeight: '700' },
    headerTitle: { ...Typography.titleMedium, color: Colors.onBackground },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { padding: 20, paddingBottom: 40, gap: 12 },
    card: {
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 16, padding: 16, ...Shadows.card,
    },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 12,
    },
    cardDate: { fontSize: 12, color: Colors.onSurfaceVariant, fontWeight: '500' },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4,
    },
    statusEmoji: { fontSize: 11 },
    statusLabel: { fontSize: 11, fontWeight: '600' },
    routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    routeDotGreen: {
        width: 10, height: 10, borderRadius: 5, backgroundColor: '#16a34a',
    },
    routeDotViolet: {
        width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primaryContainer,
    },
    routeText: { flex: 1, fontSize: 13, color: Colors.onSurface, fontWeight: '500' },
    routeDividerRow: { paddingLeft: 4, marginVertical: 2 },
    routeVertLine: { width: 2, height: 14, backgroundColor: Colors.outlineVariant },
    cardFooter: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginTop: 12,
        paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
    },
    footerChip: {
        backgroundColor: Colors.surfaceContainerLow,
        borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4,
    },
    footerChipText: { fontSize: 12, color: Colors.onSurfaceVariant, fontWeight: '500' },
    fareAmount: { fontSize: 16, fontWeight: '800', color: Colors.primaryContainer },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyEmoji: { fontSize: 64, marginBottom: 16 },
    emptyTitle: { ...Typography.headlineSmall, color: Colors.onBackground, marginBottom: 8 },
    emptySubtitle: {
        ...Typography.bodyMedium, color: Colors.onSurfaceVariant,
        textAlign: 'center', marginBottom: 24,
    },
    bookBtn: {
        backgroundColor: Colors.primaryContainer,
        borderRadius: BorderRadius.md, paddingVertical: 14, paddingHorizontal: 28,
        ...Shadows.editorial,
    },
    bookBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 14 },
});
