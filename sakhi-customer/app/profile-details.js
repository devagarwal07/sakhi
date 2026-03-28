import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Switch, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

export default function ProfileDetailsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [homeAddress, setHomeAddress] = useState('');
    const [workAddress, setWorkAddress] = useState('');
    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [language, setLanguage] = useState('English (UK)');
    const [rideReminders, setRideReminders] = useState(true);
    const [saving, setSaving] = useState(false);

    const handleSave = () => {
        setSaving(true);
        setTimeout(() => {
            setSaving(false);
            router.replace('/(tabs)');
        }, 800);
    };

    return (
        <View style={styles.container}>
            {/* Decorative blurs */}
            <View style={styles.glowRight} />
            <View style={styles.glowLeft} />

            {/* Header — glassmorphic */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile Details</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero section */}
                <View style={styles.heroSection}>
                    <Text style={styles.heroTitle}>A Few More Details</Text>
                    <Text style={styles.heroSubtitle}>
                        Help us personalise your Sakhi experience
                    </Text>
                </View>

                {/* SAVED PLACES */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>SAVED PLACES</Text>
                    <View style={styles.card}>
                        {/* Home Address */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Home Address</Text>
                            <View style={styles.inputRow}>
                                <Text style={styles.inputIcon}>🏠</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={homeAddress}
                                    onChangeText={setHomeAddress}
                                    placeholder="Enter home address"
                                    placeholderTextColor="rgba(107, 114, 128, 0.6)"
                                />
                            </View>
                        </View>

                        {/* Work Address */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Work Address</Text>
                            <View style={styles.inputRow}>
                                <Text style={styles.inputIcon}>💼</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={workAddress}
                                    onChangeText={setWorkAddress}
                                    placeholder="Enter work address"
                                    placeholderTextColor="rgba(107, 114, 128, 0.6)"
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* EMERGENCY CONTACTS */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>EMERGENCY CONTACTS</Text>
                    <View style={styles.card}>
                        {/* Contact Name */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Contact Name</Text>
                            <View style={styles.inputRow}>
                                <Text style={styles.inputIcon}>👤</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={contactName}
                                    onChangeText={setContactName}
                                    placeholder="Full Name"
                                    placeholderTextColor="rgba(107, 114, 128, 0.6)"
                                />
                            </View>
                        </View>

                        {/* Phone Number */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Phone Number</Text>
                            <View style={styles.inputRow}>
                                <Text style={styles.inputIcon}>📞</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={contactPhone}
                                    onChangeText={setContactPhone}
                                    placeholder="+91 00000 00000"
                                    placeholderTextColor="rgba(107, 114, 128, 0.6)"
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        {/* Add Another Contact */}
                        <TouchableOpacity style={styles.addContactBtn} activeOpacity={0.7}>
                            <Text style={styles.addContactIcon}>+</Text>
                            <Text style={styles.addContactText}>Add Another Contact</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* PREFERENCES */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>PREFERENCES</Text>
                    <View style={styles.card}>
                        {/* Preferred Language */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Preferred Language</Text>
                            <View style={styles.selectRow}>
                                <Text style={styles.selectValue}>{language}</Text>
                                <Text style={styles.selectChevron}>⌄</Text>
                            </View>
                        </View>

                        {/* Enable ride reminders */}
                        <View style={styles.toggleRow}>
                            <View style={styles.toggleTextCol}>
                                <Text style={styles.toggleLabel}>Enable ride reminders</Text>
                                <Text style={styles.toggleHint}>Get notified before your scheduled trips</Text>
                            </View>
                            <Switch
                                value={rideReminders}
                                onValueChange={setRideReminders}
                                trackColor={{ false: '#E2E8F0', true: '#BEA3D8' }}
                                thumbColor="#FFFFFF"
                                ios_backgroundColor="#E2E8F0"
                            />
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.ctaButton, saving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.88}
                >
                    {saving ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.ctaButtonText}>Save & Continue</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.skipBtn}>
                    <Text style={styles.skipText}>Skip for Now</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0FF',
    },

    // Decorative blurs
    glowRight: {
        position: 'absolute',
        width: 256,
        height: 256,
        right: -80,
        top: 160,
        backgroundColor: 'rgba(167, 139, 250, 0.1)',
        borderRadius: 9999,
    },
    glowLeft: {
        position: 'absolute',
        width: 320,
        height: 320,
        left: -80,
        bottom: 274,
        backgroundColor: 'rgba(124, 58, 237, 0.05)',
        borderRadius: 9999,
    },

    // Header — glassmorphic
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 52 : 16,
        paddingBottom: 16,
        gap: 16,
        backgroundColor: 'rgba(245, 240, 255, 0.8)',
    },
    backButton: {
        width: 32,
        height: 32,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        fontSize: 16,
        color: '#BEA3D8',
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E1B2E',
        letterSpacing: -0.5,
        lineHeight: 28,
    },

    // Scroll
    scrollContent: {
        paddingBottom: 180,
    },

    // Hero
    heroSection: {
        paddingHorizontal: 24,
        paddingTop: 32,
        gap: 8,
    },
    heroTitle: {
        fontSize: 30,
        fontWeight: '800',
        color: '#1E1B2E',
        letterSpacing: -0.75,
        lineHeight: 36,
    },
    heroSubtitle: {
        fontSize: 18,
        fontWeight: '400',
        color: '#6B7280',
        lineHeight: 28,
    },

    // Section
    section: {
        paddingHorizontal: 24,
        marginTop: 32,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '500',
        color: '#6B7280',
        letterSpacing: 1,
        textTransform: 'uppercase',
        lineHeight: 15,
        paddingLeft: 4,
        marginBottom: 8,
    },

    // Card — white, radius 16, purple shadow
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        gap: 24,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 2,
    },

    // Field group
    fieldGroup: {
        gap: 8.5,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E1B2E',
        lineHeight: 20,
    },

    // Input row — rgba bg, radius 12
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 55,
        backgroundColor: 'rgba(245, 240, 255, 0.5)',
        borderRadius: 12,
    },
    inputIcon: {
        position: 'absolute',
        left: 20,
        fontSize: 16,
        color: '#BEA3D8',
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '400',
        color: '#1E1B2E',
        paddingLeft: 48,
        paddingRight: 16,
        paddingVertical: 18,
        lineHeight: 19,
    },

    // Select row (language)
    selectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        backgroundColor: 'rgba(245, 240, 255, 0.5)',
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    selectValue: {
        fontSize: 16,
        fontWeight: '400',
        color: '#1E1B2E',
        lineHeight: 24,
    },
    selectChevron: {
        fontSize: 16,
        color: '#6B7280',
    },

    // Toggle row
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    toggleTextCol: {
        flex: 1,
        gap: 2,
    },
    toggleLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E1B2E',
        lineHeight: 24,
    },
    toggleHint: {
        fontSize: 12,
        fontWeight: '400',
        color: '#6B7280',
        lineHeight: 16,
    },

    // Add contact button
    addContactBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    addContactIcon: {
        fontSize: 14,
        color: '#BEA3D8',
        fontWeight: '600',
    },
    addContactText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#BEA3D8',
        lineHeight: 20,
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        alignItems: 'center',
        gap: 16,
    },
    ctaButton: {
        width: '100%',
        height: 68,
        backgroundColor: '#BEA3D8',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 8,
    },
    ctaButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        lineHeight: 28,
    },
    skipBtn: {
        paddingVertical: 4,
    },
    skipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#BEA3D8',
        lineHeight: 20,
    },
});
