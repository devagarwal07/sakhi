import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    FlatList, ActivityIndicator, Pressable, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRide } from '../src/context/RideContext';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';
import apiClient from '../src/api/client';

// Recent/popular places shown before typing
const POPULAR_PLACES = [
    { place_id: 'pp1', description: 'Indiranagar Metro Station, Bangalore', main: 'Indiranagar Metro', secondary: 'Bangalore, Karnataka', lat: 12.9784, lng: 77.6408 },
    { place_id: 'pp2', description: 'Koramangala 5th Block, Bangalore', main: 'Koramangala 5th Block', secondary: 'Bangalore, Karnataka', lat: 12.9352, lng: 77.6245 },
    { place_id: 'pp3', description: 'MG Road, Bangalore', main: 'MG Road', secondary: 'Bangalore, Karnataka', lat: 12.9752, lng: 77.6071 },
    { place_id: 'pp4', description: 'Whitefield, Bangalore', main: 'Whitefield', secondary: 'Bangalore, Karnataka', lat: 12.9698, lng: 77.7499 },
];

export default function LocationSearchScreen() {
    const router = useRouter();
    const { setDropoff, ride } = useRide();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const searchTimer = React.useRef(null);

    const handleSearch = (text) => {
        setQuery(text);
        clearTimeout(searchTimer.current);
        if (text.trim().length < 3) {
            setResults([]);
            return;
        }
        setSearching(true);
        searchTimer.current = setTimeout(async () => {
            try {
                // Use backend proxy for Places autocomplete
                const { data } = await apiClient.get('/maps/autocomplete', {
                    params: { input: text, sessiontoken: Date.now() },
                });
                setResults(data.predictions || []);
            } catch {
                // Fallback to popular if API fails
                setResults(POPULAR_PLACES.filter((p) =>
                    p.description.toLowerCase().includes(text.toLowerCase()),
                ));
            } finally {
                setSearching(false);
            }
        }, 350);
    };

    const handleSelectPlace = async (place) => {
        Keyboard.dismiss();
        try {
            let coords;
            if (place.lat && place.lng) {
                coords = { latitude: place.lat, longitude: place.lng };
            } else {
                // Fetch place detail from backend
                const { data } = await apiClient.get('/maps/place-detail', {
                    params: { place_id: place.place_id },
                });
                coords = {
                    latitude: data.result.geometry.location.lat,
                    longitude: data.result.geometry.location.lng,
                };
            }
            setDropoff({
                ...coords,
                address: place.description || place.main,
            });
            router.replace('/ride-estimate');
        } catch {
            // Use approximate coords if detail fails
            setDropoff({
                latitude: 12.9716,
                longitude: 77.5946,
                address: place.description || place.main,
            });
            router.replace('/ride-estimate');
        }
    };

    const displayList = query.length >= 3 ? results : POPULAR_PLACES;

    return (
        <View style={styles.container}>
            {/* Search Header */}
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backArrow}>←</Text>
                </Pressable>

                {/* Current location pill */}
                <View style={styles.currentLocPill}>
                    <View style={styles.dotGreen} />
                    <Text style={styles.currentLocText} numberOfLines={1}>
                        {ride.pickup?.address || 'Current Location'}
                    </Text>
                </View>

                {/* Destination input */}
                <View style={styles.destinationInputWrapper}>
                    <View style={styles.dotViolet} />
                    <TextInput
                        style={styles.destinationInput}
                        placeholder="Search destination…"
                        placeholderTextColor={Colors.outline}
                        value={query}
                        onChangeText={handleSearch}
                        autoFocus
                        returnKeyType="search"
                    />
                    {query.length > 0 && (
                        <Pressable onPress={() => { setQuery(''); setResults([]); }}>
                            <Text style={styles.clearBtn}>✕</Text>
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Results */}
            {searching ? (
                <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={Colors.primaryContainer} />
                    <Text style={styles.loadingText}>Searching…</Text>
                </View>
            ) : (
                <FlatList
                    data={displayList}
                    keyExtractor={(item) => item.place_id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        query.length < 3 ? (
                            <Text style={styles.listHeader}>Popular Places</Text>
                        ) : null
                    }
                    renderItem={({ item }) => (
                        <Pressable style={styles.resultRow} onPress={() => handleSelectPlace(item)}>
                            <View style={styles.resultIconBg}>
                                <Text style={{ fontSize: 18 }}>📍</Text>
                            </View>
                            <View style={styles.resultBody}>
                                <Text style={styles.resultMain} numberOfLines={1}>
                                    {item.structured_formatting?.main_text || item.main || item.description}
                                </Text>
                                <Text style={styles.resultSecondary} numberOfLines={1}>
                                    {item.structured_formatting?.secondary_text || item.secondary || ''}
                                </Text>
                            </View>
                        </Pressable>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.surfaceContainerLowest },
    header: {
        backgroundColor: Colors.surfaceContainerLowest,
        paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
        gap: 10,
        ...Shadows.card,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.surfaceContainerLow,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 4,
    },
    backArrow: { fontSize: 20, color: Colors.primaryContainer, fontWeight: '700' },
    currentLocPill: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: Colors.surfaceContainerLow,
        borderRadius: 12, padding: 12,
    },
    dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16a34a' },
    currentLocText: { flex: 1, fontSize: 14, color: Colors.onSurfaceVariant, fontWeight: '500' },
    destinationInputWrapper: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: Colors.primaryFixed,
        borderRadius: 12, padding: 12,
        borderWidth: 1.5, borderColor: Colors.primaryContainer,
    },
    dotViolet: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primaryContainer },
    destinationInput: {
        flex: 1, fontSize: 15, color: Colors.onSurface, fontWeight: '500',
    },
    clearBtn: { fontSize: 14, color: Colors.outline, paddingHorizontal: 4 },
    loadingRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        padding: 20,
    },
    loadingText: { ...Typography.bodyMedium, color: Colors.onSurfaceVariant },
    list: { paddingVertical: 8 },
    listHeader: {
        fontSize: 11, fontWeight: '700', color: Colors.onSurfaceVariant,
        textTransform: 'uppercase', letterSpacing: 0.8,
        paddingHorizontal: 20, paddingVertical: 10,
    },
    resultRow: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingHorizontal: 20, paddingVertical: 14,
    },
    resultIconBg: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: Colors.surfaceContainerLow,
        alignItems: 'center', justifyContent: 'center',
    },
    resultBody: { flex: 1 },
    resultMain: { fontSize: 14, fontWeight: '600', color: Colors.onBackground, marginBottom: 2 },
    resultSecondary: { fontSize: 12, color: Colors.onSurfaceVariant },
    separator: { height: 1, backgroundColor: Colors.surfaceContainerLow, marginLeft: 78 },
});
