import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import SakhiModal from '../src/components/SakhiModal';

export default function TermsScreen() {
    const router = useRouter();
    const [modal, setModal] = useState(null);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                
                {/* Header App Bar */}
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
                        <Text style={styles.headerIcon}>←</Text>
                    </TouchableOpacity>
                        <Text style={styles.headerTitle}>Terms & Privacy</Text>
                    </View>
                    {/* Empty view for flex-between balance */}
                    <View style={styles.iconBtn} /> 
                </View>

                {/* Main Scrollable Content */}
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    <Text style={styles.pageSubtext}>Review our policies and guidelines</Text>

                    {/* Legal Links */}
                    <View style={styles.legalSection}>
                        <TouchableOpacity style={styles.legalLink} activeOpacity={0.7} onPress={() => setModal({
                            icon: '📄',
                            title: 'Terms of Service',
                            message: 'Opening terms of service at sakhi.app/terms',
                            buttons: [{ text: 'OK', onPress: () => setModal(null) }]
                        })}>
                            <Text style={styles.legalLabel}>Terms of Service</Text>
                            <Text style={styles.legalChevron}>›</Text>
                        </TouchableOpacity>
                        
                        <View style={styles.divider} />
                        
                        <TouchableOpacity style={styles.legalLink} activeOpacity={0.7} onPress={() => setModal({
                            icon: '🛡️',
                            title: 'Privacy Policy',
                            message: 'Opening privacy policy at sakhi.app/privacy',
                            buttons: [{ text: 'OK', onPress: () => setModal(null) }]
                        })}>
                            <Text style={styles.legalLabel}>Privacy Policy</Text>
                            <Text style={styles.legalChevron}>›</Text>
                        </TouchableOpacity>
                        
                        <View style={styles.divider} />
                        
                        <TouchableOpacity style={styles.legalLink} activeOpacity={0.7} onPress={() => setModal({
                            icon: '🍪',
                            title: 'Cookie Policy',
                            message: 'Opening cookie policy at sakhi.app/cookies',
                            buttons: [{ text: 'OK', onPress: () => setModal(null) }]
                        })}>
                            <Text style={styles.legalLabel}>Cookie Policy</Text>
                            <Text style={styles.legalChevron}>›</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.footerText}>© {new Date().getFullYear()} Sakhi. All rights reserved.</Text>

                </ScrollView>

                {/* Reusable Sakhi Modal */}
                {modal && (
                    <SakhiModal
                        visible={!!modal}
                        icon={modal.icon}
                        title={modal.title}
                        message={modal.message}
                        buttons={modal.buttons}
                        onClose={() => setModal(null)}
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
    
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    
    
    
    
    scrollContent: { padding: 24, paddingBottom: 60 },
    pageSubtext: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24 },

    legalSection: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, 
        shadowColor: '#1E1B2E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4, 
        borderWidth: 1, borderColor: '#FDFBFF' },
    legalLink: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12 },
    legalLabel: { fontSize: 16, fontWeight: '600', color: '#1E1B2E' },
    legalChevron: { fontSize: 18, color: '#94A3B8', fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 12 },
    
    footerText: { textAlign: 'center', marginTop: 32, fontSize: 13, color: '#94A3B8', fontWeight: '500' }
});