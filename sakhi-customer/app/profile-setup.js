import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, Alert, Pressable, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';
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

    const InputField = ({ label, value, onChangeText, placeholder, keyboardType, editable = true, icon }) => (
        <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <View style={[styles.fieldInputRow, !editable && styles.fieldInputDisabled]}>
                {icon && <Text style={styles.fieldIcon}>{icon}</Text>}
                <TextInput
                    style={styles.fieldInput}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.outline}
                    keyboardType={keyboardType || 'default'}
                    editable={editable}
                />
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Background decorators */}
            <View style={styles.glowBL} />
            <View style={styles.glowTR} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backArrow}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Set Up Your Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.subtitle}>Tell us a bit about yourself</Text>

                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity style={styles.avatarWrapper} onPress={pickAvatar} activeOpacity={0.85}>
                        {avatar ? (
                            <Image source={{ uri: avatar.uri }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={{ fontSize: 48, color: Colors.primaryContainer }}>👤</Text>
                            </View>
                        )}
                        <View style={styles.cameraBtn}>
                            <Text style={{ fontSize: 14 }}>📷</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Form fields */}
                <View style={styles.form}>
                    <InputField
                        label="Full Name"
                        value={name}
                        onChangeText={setName}
                        placeholder="Enter your full name"
                        icon="👤"
                    />
                    <InputField
                        label="Email Address"
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Enter your email"
                        keyboardType="email-address"
                        icon="✉️"
                    />
                    <InputField
                        label="Phone Number"
                        value={user?.phone || ''}
                        editable={false}
                        icon="📞"
                    />
                    <InputField
                        label="Home Address"
                        value={homeAddress}
                        onChangeText={setHomeAddress}
                        placeholder="Add your home location"
                        icon="🏠"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.88}
                >
                    {saving
                        ? <ActivityIndicator color={Colors.onPrimary} />
                        : <Text style={styles.saveBtnText}>Save & Continue</Text>
                    }
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0FF' },
    glowBL: {
        position: 'absolute', bottom: -80, left: -80,
        width: 256, height: 256, borderRadius: 128,
        backgroundColor: 'rgba(99,14,212,0.05)',
    },
    glowTR: {
        position: 'absolute', top: -80, right: -80,
        width: 256, height: 256, borderRadius: 128,
        backgroundColor: 'rgba(103,75,181,0.05)',
    },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 56, paddingHorizontal: 24, paddingBottom: 12,
        backgroundColor: 'rgba(245,240,255,0.85)',
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.surfaceContainer,
        alignItems: 'center', justifyContent: 'center',
    },
    backArrow: { fontSize: 20, color: Colors.primaryContainer, fontWeight: '700' },
    headerTitle: { ...Typography.titleMedium, color: Colors.brandPurpleDark },
    content: { paddingHorizontal: 24, paddingBottom: 48, paddingTop: 16 },
    subtitle: { ...Typography.bodyMedium, color: Colors.brandGray, textAlign: 'center', marginBottom: 28 },
    avatarSection: { alignItems: 'center', marginBottom: 32 },
    avatarWrapper: { position: 'relative' },
    avatarImage: {
        width: 96, height: 96, borderRadius: 48,
        borderWidth: 3, borderColor: Colors.primaryFixed,
    },
    avatarPlaceholder: {
        width: 96, height: 96, borderRadius: 48,
        backgroundColor: Colors.primaryFixed,
        alignItems: 'center', justifyContent: 'center',
        ...Shadows.editorial,
    },
    cameraBtn: {
        position: 'absolute', bottom: 0, right: 0,
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: Colors.surfaceContainerLowest,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Colors.outlineVariant,
        ...Shadows.card,
    },
    form: { gap: 16, marginBottom: 28 },
    fieldWrapper: { gap: 6 },
    fieldLabel: {
        fontSize: 11, fontWeight: '600', color: Colors.brandGray,
        textTransform: 'uppercase', letterSpacing: 0.8, paddingLeft: 4,
    },
    fieldInputRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
        ...Shadows.card,
    },
    fieldInputDisabled: { backgroundColor: 'rgba(246,241,255,0.5)', opacity: 0.7 },
    fieldIcon: { fontSize: 18 },
    fieldInput: { flex: 1, fontSize: 15, color: Colors.onSurface },
    saveBtn: {
        backgroundColor: Colors.primaryContainer,
        borderRadius: BorderRadius.md, paddingVertical: 17,
        alignItems: 'center', ...Shadows.editorial,
    },
    saveBtnText: { color: Colors.onPrimary, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
});
