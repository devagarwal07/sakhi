import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    Platform, Modal, TextInput, KeyboardAvoidingView
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
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
                    <TouchableOpacity style={styles.headerDotsContainer} activeOpacity={0.7} onPress={() => setAlertModal({
                        icon: 'ℹ️',
                        title: 'Options',
                        message: 'Feature to edit or sync saved places coming soon.',
                        buttons: [{ text: 'OK', onPress: () => setAlertModal(null) }]
                    })}>
                        <Text style={styles.headerDots}>⋮</Text>
                    </TouchableOpacity>
                </View>

                {/* Main Content Area */}
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Primary Address Card Setup */}
                    <View style={styles.primaryCard}>
                        <TouchableOpacity style={styles.rowItem} activeOpacity={0.7} onPress={() => openModal('home')}>
                            <View style={[styles.iconWrap, { backgroundColor: '#10B981' }]}>
                                <Svg width="16" height="18" viewBox="0 0 16 18" fill="none">
                                    <Path d="M0 18V6L8 0L16 6V18H10V11H6V18H0Z" fill="white"/>
                                </Svg>
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
                                <Svg width="20" height="19" viewBox="0 0 20 19" fill="none">
                                    <Path d="M2 19C1.45 19 0.979167 18.8042 0.5875 18.4125C0.195833 18.0208 0 17.55 0 17V6C0 5.45 0.195833 4.97917 0.5875 4.5875C0.979167 4.19583 1.45 4 2 4H6V2C6 1.45 6.19583 0.979167 6.5875 0.5875C6.97917 0.195833 7.45 0 8 0H12C12.55 0 13.0208 0.195833 13.4125 0.5875C13.8042 0.979167 14 1.45 14 2V4H18C18.55 4 19.0208 4.19583 19.4125 4.5875C19.8042 4.97917 20 5.45 20 6V17C20 17.55 19.8042 18.0208 19.4125 18.4125C19.0208 18.8042 18.55 19 18 19H2ZM8 4H12V2H8V4Z" fill="white"/>
                                </Svg>
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
                                <Svg width="20" height="19" viewBox="0 0 20 19" fill="none">
                                    <Path d="M10 18.35L8.55 17.05C6.86667 15.5333 5.475 14.225 4.375 13.125C3.275 12.025 2.4 11.0375 1.75 10.1625C1.1 9.2875 0.645833 8.48333 0.3875 7.75C0.129167 7.01667 0 6.26667 0 5.5C0 3.93333 0.525 2.625 1.575 1.575C2.625 0.525 3.93333 0 5.5 0C6.36667 0 7.19167 0.183333 7.975 0.55C8.75833 0.916667 9.43333 1.43333 10 2.1C10.5667 1.43333 11.2417 0.916667 12.025 0.55C12.8083 0.183333 13.6333 0 14.5 0C16.0667 0 17.375 0.525 18.425 1.575C19.475 2.625 20 3.93333 20 5.5C20 6.26667 19.8708 7.01667 19.6125 7.75C19.3542 8.48333 18.9 9.2875 18.25 10.1625C17.6 11.0375 16.725 12.025 15.625 13.125C14.525 14.225 13.1333 15.5333 11.45 17.05L10 18.35Z" fill="white"/>
                                </Svg>
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
                                      <Svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                                          <Path d="M8 10C8.55 10 9.02083 9.80417 9.4125 9.4125C9.80417 9.02083 10 8.55 10 8C10 7.45 9.80417 6.97917 9.4125 6.5875C9.02083 6.19583 8.55 6 8 6C7.45 6 6.97917 6.19583 6.5875 6.5875C6.19583 6.97917 6 7.45 6 8C6 8.55 6.19583 9.02083 6.5875 9.4125C6.97917 9.80417 7.45 10 8 10ZM8 20C5.31667 17.7167 3.3125 15.5958 1.9875 13.6375C0.6625 11.6792 0 9.86667 0 8.2C0 5.7 0.804167 3.70833 2.4125 2.225C4.02083 0.741667 5.88333 0 8 0C10.1167 0 11.9792 0.741667 13.5875 2.225C15.1958 3.70833 16 5.7 16 8.2C16 9.86667 15.3375 11.6792 14.0125 13.6375C12.6875 15.5958 10.6833 17.7167 8 20Z" fill="#BEA3D8"/>
                                      </Svg>
                                </View>
                                <View style={styles.customPlaceInfo}>
                                    <Text style={styles.customPlaceName}>{place.name}</Text>
                                    <Text style={styles.customPlaceAddress}>{place.address}</Text>
                                </View>
                            </View>
                            <View style={[styles.actionIconsRow]}>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => setAlertModal({
                                    icon: '✏️',
                                    title: 'Edit Place',
                                    message: 'Place editing coming soon.',
                                    buttons: [{ text: 'OK', onPress: () => setAlertModal(null) }]
                                })}>
                                    <Svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                                        <Path d="M1.16667 9.33333H1.99792L7.7 3.63125L6.86875 2.8L1.16667 8.50208V9.33333ZM0 10.5V8.02083L7.7 0.335417C7.81667 0.228472 7.94549 0.145833 8.08646 0.0875C8.22743 0.0291667 8.37569 0 8.53125 0C8.68681 0 8.8375 0.0291667 8.98333 0.0875C9.12917 0.145833 9.25556 0.233333 9.3625 0.35L10.1646 1.16667C10.2812 1.27361 10.3663 1.4 10.4198 1.54583C10.4733 1.69167 10.5 1.8375 10.5 1.98333C10.5 2.13889 10.4733 2.28715 10.4198 2.42812C10.3663 2.5691 10.2812 2.69792 10.1646 2.81458L2.47917 10.5H0ZM9.33333 1.98333L8.51667 1.16667L9.33333 1.98333ZM7.27708 3.22292L6.86875 2.8L7.7 3.63125L7.27708 3.22292Z" fill="#BEA3D8"/>
                                    </Svg>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(place.id, place.name)}>
                                      <Svg width="10" height="11" viewBox="0 0 10 11" fill="none">
                                          <Path d="M1.75 10.5C1.42917 10.5 1.15451 10.3858 0.926042 10.1573C0.697569 9.92882 0.583333 9.65417 0.583333 9.33333V1.75H0V0.583333H2.91667V0H6.41667V0.583333H9.33333V1.75H8.75V9.33333C8.75 9.65417 8.63576 9.92882 8.40729 10.1573C8.17882 10.3858 7.90417 10.5 7.58333 10.5H1.75ZM7.58333 1.75H1.75V9.33333H7.58333V1.75ZM2.91667 8.16667H4.08333V2.91667H2.91667V8.16667ZM5.25 8.16667H6.41667V2.91667H5.25V8.16667ZM1.75 1.75V9.33333V1.75Z" fill="#BA1A1A"/>
                                      </Svg>
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
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
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
                </KeyboardAvoidingView>
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
    
    /* Header AppBar */
    headerDotsContainer: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
    headerDots: { fontSize: 24, color: '#BEA3D8', fontWeight: '800', lineHeight: 24 },
    
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

