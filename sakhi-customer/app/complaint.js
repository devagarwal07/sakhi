import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    TextInput, Platform, Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import SakhiModal from '../src/components/SakhiModal';

export default function HelpSupportScreen() {
    const router = useRouter();

    const [search, setSearch] = useState('');
    const [modal, setModal] = useState(null);

    const helpCategories = {
        ride: 'For ride issues, please rate the trip and submit a report from your Ride History.',
        billing: 'For billing issues, check your Wallet for transaction history or contact us.',
        safety: 'If you feel unsafe, please use the SOS button or call our safety helpline at 1800-SAKHI.',
        subscription: 'For subscription help, go to the Subscriptions tab to manage your plan.',
    };

    const QuickHelpCard = ({ icon, label, category, isEmergency = false }) => (
        <TouchableOpacity style={styles.quickCard} activeOpacity={0.7} onPress={() => setModal({
            icon: isEmergency ? '🛡️' : '💡',
            title: label,
            message: helpCategories[category] || 'Our team will assist you shortly.',
            buttons: [{ text: 'OK', onPress: () => setModal(null) }]
        })}>
            <View style={[styles.quickIconBox, isEmergency && styles.quickIconBoxEmergency]}>
                <Text style={[styles.quickIcon, isEmergency && styles.quickIconEmergency]}>{icon}</Text>
            </View>
            <Text style={styles.quickLabel}>{label}</Text>
        </TouchableOpacity>
    );

    const RecentTripCard = ({ pickup, dropoff }) => (
        <View style={styles.tripCard}>
            <View style={styles.tripDetails}>
                <View style={styles.locationRow}>
                    <View style={styles.dotGreen} />
                    <Text style={styles.locationText} numberOfLines={1}>{pickup}</Text>
                </View>
                <View style={styles.locationRow}>
                    <View style={styles.dotRed} />
                    <Text style={styles.locationText} numberOfLines={1}>{dropoff}</Text>
                </View>
            </View>
            <TouchableOpacity style={styles.getHelpBtn} activeOpacity={0.7} onPress={() => router.push('/(tabs)/ride-history')}>
                <Text style={styles.getHelpText}>Get Help</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
                        <Text style={styles.headerIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Help & Support</Text>
                    <View style={styles.iconBtn} /> 
                </View>

                {/* Main Content */}
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput 
                            style={styles.searchInput}
                            placeholder="Search for help..."
                            placeholderTextColor="#94A3B8"
                            value={search}
                            onChangeText={setSearch}
                            returnKeyType="search"
                        />
                    </View>

                    {/* Quick Help Grid */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeading}>QUICK HELP</Text>
                        <View style={styles.quickGridRow}>
                            <QuickHelpCard icon="🚙" label="My Ride Issue" category="ride" />
                            <QuickHelpCard icon="₹" label="Billing & Payments" category="billing" />
                        </View>
                        <View style={styles.quickGridRow}>
                            <QuickHelpCard icon="🛡️" label="Safety Concern" category="safety" isEmergency={true} />
                            <QuickHelpCard icon="🔁" label="Subscription Help" category="subscription" />
                        </View>
                    </View>

                    {/* Recent Trips Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionHeading}>RECENT TRIPS</Text>
                            <TouchableOpacity onPress={() => router.push('/(tabs)/ride-history')}>
                                <Text style={styles.viewAllText}>View All</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.tripsList}>
                            <RecentTripCard 
                                pickup="124 Sector 4, HSR Layout" 
                                dropoff="Venture Park, Indiranagar" 
                            />
                            <RecentTripCard 
                                pickup="Forum Mall, Koramangala" 
                                dropoff="124 Sector 4, HSR Layout" 
                            />
                        </View>
                    </View>

                    {/* Contact Us Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeading}>CONTACT US</Text>
                        <View style={styles.contactCardContainer}>
                            
                            {/* Chat Row */}
                            <TouchableOpacity style={styles.contactRow} activeOpacity={0.7} onPress={() => setModal({
                                icon: '💬',
                                title: 'Chat Support',
                                message: 'Live chat will open. Average wait time: 2 minutes.',
                                buttons: [{ text: 'OK', onPress: () => setModal(null) }]
                            })}>
                                <View style={styles.contactRowLeft}>
                                    <Text style={styles.contactIcon}>💬</Text>
                                    <Text style={styles.contactLabel}>Chat with Support</Text>
                                </View>
                                <View style={styles.onlineBadge}>
                                    <Text style={styles.onlineText}>ONLINE</Text>
                                </View>
                            </TouchableOpacity>

                            {/* Call Row */}
                            <TouchableOpacity style={styles.contactRow} activeOpacity={0.7} onPress={() => Linking.openURL('tel:18001234567')}>
                                <View style={styles.contactRowLeft}>
                                    <Text style={styles.contactIcon}>📞</Text>
                                    <View style={styles.contactTextCol}>
                                        <Text style={styles.contactLabel}>Call Support</Text>
                                        <Text style={styles.contactSubText}>Mon-Sun, 9AM-9PM</Text>
                                    </View>
                                </View>
                                <Text style={styles.chevron}>›</Text>
                            </TouchableOpacity>

                            {/* Email Row */}
                            <TouchableOpacity style={styles.contactRow} activeOpacity={0.7} onPress={() => Linking.openURL('mailto:support@sakhi.app?subject=Help Request')}>
                                <View style={styles.contactRowLeft}>
                                    <Text style={styles.contactIcon}>✉️</Text>
                                    <Text style={styles.contactLabel}>Email Us</Text>
                                </View>
                                <Text style={styles.chevron}>›</Text>
                            </TouchableOpacity>

                        </View>
                    </View>

                    {/* Visit Help Centre Button */}
                    <TouchableOpacity style={styles.visitBtn} activeOpacity={0.7} onPress={() => setModal({
                        icon: '🌐',
                        title: 'Help Centre',
                        message: 'Opening help documentation. This will be available online at help.sakhi.app',
                        buttons: [{ text: 'OK', onPress: () => setModal(null) }]
                    })}>
                        <Text style={styles.visitBtnText}>Visit Help Centre</Text>
                    </TouchableOpacity>

                </ScrollView>
            </View>
            {modal && <SakhiModal config={modal} onClose={() => setModal(null)} />}
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
        paddingVertical: 16,
        backgroundColor: 'rgba(245, 240, 255, 0.9)',
        zIndex: 10,
    },
    iconBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'flex-start' },
    headerIcon: { fontSize: 24, color: '#BEA3D8', fontWeight: 'bold' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.5, position: 'absolute', left: 0, right: 0, textAlign: 'center', zIndex: -1 },

    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 40,
        gap: 32,
    },

    /* Search Bar */
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 9999,
        paddingHorizontal: 20,
        height: 56,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 24, elevation: 3,
    },
    searchIcon: { fontSize: 18, color: '#A78BFA', marginRight: 12 },
    searchInput: { flex: 1, fontSize: 16, color: '#1E1B2E', fontWeight: '400', height: '100%' },

    /* Global Section Settings */
    section: { gap: 16 },
    sectionHeading: { fontSize: 12, fontWeight: '600', color: '#6B7280', letterSpacing: 0.6, textTransform: 'uppercase' },

    /* Quick Help Grid */
    quickGridRow: { flexDirection: 'row', gap: 16, width: '100%' },
    quickCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, alignItems: 'center', gap: 12, shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4 },
    quickIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F5F0FF', justifyContent: 'center', alignItems: 'center' },
    quickIconBoxEmergency: { backgroundColor: 'rgba(255, 218, 214, 0.3)' },
    quickIcon: { fontSize: 20, color: '#BEA3D8' },
    quickIconEmergency: { color: '#BA1A1A' },
    quickLabel: { fontSize: 13, fontWeight: '600', color: '#1E1B2E', textAlign: 'center', lineHeight: 20 },

    /* Recent Trips */
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    viewAllText: { fontSize: 12, fontWeight: '600', color: '#BEA3D8' },
    tripsList: { gap: 16 },
    tripCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 3 },
    tripDetails: { flex: 1, gap: 8, paddingRight: 16 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
    dotRed: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#BA1A1A' },
    locationText: { flex: 1, fontSize: 13, fontWeight: '500', color: '#1C1A25' },
    getHelpBtn: { backgroundColor: '#F5F0FF', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8 },
    getHelpText: { fontSize: 13, fontWeight: '700', color: '#BEA3D8' },

    /* Contact Us */
    contactCardContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4, overflow: 'hidden' },
    contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    contactRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    contactIcon: { fontSize: 20, color: '#A78BFA' },
    contactTextCol: { gap: 2 },
    contactLabel: { fontSize: 14, fontWeight: '600', color: '#1E1B2E' },
    contactSubText: { fontSize: 11, color: '#6B7280' },
    chevron: { fontSize: 22, color: '#CBD5E1', paddingBottom: 2 },
    onlineBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    onlineText: { fontSize: 10, fontWeight: '700', color: '#047857', letterSpacing: 0.5 },

    /* Visit Help Centre Btn */
    visitBtn: { width: '100%', height: 56, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#BEA3D8', borderRadius: 12, marginTop: 8 },
    visitBtnText: { fontSize: 14, fontWeight: '700', color: '#BEA3D8', letterSpacing: 0.35 },
});
