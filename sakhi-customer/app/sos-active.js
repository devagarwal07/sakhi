import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Linking, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import SakhiModal from '../src/components/SakhiModal';
import { Feather } from '@expo/vector-icons';
import { getEmergencyContacts, cancelSOS } from '../src/api/endpoints';

const AVATAR_COLORS = ['#FCD34D', '#38BDF8', '#F472B6', '#BEA3D8', '#68C4AF'];

export default function SOSActiveScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [modal, setModal] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [cancelling, setCancelling] = useState(false);

    const footerPaddingBottom = Math.max(insets.bottom, 16);

    useEffect(() => {
        getEmergencyContacts()
            .then(({ data }) => {
                const raw = data.contacts || data || [];
                setContacts(raw.map((c, i) => ({
                    ...c,
                    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
                    initial: (c.name || 'U')[0].toUpperCase(),
                })));
            })
            .catch(() => {})
            .finally(() => setLoadingContacts(false));
    }, []);

    const handleCancel = () => {
        setModal({
            icon: '⚠️',
            title: 'Cancel SOS?',
            message: 'Are you sure you are safe? This will cancel the SOS alert for all contacts.',
            buttons: [
                { text: 'No, Keep SOS', style: 'cancel', onPress: () => setModal(null) },
                {
                    text: "Yes, I'm Safe",
                    style: 'destructive',
                    onPress: async () => {
                        setModal(null);
                        setCancelling(true);
                        try {
                            await cancelSOS();
                        } catch (_) {
                            // Proceed regardless
                        } finally {
                            setCancelling(false);
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/');
                            }
                        }
                    }
                }
            ]
        });
    };

    return (
        <View style={styles.container}>
            {/* Top Navigation Bar */}
            <View style={[styles.topNavSafe, { paddingTop: insets.top }]}>
                <View style={styles.topNav}>
                    <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.navIconBtn}>
                        <Feather name="arrow-left" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.navTitle}>Emergency SOS</Text>
                    <View style={{ width: 32 }} />
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Tablet-responsive wrapper */}
                <View style={styles.tabletWrapper}>
                
                {/* Siren Animation Section */}
                <View style={styles.sirenSection}>
                    <View style={styles.ringOuter} />
                    <View style={styles.ringInner} />
                    <View style={styles.iconCircle}>
                        <Feather name="alert-circle" size={36} color="#991B1B" />
                    </View>
                </View>

                {/* Header Text */}
                <View style={styles.headerTextSection}>
                    <Text style={styles.title}>SOS Alert Sent</Text>
                    <Text style={styles.subtitle}>
                        Your emergency contacts and the Sakhi team have been notified with your live location.
                    </Text>
                </View>

                {/* Confirmation Card */}
                <View style={styles.card}>
                    {/* Status Checks */}
                    <View style={styles.statusList}>
                        <View style={styles.statusRow}>
                            <View style={styles.checkBg}>
                                <Feather name="check" size={14} color="#059669" style={{ fontWeight: 'bold' }} />
                            </View>
                            <Text style={styles.statusText}>Sakhi Safety Team Notified</Text>
                        </View>
                        <View style={styles.statusRow}>
                            <View style={styles.checkBg}>
                                <Feather name="check" size={14} color="#059669" style={{ fontWeight: 'bold' }} />
                            </View>
                            <Text style={styles.statusText}>Live Location Shared with Contacts</Text>
                        </View>
                        <View style={styles.statusRow}>
                            <View style={styles.checkBg}>
                                <Feather name="check" size={14} color="#059669" style={{ fontWeight: 'bold' }} />
                            </View>
                            <Text style={styles.statusText}>Trip Details Transmitted</Text>
                        </View>
                    </View>

                    {/* Contacts */}
                    <View style={styles.contactsSection}>
                        <Text style={styles.contactsHeading}>YOUR EMERGENCY CONTACTS</Text>
                        
                        <View style={styles.contactsList}>
                            {loadingContacts ? (
                                <ActivityIndicator color="#BEA3D8" />
                            ) : contacts.length === 0 ? (
                                <Text style={{ color: '#94A3B8', fontSize: 13 }}>No emergency contacts added.</Text>
                            ) : contacts.map(contact => (
                                <View key={contact.id} style={styles.contactRow}>
                                    <View style={styles.contactLeft}>
                                        <View style={[styles.avatar, { backgroundColor: contact.color }]}>
                                            <Text style={styles.avatarInitial}>{contact.initial}</Text>
                                        </View>
                                        <Text style={styles.contactName}>{contact.name}</Text>
                                    </View>
                                    <View style={styles.notifiedPill}>
                                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                                            <Text style={styles.notifiedText}>NOTIFIED</Text>
                                            <Feather name="check" size={10} color="#059669" />
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Primary Actions */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.callSakhiBtn} activeOpacity={0.8} onPress={() => Linking.openURL('tel:+916361933364')}>
                        <Feather name="phone-call" size={18} color="#B91C1C" />
                        <Text style={styles.callSakhiText}>Call Sakhi Team</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.msgSakhiBtn} activeOpacity={0.8} onPress={() => Linking.openURL('https://wa.me/916361933364?text=SOS%20Help%20Needed').catch(() => Linking.openURL('sms:+916361933364'))}>
                        <Feather name="message-square" size={18} color="#FFFFFF" />
                        <Text style={styles.msgSakhiText}>Message Sakhi Team</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.authoritiesBtn} activeOpacity={0.8} onPress={() => Linking.openURL('tel:112')}>
                        <Feather name="shield" size={14} color="#FFFFFF" />
                        <Text style={styles.authoritiesText}>Contact Authorities (112)</Text>
                    </TouchableOpacity>
                </View>
                </View>
            </ScrollView>

            {/* Bottom Safe Footer */}
            <View style={[styles.footerSection, { paddingBottom: footerPaddingBottom }]}>
                <TouchableOpacity style={styles.safeBtn} onPress={handleCancel} activeOpacity={0.6} disabled={cancelling}>
                    {cancelling
                        ? <ActivityIndicator color="rgba(255,255,255,0.6)" />
                        : <Text style={styles.safeBtnText}>CANCEL SOS — I'M SAFE</Text>
                    }
                </TouchableOpacity>
            </View>

            <SakhiModal config={modal} onClose={() => setModal(null)} inline={true} />
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

    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24 },
    tabletWrapper: { width: '100%', maxWidth: 500, alignSelf: 'center' },

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
    checkBg: { width: 24, height: 24, backgroundColor: '#ECFDF5', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    checkMark: { color: '#059669', fontSize: 12, fontWeight: 'bold' },
    statusText: { fontSize: 14, fontWeight: '600', color: '#1E1B2E' },

    contactsSection: { paddingTop: 8 },
    contactsHeading: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 },
    contactsList: { gap: 16 },
    contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    contactLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#F8FAFC' },
    avatarInitial: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    contactName: { fontSize: 14, fontWeight: '700', color: '#1E1B2E' },
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

    footerSection: { width: '100%', alignItems: 'center', backgroundColor: '#991B1B' },
    safeBtn: { paddingVertical: 16, paddingHorizontal: 32, marginTop: 16 },
    safeBtnText: { fontSize: 10, fontWeight: '700', color: 'rgba(255, 255, 255, 0.6)', letterSpacing: 2, textTransform: 'uppercase' },

});
