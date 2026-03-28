import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, Alert, ActivityIndicator, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../../src/utils/theme';
import { useAuth } from '../../src/context/AuthContext';
import { getEmergencyContacts, addEmergencyContact, deleteEmergencyContact } from '../../src/api/endpoints';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const [contacts, setContacts] = useState([]);
    const [loadingContacts, setLoadingContacts] = useState(true);

    useEffect(() => {
        getEmergencyContacts()
            .then(({ data }) => setContacts(data.contacts || []))
            .catch(() => { })
            .finally(() => setLoadingContacts(false));
    }, []);

    const handleLogout = () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out',
                style: 'destructive',
                onPress: async () => {
                    await logout();
                    router.replace('/(auth)/login');
                },
            },
        ]);
    };

    const handleDeleteContact = async (id) => {
        Alert.alert('Remove Contact', 'Remove this emergency contact?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive',
                onPress: async () => {
                    await deleteEmergencyContact(id);
                    setContacts((c) => c.filter((x) => x.id !== id));
                },
            },
        ]);
    };

    const MenuRow = ({ emoji, label, onPress, destructive }) => (
        <Pressable style={styles.menuRow} onPress={onPress}>
            <View style={[styles.menuIconBg, destructive && styles.menuIconBgRed]}>
                <Text style={{ fontSize: 18 }}>{emoji}</Text>
            </View>
            <Text style={[styles.menuLabel, destructive && { color: Colors.error }]}>{label}</Text>
            <Text style={styles.menuChevron}>›</Text>
        </Pressable>
    );

    return (
        <View style={styles.container}>
            {/* Header hero */}
            <View style={styles.hero}>
                <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitial}>
                        {user?.name ? user.name[0].toUpperCase() : '?'}
                    </Text>
                </View>
                <Text style={styles.heroName}>{user?.name || 'Sakhi User'}</Text>
                <Text style={styles.heroPhone}>{user?.phone || ''}</Text>
                <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>
                        {user?.verification_status === 'approved' ? '✅  Verified' : '⏳  Pending Verification'}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Emergency Contacts */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Emergency Contacts</Text>
                    <Text style={styles.sectionSubtitle}>
                        Added during SOS — up to 3 contacts
                    </Text>

                    {loadingContacts ? (
                        <ActivityIndicator color={Colors.primaryContainer} style={{ marginVertical: 12 }} />
                    ) : contacts.length === 0 ? (
                        <View style={styles.emptyContacts}>
                            <Text style={styles.emptyContactsText}>No emergency contacts added yet.</Text>
                        </View>
                    ) : (
                        contacts.map((c) => (
                            <View key={c.id} style={styles.contactCard}>
                                <View style={styles.contactIconBg}>
                                    <Text style={{ fontSize: 20 }}>👤</Text>
                                </View>
                                <View style={styles.contactInfo}>
                                    <Text style={styles.contactName}>{c.name}</Text>
                                    <Text style={styles.contactPhone}>{c.phone}</Text>
                                </View>
                                <Pressable
                                    onPress={() => handleDeleteContact(c.id)}
                                    style={styles.deleteContactBtn}
                                >
                                    <Text style={styles.deleteContactIcon}>🗑️</Text>
                                </Pressable>
                            </View>
                        ))
                    )}

                    {contacts.length < 3 && (
                        <TouchableOpacity
                            style={styles.addContactBtn}
                            onPress={() => router.push('/add-contact')}
                        >
                            <Text style={styles.addContactBtnText}>+ Add Emergency Contact</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Account Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <View style={styles.menuCard}>
                        <MenuRow emoji="✏️" label="Edit Profile" onPress={() => router.push('/edit-profile')} />
                        <View style={styles.menuDivider} />
                        <MenuRow emoji="📱" label="Change Phone Number" onPress={() => router.push('/change-phone')} />
                        <View style={styles.menuDivider} />
                        <MenuRow emoji="💳" label="Wallet & Referrals" onPress={() => router.push('/wallet')} />
                        <View style={styles.menuDivider} />
                        <MenuRow emoji="🏠" label="Saved Places" onPress={() => router.push('/saved-places')} />
                        <View style={styles.menuDivider} />
                        <MenuRow emoji="🔔" label="Notification Settings" onPress={() => router.push('/notifications')} />
                        <View style={styles.menuDivider} />
                        <MenuRow emoji="🎫" label="Subscriptions" onPress={() => router.push('/(tabs)/subscriptions')} />
                        <View style={styles.menuDivider} />
                        <MenuRow emoji="📋" label="Ride History" onPress={() => router.push('/(tabs)/ride-history')} />
                    </View>
                </View>

                {/* Support */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Help & Support</Text>
                    <View style={styles.menuCard}>
                        <MenuRow emoji="🆘" label="Raise a Complaint" onPress={() => router.push('/complaint')} />
                        <View style={styles.menuDivider} />
                        <MenuRow emoji="ℹ️" label="About Sakhi" onPress={() => router.push('/about')} />
                    </View>
                </View>

                {/* Logout */}
                <View style={styles.section}>
                    <View style={styles.menuCard}>
                        <MenuRow emoji="🚪" label="Log Out" onPress={handleLogout} destructive />
                    </View>
                </View>

                <Text style={styles.versionText}>Sakhi v1.0.0  •  sakhirides.in</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0FF' },
    hero: {
        backgroundColor: Colors.primaryContainer,
        paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24,
        alignItems: 'center',
    },
    avatarCircle: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 12,
        borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
    },
    avatarInitial: { fontSize: 30, fontWeight: '700', color: '#fff' },
    heroName: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 },
    heroPhone: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 10 },
    heroBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: BorderRadius.full, paddingHorizontal: 14, paddingVertical: 5,
    },
    heroBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    content: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 20, gap: 20 },
    section: { gap: 8 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.8 },
    sectionSubtitle: { fontSize: 12, color: Colors.outline, marginTop: -4 },
    emptyContacts: {
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 12, padding: 14, ...Shadows.card,
    },
    emptyContactsText: { fontSize: 13, color: Colors.outline, textAlign: 'center' },
    contactCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 12, padding: 12, ...Shadows.card, marginBottom: 6,
    },
    contactIconBg: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: Colors.primaryFixed,
        alignItems: 'center', justifyContent: 'center',
    },
    contactInfo: { flex: 1 },
    contactName: { fontSize: 14, fontWeight: '600', color: Colors.onBackground },
    contactPhone: { fontSize: 12, color: Colors.onSurfaceVariant },
    deleteContactBtn: { padding: 8 },
    deleteContactIcon: { fontSize: 16 },
    addContactBtn: {
        borderWidth: 1.5, borderColor: Colors.primaryContainer,
        borderStyle: 'dashed', borderRadius: 12,
        paddingVertical: 12, alignItems: 'center', marginTop: 4,
    },
    addContactBtnText: { color: Colors.primaryContainer, fontWeight: '600', fontSize: 14 },
    menuCard: {
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 16, overflow: 'hidden', ...Shadows.card,
    },
    menuRow: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: 14, paddingHorizontal: 16,
    },
    menuIconBg: {
        width: 38, height: 38, borderRadius: 10,
        backgroundColor: Colors.surfaceContainerLow,
        alignItems: 'center', justifyContent: 'center',
    },
    menuIconBgRed: { backgroundColor: '#fff1f2' },
    menuLabel: { flex: 1, fontSize: 15, color: Colors.onSurface, fontWeight: '500' },
    menuChevron: { fontSize: 20, color: Colors.outline },
    menuDivider: { height: 1, backgroundColor: Colors.outlineVariant, marginLeft: 68 },
    versionText: {
        textAlign: 'center', fontSize: 11, color: Colors.outline, marginTop: 8,
    },
});
