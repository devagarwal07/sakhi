import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    ActivityIndicator, TouchableOpacity, Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';
import { getRideDetails } from '../src/api/endpoints';
import { format, parseISO } from 'date-fns';

export default function RideDetailsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [ride, setRide] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) { setLoading(false); return; }
        getRideDetails(id)
            .then(({ data }) => setRide(data.ride || data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primaryContainer} />
            </View>
        );
    }

    if (!ride) {
        return (
            <View style={styles.centered}>
                <Text style={styles.emptyText}>Ride details not found.</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.smallBackBtn}>
                    <Text style={styles.smallBackBtnText}>← Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const date = ride.created_at
        ? format(parseISO(ride.created_at), 'EEEE, dd MMM yyyy • hh:mm a')
        : 'Unknown date';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backArrow}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Ride Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Date */}
                <Text style={styles.dateText}>{date}</Text>

                {/* Route card */}
                <View style={styles.routeCard}>
                    <View style={styles.routeRow}>
                        <View style={[styles.routeDot, { backgroundColor: '#16a34a' }]} />
                        <Text style={styles.routeAddr}>{ride.pickup_address || 'Pickup'}</Text>
                    </View>
                    <View style={styles.routeVertLine} />
                    <View style={styles.routeRow}>
                        <View style={[styles.routeDot, { backgroundColor: Colors.primaryContainer }]} />
                        <Text style={styles.routeAddr}>{ride.dropoff_address || 'Destination'}</Text>
                    </View>
                </View>

                {/* Fare card */}
                {ride.fare && (
                    <View style={styles.fareCard}>
                        <Text style={styles.fareCardTitle}>Fare Breakdown</Text>
                        {[
                            { label: 'Base Fare', value: ride.fare.base },
                            { label: 'Distance Charge', value: ride.fare.distance },
                            { label: 'Waiting Charge', value: ride.fare.waiting },
                            { label: 'Promo Discount', value: ride.fare.promo, isDiscount: true },
                        ].map((row, i) => row.value != null ? (
                            <View key={i} style={styles.fareRow}>
                                <Text style={styles.fareLabel}>{row.label}</Text>
                                <Text style={[styles.fareValue, row.isDiscount && { color: Colors.success }]}>
                                    {row.isDiscount ? '−' : ''}₹{(row.value || 0).toFixed(2)}
                                </Text>
                            </View>
                        ) : null)}
                        <View style={styles.fareDivider} />
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>₹{(ride.fare.total || 0).toFixed(2)}</Text>
                        </View>
                    </View>
                )}

                {/* Driver */}
                {ride.driver && (
                    <View style={styles.driverCard}>
                        <View style={styles.driverAvatar}>
                            <Text style={{ fontSize: 24 }}>👩</Text>
                        </View>
                        <View style={styles.driverInfo}>
                            <Text style={styles.driverName}>{ride.driver.name}</Text>
                            <Text style={styles.driverSub}>{ride.driver.vehicle} · {ride.driver.plate}</Text>
                        </View>
                        {ride.driver.rating && (
                            <View style={styles.ratingBadge}>
                                <Text style={styles.ratingText}>⭐ {ride.driver.rating.toFixed(1)}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Meta pills */}
                <View style={styles.metaRow}>
                    <View style={styles.metaPill}>
                        <Text style={styles.metaIcon}>🛺</Text>
                        <Text style={styles.metaText}>{ride.vehicle_type || 'Auto'}</Text>
                    </View>
                    <View style={styles.metaPill}>
                        <Text style={styles.metaIcon}>💵</Text>
                        <Text style={styles.metaText}>{ride.payment_method === 'online' ? 'Online' : 'Cash'}</Text>
                    </View>
                    <View style={styles.metaPill}>
                        <Text style={styles.metaIcon}>📏</Text>
                        <Text style={styles.metaText}>{ride.distance_km?.toFixed(1) || '–'} km</Text>
                    </View>
                </View>

                {/* Rating (if given) */}
                {ride.customer_rating && (
                    <View style={styles.ratingCard}>
                        <Text style={styles.ratingCardLabel}>Your Rating</Text>
                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((s) => (
                                <Text key={s} style={[styles.starIcon, s <= ride.customer_rating && styles.starIconActive]}>★</Text>
                            ))}
                        </View>
                        {ride.customer_comment && (
                            <Text style={styles.ratingComment}>"{ride.customer_comment}"</Text>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0FF' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F0FF' },
    emptyText: { ...Typography.bodyLarge, color: Colors.onSurfaceVariant, marginBottom: 16 },
    smallBackBtn: { padding: 10 },
    smallBackBtnText: { color: Colors.primaryContainer, fontWeight: '600' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.surfaceContainer, alignItems: 'center', justifyContent: 'center',
    },
    backArrow: { fontSize: 20, color: Colors.primaryContainer, fontWeight: '700' },
    headerTitle: { ...Typography.titleMedium, color: Colors.onBackground },
    content: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
    dateText: { fontSize: 12, color: Colors.onSurfaceVariant, fontWeight: '500' },
    routeCard: {
        backgroundColor: Colors.surfaceContainerLowest, borderRadius: 16, padding: 16, ...Shadows.card,
    },
    routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    routeDot: { width: 10, height: 10, borderRadius: 5 },
    routeVertLine: { width: 2, height: 16, backgroundColor: Colors.outlineVariant, marginLeft: 4, marginVertical: 4 },
    routeAddr: { flex: 1, fontSize: 13, color: Colors.onSurface, fontWeight: '500' },
    fareCard: {
        backgroundColor: Colors.surfaceContainerLowest, borderRadius: 16, padding: 16, ...Shadows.card,
    },
    fareCardTitle: { ...Typography.titleSmall, color: Colors.onBackground, marginBottom: 12 },
    fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    fareLabel: { fontSize: 13, color: Colors.onSurfaceVariant },
    fareValue: { fontSize: 13, fontWeight: '600', color: Colors.onSurface },
    fareDivider: { height: 1, backgroundColor: Colors.outlineVariant, marginVertical: 10 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
    totalLabel: { fontSize: 15, fontWeight: '700', color: Colors.onBackground },
    totalValue: { fontSize: 20, fontWeight: '800', color: Colors.primaryContainer },
    driverCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: Colors.surfaceContainerLowest, borderRadius: 14, padding: 14, ...Shadows.card,
    },
    driverAvatar: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: Colors.primaryFixed, alignItems: 'center', justifyContent: 'center',
    },
    driverInfo: { flex: 1 },
    driverName: { fontSize: 15, fontWeight: '700', color: Colors.onBackground },
    driverSub: { fontSize: 12, color: Colors.onSurfaceVariant },
    ratingBadge: {
        backgroundColor: Colors.surfaceContainerLow, borderRadius: BorderRadius.full,
        paddingHorizontal: 10, paddingVertical: 4,
    },
    ratingText: { fontSize: 13, fontWeight: '600', color: Colors.onSurface },
    metaRow: { flexDirection: 'row', gap: 8 },
    metaPill: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 10, padding: 10, justifyContent: 'center', ...Shadows.card,
    },
    metaIcon: { fontSize: 14 },
    metaText: { fontSize: 12, color: Colors.onSurface, fontWeight: '500' },
    ratingCard: {
        backgroundColor: Colors.surfaceContainerLowest, borderRadius: 14, padding: 16, ...Shadows.card,
    },
    ratingCardLabel: { fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant, marginBottom: 8 },
    starsRow: { flexDirection: 'row', gap: 4, marginBottom: 8 },
    starIcon: { fontSize: 24, color: Colors.outlineVariant },
    starIconActive: { color: '#f59e0b' },
    ratingComment: { fontSize: 13, color: Colors.onSurfaceVariant, fontStyle: 'italic' },
});
