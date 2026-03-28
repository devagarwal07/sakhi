import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, Alert, Pressable, Image, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { updateProfile } from '../src/api/endpoints';

export default function ProfileSetupScreen() {
    const router = useRouter();
    const { user, updateUser } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [homeAddress, setHomeAddress] = useState('');
    const [avatar, setAvatar] = useState(null);
    const [saving, setSaving] = useState(false);

    const pickAvatar = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return;
        const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true, aspect: [1, 1], quality: 0.8,
        });
        if (!result.canceled) setAvatar(result.assets[0]);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Name Required', 'Please enter your full name.');
            return;
        }
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('name', name.trim());
            if (email.trim()) formData.append('email', email.trim());
            if (homeAddress.trim()) formData.append('home_address', homeAddress.trim());
            if (avatar) {
                formData.append('avatar', {
                    uri: avatar.uri, name: 'avatar.jpg', type: 'image/jpeg',
                });
            }
            const { data } = await updateProfile(formData);
            updateUser(data.user || { name, email });
            router.replace('/(kyc)/intro');
        } catch (err) {
            const msg = err?.response?.data?.message || 'Failed to save profile. Try again.';
            Alert.alert('Save Failed', msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Decorative blurs */}
            <View style={styles.glowBL} />
            <View style={styles.glowTR} />

            {/* Header — glassmorphic */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Set Up Your Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Hero subtext */}
                <View style={styles.heroSubtext}>
                    <Text style={styles.subtitleText}>Tell us a bit about yourself</Text>
                </View>

                {/* Avatar upload */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar} activeOpacity={0.85}>
                        {avatar ? (
                            <Image source={{ uri: avatar.uri }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarPersonIcon}>👤</Text>
                            </View>
                        )}
                        {/* Camera action button */}
                        <View style={styles.cameraButton}>
                            <Text style={styles.cameraEmoji}>📷</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Form fields */}
                <View style={styles.form}>
                    {/* Full Name */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>FULL NAME</Text>
                        <View style={styles.inputContainer}>
                            <View style={styles.inputIconWrapper}>
                                <Text style={styles.inputIcon}>👤</Text>
                            </View>
                            <TextInput
                                style={styles.textInput}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your full name"
                                placeholderTextColor="rgba(107, 114, 128, 0.4)"
                            />
                        </View>
                    </View>

                    {/* Email Address */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
                        <View style={styles.inputContainer}>
                            <View style={styles.inputIconWrapper}>
                                <Text style={styles.inputIcon}>✉️</Text>
                            </View>
                            <TextInput
                                style={styles.textInput}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter your email"
                                placeholderTextColor="rgba(107, 114, 128, 0.4)"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    {/* Phone Number — non-editable */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
                        <View style={styles.inputContainerDisabled}>
                            <View style={styles.inputIconWrapper}>
                                <Text style={[styles.inputIcon, { opacity: 0.4 }]}>📞</Text>
                            </View>
                            <Text style={styles.phoneText}>{user?.phone || '+91XXXXXXXXXX'}</Text>
                        </View>
                    </View>

                    {/* Home Address */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>HOME ADDRESS</Text>
                        <View style={styles.inputContainer}>
                            <View style={styles.inputIconWrapper}>
                                <Text style={styles.inputIcon}>📍</Text>
                            </View>
                            <TextInput
                                style={styles.textInput}
                                value={homeAddress}
                                onChangeText={setHomeAddress}
                                placeholder="Add your location"
                                placeholderTextColor="rgba(107, 114, 128, 0.4)"
                            />
                        </View>
                    </View>
                </View>

                {/* Save & Continue button */}
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
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0FF',
    },

    // Decorative blurs
    glowBL: {
        position: 'absolute',
        bottom: -80,
        left: -80,
        width: 256,
        height: 256,
        borderRadius: 9999,
        backgroundColor: 'rgba(190, 163, 216, 0.05)',
    },
    glowTR: {
        position: 'absolute',
        top: -80,
        right: -80,
        width: 256,
        height: 256,
        borderRadius: 9999,
        backgroundColor: 'rgba(190, 163, 216, 0.05)',
    },

    // Header — glassmorphic
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 52 : 16,
        paddingBottom: 12,
        backgroundColor: 'rgba(245, 240, 255, 0.8)',
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        fontSize: 18,
        color: '#BEA3D8',
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1E1B2E',
        letterSpacing: -0.45,
        lineHeight: 28,
    },

    // Scroll content
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 56,
        gap: 40,
    },

    // Hero subtext
    heroSubtext: {
        alignItems: 'center',
    },
    subtitleText: {
        fontSize: 16,
        fontWeight: '400',
        color: '#6B7280',
        lineHeight: 26,
        textAlign: 'center',
    },

    // Avatar section — 96×96
    avatarSection: {
        alignItems: 'center',
    },
    avatarContainer: {
        width: 96,
        height: 96,
    },
    avatarImage: {
        width: 96,
        height: 96,
        borderRadius: 9999,
    },
    avatarPlaceholder: {
        width: 96,
        height: 96,
        borderRadius: 9999,
        backgroundColor: '#EDE9FE',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 4,
    },
    avatarPersonIcon: {
        fontSize: 32,
        color: '#BEA3D8',
    },

    // Camera button — 32×32, white, bottom-right
    cameraButton: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 32,
        height: 32,
        borderRadius: 9999,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#F6F1FF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 4,
    },
    cameraEmoji: {
        fontSize: 13,
    },

    // Form
    form: {
        gap: 24,
        paddingTop: 8,
    },

    // Field group
    fieldGroup: {
        gap: 8,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
        lineHeight: 18,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        paddingLeft: 4,
    },

    // Input container — white bg, radius 12, shadow
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        height: 55,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 2,
    },

    // Disabled (phone) — faded bg
    inputContainerDisabled: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(246, 241, 255, 0.5)',
        borderRadius: 12,
        height: 56,
        opacity: 0.8,
    },

    inputIconWrapper: {
        paddingLeft: 16,
        width: 48,
        alignItems: 'center',
    },
    inputIcon: {
        fontSize: 16,
        color: '#BEA3D8',
        opacity: 0.6,
    },

    // Text input — 16px, left padding 48
    textInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '400',
        color: '#1E1B2E',
        paddingRight: 16,
        paddingVertical: 18,
        lineHeight: 19,
    },

    // Phone text (non-editable)
    phoneText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '400',
        color: '#6B7280',
        lineHeight: 24,
    },

    // CTA button — #BEA3D8, radius 12, 56px
    ctaButton: {
        height: 56,
        backgroundColor: '#BEA3D8',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 4,
    },
    ctaButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        lineHeight: 24,
    },
});
