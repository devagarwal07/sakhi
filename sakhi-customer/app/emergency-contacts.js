import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    SafeAreaView, Switch, Platform, Modal, TextInput, Alert
} from 'react-native';
import { useRouter } from 'expo-router';

export default function EmergencyContactsScreen() {
    const router = useRouter();

    const [contacts, setContacts] = useState([
        { id: '1', name: 'Anita Sharma', relation: 'MOTHER', phone: '+91 98765 00001', autoShare: true, color: '#BEA3D8', initial: 'A' },
        { id: '2', name: 'Riya Sharma', relation: 'SISTER', phone: '+91 98765 00002', autoShare: false, color: '#AB8FFE', initial: 'R' },
    ]);

    const [isAddModalVisible, setAddModalVisible] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newRelation, setNewRelation] = useState('Friend');

    const toggleAutoShare = (id) => {
        setContacts(prev => prev.map(c => c.id === id ? { ...c, autoShare: !c.autoShare } : c));
    };

    const handleDelete = (id, name) => {
        Alert.alert('Remove Contact', `Remove ${name} from emergency contacts?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => setContacts(prev => prev.filter(c => c.id !== id)) },
        ]);
    };

    const handleSaveContact = () => {
        if (!newName.trim()) { Alert.alert('Missing Info', 'Please enter a name.'); return; }
        if (newPhone.replace(/\D/g, '').length < 10) { Alert.alert('Invalid Number', 'Please enter a 10-digit phone number.'); return; }
        const colors = ['#BEA3D8', '#AB8FFE', '#68C4AF'];
        setContacts(prev => [...prev, {
            id: String(Date.now()), name: newName.trim(), relation: newRelation.toUpperCase(),
            phone: `+91 ${newPhone.trim()}`, autoShare: false,
            color: colors[prev.length % colors.length], initial: newName[0].toUpperCase(),
        }]);
        setNewName(''); setNewPhone(''); setNewRelation('Friend');
        setAddModalVisible(false);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                
                {/* Header App Bar */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.7}>
                        <Text style={styles.headerIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Emergency Contacts</Text>
                    <View style={styles.iconBtn} />
                </View>

                {/* Main Scroll Content */}
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Top subtext */}
                    <Text style={styles.pageSubText}>Contacts notified during SOS alerts</Text>

                    {/* Info Banner */}
                    <View style={styles.infoBanner}>
                        <View style={styles.infoIconWrapper}>
                            <Text style={styles.infoIcon}>ⓘ</Text>
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
                                                <Text style={styles.relationBadgeText}>{contact.relation}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.contactPhone}>{contact.phone}</Text>
                                    </View>
                                    <View style={styles.actionBtnsRow}>
                                        <TouchableOpacity style={styles.editBtn} onPress={() => Alert.alert('Edit Contact', 'Contact editing coming soon.')}>
                                            <Text style={styles.editIcon}>✎</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(contact.id, contact.name)}>
                                            <Text style={styles.deleteIcon}>🗑</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={styles.cardBottom}>
                                    <View style={styles.autoShareInfo}>
                                        <Text style={styles.shareIcon}>⛑</Text>
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
                            <TouchableOpacity style={styles.addContactBtn} activeOpacity={0.7} onPress={() => setAddModalVisible(true)}>
                                <View style={styles.addIconBg}>
                                    <Text style={styles.addIcon}>👤+</Text>
                                </View>
                                <View style={styles.addContactContent}>
                                    <Text style={styles.addContactText}>Add Emergency Contact</Text>
                                    <Text style={styles.slotText}>{3 - contacts.length} slot{3 - contacts.length !== 1 ? 's' : ''} remaining</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>

                </ScrollView>

                {/* Fixed Bottom Action */}
                <View style={styles.bottomFixedWrap}>
                    <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8} onPress={() => router.back()}>
                        <Text style={styles.saveBtnText}>Save Contacts</Text>
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
                        <TouchableOpacity 
                            style={styles.modalBackdropClose} 
                            activeOpacity={1} 
                            onPress={() => setAddModalVisible(false)} 
                        />
                        <View style={styles.bottomSheet}>
                            <View style={styles.dragHandle} />
                            <View style={styles.sheetHeader}>
                                <Text style={styles.sheetTitle}>Add New Contact</Text>
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
                                        />
                                        <Text style={styles.inputIcon}>👤</Text>
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
                                        />
                                        <Text style={styles.inputIcon}>📞</Text>
                                    </View>
                                </View>
                                <TouchableOpacity 
                                    style={styles.sheetActionBtn} 
                                    activeOpacity={0.8}
                                    onPress={handleSaveContact}
                                >
                                    <Text style={styles.sheetActionText}>Save Contact</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F5F0FF' },
    container: { flex: 1 },
    
    /* Header */
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: 'rgba(245, 240, 255, 0.95)',
        zIndex: 10,
    },
    iconBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'flex-start' },
    headerIcon: { fontSize: 24, color: '#BEA3D8', fontWeight: 'bold' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#685F96', letterSpacing: -0.5, position: 'absolute', left: 0, right: 0, textAlign: 'center', zIndex: -1 },

    /* Scroll Area */
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 140, // Space for fixed bottom btn
        gap: 24,
    },
    pageSubText: {
        fontSize: 14, fontWeight: '500', color: '#6B7280', letterSpacing: 0.35,
        marginBottom: -8,
    },

    /* Info Banner */
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

    /* Contact Card */
    contactCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
    },
    cardTop: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 24,
    },
    avatar: {
        width: 50, height: 50, borderRadius: 25,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 16,
    },
    avatarText: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
    contactInfo: { flex: 1, gap: 8 },
    nameRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    },
    contactName: { fontSize: 18, fontWeight: '700', color: '#685F96', lineHeight: 22 },
    relationBadge: {
        backgroundColor: '#E8DDFF',
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, marginTop: 4,
    },
    relationBadgeText: { fontSize: 10, fontWeight: '700', color: '#BEA3D8', letterSpacing: 0.5 },
    contactPhone: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
    
    actionBtnsRow: { flexDirection: 'row', gap: 8 },
    editBtn: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: '#F6F1FF',
        justifyContent: 'center', alignItems: 'center',
    },
    editIcon: { fontSize: 18, color: '#BEA3D8' },
    deleteBtn: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255, 218, 214, 0.4)',
        justifyContent: 'center', alignItems: 'center',
    },
    deleteIcon: { fontSize: 18, color: '#BA1A1A' },

    cardBottom: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F5F0FF',
    },
    autoShareInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    shareIcon: { fontSize: 20, color: '#BEA3D8' },
    shareText: { fontSize: 14, fontWeight: '600', color: '#685F96' },
    switchControl: { transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] },

    /* Add Contact Empty State Button */
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

    /* Fixed Bottom Action */
    bottomFixedWrap: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: 24, paddingTop: 40, alignItems: 'center', backgroundColor: '#F5F0FF',
        shadowColor: '#F5F0FF', shadowOffset: { width: 0, height: -20 }, shadowOpacity: 1, shadowRadius: 20, elevation: 10,
    },
    saveBtn: {
        width: '100%', height: 60, backgroundColor: '#BEA3D8', borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 32, elevation: 6,
    },
    saveBtnText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },

    /* Bottom Sheet Modal Styles */
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
        paddingBottom: 56,
        alignItems: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: -16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 10,
    },
    dragHandle: {
        width: 48, height: 6,
        backgroundColor: '#E5E0EF',
        borderRadius: 9999,
        marginBottom: 32,
    },
    sheetHeader: {
        width: '100%', gap: 4, marginBottom: 32,
    },
    sheetTitle: {
        fontSize: 24, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.6,
    },
    sheetSub: {
        fontSize: 14, color: '#4A4455',
    },
    formContent: {
        width: '100%', gap: 24,
    },
    fieldGroup: {
        width: '100%', gap: 8,
    },
    fieldLabel: {
        fontSize: 12, fontWeight: '700', color: '#4A4455', letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 4,
    },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FCF8FF',
        borderWidth: 1, borderColor: 'rgba(204, 195, 216, 0.3)',
        borderRadius: 16,
        paddingHorizontal: 20, paddingVertical: 18,
    },
    input: {
        flex: 1,
        fontSize: 16, fontWeight: '500', color: '#1C1A25',
    },
    dropdownPlaceholder: {
        flex: 1, fontSize: 16, fontWeight: '500', color: '#6B7280',
    },
    inputIcon: {
        fontSize: 16, color: '#CCC3D8', marginLeft: 12,
    },
    sheetActionBtn: {
        width: '100%', height: 60,
        backgroundColor: '#AB8FFE', // Simulating Gradient
        borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 32, elevation: 6,
        marginTop: 8,
    },
    sheetActionText: {
        fontSize: 18, fontWeight: '700', color: '#FFFFFF',
    },
});
