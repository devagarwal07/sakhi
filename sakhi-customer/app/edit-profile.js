import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Pressable, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';
import { useAuth } from '../src/context/AuthContext';
import { updateProfile } from '../src/api/endpoints';
import Input from '../src/components/Input';
import Button from '../src/components/Button';

export default function EditProfileScreen() {
    const router = useRouter();
    const { user, updateUser } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [accessibilityNotes, setAccessibilityNotes] = useState(user?.accessibility_notes || '');
    const [avatar, setAvatar] = useState(null);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const validate = () => {
        const e = {};
        if (!name.trim()) e.name = 'Name is required';
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email address';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const pickAvatar = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return;
        const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true, aspect: [1, 1], quality: 0.8,
        });
        if (!result.canceled) setAvatar(result.assets[0]);
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('name', name.trim());
            if (email.trim()) formData.append('email', email.trim());
            if (accessibilityNotes.trim()) formData.append('accessibility_notes', accessibilityNotes.trim());
            if (avatar) {
                formData.append('avatar', {
                    uri: avatar.uri, name: 'avatar.jpg', type: 'image/jpeg',
                });
            }
            const { data } = await updateProfile(formData);
            updateUser(data.user || { name, email, accessibility_notes: accessibilityNotes });
            Alert.alert('✅ Saved', 'Your profile has been updated.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    const initials = name.trim() ? name.trim()[0].toUpperCase() : (user?.name?.[0]?.toUpperCase() || '?');

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backArrow}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <Pressable style={styles.saveTextBtn} onPress={handleSave} disabled={saving}>
                    <Text style={[styles.saveText, saving && { opacity: 0.5 }]}>Save</Text>
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Avatar */}
                <TouchableOpacity style={styles.avatarWrapper} onPress={pickAvatar} activeOpacity={0.85}>
                    {avatar ? (
                        <Image source={{ uri: avatar.uri }} style={styles.avatarImg} />
                    ) : user?.avatar_url ? (
                        <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
                    ) : (
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarInitial}>{initials}</Text>
                        </View>
                    )}
                    <View style={styles.cameraOverlay}>
                        <Text style={{ fontSize: 14 }}>📷</Text>
                    </View>
                </TouchableOpacity>
                <Text style={styles.changePhotoHint}>Tap to change photo</Text>

                {/* Form */}
                <Input
                    label="Full Name"
                    value={name}
                    onChangeText={setName}
                    placeholder="Your full name"
                    icon="👤"
                    error={errors.name}
                />

                <Input
                    label="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="youremail@example.com"
                    keyboardType="email-address"
                    icon="✉️"
                    error={errors.email}
                />

                <Input
                    label="Phone Number"
                    value={user?.phone || ''}
                    editable={false}
                    icon="📞"
                />

                <Input
                    label="Accessibility / Special Notes"
                    value={accessibilityNotes}
                    onChangeText={setAccessibilityNotes}
                    placeholder="E.g. wheelchair user, prefer ground floor pickup…"
                    multiline
                    numberOfLines={3}
                    icon="♿"
                />

                <View style={styles.infoCard}>
                    <Text style={styles.infoIcon}>🔒</Text>
                    <Text style={styles.infoText}>
                        Your phone number is linked to your account and cannot be changed here. Contact support if needed.
                    </Text>
                </View>

                <Button
                    title="Save Changes"
                    onPress={handleSave}
                    loading={saving}
                    size="lg"
                    style={{ marginTop: 8 }}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0FF' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.surfaceContainer, alignItems: 'center', justifyContent: 'center',
    },
    backArrow: { fontSize: 20, color: Colors.primaryContainer, fontWeight: '700' },
    headerTitle: { ...Typography.titleMedium, color: Colors.onBackground },
    saveTextBtn: { paddingHorizontal: 4 },
    saveText: { fontSize: 15, fontWeight: '700', color: Colors.primaryContainer },
    content: { paddingHorizontal: 20, paddingBottom: 48, gap: 16, alignItems: 'center' },
    avatarWrapper: { position: 'relative', marginBottom: 4 },
    avatarImg: {
        width: 96, height: 96, borderRadius: 48,
        borderWidth: 3, borderColor: Colors.primaryFixed,
    },
    avatarCircle: {
        width: 96, height: 96, borderRadius: 48,
        backgroundColor: Colors.primaryContainer,
        alignItems: 'center', justifyContent: 'center',
        ...Shadows.editorial,
    },
    avatarInitial: { fontSize: 36, fontWeight: '700', color: '#fff' },
    cameraOverlay: {
        position: 'absolute', bottom: 0, right: 0,
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: Colors.surfaceContainerLowest,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Colors.outlineVariant,
        ...Shadows.card,
    },
    changePhotoHint: { fontSize: 11, color: Colors.onSurfaceVariant, marginBottom: 8 },
    infoCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        backgroundColor: Colors.surfaceContainerLow,
        borderRadius: 12, padding: 14, alignSelf: 'stretch',
    },
    infoIcon: { fontSize: 16 },
    infoText: { flex: 1, fontSize: 12, color: Colors.onSurfaceVariant, lineHeight: 18 },
});
