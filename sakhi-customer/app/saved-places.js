import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    Platform, Modal, TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import SakhiModal from '../src/components/SakhiModal';

export default function SavedPlacesScreen() {
    const router = useRouter();
    const [homeAddress, setHomeAddress] = useState('');
    const [workAddress, setWorkAddress] = useState('');
    const [customPlaces, setCustomPlaces] = useState([
        { id: '1', name: 'Cafe Coffee Day', address: '24, MG Road, Bangalore, Karnataka 560001' },
        { id: '2', name: 'Central Library', address: 'Cubbon Park, Ambedkar Veedhi, Bengaluru' },
    ]);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('custom'); // 'home' | 'work' | 'custom'
    const [inputAddress, setInputAddress] = useState('');
    const [inputName, setInputName] = useState('');
    const [alertModal, setAlertModal] = useState(null);

    const openModal = (type) => {
        setModalType(type);
        setInputAddress(type === 'home' ? homeAddress : type === 'work' ? workAddress : '');
        setInputName('');
        setShowModal(true);
    };

    const handleSave = () => {
        if (!inputAddress.trim()) { 
            setAlertModal({
                icon: '⚠️',
                title: 'Missing Info',
                message: 'Please enter an address.',
                buttons: [{ text: 'OK', onPress: () => setAlertModal(null) }]
            });
            return; 
        }
        if (modalType === 'home') { setHomeAddress(inputAddress.trim()); }
        else if (modalType === 'work') { setWorkAddress(inputAddress.trim()); }
        else {
            if (!inputName.trim()) { 
                setAlertModal({
                    icon: '⚠️',
                    title: 'Missing Info',
                    message: 'Please enter a place name.',
                    buttons: [{ text: 'OK', onPress: () => setAlertModal(null) }]
                });
                return; 
            }
            setCustomPlaces(prev => [...prev, { id: String(Date.now()), name: inputName.trim(), address: inputAddress.trim() }]);
        }
        setShowModal(false);
    };

    const handleDelete = (id, name) => {
        setAlertModal({
            icon: '🗑️',
            title: 'Remove Place',
            message: `Remove "${name}" from saved places?`,
            buttons: [
                { text: 'Cancel', style: 'cancel', onPress: () => setAlertModal(null) },
                { 
                    text: 'Remove', 
                    style: 'destructive', 
                    onPress: () => {
                        setAlertModal(null);
                        setCustomPlaces(prev => prev.filter(p => p.id !== id));
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
                        <Text style={styles.headerIcon}>←</Text>
                    </TouchableOpacity>
                        <Text style={styles.headerTitle}>Saved Places</Text>
                    </View>
                    <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
                        <Text style={styles.headerDots}>⋮</Text>
                    </TouchableOpacity>
                </View>

                {/* Main Content Area */}
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Primary Address Card Setup */}
                    <View style={styles.primaryCard}>
                        <TouchableOpacity style={styles.rowItem} activeOpacity={0.7} onPress={() => openModal('home')}>
                            <View style={[styles.iconWrap, { backgroundColor: '#10B981' }]}>
                                <Text style={styles.whiteIcon}>🏠</Text>
                            </View>
                            <View style={styles.rowTextWrap}>
                                <Text style={styles.rowTitle}>Home</Text>
                                <Text style={styles.rowActionText}>{homeAddress || 'Add Home Address'}</Text>
                            </View>
                            <Text style={styles.chevron}>›</Text>
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity style={styles.rowItem} activeOpacity={0.7} onPress={() => openModal('work')}>
                            <View style={[styles.iconWrap, { backgroundColor: '#3B82F6' }]}>
                                <Text style={styles.whiteIcon}>💼</Text>
                            </View>
                            <View style={styles.rowTextWrap}>
                                <Text style={styles.rowTitle}>Work</Text>
                                <Text style={styles.rowActionText}>{workAddress || 'Add Work Address'}</Text>
                            </View>
                            <Text style={styles.chevron}>›</Text>
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
                            <View style={[styles.iconWrap, { backgroundColor: '#A78BFA' }]}>
                                <Text style={styles.whiteIcon}>🤍</Text>
                            </View>
                            <View style={styles.rowTextWrap}>
                                <Text style={styles.rowTitle}>Favourites</Text>
                                <Text style={styles.rowSubtext}>{customPlaces.length} places saved</Text>
                            </View>
                            <Text style={styles.chevron}>›</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Add New Place CTA */}
                    <TouchableOpacity style={styles.addPlaceBtn} activeOpacity={0.7} onPress={() => openModal('custom')}>
                        <Text style={styles.addTextIcon}>+</Text>
                        <Text style={styles.addText}>Add New Place</Text>
                    </TouchableOpacity>

                    {/* Custom Saved Locations Heading */}
                    <Text style={styles.sectionHeader}>My Saved Locations</Text>
                    {customPlaces.map(place => (
                        <View key={place.id} style={styles.customPlaceCard}>
                            <View style={styles.customPlaceLeft}>
                                <View style={styles.pinIconWrap}>
                                    <Text style={styles.pinIcon}>📍</Text>
                                </View>
                                <View style={styles.customPlaceInfo}>
                                    <Text style={styles.customPlaceName}>{place.name}</Text>
                                    <Text style={styles.customPlaceAddress}>{place.address}</Text>
                                </View>
                            </View>
                            <View style={styles.actionIconsRow}>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => setAlertModal({
                                    icon: '✏️',
                                    title: 'Edit Place',
                                    message: 'Place editing coming soon.',
                                    buttons: [{ text: 'OK', onPress: () => setAlertModal(null) }]
                                })}>
                                    <Text style={styles.actionEdit}>✏️</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(place.id, place.name)}>
                                    <Text style={styles.actionDelete}>🗑️</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}

                    {/* Map Placeholder */}
                    <View style={styles.mapThumbnail}>
                        <View style={styles.mapOverlayBg}>
                            <Text style={[styles.mapGraphicPin, { top: '30%', right: '30%' }]}>📍</Text>
                            <Text style={[styles.mapGraphicPin, { top: '65%', left: '42%' }]}>📍</Text>
                            <Text style={[styles.mapGraphicPin, { top: '75%', left: '55%' }]}>📍</Text>
                        </View>
                    </View>

                </ScrollView>
            </View>

            {/* Add/Edit Place Modal */}
            <Modal visible={showModal} transparent animationType="slide">
                <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowModal(false)} activeOpacity={1} />
                <View style={styles.modalSheet}>
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
                        onChangeText={setInputAddress}
                        placeholder="Enter full address"
                        placeholderTextColor="#AAA"
                        multiline
                    />
                    <TouchableOpacity style={styles.modalBtn} onPress={handleSave}>
                        <Text style={styles.modalBtnText}>Save Place</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
            {alertModal && <SakhiModal config={alertModal} onClose={() => setAlertModal(null)} />}
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
    
    /* Header AppBar */
    
    
    
    
    headerDots: { fontSize: 24, color: '#BEA3D8', fontWeight: 'bold', paddingTop: -4 },

    /* Scroll Body */
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 16, 
        paddingBottom: 40,
        gap: 24,
    },

    /* Top Default Config Card */
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
    whiteIcon: { fontSize: 18, color: '#FFFFFF' },
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

    /* Custom Places Section */
    sectionHeader: {
        fontSize: 20, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.5,
        marginTop: 8, marginBottom: -8, // Tweak spacing explicitly
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
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#F6F1FF',
        justifyContent: 'center', alignItems: 'center',
    },
    pinIcon: { fontSize: 18, color: '#BEA3D8' },
    customPlaceInfo: { flex: 1, paddingRight: 8 },
    customPlaceName: { fontSize: 16, fontWeight: '700', color: '#1E1B2E', lineHeight: 24 },
    customPlaceAddress: { fontSize: 12, color: '#1C1A25', lineHeight: 20, paddingTop: 2 },
    
    /* Action Icons row */
    actionIconsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    actionBtn: { padding: 4 },
    actionEdit: { fontSize: 16 }, 
    actionDelete: { fontSize: 16 },

    /* Interactive Map Thumbnail Stub */
    mapThumbnail: {
        width: '100%', height: 192,
        backgroundColor: '#C5E2F6', // Safe water/sky base tone
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
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    modalSheet: {
        backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    },
    modalHandle: { width: 40, height: 4, backgroundColor: '#E2D9F3', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 17, fontWeight: '700', color: '#1E1B2E', marginBottom: 16, textAlign: 'center' },
    modalInput: {
        backgroundColor: '#F6F1FF', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14,
        fontSize: 15, fontWeight: '500', color: '#1C1A25',
        marginBottom: 12,
    },
    modalBtn: {
        backgroundColor: '#BEA3D8', borderRadius: 12, height: 52,
        justifyContent: 'center', alignItems: 'center', marginTop: 4,
    },
    modalBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

