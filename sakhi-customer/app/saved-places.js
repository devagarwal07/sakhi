import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Platform, Modal, TextInput, KeyboardAvoidingView, ActivityIndicator,
    FlatList, Keyboard
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import SakhiModal from '../src/components/SakhiModal';
import { Feather } from '@expo/vector-icons';
import { getAddresses, saveAddress, deleteAddress } from '../src/api/endpoints';
import { KEYBOARD_BEHAVIOR } from '../src/utils/androidUtils';
import CustomAlert from '../src/utils/CustomAlert';
import { searchPlaces, resolveCoordinates } from '../src/utils/locationService';
import MapplsMapWebView from '../src/components/MapplsMapWebView';
import { isInBengaluru } from '../src/utils/bengaluruUtils';

export default function SavedPlacesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Backend address objects — { id, label, address, lat, lng }
    const [homeAddress, setHomeAddress] = useState(null);
    const [workAddress, setWorkAddress] = useState(null);
    const [customPlaces, setCustomPlaces] = useState([]);

    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('custom'); // 'home' | 'work' | 'custom'
    const [inputAddress, setInputAddress] = useState('');
    const [inputName, setInputName] = useState('');
    const [alertModal, setAlertModal] = useState(null);

    // Mappls Autocomplete State
    const [suggestions, setSuggestions] = useState([]);
    const [searching, setSearching] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [selectedCoords, setSelectedCoords] = useState(null);
    const searchTimer = React.useRef(null);

    const modalSheetPaddingBottom = Math.max(insets.bottom + 10, 28);
    const modalKeyboardOffset = Math.max(insets.bottom + 12, 24);

    const mapMarkers = React.useMemo(() => {
        const mkrs = [];
        if (homeAddress?.lat && homeAddress?.lng) {
            mkrs.push({ id: 'home', latitude: homeAddress.lat, longitude: homeAddress.lng, markerType: 'pickup', color: '#10B981' });
        }
        if (workAddress?.lat && workAddress?.lng) {
            mkrs.push({ id: 'work', latitude: workAddress.lat, longitude: workAddress.lng, markerType: 'pickup', color: '#3B82F6' });
        }
        customPlaces.forEach((p, i) => {
            if (p.lat && p.lng) {
                mkrs.push({ id: `custom_${i}`, latitude: p.lat, longitude: p.lng, markerType: 'pickup', color: '#BEA3D8' });
            }
        });
        return mkrs;
    }, [homeAddress, workAddress, customPlaces]);

    // ── Load addresses from backend ──────────────────────────────────────────
    useEffect(() => {
        loadAddresses();
    }, []);

    const loadAddresses = async () => {
        setLoading(true);
        try {
            const { data } = await getAddresses();
            const list = data.addresses || data || [];
            const home = list.find(a => a.label === 'home');
            const work = list.find(a => a.label === 'work');
            const others = list.filter(a => a.label !== 'home' && a.label !== 'work');
            setHomeAddress(home || null);
            setWorkAddress(work || null);
            setCustomPlaces(others);
        } catch {
            setAlertModal({
                icon: '⚠️', title: 'Error',
                message: 'Could not load saved places.',
                buttons: [{ text: 'OK', onPress: () => setAlertModal(null) }]
            });
        } finally {
            setLoading(false);
        }
    };

    const openModal = (type) => {
        setModalType(type);
        setInputAddress(type === 'home' ? homeAddress?.address || '' : type === 'work' ? workAddress?.address || '' : '');
        setInputName('');
        setSelectedCoords(type === 'home' ? (homeAddress?.lat ? { latitude: homeAddress.lat, longitude: homeAddress.lng } : null) : type === 'work' ? (workAddress?.lat ? { latitude: workAddress.lat, longitude: workAddress.lng } : null) : null);
        setSuggestions([]);
        setShowModal(true);
    };

    const handleSearchInput = (text) => {
        setInputAddress(text);
        setSelectedCoords(null); // Clear selected coords if user types manually
        clearTimeout(searchTimer.current);
        if (text.trim().length < 3) {
            setSuggestions([]);
            return;
        }
        setSearching(true);
        searchTimer.current = setTimeout(async () => {
            try {
                const res = await searchPlaces(text);
                setSuggestions(res);
            } catch (e) {
                setSuggestions([]);
            } finally {
                setSearching(false);
            }
        }, 350);
    };

    const handleSelectSuggestion = async (place) => {
        Keyboard.dismiss();
        setResolving(true);
        try {
            const { coords, address: newAddress } = await resolveCoordinates(place);
            if (!coords || !coords.latitude) {
                setAlertModal({ icon: '⚠️', title: 'Location Error', message: 'Could not resolve exact coordinates for this address.', buttons: [{ text: 'OK', onPress: () => setAlertModal(null) }] });
                return;
            }

            if (!isInBengaluru(coords.latitude, coords.longitude)) {
                setAlertModal({ 
                    icon: '📍', 
                    title: 'Outside Service Area', 
                    message: 'Sakhi is currently only available in Bengaluru. Please select a Bengaluru location.', 
                    buttons: [{ text: 'OK', onPress: () => setAlertModal(null) }] 
                });
                return;
            }

            setInputAddress(newAddress);
            setSelectedCoords(coords);
            setSuggestions([]);
        } catch (e) {
            setAlertModal({ icon: '⚠️', title: 'Error', message: 'Something went wrong while resolving the location.', buttons: [{ text: 'OK', onPress: () => setAlertModal(null) }] });
        } finally {
            setResolving(false);
        }
    };

    const handleSave = async () => {
        if (!inputAddress.trim()) {
            setAlertModal({
                icon: '⚠️', title: 'Missing Info', message: 'Please enter an address.',
                buttons: [{ text: 'OK', onPress: () => setAlertModal(null) }]
            });
            return;
        }
        if (modalType === 'custom' && !inputName.trim()) {
            setAlertModal({
                icon: '⚠️', title: 'Missing Info', message: 'Please enter a place name.',
                buttons: [{ text: 'OK', onPress: () => setAlertModal(null) }]
            });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                label: modalType === 'custom' ? inputName.trim() : modalType,
                address: inputAddress.trim(),
                lat: selectedCoords?.latitude,
                lng: selectedCoords?.longitude,
            };

            // If updating home/work, delete the old record first then re-create
            if (modalType === 'home' && homeAddress?.id) {
                await deleteAddress(homeAddress.id);
            }
            if (modalType === 'work' && workAddress?.id) {
                await deleteAddress(workAddress.id);
            }

            const { data } = await saveAddress(payload);
            const newAddr = data.address || data;

            if (modalType === 'home') {
                setHomeAddress(newAddr);
            } else if (modalType === 'work') {
                setWorkAddress(newAddr);
            } else {
                setCustomPlaces(prev => [...prev, newAddr]);
            }
            setShowModal(false);
        } catch (err) {
            setAlertModal({
                icon: '⚠️', title: 'Error',
                message: err?.response?.data?.message || 'Could not save address.',
                buttons: [{ text: 'OK', onPress: () => setAlertModal(null) }]
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id, name) => {
        setAlertModal({
            icon: '🗑️', title: 'Remove Place',
            message: `Remove "${name}" from saved places?`,
            buttons: [
                { text: 'Cancel', style: 'cancel', onPress: () => setAlertModal(null) },
                {
                    text: 'Remove', style: 'destructive',
                    onPress: async () => {
                        setAlertModal(null);
                        try {
                            await deleteAddress(id);
                            if (homeAddress?.id === id) {
                                setHomeAddress(null);
                            } else if (workAddress?.id === id) {
                                setWorkAddress(null);
                            } else {
                                setCustomPlaces(prev => prev.filter(p => p.id !== id));
                            }
                        } catch {
                            setTimeout(() => setAlertModal({
                                icon: '⚠️', title: 'Error', message: 'Could not remove place.',
                                buttons: [{ text: 'OK', onPress: () => setAlertModal(null) }]
                            }), 300);
                        }
                    }
                },
            ]
        });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>

                {/* Header App Bar */}
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} activeOpacity={0.7}>
                            <Feather name="arrow-left" size={24} color="#BEA3D8" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Saved Places</Text>
                    </View>
                    <TouchableOpacity style={styles.headerDotsContainer} activeOpacity={0.7} onPress={loadAddresses}>
                        <Feather name="refresh-cw" size={20} color="#BEA3D8" />
                    </TouchableOpacity>
                </View>

                {/* Main Content Area */}
                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color="#BEA3D8" />
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                        {/* Primary Address Card Setup */}
                        <View style={styles.primaryCard}>
                            <View style={styles.rowItem}>
                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 16 }} activeOpacity={0.7} onPress={() => openModal('home')}>
                                    <View style={[styles.iconWrap, { backgroundColor: '#ECFDF5' }]}>
                                        <Feather name="home" size={18} color="#10B981" />
                                    </View>
                                    <View style={styles.rowTextWrap}>
                                        <Text style={styles.rowTitle}>Home</Text>
                                        <Text style={styles.rowActionText}>{homeAddress?.address || 'Add Home Address'}</Text>
                                    </View>
                                </TouchableOpacity>
                                {homeAddress ? (
                                    <TouchableOpacity style={{ padding: 8, marginRight: -8 }} onPress={() => handleDelete(homeAddress.id, 'Home')}>
                                        <Feather name="trash-2" size={20} color="#BA1A1A" />
                                    </TouchableOpacity>
                                ) : (
                                    <Feather name="chevron-right" size={20} color="#CCC3D8" />
                                )}
                            </View>
                            <View style={styles.divider} />
                            
                            <View style={styles.rowItem}>
                                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 16 }} activeOpacity={0.7} onPress={() => openModal('work')}>
                                    <View style={[styles.iconWrap, { backgroundColor: '#EFF6FF' }]}>
                                        <Feather name="briefcase" size={18} color="#3B82F6" />
                                    </View>
                                    <View style={styles.rowTextWrap}>
                                        <Text style={styles.rowTitle}>Work</Text>
                                        <Text style={styles.rowActionText}>{workAddress?.address || 'Add Work Address'}</Text>
                                    </View>
                                </TouchableOpacity>
                                {workAddress ? (
                                    <TouchableOpacity style={{ padding: 8, marginRight: -8 }} onPress={() => handleDelete(workAddress.id, 'Work')}>
                                        <Feather name="trash-2" size={20} color="#BA1A1A" />
                                    </TouchableOpacity>
                                ) : (
                                    <Feather name="chevron-right" size={20} color="#CCC3D8" />
                                )}
                            </View>
                            <View style={styles.divider} />
                            <TouchableOpacity style={styles.rowItem} activeOpacity={0.7} onPress={() => CustomAlert.alert('Favourites', 'Scroll down to see your saved locations.')}>
                                <View style={[styles.iconWrap, { backgroundColor: '#F5F0FF' }]}>
                                    <Feather name="heart" size={18} color="#A78BFA" />
                                </View>
                                <View style={styles.rowTextWrap}>
                                    <Text style={styles.rowTitle}>Favourites</Text>
                                    <Text style={styles.rowSubtext}>{customPlaces.length} places saved</Text>
                                </View>
                                <Feather name="chevron-right" size={20} color="#CCC3D8" />
                            </TouchableOpacity>
                        </View>

                        {/* Add New Place CTA */}
                        <TouchableOpacity style={styles.addPlaceBtn} activeOpacity={0.7} onPress={() => openModal('custom')}>
                            <Feather name="plus" size={18} color="#BEA3D8" />
                            <Text style={styles.addText}>Add New Place</Text>
                        </TouchableOpacity>

                        {/* Empty State (Only if NO locations exist anywhere) */}
                        {!homeAddress && !workAddress && customPlaces.length === 0 && (
                            <View style={styles.emptyStateContainer}>
                                <View style={styles.emptyStateIconBg}>
                                    <Feather name="map" size={28} color="#BEA3D8" />
                                </View>
                                <Text style={styles.emptyStateTitle}>No saved locations yet</Text>
                                <Text style={styles.emptyStateSub}>Save your favorite spots for quick booking.</Text>
                            </View>
                        )}

                        {/* Custom Saved Locations List */}
                        {customPlaces.length > 0 && (
                            <>
                                <Text style={styles.sectionHeader}>Other Saved Places</Text>
                                {customPlaces.map(place => (
                                    <View key={place.id} style={styles.customPlaceCard}>
                                        <View style={styles.customPlaceLeft}>
                                            <View style={styles.pinIconWrap}>
                                                <Svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                                                    <Path d="M8 10C8.55 10 9.02083 9.80417 9.4125 9.4125C9.80417 9.02083 10 8.55 10 8C10 7.45 9.80417 6.97917 9.4125 6.5875C9.02083 6.19583 8.55 6 8 6C7.45 6 6.97917 6.19583 6.5875 6.5875C6.19583 6.97917 6 7.45 6 8C6 8.55 6.19583 9.02083 6.5875 9.4125C6.97917 9.80417 7.45 10 8 10ZM8 20C5.31667 17.7167 3.3125 15.5958 1.9875 13.6375C0.6625 11.6792 0 9.86667 0 8.2C0 5.7 0.804167 3.70833 2.4125 2.225C4.02083 0.741667 5.88333 0 8 0C10.1167 0 11.9792 0.741667 13.5875 2.225C15.1958 3.70833 16 5.7 16 8.2C16 9.86667 15.3375 11.6792 14.0125 13.6375C12.6875 15.5958 10.6833 17.7167 8 20Z" fill="#BEA3D8" />
                                                </Svg>
                                            </View>
                                            <View style={styles.customPlaceInfo}>
                                                <Text style={styles.customPlaceName}>{place.label || place.name}</Text>
                                                <Text style={styles.customPlaceAddress}>{place.address}</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.actionIconsRow]}>
                                            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(place.id, place.label || place.name)}>
                                                <Svg width="10" height="11" viewBox="0 0 10 11" fill="none">
                                                    <Path d="M1.75 10.5C1.42917 10.5 1.15451 10.3858 0.926042 10.1573C0.697569 9.92882 0.583333 9.65417 0.583333 9.33333V1.75H0V0.583333H2.91667V0H6.41667V0.583333H9.33333V1.75H8.75V9.33333C8.75 9.65417 8.63576 9.92882 8.40729 10.1573C8.17882 10.3858 7.90417 10.5 7.58333 10.5H1.75ZM7.58333 1.75H1.75V9.33333H7.58333V1.75ZM2.91667 8.16667H4.08333V2.91667H2.91667V8.16667ZM5.25 8.16667H6.41667V2.91667H5.25V8.16667ZM1.75 1.75V9.33333V1.75Z" fill="#BA1A1A" />
                                                </Svg>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </>
                        )}

                        {/* Real Map Showing Saved Locations */}
                        <View style={[styles.mapThumbnail, { overflow: 'hidden' }]}>
                            <MapplsMapWebView
                                style={{ flex: 1 }}
                                markers={mapMarkers}
                                fitBounds={false}
                                center={{ lat: 12.9716, lng: 77.5946 }}
                                zoom={10}
                                scrollEnabled={true}
                                zoomEnabled={true}
                            />
                        </View>

                    </ScrollView>
                )}
            </View>

            <Modal visible={showModal} transparent animationType="slide">
                <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                    <TouchableOpacity 
                        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} 
                        onPress={() => setShowModal(false)} 
                        activeOpacity={1} 
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
                    >
                        <View style={[styles.modalSheet, { paddingBottom: modalSheetPaddingBottom }]}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>
                            {modalType === 'home' ? 'Set Home Address' : modalType === 'work' ? 'Set Work Address' : 'Add New Place'}
                        </Text>
                        {modalType === 'custom' && (
                            <TextInput
                                style={styles.modalInput}
                                value={inputName}
                                onChangeText={setInputName}
                                placeholder="Place name (e.g. Gym, Parents' Home)"
                                placeholderTextColor="#AAA"
                            />
                        )}
                        <TextInput
                            style={styles.modalInput}
                            value={inputAddress}
                            onChangeText={handleSearchInput}
                            placeholder="Enter full address or search..."
                            placeholderTextColor="#AAA"
                        />

                        {/* Suggestions Dropdown */}
                        {suggestions.length > 0 && (
                            <View style={styles.suggestionsContainer}>
                                <FlatList
                                    data={suggestions}
                                    keyExtractor={(item, index) => item.place_id || index.toString()}
                                    keyboardShouldPersistTaps="handled"
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.suggestionItem}
                                            onPress={() => handleSelectSuggestion(item)}
                                        >
                                            <Feather name="map-pin" size={16} color="#A78BFA" />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.suggestionMain} numberOfLines={1}>
                                                    {item.structured_formatting?.main_text}
                                                </Text>
                                                {!!item.structured_formatting?.secondary_text && (
                                                    <Text style={styles.suggestionSub} numberOfLines={1}>
                                                        {item.structured_formatting?.secondary_text}
                                                    </Text>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        )}
                        {searching && <ActivityIndicator size="small" color="#BEA3D8" style={{ alignSelf: 'flex-start', marginLeft: 8 }} />}
                        {resolving && <Text style={{ color: '#A78BFA', fontSize: 13, marginLeft: 8, marginBottom: 8 }}>Locating address...</Text>}

                        <TouchableOpacity style={[styles.modalBtn, (saving || resolving) && { opacity: 0.6 }]} onPress={handleSave} disabled={saving || resolving}>
                            {saving
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.modalBtnText}>Save Place</Text>
                            }
                        </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
            {alertModal && <SakhiModal config={alertModal} onClose={() => setAlertModal(null)} />}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
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
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    headerDotsContainer: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
    headerDots: { fontSize: 20, color: '#BEA3D8', fontWeight: '700' },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 40,
        gap: 24,
    },
    primaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: '#BEA3D8', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
    },
    rowItem: {
        flexDirection: 'row', alignItems: 'center',
        padding: 20, gap: 16,
    },
    iconWrap: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center',
    },
    rowTextWrap: { flex: 1 },
    rowTitle: { fontSize: 16, fontWeight: '700', color: '#1E1B2E', lineHeight: 24 },
    rowActionText: { fontSize: 14, fontWeight: '500', color: '#BEA3D8', marginTop: -2 },
    rowSubtext: { fontSize: 14, color: '#1C1A25', marginTop: -2 },
    divider: { height: 1, backgroundColor: '#F0ECFA', marginHorizontal: 20 },

    /* Add Action Button */
    addPlaceBtn: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        width: '100%', height: 60,
        borderWidth: 2, borderColor: '#A78BFA', borderStyle: 'dashed',
        borderRadius: 16, gap: 8,
    },
    addTextIcon: { fontSize: 18, fontWeight: '700', color: '#BEA3D8' },
    addText: { fontSize: 16, fontWeight: '700', color: '#BEA3D8' },
    sectionHeader: {
        fontSize: 20, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.5,
        marginTop: 8, marginBottom: -8,
    },
    customPlaceCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#BEA3D8', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
    },
    customPlaceLeft: {
        flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1,
    },
    pinIconWrap: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F0FF',
        justifyContent: 'center', alignItems: 'center',
    },
    customPlaceInfo: { flex: 1, paddingRight: 8 },
    customPlaceName: { fontSize: 16, fontWeight: '700', color: '#1E1B2E', lineHeight: 24 },
    customPlaceAddress: { fontSize: 12, color: '#1C1A25', lineHeight: 20, paddingTop: 2 },

    /* Action Icons row */
    actionIconsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    actionBtn: { padding: 4 },
    
    emptyStateContainer: {
        alignItems: 'center',
        paddingVertical: 32,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(204, 195, 216, 0.3)',
        borderStyle: 'dashed',
    },
    emptyStateIconBg: {
        width: 56, height: 56, borderRadius: 28, backgroundColor: '#F5F0FF',
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    emptyStateTitle: { fontSize: 16, fontWeight: '700', color: '#1E1B2E', marginBottom: 4 },
    emptyStateSub: { fontSize: 13, color: '#6B7280', textAlign: 'center' },

    mapThumbnail: {
        width: '100%', height: 192,
        backgroundColor: '#C5E2F6',
        borderRadius: 24,
        marginTop: 8,
        overflow: 'hidden',
        shadowColor: '#BEA3D8', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 5,
    },
    mapOverlayBg: {
        flex: 1,
        backgroundColor: 'rgba(190, 163, 216, 0.1)',
        position: 'relative'
    },
    mapGraphicPin: {
        position: 'absolute',
        fontSize: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6,
    },
    chevron: { fontSize: 20, color: '#CCC3D8' },
    modalSheet: {
        backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 28,
    },
    modalHandle: { width: 40, height: 4, backgroundColor: '#E2D9F3', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 17, fontWeight: '700', color: '#1E1B2E', marginBottom: 16, textAlign: 'center' },
    modalInput: {
        backgroundColor: '#F5F0FF', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14,
        fontSize: 15, fontWeight: '500', color: '#1E1B2E',
        marginBottom: 12,
    },
    modalBtn: {
        backgroundColor: '#BEA3D8', borderRadius: 12, height: 52,
        justifyContent: 'center', alignItems: 'center', marginTop: 12,
    },
    modalBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    suggestionsContainer: {
        maxHeight: 200,
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F0ECFA',
        marginBottom: 12,
        overflow: 'hidden',
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F0FF',
        gap: 12,
    },
    suggestionMain: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E1B2E',
    },
    suggestionSub: {
        fontSize: 12,
        color: '#1C1A25',
        marginTop: 2,
    },
});
