import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

export default function SOSActiveScreen() {
    const router = useRouter();

    const emergencyContacts = [
        { id: 1, name: 'Aisha Sharma', initial: 'A', color: '#FCD34D' },
        { id: 2, name: 'Rajesh Kumar', initial: 'R', color: '#38BDF8' },
        { id: 3, name: 'Priya Singh', initial: 'P', color: '#F472B6' }
    ];

    const handleCancel = () => {
        alert('SOS Alert Cancelled.');
        router.replace('/(tabs)/');
    };

    return (
        <View style={styles.container}>
            {/* Top Navigation Bar */}
            <SafeAreaView style={styles.topNavSafe}>
                <View style={styles.topNav}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.navIconBtn}>
                        <Text style={styles.navIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.navTitle}>Emergency SOS</Text>
                    <TouchableOpacity style={styles.navIconBtn}>
                        <Text style={styles.navIcon}>⚙️</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Siren Animation Section */}
                <View style={styles.sirenSection}>
                    <View style={styles.ringOuter} />
                    <View style={styles.ringInner} />
                    <View style={styles.iconCircle}>
                        <Text style={styles.dangerIcon}>❕</Text>
                    </View>
                </View>

                {/* Header Text */}
                <View style={styles.headerTextSection}>
                    <Text style={styles.title}>SOS Alert Sent</Text>
                    <Text style={styles.subtitle}>
                        Your emergency contacts and the Sakhi{'\n'}team have been notified with your live{'\n'}location.
                    </Text>
                </View>

                {/* Confirmation Card */}
                <View style={styles.card}>
                    {/* Status Checks */}
                    <View style={styles.statusList}>
                        <View style={styles.statusRow}>
                            <View style={styles.checkBg}>
                                <Text style={styles.checkMark}>✓</Text>
                            </View>
                            <Text style={styles.statusText}>Sakhi Safety Team Notified</Text>
                        </View>
                        <View style={styles.statusRow}>
                            <View style={styles.checkBg}>
                                <Text style={styles.checkMark}>✓</Text>
                            </View>
                            <Text style={styles.statusText}>Live Location Shared with Contacts</Text>
                        </View>
                        <View style={styles.statusRow}>
                            <View style={styles.checkBg}>
                                <Text style={styles.checkMark}>✓</Text>
                            </View>
                            <Text style={styles.statusText}>Trip Details Transmitted</Text>
                        </View>
                    </View>

                    {/* Contacts */}
                    <View style={styles.contactsSection}>
                        <Text style={styles.contactsHeading}>YOUR EMERGENCY CONTACTS</Text>
                        
                        <View style={styles.contactsList}>
                            {emergencyContacts.map(contact => (
                                <View key={contact.id} style={styles.contactRow}>
                                    <View style={styles.contactLeft}>
                                        <View style={[styles.avatar, { backgroundColor: contact.color }]}>
                                            <Text style={styles.avatarInitial}>{contact.initial}</Text>
                                        </View>
                                        <Text style={styles.contactName}>{contact.name}</Text>
                                    </View>
                                    <View style={styles.notifiedPill}>
                                        <Text style={styles.notifiedText}>NOTIFIED ✓</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Primary Actions */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.callSakhiBtn} activeOpacity={0.8}>
                        <Text style={styles.callIcon}>📞</Text>
                        <Text style={styles.callSakhiText}>Call Sakhi Team</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.msgSakhiBtn} activeOpacity={0.8}>
                        <Text style={styles.msgIcon}>💬</Text>
                        <Text style={styles.msgSakhiText}>Message Sakhi Team</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.authoritiesBtn} activeOpacity={0.8}>
                        <Text style={styles.shieldIcon}>🛡️</Text>
                        <Text style={styles.authoritiesText}>Contact Authorities (112)</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            {/* Bottom Safe Footer */}
            <View style={styles.footerSection}>
                <TouchableOpacity style={styles.safeBtn} onPress={handleCancel} activeOpacity={0.6}>
                    <Text style={styles.safeBtnText}>CANCEL SOS — I'M SAFE</Text>
                </TouchableOpacity>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#991B1B' },
    
    topNavSafe: { backgroundColor: '#DC2626', shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 6, zIndex: 10 },
    topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 60, paddingHorizontal: 24 },
    navIconBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
    navIcon: { fontSize: 20, color: '#FFFFFF', fontWeight: 'bold' },
    navTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.9 },

    scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 100 },

    sirenSection: { width: '100%', height: 192, justifyContent: 'center', alignItems: 'center', marginBottom: 24, position: 'relative' },
    ringOuter: { position: 'absolute', width: 176, height: 176, borderRadius: 88, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.4)', opacity: 0.4 },
    ringInner: { position: 'absolute', width: 128, height: 128, borderRadius: 64, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.4)', opacity: 0.8 },
    iconCircle: { width: 88, height: 88, backgroundColor: '#FFFFFF', borderRadius: 44, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 8 },
    dangerIcon: { fontSize: 36, color: '#991B1B' },

    headerTextSection: { alignItems: 'center', marginBottom: 32 },
    title: { fontSize: 30, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.75, marginBottom: 12 },
    subtitle: { fontSize: 16, fontWeight: '500', color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center', lineHeight: 26 },

    card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.12, shadowRadius: 32, elevation: 8, marginBottom: 32 },
    
    statusList: { gap: 16, marginBottom: 32 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    checkBg: { width: 24, height: 24, backgroundColor: '#D1FAE5', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    checkMark: { color: '#059669', fontSize: 12, fontWeight: 'bold' },
    statusText: { fontSize: 14, fontWeight: '600', color: '#1C1A25' },

    contactsSection: { paddingTop: 8 },
    contactsHeading: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 },
    contactsList: { gap: 16 },
    contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    contactLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#F8FAFC' },
    avatarInitial: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    contactName: { fontSize: 14, fontWeight: '700', color: '#1C1A25' },
    notifiedPill: { backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    notifiedText: { fontSize: 10, fontWeight: '700', color: '#059669', letterSpacing: 0.5 },

    actionButtons: { gap: 16 },
    callSakhiBtn: { width: '100%', height: 56, backgroundColor: '#FFFFFF', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, shadowColor: 'rgba(0, 0, 0, 0.1)', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 1, shadowRadius: 20, elevation: 6 },
    callIcon: { fontSize: 18 },
    callSakhiText: { fontSize: 16, fontWeight: '700', color: '#B91C1C' },

    msgSakhiBtn: { width: '100%', height: 60, borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
    msgIcon: { fontSize: 18 },
    msgSakhiText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

    authoritiesBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8 },
    shieldIcon: { fontSize: 14 },
    authoritiesText: { fontSize: 14, fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)', textDecorationLine: 'underline' },

    footerSection: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
    safeBtn: { paddingVertical: 16, paddingHorizontal: 32 },
    safeBtnText: { fontSize: 10, fontWeight: '700', color: 'rgba(255, 255, 255, 0.6)', letterSpacing: 2, textTransform: 'uppercase' },

});
