import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    FlatList, ActivityIndicator, Pressable, Keyboard, Platform,
    ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRide } from '../src/context/RideContext';
import apiClient from '../src/api/client';

const RECENT_SEARCHES = [
    {
        place_id: 'rs1',
        main: 'Hauz Khas Social',
        secondary: '9A & 12, Hauz Khas Village, New Delhi',
        lat: 28.5494,
        lng: 77.2001,
    },
    {
        place_id: 'rs2',
        main: 'Select Citywalk',
        secondary: 'A-3, District Centre, Saket, New Delhi',
        lat: 28.5286,
        lng: 77.2189,
    },
    {
        place_id: 'rs3',
        main: 'Indira Gandhi International Airport',
        secondary: 'Terminal 3, New Delhi, Delhi 110037',
        lat: 28.5562,
        lng: 77.1000,
    },
];

export default function LocationSearchScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { setDropoff, ride } = useRide();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const searchTimer = React.useRef(null);

    const returnRoute = params?.returnRoute || '/ride-estimate';

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
                const { data } = await apiClient.get('/maps/autocomplete', {
                    params: { input: text, sessiontoken: Date.now() },
                });
                setResults(data.predictions || []);
            } catch {
                setResults(RECENT_SEARCHES.filter((p) =>
                    p.main.toLowerCase().includes(text.toLowerCase()),
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
            router.replace(returnRoute);
        } catch {
            setDropoff({
                latitude: 28.6139,
                longitude: 77.2090,
                address: place.description || place.main,
            });
            router.replace(returnRoute);
        }
    };

    const handleConfirm = () => {
        router.replace(returnRoute);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backIcon}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Plan Your Ride</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Search Card */}
                <View style={styles.searchCardWrapper}>
                    <View style={styles.searchCard}>
                        <View style={styles.routeRow}>
                            {/* Icon Column */}
                            <View style={styles.iconColumn}>
                                <View style={styles.dotGreen} />
                                <View style={styles.dashedLine} />
                                <Text style={styles.dropPin}>📍</Text>
                            </View>

                            {/* Input Column */}
                            <View style={styles.inputColumn}>
                                {/* Pickup */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>PICKUP LOCATION</Text>
                                    <Text style={styles.inputValue} numberOfLines={2}>
                                        {ride?.pickup?.address || '12, Green Park Avenue, New Delhi'}
                                    </Text>
                                </View>

                                {/* Drop-off */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>DROP-OFF LOCATION</Text>
                                    <TextInput
                                        style={styles.dropInput}
                                        placeholder="Where to?"
                                        placeholderTextColor="rgba(190, 163, 216, 0.6)"
                                        value={query}
                                        onChangeText={handleSearch}
                                        returnKeyType="search"
                                    />
                                </View>
                            </View>

                            {/* Swap button */}
                            <View style={styles.swapBtn}>
                                <Text style={styles.swapIcon}>⇅</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Saved Places */}
                <View style={styles.savedSection}>
                    <Text style={styles.sectionTitle}>SAVED PLACES</Text>
                    <View style={styles.chipsRow}>
                        <TouchableOpacity style={styles.chip}>
                            <Text style={styles.chipIcon}>🏠</Text>
                            <Text style={styles.chipText}>Home</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.chip}>
                            <Text style={styles.chipIcon}>💼</Text>
                            <Text style={styles.chipText}>Work</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.chip}>
                            <Text style={styles.chipIcon}>+</Text>
                            <Text style={styles.chipText}>Add New</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Recent Searches */}
                <View style={styles.recentSection}>
                    <Text style={styles.sectionTitle}>RECENT SEARCHES</Text>

                    {(query.length >= 3 ? results : RECENT_SEARCHES).map((item, index) => (
                        <React.Fragment key={item.place_id}>
                            <Pressable
                                style={styles.recentRow}
                                onPress={() => handleSelectPlace(item)}
                            >
                                <View style={styles.recentIconBg}>
                                    <Text style={styles.recentIcon}>🕐</Text>
                                </View>
                                <View style={styles.recentInfo}>
                                    <Text style={styles.recentMain} numberOfLines={1}>
                                        {item.structured_formatting?.main_text || item.main}
                                    </Text>
                                    <Text style={styles.recentSub} numberOfLines={1}>
                                        {item.structured_formatting?.secondary_text || item.secondary}
                                    </Text>
                                </View>
                                <Text style={styles.recentArrow}>→</Text>
                            </Pressable>
                            {index < (query.length >= 3 ? results : RECENT_SEARCHES).length - 1 && (
                                <View style={styles.divider} />
                            )}
                        </React.Fragment>
                    ))}

                    {searching && (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator size="small" color="#BEA3D8" />
                            <Text style={styles.loadingText}>Searching…</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Bottom CTA */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={handleConfirm}
                    activeOpacity={0.88}
                >
                    <Text style={styles.ctaText}>CONFIRM LOCATIONS</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0FF',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 52 : 16,
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 16,
        backgroundColor: '#F5F0FF',
    },
    backBtn: {
        width: 19,
        height: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        fontSize: 18,
        color: '#BEA3D8',
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1C1A25',
        letterSpacing: -0.45,
        lineHeight: 28,
    },

    scrollContent: {
        paddingBottom: 140,
    },

    // Search card
    searchCardWrapper: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    searchCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 4,
    },
    routeRow: {
        flexDirection: 'row',
        gap: 16,
    },

    // Icon column
    iconColumn: {
        alignItems: 'center',
        paddingTop: 10,
        width: 14,
    },
    dotGreen: {
        width: 14,
        height: 14,
        borderRadius: 9999,
        backgroundColor: '#10B981',
    },
    dashedLine: {
        width: 2,
        height: 48,
        borderLeftWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#CCC3D8',
        marginVertical: 4,
    },
    dropPin: {
        fontSize: 14,
        color: '#BEA3D8',
    },

    // Input column
    inputColumn: {
        flex: 1,
        gap: 20,
    },
    inputGroup: {
        gap: 4,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6B7280',
        letterSpacing: 0.55,
        textTransform: 'uppercase',
        lineHeight: 16,
    },
    inputValue: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1C1A25',
        lineHeight: 24,
    },
    dropInput: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1C1A25',
        lineHeight: 18,
        padding: 0,
    },

    // Swap button
    swapBtn: {
        position: 'absolute',
        right: -4,
        top: '50%',
        marginTop: -20,
        width: 40,
        height: 40,
        borderRadius: 9999,
        backgroundColor: '#F5F0FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    swapIcon: {
        fontSize: 16,
        color: '#BEA3D8',
    },

    // Saved section
    savedSection: {
        paddingHorizontal: 20,
        paddingTop: 31,
        gap: 16,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6B7280',
        letterSpacing: 1.3,
        textTransform: 'uppercase',
        lineHeight: 20,
    },
    chipsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: 'rgba(204, 195, 216, 0.1)',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    chipIcon: {
        fontSize: 14,
        color: '#BEA3D8',
    },
    chipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E1B2E',
        lineHeight: 21,
    },

    // Recent searches
    recentSection: {
        paddingHorizontal: 20,
        paddingTop: 40,
    },
    recentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 8,
        gap: 16,
        borderRadius: 12,
    },
    recentIconBg: {
        width: 40,
        height: 40,
        borderRadius: 9999,
        backgroundColor: '#EBE6F5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    recentIcon: {
        fontSize: 16,
        color: '#7B7487',
    },
    recentInfo: {
        flex: 1,
    },
    recentMain: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1C1A25',
        lineHeight: 22,
    },
    recentSub: {
        fontSize: 13,
        fontWeight: '400',
        color: '#6B7280',
        lineHeight: 20,
    },
    recentArrow: {
        fontSize: 16,
        color: '#BEA3D8',
    },

    // Divider
    divider: {
        height: 1,
        backgroundColor: 'rgba(204, 195, 216, 0.3)',
    },

    // Loading
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 20,
    },
    loadingText: {
        fontSize: 14,
        color: '#6B7280',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
    },
    ctaButton: {
        height: 56,
        backgroundColor: '#BEA3D8',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 6,
    },
    ctaText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        lineHeight: 24,
    },
});
