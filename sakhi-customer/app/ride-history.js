import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    TouchableOpacity, ActivityIndicator, Pressable,
    ScrollView, Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { getRideHistory } from '../src/api/endpoints';
import { format, parseISO, isWithinInterval, startOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const FILTERS = ['All', 'This Week', 'This Month', 'Last Month'];

export default function RideHistoryScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    
    // As it is no longer a tab screen, it will always be accessed from settings/sidebar,
    // so we can default to showing back button.
    const showBack = true;
    
    const [rides, setRides] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [activeFilter, setActiveFilter] = useState('All');

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

    // Filter rides client-side based on the selected chip
    const applyFilter = (rideList, filter) => {
        if (filter === 'All') return rideList;
        const now = new Date();
        return rideList.filter((item) => {
            if (!item.created_at) return false;
            try {
                const rideDate = parseISO(item.created_at);
                if (filter === 'This Week') {
                    return isWithinInterval(rideDate, {
                        start: startOfWeek(now, { weekStartsOn: 1 }),
                        end: now,
                    });
                }
                if (filter === 'This Month') {
                    return isWithinInterval(rideDate, {
                        start: startOfMonth(now),
                        end: now,
                    });
                }
                if (filter === 'Last Month') {
                    const lastMonth = subMonths(now, 1);
                    return isWithinInterval(rideDate, {
                        start: startOfMonth(lastMonth),
                        end: endOfMonth(lastMonth),
                    });
                }
                return true;
            } catch {
                return false;
            }
        });
    };

    const RideCard = ({ item }) => {
        // Format dates cleanly
        let timeString = 'Unknown Time';
        try {
            if (item.created_at) {
                timeString = format(parseISO(item.created_at), 'dd MMM, hh:mm a');
            }
        } catch(e) {}

        // Mocking 'SUB' logic - if fare is exactly 0, consider it a subscription ride visually
        const isSub = item.fare?.total === 0;
        const fareDisplay = item.fare?.total != null ? `₹${Math.round(item.fare.total)}` : '₹0';
        
        // Clean text truncating for the beautiful UI
        const mainLocation = item.dropoff_address || 'Destination Location';
        const subLocation = item.pickup_address || 'Pickup Location Area';

        return (
            <Pressable
                style={styles.card}
                onPress={() => router.push({ pathname: '/ride-details', params: { id: item.id } })}
            >
                {/* Left Route Line */}
                <View style={styles.routeCol}>
                    <View style={styles.dotGreen} />
                    <View style={styles.vertLine} />
                    <View style={styles.dotPurple} />
                </View>

                {/* Middle Address Info */}
                <View style={styles.infoCol}>
                    <Text style={styles.mainTitle} numberOfLines={1}>{mainLocation}</Text>
                    <Text style={styles.subTitle} numberOfLines={1}>{subLocation}</Text>
                    <Text style={styles.timeText} numberOfLines={1}>{timeString}</Text>
                </View>

                {/* Right Price & Type */}
                <View style={styles.priceCol}>
                    <View style={styles.priceTopRow}>
                        {isSub && (
                            <View style={styles.subBadge}>
                                <Text style={styles.subBadgeText}>SUB</Text>
                            </View>
                        )}
                        <Text style={styles.priceText}>{fareDisplay}</Text>
                    </View>
                    <View style={styles.typeRow}>
                        <Text style={styles.typeText}>
                            {item.vehicle_type ? item.vehicle_type.replace('_', ' ') : 'Auto'}
                        </Text>
                        <Feather name="chevron-right" size={20} color="#CCC3D8" style={{ marginTop: -2 }} />
                    </View>
                </View>
            </Pressable>
        );
    };

    // Show different empty message when filter returns no results vs truly no rides
    const renderEmpty = () => {
        if (loading) return null;
        const isFiltered = activeFilter !== 'All';
        return (
            <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                    <Svg width="54" height="48" viewBox="0 0 18 16" fill="none">
                        <Path
                            d="M3 14V15C3 15.2833 2.90417 15.5208 2.7125 15.7125C2.52083 15.9042 2.28333 16 2 16H1C0.716667 16 0.479167 15.9042 0.2875 15.7125C0.0958333 15.5208 0 15.2833 0 15V7L2.1 1C2.2 0.7 2.37917 0.458333 2.6375 0.275C2.89583 0.0916667 3.18333 0 3.5 0H14.5C14.8167 0 15.1042 0.0916667 15.3625 0.275C15.6208 0.458333 15.8 0.7 15.9 1L18 7V15C18 15.2833 17.9042 15.5208 17.7125 15.7125C17.5208 15.9042 17.2833 16 17 16H16C15.7167 16 15.4792 15.9042 15.2875 15.7125C15.0958 15.5208 15 15.2833 15 15V14H3ZM2.8 5H15.2L14.15 2H3.85L2.8 5ZM2 7V12V7ZM4.5 11C4.91667 11 5.27083 10.8542 5.5625 10.5625C5.85417 10.2708 6 9.91667 6 9.5C6 9.08333 5.85417 8.72917 5.5625 8.4375C5.27083 8.14583 4.91667 8 4.5 8C4.08333 8 3.72917 8.14583 3.4375 8.4375C3.14583 8.72917 3 9.08333 3 9.5C3 9.91667 3.14583 10.2708 3.4375 10.5625C3.72917 10.8542 4.08333 11 4.5 11ZM13.5 11C13.9167 11 14.2708 10.8542 14.5625 10.5625C14.8542 10.2708 15 9.91667 15 9.5C15 9.08333 14.8542 8.72917 14.5625 8.4375C14.2708 8.14583 13.9167 8 13.5 8C13.0833 8 12.7292 8.14583 12.4375 8.4375C12.1458 8.72917 12 9.08333 12 9.5C12 9.91667 12.1458 10.2708 12.4375 10.5625C12.7292 10.8542 13.0833 11 13.5 11ZM2 12H16V7H2V12Z"
                            fill="#BEA3D8"
                        />
                    </Svg>
                </View>
                <Text style={styles.emptyTitle}>
                    {isFiltered ? `No rides in ${activeFilter}` : 'No rides yet'}
                </Text>
                <Text style={styles.emptySubtitle}>
                    {isFiltered
                        ? 'Try selecting a different time period'
                        : 'Your completed trips will appear here.'}
                </Text>
            </View>
        );
    };

    // Apply active filter to ride list
    const filteredRides = applyFilter(rides, activeFilter);
    const dataToRender = filteredRides;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                
                {/* Fixed App Bar */}
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {showBack ? (
                            <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')} style={styles.backBtn} activeOpacity={0.7}>
                                <Feather name="arrow-left" size={24} color="#BEA3D8" />
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.backBtn} /* Left Spacer if no back btn */ />
                        )}
                        <Text style={styles.headerTitle}>Ride History</Text>
                    </View>
                </View>

                {/* Filter Chips - Horizontal Scroll */}
                <View>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterScroll}
                    >
                        {FILTERS.map((f) => {
                            const isActive = f === activeFilter;
                            return (
                                <TouchableOpacity 
                                    key={f}
                                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                                    onPress={() => setActiveFilter(f)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                                        {f}
                                    </Text>
                                </TouchableOpacity>
                            )
                        })}
                    </ScrollView>
                </View>

                {loading && page === 1 ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#BEA3D8" />
                    </View>
                ) : (
                    <FlatList
                        data={dataToRender}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <RideCard item={item} />}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={renderEmpty}
                        ListFooterComponent={
                            <View style={styles.loadMoreWrap}>
                                {loadingMore ? (
                                    <ActivityIndicator size="small" color="#BEA3D8" />
                                ) : hasMore && dataToRender.length > 0 ? (
                                    <TouchableOpacity style={styles.loadMoreBtn} onPress={() => fetchRides(page + 1)}>
                                        <Text style={styles.loadMoreText}>Load More Rides</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        }
                    />
                )}

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        height: 64,
        backgroundColor: '#F5F0FF', 
        zIndex: 10
    },
    iconBtn: { 
        width: 32, 
        height: 32, 
        justifyContent: 'center', 
        alignItems: 'flex-start',
        backgroundColor: 'transparent'
    },
    headerIcon: { 
        fontSize: 24, 
        color: '#BEA3D8', 
        fontWeight: 'bold' 
    },
    headerTitle: { 
        fontSize: 20, 
        fontWeight: '700', 
        color: '#1E1B2E', 
        letterSpacing: -0.5,
        marginLeft: 16
    },
    safeArea: { flex: 1, backgroundColor: '#F5F0FF' },
    container: { flex: 1 },
    
    /* App Bar */
    
    backBtn: { width: 32, height: 32, justifyContent: 'center' },
    backArrow: { fontSize: 24, color: '#BEA3D8', fontWeight: 'bold' },
    
    
    /* Filter Row */
    filterScroll: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 24, // extra padding before list
        gap: 12,
        flexDirection: 'row',
    },
    filterChip: {
        paddingVertical: 8, paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1, borderColor: 'rgba(204, 195, 216, 0.4)',
        borderRadius: 9999,
        justifyContent: 'center', alignItems: 'center',
    },
    filterChipActive: {
        backgroundColor: '#BEA3D8',
        borderColor: '#BEA3D8',
        shadowColor: 'rgba(0, 0, 0, 0.05)', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 2, elevation: 2,
    },
    filterText: {
        fontSize: 14, fontWeight: '500', color: '#64748B',
    },
    filterTextActive: {
        color: '#FFFFFF',
    },

    /* List */
    list: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
    
    /* Card */
    card: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
    },
    
    /* Left Route Diagram */
    routeCol: {
        alignItems: 'center',
        marginRight: 16,
        paddingTop: 4,
    },
    dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
    vertLine: { width: 2, height: 32, backgroundColor: '#F1F5F9', marginVertical: 4 },
    dotPurple: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#BEA3D8' },
    
    /* Middle Info */
    infoCol: {
        flex: 1,
        gap: 4,
    },
    mainTitle: {
        fontSize: 14, fontWeight: '700', color: '#1E1B2E', lineHeight: 20,
    },
    subTitle: {
        fontSize: 12, fontWeight: '400', color: '#1E1B2E', lineHeight: 16,
    },
    timeText: {
        fontSize: 10, fontWeight: '400', color: '#1E1B2E', lineHeight: 15,
        marginTop: 4, // slight push down as in spec
    },
    
    /* Right Action/Price */
    priceCol: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 4,
    },
    priceTopRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    subBadge: {
        backgroundColor: '#F5F0FF',
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    },
    subBadgeText: {
        fontSize: 9, fontWeight: '700', color: '#BEA3D8', textTransform: 'uppercase', letterSpacing: 0.45,
    },
    priceText: {
        fontSize: 16, fontWeight: '700', color: '#BEA3D8', lineHeight: 24,
    },
    typeRow: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    typeText: {
        fontSize: 10, color: '#1E1B2E', textTransform: 'capitalize',
    },
    chevron: {
        fontSize: 14, color: '#CCC3D8', marginTop: -2,
    },

    /* Empty State */
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
    emptyIconWrap: { 
        width: 88, 
        height: 88, 
        borderRadius: 44, 
        backgroundColor: '#F0EAFF', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 20 
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1E1B2E', marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },

    /* Footer Load More Wrapper */
    loadMoreWrap: { 
        paddingVertical: 24, 
        justifyContent: 'center', alignItems: 'center',
    },
    loadMoreBtn: {
        paddingVertical: 12, paddingHorizontal: 32,
        borderWidth: 2, borderColor: '#BEA3D8',
        borderRadius: 9999,
        justifyContent: 'center', alignItems: 'center',
    },
    loadMoreText: {
        fontSize: 14, fontWeight: '600', color: '#BEA3D8',
    },
});
