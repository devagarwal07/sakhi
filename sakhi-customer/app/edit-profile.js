import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Image, KeyboardAvoidingView,
    Platform, Modal, FlatList, Pressable, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import SakhiModal from '../src/components/SakhiModal';
import { useAuth } from '../src/context/AuthContext';
import { updateProfile } from '../src/api/endpoints';
import { KEYBOARD_BEHAVIOR } from '../src/utils/androidUtils';

const LANGUAGES = [
    'English', 'Hindi', 'Marathi', 'Bengali', 'Tamil',
    'Telugu', 'Kannada', 'Malayalam', 'Punjabi', 'Gujarati',
];

export default function EditProfileScreen() {
    const router = useRouter();
    const { user, updateUser } = useAuth();
    const insets = useSafeAreaInsets();
    const [modal, setModal] = useState(null);
    const [saving, setSaving] = useState(false);

    const pickerSheetPaddingBottom = Math.max(insets.bottom + 10, 28);
    const footerPaddingBottom = Math.max(insets.bottom, Platform.OS === 'ios' ? 36 : 24);
    const scrollPaddingBottom = 20 + 56 + footerPaddingBottom + 24;
    const keyboardVerticalOffset = 64;

    // Form state — seeded from auth context user
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [avatarUri, setAvatarUri] = useState(user?.avatar_url || user?.avatar || null);

    // DOB state
    const parseDobPart = (field, fallback) => {
        if (user?.dob) {
            const parts = user.dob.split('-');
            if (field === 'year') return parts[0] || fallback;
            if (field === 'month') return parts[1] || fallback;
            if (field === 'day') return parts[2] || fallback;
        }
        return fallback;
    };
    const [dobDay, setDobDay] = useState(parseDobPart('day', '01'));
    const [dobMonth, setDobMonth] = useState(parseDobPart('month', '01'));
    const [dobYear, setDobYear] = useState(parseDobPart('year', '1995'));
    const [showDobPicker, setShowDobPicker] = useState(false);
    const [tempDay, setTempDay] = useState(dobDay);
    const [tempMonth, setTempMonth] = useState(dobMonth);
    const [tempYear, setTempYear] = useState(dobYear);

    // Language state
    const [language, setLanguage] = useState(user?.preferred_language || 'English');
    const [showLangPicker, setShowLangPicker] = useState(false);

    // ── Avatar Picker ──────────────────────────────────────────
    const handlePickAvatar = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            setModal({
                icon: '⚠️',
                title: 'Permission Required',
                message: 'Please allow photo library access to update your profile picture.',
                buttons: [{ text: 'OK', onPress: () => setModal(null) }]
            });
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets?.length > 0) {
            setAvatarUri(result.assets[0].uri);
        }
    };

    // ── DOB Helpers ────────────────────────────────────────────
    const formattedDob = `${dobDay.padStart(2, '0')}/${dobMonth.padStart(2, '0')}/${dobYear}`;

    const openDobPicker = () => {
        setTempDay(dobDay); setTempMonth(dobMonth); setTempYear(dobYear);
        setShowDobPicker(true);
    };

    const confirmDob = () => {
        const d = parseInt(tempDay, 10);
        const m = parseInt(tempMonth, 10);
        const y = parseInt(tempYear, 10);
        if (!d || d < 1 || d > 31) {
            setModal({ icon: '⚠️', title: 'Invalid Day', message: 'Please enter a valid day (1-31).', buttons: [{ text: 'OK', onPress: () => setModal(null) }] });
            return;
        }
        if (!m || m < 1 || m > 12) {
            setModal({ icon: '⚠️', title: 'Invalid Month', message: 'Please enter a valid month (1-12).', buttons: [{ text: 'OK', onPress: () => setModal(null) }] });
            return;
        }
        if (!y || y < 1920 || y > new Date().getFullYear() - 5) {
            setModal({ icon: '⚠️', title: 'Invalid Year', message: 'Please enter a valid birth year.', buttons: [{ text: 'OK', onPress: () => setModal(null) }] });
            return;
        }
        setDobDay(String(d).padStart(2, '0'));
        setDobMonth(String(m).padStart(2, '0'));
        setDobYear(String(y));
        setShowDobPicker(false);
    };

    // ── Save Profile ───────────────────────────────────────────
    const handleSave = async () => {
        if (!name.trim()) {
            setModal({ icon: '⚠️', title: 'Missing Info', message: 'Full name cannot be empty.', buttons: [{ text: 'OK', onPress: () => setModal(null) }] });
            return;
        }
        if (email && !email.includes('@')) {
            setModal({ icon: '⚠️', title: 'Invalid Email', message: 'Please enter a valid email address.', buttons: [{ text: 'OK', onPress: () => setModal(null) }] });
            return;
        }

        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('name', name.trim());
            if (email) formData.append('email', email.trim());
            formData.append('preferred_language', language);
            const dob = `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`;
            formData.append('dob', dob);

            // Attach avatar only if it's a new local file (not an http/s URL already on server)
            if (avatarUri && !avatarUri.startsWith('http')) {
                const filename = avatarUri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : 'image/jpeg';
                formData.append('avatar', { uri: avatarUri, name: filename, type });
            }

            const { data } = await updateProfile(formData);
            updateUser(data.user || data);

            setModal({
                icon: '✅',
                title: 'Profile Updated!',
                message: 'Your profile changes have been saved successfully.',
                buttons: [{ text: 'Done', onPress: () => { setModal(null); if (router.canGoBack()) router.back(); else router.replace("/"); } }]
            });
        } catch (err) {
            setModal({
                icon: '🔄',
                title: 'Error',
                message: err?.response?.data?.message || 'Could not save profile. Please try again.',
                buttons: [{ text: 'OK', onPress: () => setModal(null) }]
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={KEYBOARD_BEHAVIOR}
                keyboardVerticalOffset={keyboardVerticalOffset}
            >
                {/* ── Header ── */}
                <View style={styles.header}>
                    <View style={styles.headerTitleWrap}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
                            <Text style={styles.headerIcon}>←</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Edit Profile</Text>
                    </View>
                    <View style={styles.headerRightWrap}>
                        <TouchableOpacity style={styles.saveTopBtn} onPress={handleSave} disabled={saving}>
                            {saving
                                ? <ActivityIndicator size="small" color="#BEA3D8" />
                                : <Text style={styles.saveTopText}>Save</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Scrollable Form ── */}
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Avatar */}
                    <View style={styles.avatarSection}>
                        <TouchableOpacity style={styles.avatarWrap} onPress={handlePickAvatar} activeOpacity={0.85}>
                            {avatarUri ? (
                                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                            ) : (
                                <View style={styles.avatarImagePlaceholder}>
                                    <Text style={{ fontSize: 40 }}>👩🏽</Text>
                                </View>
                            )}
                            <View style={styles.avatarEditBtn}>
                                <Text style={styles.avatarEditIcon}>📷</Text>
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.avatarHint}>Tap to change photo</Text>
                    </View>

                    {/* Form Card */}
                    <View style={styles.formCard}>

                        {/* Full Name */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>FULL NAME</Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Enter full name"
                                    placeholderTextColor="#94A3B8"
                                    returnKeyType="next"
                                />
                            </View>
                        </View>

                        {/* Email */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>EMAIL</Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="Enter email address"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    returnKeyType="done"
                                />
                            </View>
                        </View>

                        {/* Phone (read-only with change link) */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>PHONE</Text>
                            <View style={[styles.inputWrap, styles.inputRow]}>
                                <Text style={styles.inputText}>{user?.phone || '—'}</Text>
                                <TouchableOpacity onPress={() => router.push('/change-phone')}>
                                    <Text style={styles.changeLinkText}>Change →</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Date of Birth → opens picker modal */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>DATE OF BIRTH</Text>
                            <TouchableOpacity
                                style={[styles.inputWrap, styles.inputRow]}
                                activeOpacity={0.7}
                                onPress={openDobPicker}
                            >
                                <Text style={styles.inputText}>{formattedDob}</Text>
                                <Text style={styles.inputEndIcon}>📅</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Preferred Language → opens picker modal */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>PREFERRED LANGUAGE</Text>
                            <TouchableOpacity
                                style={[styles.inputWrap, styles.inputRow]}
                                activeOpacity={0.7}
                                onPress={() => setShowLangPicker(true)}
                            >
                                <Text style={styles.inputText}>{language}</Text>
                                <Text style={[styles.inputEndIcon, { fontSize: 14 }]}>▼</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Verification Status Badges */}
                        <View style={styles.verificationBox}>
                            <View style={styles.verifyRow}>
                                <View style={styles.verifyIconWrap}>
                                    <Text style={styles.verifyIcon}>
                                        {user?.verification_status === 'approved' ? '✓' : '…'}
                                    </Text>
                                </View>
                                <Text style={styles.verifyLabel}>
                                    {user?.verification_status === 'approved' ? 'Identity Verified' : 'Verification Pending'}
                                </Text>
                            </View>
                            {user?.gender_verified && (
                                <View style={styles.verifyRow}>
                                    <View style={styles.verifyIconWrap}>
                                        <Text style={styles.verifyIcon}>✓</Text>
                                    </View>
                                    <Text style={styles.verifyLabel}>Gender Verified</Text>
                                </View>
                            )}
                        </View>

                    </View>
                </ScrollView>

                {/* ── Fixed Save Button ── */}
                <View style={[styles.bottomFixedWrap, { paddingBottom: footerPaddingBottom }]}>
                    <TouchableOpacity style={[styles.actionBtn, saving && { opacity: 0.6 }]} activeOpacity={0.85} onPress={handleSave} disabled={saving}>
                        {saving
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.actionBtnText}>Save Changes</Text>
                        }
                    </TouchableOpacity>
                </View>

            </KeyboardAvoidingView>

            {/* ════ DOB Picker Modal ════ */}
            <Modal visible={showDobPicker} transparent animationType="slide">
                <Pressable style={styles.modalBackdrop} onPress={() => setShowDobPicker(false)} />
                <View style={[styles.pickerSheet, { paddingBottom: pickerSheetPaddingBottom }]}>
                    <View style={styles.pickerHandle} />
                    <Text style={styles.pickerTitle}>Select Date of Birth</Text>

                    <View style={styles.dobRow}>
                        <View style={styles.dobFieldWrap}>
                            <Text style={styles.dobFieldLabel}>Day</Text>
                            <TextInput
                                style={styles.dobInput}
                                value={tempDay}
                                onChangeText={setTempDay}
                                keyboardType="number-pad"
                                maxLength={2}
                                placeholder="DD"
                                placeholderTextColor="#AAA"
                            />
                        </View>
                        <Text style={styles.dobSep}>/</Text>
                        <View style={styles.dobFieldWrap}>
                            <Text style={styles.dobFieldLabel}>Month</Text>
                            <TextInput
                                style={styles.dobInput}
                                value={tempMonth}
                                onChangeText={setTempMonth}
                                keyboardType="number-pad"
                                maxLength={2}
                                placeholder="MM"
                                placeholderTextColor="#AAA"
                            />
                        </View>
                        <Text style={styles.dobSep}>/</Text>
                        <View style={[styles.dobFieldWrap, { flex: 2 }]}>
                            <Text style={styles.dobFieldLabel}>Year</Text>
                            <TextInput
                                style={styles.dobInput}
                                value={tempYear}
                                onChangeText={setTempYear}
                                keyboardType="number-pad"
                                maxLength={4}
                                placeholder="YYYY"
                                placeholderTextColor="#AAA"
                            />
                        </View>
                    </View>

                    <View style={styles.pickerActions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDobPicker(false)}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmBtn} onPress={confirmDob}>
                            <Text style={styles.confirmBtnText}>Confirm</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ════ Language Picker Modal ════ */}
            <Modal visible={showLangPicker} transparent animationType="slide">
                <Pressable style={styles.modalBackdrop} onPress={() => setShowLangPicker(false)} />
                <View style={[styles.pickerSheet, { paddingBottom: pickerSheetPaddingBottom }]}>
                    <View style={styles.pickerHandle} />
                    <Text style={styles.pickerTitle}>Preferred Language</Text>
                    <FlatList
                        data={LANGUAGES}
                        keyExtractor={(item) => item}
                        style={{ maxHeight: 280 }}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.langItem, item === language && styles.langItemActive]}
                                onPress={() => { setLanguage(item); setShowLangPicker(false); }}
                            >
                                <Text style={[styles.langItemText, item === language && styles.langItemTextActive]}>
                                    {item}
                                </Text>
                                {item === language && <Text style={styles.langCheck}>✓</Text>}
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>

            <SakhiModal config={modal} onClose={() => setModal(null)} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    headerTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E1B2E',
        letterSpacing: -0.5,
        marginLeft: 16
    },
    safeArea: { flex: 1, backgroundColor: '#F5F0FF' },
    keyboardView: { flex: 1 },
    headerLeftWrap: { width: 60, alignItems: 'flex-start' },
    headerRightWrap: { width: 60, alignItems: 'flex-end' },
    saveTopBtn: { paddingVertical: 4, paddingHorizontal: 4, minWidth: 40, alignItems: 'center' },
    saveTopText: { fontSize: 16, fontWeight: '700', color: '#BEA3D8' },
    scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 0 },
    avatarSection: { alignItems: 'center', marginBottom: 28 },
    avatarWrap: {
        position: 'relative', width: 100, height: 100,
        backgroundColor: '#FFFFFF', borderRadius: 50,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 4, borderColor: '#FFFFFF',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 5,
    },
    avatarImage: { width: '100%', height: '100%', borderRadius: 46 },
    avatarImagePlaceholder: {
        width: '100%', height: '100%',
        backgroundColor: '#FFDAC1', borderRadius: 46,
        justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    },
    avatarEditBtn: {
        position: 'absolute', right: -4, bottom: 0,
        width: 32, height: 32, backgroundColor: '#BEA3D8',
        borderRadius: 16, justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#FFFFFF',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
    },
    avatarEditIcon: { fontSize: 14 },
    avatarHint: { marginTop: 10, fontSize: 12, color: '#7B7487', fontWeight: '500' },

    // ── Form Card ──
    formCard: {
        backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, gap: 20,
        shadowColor: '#BEA3D8', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 6,
    },
    fieldGroup: { gap: 6 },
    fieldLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 2 },
    inputWrap: {
        backgroundColor: '#F5F0FF', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 13,
        minHeight: 48, justifyContent: 'center',
    },
    inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    input: { fontSize: 15, fontWeight: '500', color: '#1E1B2E', flex: 1, padding: 0, margin: 0 },
    inputText: { fontSize: 15, fontWeight: '500', color: '#1E1B2E' },
    changeLinkText: { fontSize: 13, fontWeight: '700', color: '#BEA3D8' },
    inputEndIcon: { fontSize: 18, color: '#7B7487' },

    // ── Verification ──
    verificationBox: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16, gap: 14, marginTop: 4, borderWidth: 1, borderColor: '#BBF7D0' },
    verifyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    verifyIconWrap: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' },
    verifyIcon: { fontSize: 11, fontWeight: 'bold', color: '#FFF' },
    verifyLabel: { fontSize: 14, fontWeight: '600', color: '#059669' },
    bottomFixedWrap: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: 20,
        paddingBottom: 24,
        backgroundColor: '#F5F0FF',
        shadowColor: '#BEA3D8', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
    },
    actionBtn: {
        width: '100%', height: 56, backgroundColor: '#BEA3D8',
        borderRadius: 14, justifyContent: 'center', alignItems: 'center',
        shadowColor: '#BEA3D8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
    },
    actionBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    pickerSheet: {
        backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 28,
    },
    pickerHandle: {
        width: 40, height: 4, backgroundColor: '#E2D9F3',
        borderRadius: 2, alignSelf: 'center', marginBottom: 20,
    },
    pickerTitle: { fontSize: 17, fontWeight: '700', color: '#1E1B2E', marginBottom: 20, textAlign: 'center' },
    dobRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 28 },
    dobFieldWrap: { flex: 1, gap: 6 },
    dobFieldLabel: { fontSize: 11, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8 },
    dobInput: {
        backgroundColor: '#F5F0FF', borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 14,
        fontSize: 18, fontWeight: '600', color: '#1E1B2E', textAlign: 'center',
    },
    dobSep: { fontSize: 22, fontWeight: '600', color: '#BEA3D8', paddingBottom: 10 },
    pickerActions: { flexDirection: 'row', gap: 12 },
    cancelBtn: {
        flex: 1, height: 50, borderRadius: 12,
        backgroundColor: '#F5F0FF', justifyContent: 'center', alignItems: 'center',
    },
    cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#94A3B8' },
    confirmBtn: {
        flex: 1, height: 50, borderRadius: 12,
        backgroundColor: '#BEA3D8', justifyContent: 'center', alignItems: 'center',
    },
    confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
    langItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 8,
        borderBottomWidth: 1, borderBottomColor: '#F5F0FF',
    },
    langItemActive: { backgroundColor: '#F5F0FF', borderRadius: 10, marginHorizontal: -8, paddingHorizontal: 16 },
    langItemText: { fontSize: 15, fontWeight: '500', color: '#1E1B2E' },
    langItemTextActive: { fontWeight: '700', color: '#BEA3D8' },
    langCheck: { fontSize: 16, color: '#BEA3D8', fontWeight: '700' },
});
