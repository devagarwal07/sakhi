import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Switch, Platform, Modal, TextInput, ActivityIndicator,
    Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import SakhiModal from '../src/components/SakhiModal';
import { Feather } from '@expo/vector-icons';
import { getEmergencyContacts, addEmergencyContact, updateEmergencyContact, deleteEmergencyContact } from '../src/api/endpoints';

const RELATION_OPTIONS = ['Mother', 'Father', 'Sister', 'Brother', 'Friend', 'Spouse', 'Other'];

export default function EmergencyContactsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [isAddModalVisible, setAddModalVisible] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newRelation, setNewRelation] = useState('Friend');
    const [editingContactId, setEditingContactId] = useState(null);
    const [alertModal, setAlertModal] = useState(null);

    const AVATAR_COLORS = ['#BEA3D8', '#AB8FFE', '#68C4AF', '#F9A8D4', '#FCD34D'];

    const addSheetPaddingBottom = Math.max(insets.bottom, 24) + 32;
    const doneFooterPaddingBottom = Math.max(insets.bottom, 24);
    const scrollPaddingBottom = 40 + 60 + doneFooterPaddingBottom + 16;

    const [keyboardOffset, setKeyboardOffset] = useState(0);
    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const show = Keyboard.addListener(showEvent, e => setKeyboardOffset(e.endCoordinates.height));
        const hide = Keyboard.addListener(hideEvent, () => setKeyboardOffset(0));
        return () => { show.remove(); hide.remove(); };
    }, []);

    // ── Load contacts from backend ─────────────────────────────────────────
    useEffect(() => {
        loadContacts();
    }, []);

    const loadContacts = async () => {
        setLoading(true);
        try {
            const { data } = await getEmergencyContacts();
            const raw = data.contacts || data || [];
            setContacts(raw.map((c, i) => ({
                ...c,
                autoShare: c.auto_share ?? false,
                color: AVATAR_COLORS[i % AVATAR_COLORS.length],
                initial: (c.name || 'U')[0].toUpperCase(),
            })));
        } catch (err) {
            setAlertModal({
                icon: '⚠️',
                title: 'Error',
                message: 'Could not load emergency contacts.',
                buttons: [{ text: 'OK', onPress: () => setAlertModal(null) }]
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleAutoShare = (id) => {
        setContacts(prev => prev.map(c => c.id === id ? { ...c, autoShare: !c.autoShare } : c));
    };

    const handleDelete = (id, name) => {
        setAlertModal({
            icon: '🗑️',
            title: 'Remove Contact',
            message: `Remove ${name} from emergency contacts?`,
            buttons: [
                { text: 'Cancel', style: 'cancel', onPress: () => setAlertModal(null) },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        setAlertModal(null);
                        try {
                            await deleteEmergencyContact(id);
                            setContacts(prev => prev.filter(c => c.id !== id));
                        } catch {
                            setTimeout(() => setAlertModal({
                                icon: '⚠️', title: 'Error', message: 'Could not remove contact.',
                                buttons: [{ text: 'OK', onPress: () => setAlertModal(null) }]
                            }), 300);
                        }
                    }
                },
            ]
        });
    };

    const handleSaveContact = async () => {
        if (!newName.trim()) {
            setAlertModal({
                icon: '⚠️', title: 'Missing Info', message: 'Please enter a name.',
                buttons: [{ text: 'OK', onPress: () => setAlertModal(null) }]
            });
            return;
        }
        const cleaned = newPhone.replace(/\D/g, '');
        if (cleaned.length < 10) {
            setAlertModal({
                icon: '⚠️', title: 'Invalid Number', message: 'Please enter a 10-digit phone number.',
                buttons: [{ text: 'OK', onPress: () => setAlertModal(null) }]
            });
            return;
        }
        setSaving(true);
        try {
            if (editingContactId) {
                const { data } = await updateEmergencyContact(editingContactId, {
                    name: newName.trim(),
                    phone: `+91${cleaned}`,
                    relation: newRelation.toLowerCase(),
                });
                const contact = data.contact || data;
                setContacts(prev => prev.map(c => c.id === editingContactId ? {
                    ...c,
                    ...contact,
                    autoShare: c.autoShare,
                    initial: (contact.name || 'U')[0].toUpperCase(),
                } : c));
            } else {
                const { data } = await addEmergencyContact({
                    name: newName.trim(),
                    phone: `+91${cleaned}`,
                    relation: newRelation.toLowerCase(),
                });
                const contact = data.contact || data;
                const i = contacts.length;
                setContacts(prev => [...prev, {
                    ...contact,
                    autoShare: contact.auto_share ?? false,
                    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
                    initial: (contact.name || 'U')[0].toUpperCase(),
                }]);
            }
            setNewName(''); setNewPhone(''); setNewRelation('Friend'); setEditingContactId(null);
            setAddModalVisible(false);
        } catch (err) {
            setAlertModal({
                icon: '⚠️', title: 'Error',
                message: err?.response?.data?.message || 'Could not save contact.',
                buttons: [{ text: 'OK', onPress: () => setAlertModal(null) }]
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <View style={styles.container}>

                {/* Header App Bar */}
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} activeOpacity={0.7}>
                            <Feather name="arrow-left" size={24} color="#BEA3D8" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Emergency Contacts</Text>
                    </View>
                    <View style={styles.iconBtn} />
                </View>

                {/* Main Scroll Content */}
                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color="#BEA3D8" />
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
                        showsVerticalScrollIndicator={false}
                    >

                        {/* Top subtext */}
                        <Text style={styles.pageSubText}>Contacts notified during SOS alerts</Text>

                        {/* Info Banner */}
                        <View style={styles.infoBanner}>
                            <View style={styles.infoIconWrapper}>
                                <Feather name="info" size={18} color="#BEA3D8" />
                            </View>
                            <Text style={styles.infoText}>
                                You can add up to 3 trusted contacts. They will receive your live location and trip details during an SOS.
                            </Text>
                        </View>

                        {/* List of Contacts */}
                        <View style={styles.contactsList}>
                            {contacts.map(contact => (
                                <View key={contact.id} style={styles.contactCard}>
                                    <View style={styles.cardTop}>
                                        <View style={[styles.avatar, { backgroundColor: contact.color }]}>
                                            <Text style={styles.avatarText}>{contact.initial}</Text>
                                        </View>
                                        <View style={styles.contactInfo}>
                                            <View style={styles.nameRow}>
                                                <Text style={styles.contactName}>{contact.name}</Text>
                                                <View style={styles.relationBadge}>
                                                    <Text style={styles.relationBadgeText}>{(contact.relation || 'contact').toUpperCase()}</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.contactPhone}>{contact.phone}</Text>
                                        </View>
                                        <View style={styles.actionBtnsRow}>
                                            <TouchableOpacity style={styles.editBtn} onPress={() => {
                                                setEditingContactId(contact.id);
                                                setNewName(contact.name);
                                                setNewPhone(contact.phone.replace('+91', ''));
                                                setNewRelation((contact.relation || 'Friend').charAt(0).toUpperCase() + (contact.relation || 'friend').slice(1));
                                                setAddModalVisible(true);
                                            }}>
                                                <Feather name="edit-2" size={16} color="#BEA3D8" />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(contact.id, contact.name)}>
                                                <Feather name="trash-2" size={16} color="#BA1A1A" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <View style={styles.cardBottom}>
                                        <View style={styles.autoShareInfo}>
                                            <Feather name="shield" size={20} color="#BEA3D8" />
                                            <Text style={styles.shareText}>Auto-share trip on start</Text>
                                        </View>
                                        <Switch
                                            trackColor={{ false: '#EBE6F5', true: '#BEA3D8' }}
                                            thumbColor="#FFFFFF"
                                            ios_backgroundColor="#EBE6F5"
                                            onValueChange={() => toggleAutoShare(contact.id)}
                                            value={contact.autoShare}
                                            style={styles.switchControl}
                                        />
                                    </View>
                                </View>
                            ))}

                        {/* Add Contact Button - show only if < 3 */}
                        {contacts.length < 3 && (
                            <TouchableOpacity style={styles.addContactBtn} activeOpacity={0.7} onPress={() => {
                                setEditingContactId(null);
                                setNewName(''); setNewPhone(''); setNewRelation('Friend');
                                setAddModalVisible(true);
                            }}>
                                <View style={styles.addIconBg}>
                                    <Feather name="user-plus" size={20} color="#BEA3D8" />
                                </View>
                                <View style={styles.addContactContent}>
                                    <Text style={styles.addContactText}>Add Emergency Contact</Text>
                                    <Text style={styles.slotText}>{3 - contacts.length} slot{3 - contacts.length !== 1 ? 's' : ''} remaining</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>

                    </ScrollView>
                )}

            {/* Fixed Bottom Action */}
            <View style={[styles.bottomFixedWrap, { paddingBottom: doneFooterPaddingBottom }]}>
                <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
                    <Text style={styles.saveBtnText}>Done</Text>
                </TouchableOpacity>
            </View>

            {/* Add New Contact Bottom Sheet Overlay */}
            <Modal
                visible={isAddModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setAddModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    {/* Backdrop tap to close */}
                    <TouchableOpacity
                        style={{ flex: 1, width: '100%' }}
                        activeOpacity={1}
                        onPress={() => { Keyboard.dismiss(); setAddModalVisible(false); setEditingContactId(null); setNewName(''); setNewPhone(''); setNewRelation('Friend'); }}
                    />
                    {/* Bottom Sheet */}
                    <View style={[styles.bottomSheet, { paddingBottom: addSheetPaddingBottom, marginBottom: keyboardOffset }]}>
                        {/* Close Button */}
                        <View style={styles.sheetTopRow}>
                            <TouchableOpacity
                                style={styles.sheetCloseBtn}
                                onPress={() => { Keyboard.dismiss(); setAddModalVisible(false); setEditingContactId(null); setNewName(''); setNewPhone(''); setNewRelation('Friend'); }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Feather name="x" size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                            <View style={styles.sheetHeader}>
                                <Text style={styles.sheetTitle}>{editingContactId ? 'Edit Contact' : 'Add New Contact'}</Text>
                                <Text style={styles.sheetSub}>Select someone you trust to help in emergencies.</Text>
                            </View>
                            <View style={styles.formContent}>
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>FULL NAME</Text>
                                    <View style={styles.inputWrap}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter name"
                                            placeholderTextColor="#6B7280"
                                            value={newName}
                                            onChangeText={setNewName}
                                            returnKeyType="next"
                                        />
                                        <Feather name="user" size={16} color="#CCC3D8" />
                                    </View>
                                </View>
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
                                    <View style={styles.inputWrap}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="10-digit mobile number"
                                            placeholderTextColor="#6B7280"
                                            keyboardType="phone-pad"
                                            maxLength={10}
                                            value={newPhone}
                                            onChangeText={setNewPhone}
                                            returnKeyType="done"
                                        />
                                        <Feather name="phone" size={16} color="#CCC3D8" />
                                    </View>
                                </View>
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>RELATION</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            {RELATION_OPTIONS.map(rel => (
                                                <TouchableOpacity
                                                    key={rel}
                                                    style={[styles.relChip, newRelation === rel && styles.relChipActive]}
                                                    onPress={() => setNewRelation(rel)}
                                                >
                                                    <Text style={[styles.relChipText, newRelation === rel && styles.relChipTextActive]}>{rel}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </ScrollView>
                                </View>
                                <TouchableOpacity
                                    style={[styles.sheetActionBtn, saving && { opacity: 0.6 }]}
                                    activeOpacity={0.8}
                                    onPress={handleSaveContact}
                                    disabled={saving}
                                >
                                    {saving
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={styles.sheetActionText}>{editingContactId ? 'Update Contact' : 'Save Contact'}</Text>
                                    }
                                </TouchableOpacity>
                            </View>
                    </View>
                </View>
            </Modal>
            {alertModal && <SakhiModal config={alertModal} onClose={() => setAlertModal(null)} />}
        </View>
        </SafeAreaView >
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
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 0,
        gap: 24,
    },
    pageSubText: {
        fontSize: 14, fontWeight: '500', color: '#6B7280', letterSpacing: 0.35,
        marginBottom: -8,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 20,
        gap: 16,
        backgroundColor: '#EDE9FE',
        borderRadius: 12,
        borderWidth: 1, borderColor: 'rgba(124, 58, 237, 0.05)',
    },
    infoIconWrapper: {
        width: 36, height: 36, borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        justifyContent: 'center', alignItems: 'center',
    },
    infoIcon: { fontSize: 18, color: '#BEA3D8', fontWeight: '700' },
    infoText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#685F96', lineHeight: 22 },
    contactsList: { gap: 24 },
    contactCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 2,
    },
    cardTop: {
        flexDirection: 'row', alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 44, height: 44, borderRadius: 22,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12,
    },
    avatarText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
    contactInfo: { flex: 1, gap: 4 },
    nameRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap',
    },
    contactName: { fontSize: 16, fontWeight: '700', color: '#685F96', lineHeight: 20 },
    relationBadge: {
        backgroundColor: '#E8DDFF',
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 9999,
    },
    relationBadgeText: { fontSize: 9, fontWeight: '700', color: '#BEA3D8', letterSpacing: 0.5 },
    contactPhone: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
    actionBtnsRow: { flexDirection: 'row', gap: 6 },
    editBtn: {
        width: 36, height: 36, borderRadius: 10, backgroundColor: '#F6F1FF',
        justifyContent: 'center', alignItems: 'center',
    },
    editIcon: { fontSize: 16, color: '#BEA3D8' },
    deleteBtn: {
        width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255, 218, 214, 0.4)',
        justifyContent: 'center', alignItems: 'center',
    },
    deleteIcon: { fontSize: 16, color: '#BA1A1A' },
    cardBottom: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F5F0FF',
    },
    autoShareInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    shareIcon: { fontSize: 20, color: '#BEA3D8' },
    shareText: { fontSize: 14, fontWeight: '600', color: '#685F96' },
    switchControl: { transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] },
    addContactBtn: {
        width: '100%', height: 140,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderStyle: 'dashed', borderColor: '#A78BFA',
        borderRadius: 16, gap: 16, backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    addIconBg: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: '#EDE9FE',
        justifyContent: 'center', alignItems: 'center',
    },
    addIcon: { fontSize: 20, color: '#BEA3D8' },
    addContactContent: { alignItems: 'center', gap: 4 },
    addContactText: { fontSize: 16, fontWeight: '700', color: '#BEA3D8', letterSpacing: -0.4 },
    slotText: { fontSize: 12, color: '#6B7280' },
    bottomFixedWrap: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 24,
        paddingTop: 40,
        alignItems: 'center',
        backgroundColor: '#F5F0FF',
        shadowColor: '#F5F0FF', shadowOffset: { width: 0, height: -20 }, shadowOpacity: 1, shadowRadius: 20, elevation: 10,
    },
    saveBtn: {
        width: '100%', height: 60, backgroundColor: '#BEA3D8', borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 32, elevation: 6,
    },
    saveBtnText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(28, 26, 37, 0.4)',
    },
    modalBackdropClose: {
        flex: 1, width: '100%',
    },
    bottomSheet: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 32,
        alignItems: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: -16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 10,
    },
    sheetTopRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingTop: 4,
        paddingBottom: 20,
        position: 'relative',
    },
    sheetCloseBtn: {
        position: 'absolute',
        right: 0,
        top: 0,
        width: 36, height: 36,
        borderRadius: 18,
        backgroundColor: '#F5F0FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetHeader: {
        width: '100%', gap: 4, marginBottom: 32,
    },
    sheetTitle: {
        fontSize: 24, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.6,
    },
    sheetSub: {
        fontSize: 14, color: '#64748B',
    },
    formContent: {
        width: '100%', gap: 24,
    },
    fieldGroup: {
        width: '100%', gap: 8,
    },
    fieldLabel: {
        fontSize: 12, fontWeight: '700', color: '#64748B', letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 4,
    },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F5F0FF',
        borderWidth: 1, borderColor: 'rgba(204, 195, 216, 0.3)',
        borderRadius: 16,
        paddingHorizontal: 20, paddingVertical: 18,
    },
    input: {
        flex: 1,
        fontSize: 16, fontWeight: '500', color: '#1E1B2E',
    },
    inputIcon: {
        fontSize: 16, color: '#CCC3D8', marginLeft: 12,
    },
    relChip: {
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1.5, borderColor: '#E0D9F0',
        backgroundColor: '#F6F1FF',
    },
    relChipActive: { borderColor: '#BEA3D8', backgroundColor: '#EDE9FE' },
    relChipText: { fontSize: 13, fontWeight: '600', color: '#7B7487' },
    relChipTextActive: { color: '#BEA3D8' },
    sheetActionBtn: {
        width: '100%', height: 60,
        backgroundColor: '#AB8FFE',
        borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 32, elevation: 6,
        marginTop: 8,
    },
    sheetActionText: {
        fontSize: 18, fontWeight: '700', color: '#FFFFFF',
    },
});
