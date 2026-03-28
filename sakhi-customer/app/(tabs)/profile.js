import React from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    SafeAreaView, Image, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        router.replace('/(auth)/login');
    };

    const SettingRow = ({ icon, label, onPress, isLast = false }) => (
        <View style={styles.settingRowContainer}>
            <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
                <View style={styles.settingIconBg}>
                    <Text style={styles.settingIcon}>{icon}</Text>
                </View>
                <Text style={styles.settingLabel}>{label}</Text>
                <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            {!isLast && <View style={styles.divider} />}
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                
                {/* Header App Bar */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
                        <Text style={styles.headerIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Settings</Text>
                    <TouchableOpacity style={styles.iconBtn}>
                        <Text style={styles.headerDots}>⋮</Text>
                    </TouchableOpacity>
                </View>

                {/* Main Scrollable Content */}
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Profile Hero Card */}
                    <View style={styles.heroCard}>
                        <View style={styles.avatarImg}>
                            <Text style={styles.avatarInitial}>
                                {user?.name ? user.name[0].toUpperCase() : 'P'}
                            </Text>
                        </View>
                        
                        <View style={styles.heroInfo}>
                            <View style={styles.heroNameRow}>
                                <Text style={styles.heroName}>{user?.name || 'Priya Sharma'}</Text>
                                <View style={styles.verifiedBadge}>
                                    <Text style={styles.verifiedCheck}>✓</Text>
                                    <Text style={styles.verifiedText}>VERIFIED</Text>
                                </View>
                            </View>
                            <Text style={styles.heroPhone}>{user?.phone || '+91 98765 43210'}</Text>
                            <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/edit-profile')}>
                                <Text style={styles.editText}>Edit Profile</Text>
                                <Text style={styles.editArrow}>→</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* My Account Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeading}>MY ACCOUNT</Text>
                        <View style={styles.cardGroup}>
                            <SettingRow icon="📍" label="Saved Places" onPress={() => router.push('/saved-places')} />
                            <SettingRow icon="🕐" label="Ride History" onPress={() => router.push('/(tabs)/ride-history')} />
                            <SettingRow icon="📇" label="Emergency Contacts" onPress={() => router.push('/emergency-contacts')} />
                            <SettingRow icon="💵" label="Payment Methods" onPress={() => router.push('/payment')} isLast />
                        </View>
                    </View>

                    {/* Safety Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeading}>SAFETY</Text>
                        <View style={styles.cardGroup}>
                            <SettingRow icon="✳️" label="SOS Settings" onPress={() => router.push('/sos-settings')} />
                            <SettingRow icon="🎯" label="Live Trip Sharing" isLast />
                        </View>
                    </View>

                    {/* App Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeading}>APP</Text>
                        <View style={styles.cardGroup}>
                            <SettingRow icon="🔔" label="Notifications" onPress={() => router.push('/notifications')} />
                            <SettingRow icon="❓" label="Help & Support" onPress={() => router.push('/complaint')} />
                            <SettingRow icon="ℹ️" label="About Sakhi" onPress={() => router.push('/about')} />
                            <SettingRow icon="🛡️" label="Terms & Privacy" onPress={() => router.push('/about')} isLast />
                        </View>
                    </View>

                    {/* Logout Button */}
                    <TouchableOpacity style={styles.logoutCard} onPress={handleLogout} activeOpacity={0.8}>
                        <View style={styles.logoutIconBg}>
                            <Text style={styles.logoutIcon}>🚪</Text>
                        </View>
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>

                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F5F0FF',
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: '#F5F0FF',
        zIndex: 10,
    },
    iconBtn: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerIcon: {
        fontSize: 24,
        color: '#BEA3D8',
        fontWeight: '500',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E1B2E',
        letterSpacing: -0.5,
    },
    headerDots: {
        fontSize: 24,
        color: '#BEA3D8',
        fontWeight: '800',
    },

    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
        gap: 24,
    },

    /* Hero Card */
    heroCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        gap: 16,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 6,
    },
    avatarImg: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#BEA3D8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    heroInfo: {
        flex: 1,
        gap: 4,
    },
    heroNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    heroName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E1B2E',
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D1FAE5',
        gap: 4,
    },
    verifiedCheck: {
        fontSize: 10,
        color: '#059669',
        fontWeight: 'bold',
    },
    verifiedText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#059669',
        letterSpacing: 0.5,
    },
    heroPhone: {
        fontSize: 14,
        color: '#1C1A25',
        opacity: 0.8,
        marginBottom: 2,
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    editText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#BEA3D8',
    },
    editArrow: {
        fontSize: 14,
        color: '#BEA3D8',
        fontWeight: 'bold',
    },

    /* Sections */
    section: {
        gap: 12,
    },
    sectionHeading: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1C1A25',
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        paddingHorizontal: 4,
    },
    cardGroup: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 24,
        elevation: 3,
        overflow: 'hidden',
    },
    
    /* Rows */
    settingRowContainer: {
        width: '100%',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    settingIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F0FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingIcon: {
        fontSize: 18,
    },
    settingLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#1E1B2E',
    },
    chevron: {
        fontSize: 22,
        color: '#CCC3D8',
        paddingBottom: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#F5F0FF',
    },

    /* Logout Block */
    logoutCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        gap: 16,
        shadowColor: 'rgba(186, 26, 26, 1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 4,
        marginTop: 8,
    },
    logoutIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 218, 214, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoutIcon: {
        fontSize: 18,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#BA1A1A',
    },
});
