import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    FlatList, ActivityIndicator, Pressable, Keyboard, Platform,
    ScrollView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
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
                <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn}>
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
                                <Svg width="14" height="17" viewBox="0 0 14 17" fill="none">
                                    <Path d="M6.66667 8.33333C7.125 8.33333 7.51736 8.17014 7.84375 7.84375C8.17014 7.51736 8.33333 7.125 8.33333 6.66667C8.33333 6.20833 8.17014 5.81597 7.84375 5.48958C7.51736 5.16319 7.125 5 6.66667 5C6.20833 5 5.81597 5.16319 5.48958 5.48958C5.16319 5.81597 5 6.20833 5 6.66667C5 7.125 5.16319 7.51736 5.48958 7.84375C5.81597 8.17014 6.20833 8.33333 6.66667 8.33333ZM6.66667 16.6667C4.43056 14.7639 2.76042 12.9965 1.65625 11.3646C0.552083 9.73264 0 8.22222 0 6.83333C0 4.75 0.670139 3.09028 2.01042 1.85417C3.35069 0.618055 4.90278 0 6.66667 0C8.43056 0 9.98264 0.618055 11.3229 1.85417C12.6632 3.09028 13.3333 4.75 13.3333 6.83333C13.3333 8.22222 12.7812 9.73264 11.6771 11.3646C10.5729 12.9965 8.90278 14.7639 6.66667 16.6667Z" fill="#BEA3D8"/>
                                </Svg>
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
                                <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <Path d="M4.66667 14L4.66667 4.55333L2.61333 6.60667L1.66667 5.66667L5.33333 2L9 5.66667L8.05333 6.60667L6 4.55333L6 14L4.66667 14ZM10.6667 14L7 10.3333L7.94667 9.39333L10 11.4467V2H11.3333V11.4467L13.3867 9.39333L14.3333 10.3333L10.6667 14Z" fill="#BEA3D8"/>
                                </Svg>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Saved Places */}
                <View style={styles.savedSection}>
                    <Text style={styles.sectionTitle}>SAVED PLACES</Text>
                    <View style={styles.chipsRow}>
                        <TouchableOpacity style={styles.chip} onPress={() => {
                            const homeAddr = ride?.savedPlaces?.home || 'Home';
                            setQuery(homeAddr);
                        }}>
                            <Svg width="12" height="14" viewBox="0 0 12 14" fill="none" style={styles.chipIcon}>
                                <Path d="M1.5 12H3.75V7.5H8.25V12H10.5V5.25L6 1.875L1.5 5.25V12ZM0 13.5V4.5L6 0L12 4.5V13.5H6.75V9H5.25V13.5H0Z" fill="#BEA3D8"/>
                            </Svg>
                            <Text style={styles.chipText}>Home</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.chip} onPress={() => {
                            const workAddr = ride?.savedPlaces?.work || 'Work';
                            setQuery(workAddr);
                        }}>
                            <Svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={styles.chipIcon}>
                                <Path d="M1.5 14.25C1.0875 14.25 0.734375 14.1031 0.440625 13.8094C0.146875 13.5156 0 13.1625 0 12.75V4.5C0 4.0875 0.146875 3.73438 0.440625 3.44062C0.734375 3.14687 1.0875 3 1.5 3H4.5V1.5C4.5 1.0875 4.64688 0.734375 4.94063 0.440625C5.23438 0.146875 5.5875 0 6 0H9C9.4125 0 9.76562 0.146875 10.0594 0.440625C10.3531 0.734375 10.5 1.0875 10.5 1.5V3H13.5C13.9125 3 14.2656 3.14687 14.5594 3.44062C14.8531 3.73438 15 4.0875 15 4.5V12.75C15 13.1625 14.8531 13.5156 14.5594 13.8094C14.2656 14.1031 13.9125 14.25 13.5 14.25H1.5ZM1.5 12.75H13.5V4.5H1.5V12.75ZM6 3H9V1.5H6V3ZM1.5 12.75V4.5V12.75Z" fill="#BEA3D8"/>
                            </Svg>
                            <Text style={styles.chipText}>Work</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.chip} onPress={() => router.push('/saved-places')}>
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
                                    <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <Path d="M13.3 14.7L14.7 13.3L11 9.6V5H9V10.4L13.3 14.7ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20ZM10 18C12.2167 18 14.1042 17.2208 15.6625 15.6625C17.2208 14.1042 18 12.2167 18 10C18 7.78333 17.2208 5.89583 15.6625 4.3375C14.1042 2.77917 12.2167 2 10 2C7.78333 2 5.89583 2.77917 4.3375 4.3375C2.77917 5.89583 2 7.78333 2 10C2 12.2167 2.77917 14.1042 4.3375 15.6625C5.89583 17.2208 7.78333 18 10 18Z" fill="#7B7487"/>
                                    </Svg>
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
    container: {
        flex: 1,
        backgroundColor: '#F5F0FF',
    },

    // Header
    
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
