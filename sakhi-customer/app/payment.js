import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    SafeAreaView, Platform, Alert, Modal, TextInput
} from 'react-native';
import { useRouter } from 'expo-router';

export default function PaymentMethodsScreen() {
    const router = useRouter();
    const [selectedMethod, setSelectedMethod] = useState('cash');
    const [upiIds, setUpiIds] = useState(['priya@okaxis']);
    const [showAddUpi, setShowAddUpi] = useState(false);
    const [newUpi, setNewUpi] = useState('');

    const handleDeleteUpi = (id) => {
        Alert.alert('Remove UPI', `Remove ${id} from saved IDs?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => setUpiIds(prev => prev.filter(u => u !== id)) },
        ]);
    };

    const handleAddUpi = () => {
        if (!newUpi.includes('@')) { Alert.alert('Invalid UPI', 'Please enter a valid UPI ID (e.g. name@okaxis).'); return; }
        setUpiIds(prev => [...prev, newUpi.trim()]);
        setNewUpi('');
        setShowAddUpi(false);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                
                {/* Header App Bar */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.7}>
                        <Text style={styles.headerIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Payment Methods</Text>
                    <View style={styles.iconBtn} />
                </View>

                {/* Content Canvas */}
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Banner: Info */}
                    <View style={styles.infoBanner}>
                        <Text style={styles.infoIcon}>ⓘ</Text>
                        <Text style={styles.infoText}>Sakhi accepts Cash and UPI payments.</Text>
                    </View>

                    {/* Section: Saved UPI IDs */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>SAVED UPI IDS</Text>
                        
                        {upiIds.map((id) => (
                            <View key={id} style={styles.upiCard}>
                                <TouchableOpacity style={styles.upiLeft} onPress={() => setSelectedMethod(id)} activeOpacity={0.8}>
                                    <View style={[styles.upiIconBg, selectedMethod === id && { backgroundColor: '#EDE9FE' }]}>
                                        <Text style={styles.upiIcon}>📱</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.upiID}>{id}</Text>
                                        {upiIds.indexOf(id) === 0 && (
                                            <View style={styles.primaryBadge}>
                                                <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                                <View style={styles.actionBtns}>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Edit UPI', 'UPI editing coming soon.')}>
                                        <Text style={styles.actionIcon}>✎</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteUpi(id)}>
                                        <Text style={styles.actionIcon}>🗑</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        {/* Add UPI Action */}
                        <TouchableOpacity style={styles.addUpiBtn} activeOpacity={0.7} onPress={() => setShowAddUpi(true)}>
                            <Text style={styles.addUpiIcon}>+</Text>
                            <Text style={styles.addUpiText}>Add UPI ID</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Section: Cash */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>CASH</Text>
                        
                        {/* Cash Card */}
                        <TouchableOpacity style={[styles.cashCard, selectedMethod === 'cash' && styles.cashCardSelected]} onPress={() => setSelectedMethod('cash')} activeOpacity={0.8}>
                            <View style={styles.cashLeft}>
                                <View style={styles.cashIconBg}>
                                    <Text style={styles.cashIcon}>💵</Text>
                                </View>
                                <View style={styles.cashDetails}>
                                    <Text style={styles.cashTitle}>Cash — Pay Driver Directly</Text>
                                    <Text style={styles.cashSubtitle}>Default for on-demand rides</Text>
                                </View>
                            </View>
                            {selectedMethod === 'cash' && (
                                <View style={styles.checkIconWrapper}>
                                    <Text style={styles.checkIcon}>✓</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Transaction History Link */}
                    <TouchableOpacity style={styles.historyBtn} activeOpacity={0.7} onPress={() => router.push('/wallet')}>
                        <View style={styles.historyLeft}>
                            <Text style={styles.historyIcon}>⏱</Text>
                            <Text style={styles.historyText}>Transaction History</Text>
                        </View>
                        <Text style={styles.chevron}>›</Text>
                    </TouchableOpacity>

                </ScrollView>

                {/* Footer: Security */}
                <View style={styles.footerWrap}>
                    <View style={styles.securityFooter}>
                        <Text style={styles.lockIcon}>🔒</Text>
                        <Text style={styles.securityText}>
                            ALL TRANSACTIONS SECURED BY 256-BIT{'\n'}ENCRYPTION
                        </Text>
                    </View>
                </View>

            </View>

            {/* Add UPI Modal */}
            <Modal visible={showAddUpi} transparent animationType="slide">
                <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowAddUpi(false)} activeOpacity={1} />
                <View style={styles.modalSheet}>
                    <View style={styles.modalHandle} />
                    <Text style={styles.modalTitle}>Add UPI ID</Text>
                    <TextInput
                        style={styles.modalInput}
                        value={newUpi}
                        onChangeText={setNewUpi}
                        placeholder="example@okaxis"
                        placeholderTextColor="#AAA"
                        autoCapitalize="none"
                        autoFocus
                    />
                    <TouchableOpacity style={styles.modalBtn} onPress={handleAddUpi}>
                        <Text style={styles.modalBtnText}>Add UPI ID</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F5F0FF' },
    container: { flex: 1 },
    
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        height: 64,
        backgroundColor: 'rgba(246, 241, 255, 0.9)',
        zIndex: 10,
        ...Platform.select({
            ios: { shadowColor: '#EDE9FE', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
            android: { elevation: 2 }
        })
    },
    iconBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'flex-start' },
    headerIcon: { fontSize: 24, color: '#BEA3D8', fontWeight: 'bold' },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#1E1B2E', letterSpacing: -0.45, position: 'absolute', left: 0, right: 0, textAlign: 'center', zIndex: -1 },

    scrollContent: {
        padding: 24,
        paddingBottom: 120, // Leave room for footer
        gap: 32,
    },

    /* Info Banner */
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
        backgroundColor: '#EDE9FE',
        borderRadius: 12,
    },
    infoIcon: { fontSize: 16, color: '#BEA3D8' },
    infoText: { fontSize: 14, color: '#4A4455', lineHeight: 20 },

    /* Global Section Settings */
    section: { gap: 16 },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: '#7B7487', letterSpacing: 1.2, textTransform: 'uppercase' },

    /* Saved UPI IDs */
    upiCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
    },
    upiLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    upiIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F6F1FF', justifyContent: 'center', alignItems: 'center' },
    upiIcon: { fontSize: 18, color: '#BEA3D8' },
    upiDetails: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    upiID: { fontSize: 16, fontWeight: '700', color: '#1E1B2E' },
    primaryBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
    primaryBadgeText: { fontSize: 10, fontWeight: '700', color: '#065F46', letterSpacing: -0.5, textTransform: 'uppercase' },
    
    actionBtns: { flexDirection: 'row', gap: 8 },
    actionBtn: { padding: 4 },
    actionIcon: { fontSize: 16, color: '#7B7487' },

    addUpiBtn: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        padding: 16, gap: 8,
        borderWidth: 2, borderColor: 'rgba(204, 195, 216, 0.4)', borderStyle: 'dashed',
        borderRadius: 12,
    },
    addUpiIcon: { fontSize: 20, color: '#BEA3D8', fontWeight: 'bold' },
    addUpiText: { fontSize: 16, fontWeight: '600', color: '#BEA3D8' },

    cashCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 2, borderColor: 'rgba(190, 163, 216, 0.2)',
        borderRadius: 12,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
    },
    cashCardSelected: { borderColor: '#BEA3D8', backgroundColor: '#F6F1FF' },
    cashLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    cashIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' },
    cashIcon: { fontSize: 20 },
    cashDetails: { gap: 2 },
    cashTitle: { fontSize: 16, fontWeight: '700', color: '#1E1B2E' },
    cashSubtitle: { fontSize: 12, color: '#7B7487' },
    checkIconWrapper: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#BEA3D8', justifyContent: 'center', alignItems: 'center' },
    checkIcon: { fontSize: 12, color: '#BEA3D8', fontWeight: 'bold' },

    /* Transaction History */
    historyBtn: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(246, 241, 255, 0.8)',
        borderRadius: 12,
    },
    historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    historyIcon: { fontSize: 18, color: '#7B7487' },
    historyText: { fontSize: 16, fontWeight: '600', color: '#1E1B2E' },
    chevron: { fontSize: 24, color: '#7B7487', paddingBottom: 2 },

    /* Footer */
    footerWrap: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 121,
        justifyContent: 'center', alignItems: 'center',
        paddingBottom: 24,
    },
    securityFooter: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    lockIcon: { fontSize: 10, color: '#7B7487', marginTop: 1 },
    securityText: {
        fontSize: 11, fontWeight: '500', color: '#7B7487',
        textAlign: 'center', letterSpacing: 0.55, textTransform: 'uppercase', lineHeight: 16,
    },

    /* Add UPI Modal */
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    modalSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    },
    modalHandle: { width: 40, height: 4, backgroundColor: '#E2D9F3', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 17, fontWeight: '700', color: '#1E1B2E', marginBottom: 16, textAlign: 'center' },
    modalInput: {
        backgroundColor: '#F6F1FF', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14,
        fontSize: 16, fontWeight: '500', color: '#1C1A25',
        marginBottom: 16,
    },
    modalBtn: {
        backgroundColor: '#9867D9', borderRadius: 12, height: 52,
        justifyContent: 'center', alignItems: 'center',
    },
    modalBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

