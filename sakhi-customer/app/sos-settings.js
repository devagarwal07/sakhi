import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Switch, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEmergencyContacts } from '../src/api/endpoints';

const LIVE_SHARING_KEY = 'sakhi_live_sharing_enabled';

export default function SOSSettingsScreen({ isTab = false }) {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const tabBarPaddingBottom = Math.max(insets.bottom, 20);
    const tabBarHeight = 95 - 20 + tabBarPaddingBottom;
    const scrollPaddingBottom = isTab
        ? (tabBarHeight - insets.bottom) + 24
        : 32;

    const [preferences, setPreferences] = useState({
        autoSend: true,
        vibrate: true,
        playSound: true,
    });
    const [liveSharingEnabled, setLiveSharingEnabled] = useState(false);
    const [contactCount, setContactCount] = useState(null);

    useEffect(() => {
        // Load live sharing preference
        AsyncStorage.getItem(LIVE_SHARING_KEY)
            .then(val => { if (val !== null) setLiveSharingEnabled(val === 'true'); })
            .catch(() => {});

        getEmergencyContacts()
            .then(({ data }) => {
                const list = data.contacts || data || [];
                setContactCount(list.length);
            })
            .catch(() => {});
    }, []);

    const toggleLiveSharing = async (value) => {
        setLiveSharingEnabled(value);
        await AsyncStorage.setItem(LIVE_SHARING_KEY, String(value)).catch(() => {});
    };

    const toggleSwitch = (key) => {
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {!isTab && (
                            <TouchableOpacity style={styles.iconBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
                                <Feather name="arrow-left" size={24} color="#BEA3D8" />
                            </TouchableOpacity>
                        )}
                        <Text style={styles.headerTitle}>Safety & SOS</Text>
                    </View>
                </View>

                {/* Main Scroll Content */}
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
                    showsVerticalScrollIndicator={false}
                >
                    
                    {/* Top subtext */}
                    <Text style={styles.pageSubText}>Customise your SOS alert behaviour</Text>

                    {/* Master Settings Card */}
                    <View style={styles.settingsCard}>
                        
                        {/* Section 1: Alert Behaviour */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeading}>Alert Behaviour</Text>
                            
                            <View style={styles.row}>
                                <View style={styles.rowTextCol}>
                                    <Text style={styles.rowTitle}>Auto-send after 5 seconds</Text>
                                    <Text style={styles.rowSubtitle}>SOS auto-sends if you don't cancel</Text>
                                </View>
                                <Switch
                                    trackColor={{ false: '#E5E0EF', true: '#BEA3D8' }}
                                    thumbColor="#FFFFFF"
                                    ios_backgroundColor="#E5E0EF"
                                    onValueChange={() => toggleSwitch('autoSend')}
                                    value={preferences.autoSend}
                                    style={styles.switchControl}
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={styles.rowTextCol}>
                                    <Text style={styles.rowTitle}>Vibrate on SOS trigger</Text>
                                </View>
                                <Switch
                                    trackColor={{ false: '#E5E0EF', true: '#BEA3D8' }}
                                    thumbColor="#FFFFFF"
                                    ios_backgroundColor="#E5E0EF"
                                    onValueChange={() => toggleSwitch('vibrate')}
                                    value={preferences.vibrate}
                                    style={styles.switchControl}
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={styles.rowTextCol}>
                                    <Text style={styles.rowTitle}>Play alert sound</Text>
                                </View>
                                <Switch
                                    trackColor={{ false: '#E5E0EF', true: '#BEA3D8' }}
                                    thumbColor="#FFFFFF"
                                    ios_backgroundColor="#E5E0EF"
                                    onValueChange={() => toggleSwitch('playSound')}
                                    value={preferences.playSound}
                                    style={styles.switchControl}
                                />
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Section: Live Trip Sharing */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeading}>Live Trip Sharing</Text>

                            <View style={styles.row}>
                                <View style={styles.rowTextCol}>
                                    <Text style={styles.rowTitle}>Share trip with contacts</Text>
                                    <Text style={styles.rowSubtitle}>When ON, a Share Trip button appears during your active ride</Text>
                                </View>
                                <Switch
                                    trackColor={{ false: '#E5E0EF', true: '#BEA3D8' }}
                                    thumbColor="#FFFFFF"
                                    ios_backgroundColor="#E5E0EF"
                                    onValueChange={toggleLiveSharing}
                                    value={liveSharingEnabled}
                                    style={styles.switchControl}
                                />
                            </View>

                            {/* Info banner */}
                            <View style={[styles.infoBanner, liveSharingEnabled && styles.infoBannerActive]}>
                                <Feather name={liveSharingEnabled ? 'share' : 'lock'} size={18} color={liveSharingEnabled ? '#7C3AED' : '#6B7280'} />
                                <Text style={styles.infoBannerText}>
                                    {liveSharingEnabled
                                        ? 'Share Trip button is now active. It will appear on your next ride.'
                                        : 'Enable to let trusted contacts track your ride in real time.'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Section 2: Who Gets Notified */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeading}>Who Gets Notified</Text>
                            
                            <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => router.push('/emergency-contacts')}>
                                <View style={styles.rowTextCol}>
                                    <Text style={styles.rowTitle}>Emergency Contacts</Text>
                                    <View style={styles.badgeWrapper}>
                                        <View style={styles.purpleBadge}>
                                            <Text style={styles.purpleBadgeText}>
                                                {contactCount !== null ? `${contactCount} saved` : '...'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <Feather name="chevron-right" size={20} color="#CBD5E1" />
                            </TouchableOpacity>

                            <View style={styles.row}>
                                <View style={styles.rowTextCol}>
                                    <View style={styles.lockedRow}>
                                        <Text style={styles.rowTitle}>Sakhi Safety Team</Text>
                                        <Feather name="lock" size={10} color="#6B7280" />
                                    </View>
                                </View>
                                <View style={styles.greenBadge}>
                                    <Text style={styles.greenBadgeText}>ALWAYS NOTIFIED</Text>
                                </View>
                            </View>

                        </View>

                        <View style={styles.divider} />

                        {/* Section 3: Test SOS */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeading}>Test SOS</Text>
                            
                            <View style={styles.testBox}>
                                <TouchableOpacity 
                                    style={styles.testBtn} 
                                    activeOpacity={0.7}
                                    onPress={() => router.push('/sos-warning')}
                                >
                                    <Text style={styles.testBtnText}>Test Alert</Text>
                                </TouchableOpacity>
                                <Text style={styles.testSubText}>
                                    Sends test notification only — no real alert
                                </Text>
                            </View>
                        </View>

                    </View>

                </ScrollView>
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
    safeArea: { flex: 1, backgroundColor: '#F5F0FF' },
    container: { flex: 1 },
    
    
    
    
    

    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    pageSubText: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 24,
    },

    /* Master Card */
    settingsCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
    },

    divider: {
        height: 1,
        backgroundColor: '#EADDFF', // Slightly darker purple line as per CSS
        marginHorizontal: 24,
    },

    /* Standard Sections */
    section: {
        padding: 24,
        gap: 24,
    },
    sectionHeading: {
        fontSize: 18, fontWeight: '700', color: '#1E1B2E',
    },

    /* Row Layouts */
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
    },
    rowTextCol: {
        flex: 1,
        justifyContent: 'center',
        gap: 4,
    },
    rowTitle: {
        fontSize: 16, fontWeight: '600', color: '#1E1B2E', lineHeight: 24,
    },
    rowSubtitle: {
        fontSize: 12, fontWeight: '400', color: '#6B7280', lineHeight: 16,
    },
    switchControl: {
        transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
    },

    /* Specific Row Elements */
    badgeWrapper: { flexDirection: 'row', marginTop: 4 },
    purpleBadge: {
        backgroundColor: '#F5F0FF',
        paddingHorizontal: 8, paddingVertical: 2,
        borderRadius: 9999,
    },
    purpleBadgeText: {
        fontSize: 12, fontWeight: '500', color: '#BEA3D8',
    },
    lockedRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    padlockIcon: {
        fontSize: 10, color: '#6B7280',
    },
    greenBadge: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 4,
    },
    greenBadgeText: {
        fontSize: 10, fontWeight: '700', color: '#047857', letterSpacing: 0.5, textTransform: 'uppercase',
    },
    chevron: {
        fontSize: 24, color: '#CBD5E1', paddingBottom: 2,
    },

    /* Test SOS Box */
    testBox: {
        width: '100%',
        backgroundColor: 'rgba(255, 247, 237, 0.4)', // Faint orange tint
        borderWidth: 2, borderColor: '#FED7AA',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    testBtn: {
        width: '100%',
        height: 52,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#F97316',
        borderRadius: 8,
        marginBottom: 12,
    },
    testBtnText: {
        fontSize: 16, fontWeight: '700', color: '#EA580C',
    },
    testSubText: {
        fontSize: 11, color: '#6B7280', textAlign: 'center',
    },

    /* Live Trip Sharing Info Banner */
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#F5F0FF',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(190,163,216,0.3)',
    },
    infoBannerActive: {
        backgroundColor: '#EADDFF',
        borderColor: '#BEA3D8',
    },
    infoBannerIcon: { fontSize: 18 },
    infoBannerText: {
        flex: 1, fontSize: 12, fontWeight: '500', color: '#6B7280', lineHeight: 18,
    },
});
