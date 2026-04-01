import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Image, KeyboardAvoidingView,
    Platform, Modal, FlatList, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import SakhiModal from '../src/components/SakhiModal';

const LANGUAGES = [
    'English', 'Hindi', 'Marathi', 'Bengali', 'Tamil',
    'Telugu', 'Kannada', 'Malayalam', 'Punjabi', 'Gujarati',
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function EditProfileScreen() {
    const router = useRouter();
    const [modal, setModal] = useState(null);

    // Form state
    const [name, setName] = useState('Priya Sharma');
    const [email, setEmail] = useState('priya.sharma@example.com');
    const [avatarUri, setAvatarUri] = useState(null);

    // DOB state
    const [dobDay, setDobDay] = useState('12');
    const [dobMonth, setDobMonth] = useState('05');
    const [dobYear, setDobYear] = useState('1995');
    const [showDobPicker, setShowDobPicker] = useState(false);
    const [tempDay, setTempDay] = useState('12');
    const [tempMonth, setTempMonth] = useState('05');
    const [tempYear, setTempYear] = useState('1995');

    // Language state
    const [language, setLanguage] = useState('English');
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
    const formattedDob = `${dobDay.padStart(2,'0')}/${dobMonth.padStart(2,'0')}/${dobYear}`;

    const openDobPicker = () => {
        setTempDay(dobDay); setTempMonth(dobMonth); setTempYear(dobYear);
        setShowDobPicker(true);
    };

    const confirmDob = () => {
        const d = parseInt(tempDay, 10);
        const m = parseInt(tempMonth, 10);
        const y = parseInt(tempYear, 10);
        if (!d || d < 1 || d > 31) { 
            setModal({ icon: '⚠️', title: 'Invalid Day', message: 'Please enter a valid day (1-31).', buttons: [{text: 'OK', onPress: () => setModal(null)}]});
            return; 
        }
        if (!m || m < 1 || m > 12) { 
            setModal({ icon: '⚠️', title: 'Invalid Month', message: 'Please enter a valid month (1-12).', buttons: [{text: 'OK', onPress: () => setModal(null)}]});
            return; 
        }
        if (!y || y < 1920 || y > new Date().getFullYear() - 5) {
            setModal({ icon: '⚠️', title: 'Invalid Year', message: 'Please enter a valid birth year.', buttons: [{text: 'OK', onPress: () => setModal(null)}]});
            return;
        }
        setDobDay(String(d).padStart(2, '0'));
        setDobMonth(String(m).padStart(2, '0'));
        setDobYear(String(y));
        setShowDobPicker(false);
    };

    // ── Save Profile ───────────────────────────────────────────
    const handleSave = () => {
        if (!name.trim()) { 
            setModal({ icon: '⚠️', title: 'Missing Info', message: 'Full name cannot be empty.', buttons: [{text: 'OK', onPress: () => setModal(null)}]});
            return; 
        }
        if (!email.includes('@')) { 
            setModal({ icon: '⚠️', title: 'Invalid Email', message: 'Please enter a valid email address.', buttons: [{text: 'OK', onPress: () => setModal(null)}]});
            return; 
        }
        setModal({
            icon: '✅',
            title: 'Profile Updated!',
            message: 'Your profile changes have been saved successfully.',
            buttons: [{ text: 'Done', onPress: () => { setModal(null); router.back(); } }]
        });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : null}
            >
                {/* ── Header ── */}
                <View style={styles.header}>
                    <View style={styles.headerLeftWrap}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
                            <Text style={styles.headerIcon}>←</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                    <View style={styles.headerRightWrap}>
                        <TouchableOpacity style={styles.saveTopBtn} onPress={handleSave}>
                            <Text style={styles.saveTopText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Scrollable Form ── */}
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
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
                                    placeholderTextColor="#7B7487"
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
                                    placeholderTextColor="#7B7487"
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
                                <Text style={styles.inputText}>+91 98765 43210</Text>
                                <TouchableOpacity onPress={() => router.push('/change-phone')}>
                                    <Text style={styles.changeLinkText}>Change Number →</Text>
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
                                    <Text style={styles.verifyIcon}>✓</Text>
                                </View>
                                <Text style={styles.verifyLabel}>Aadhaar Verified</Text>
                            </View>
                            <View style={styles.verifyRow}>
                                <View style={styles.verifyIconWrap}>
                                    <Text style={styles.verifyIcon}>✓</Text>
                                </View>
                                <Text style={styles.verifyLabel}>Gender Verified</Text>
                            </View>
                        </View>

                    </View>
                </ScrollView>

                {/* ── Fixed Save Button ── */}
                <View style={styles.bottomFixedWrap}>
                    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85} onPress={handleSave}>
                        <Text style={styles.actionBtnText}>Save Changes</Text>
                    </TouchableOpacity>
                </View>

            </KeyboardAvoidingView>

            {/* ════ DOB Picker Modal ════ */}
            <Modal visible={showDobPicker} transparent animationType="slide">
                <Pressable style={styles.modalBackdrop} onPress={() => setShowDobPicker(false)} />
                <View style={styles.pickerSheet}>
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
                <View style={styles.pickerSheet}>
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
    safeArea: { flex: 1, backgroundColor: '#F5F0FF' },
    keyboardView: { flex: 1 },

    // ── Header ──
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 24, paddingVertical: 16,
        backgroundColor: 'rgba(245, 240, 255, 0.95)', zIndex: 10,
    },
    headerLeftWrap: { width: 60, alignItems: 'flex-start' },
    headerRightWrap: { width: 60, alignItems: 'flex-end' },
    iconBtn: { width: 32, height: 32, justifyContent: 'center' },
    headerIcon: { fontSize: 24, color: '#BEA3D8', fontWeight: 'bold' },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.45, textAlign: 'center' },
    saveTopBtn: { paddingVertical: 4 },
    saveTopText: { fontSize: 16, fontWeight: '700', color: '#BEA3D8' },

    // ── Scroll ──
    scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 140 },

    // ── Avatar ──
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
    fieldLabel: { fontSize: 11, fontWeight: '700', color: '#7B7487', letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 2 },
    inputWrap: {
        backgroundColor: '#F6F1FF', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 13,
        minHeight: 48, justifyContent: 'center',
    },
    inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    input: { fontSize: 15, fontWeight: '500', color: '#1C1A25', flex: 1, padding: 0, margin: 0 },
    inputText: { fontSize: 15, fontWeight: '500', color: '#1C1A25' },
    changeLinkText: { fontSize: 13, fontWeight: '700', color: '#BEA3D8' },
    inputEndIcon: { fontSize: 18, color: '#7B7487' },

    // ── Verification ──
    verificationBox: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16, gap: 14, marginTop: 4, borderWidth: 1, borderColor: '#BBF7D0' },
    verifyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    verifyIconWrap: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' },
    verifyIcon: { fontSize: 11, fontWeight: 'bold', color: '#FFF' },
    verifyLabel: { fontSize: 14, fontWeight: '600', color: '#059669' },

    // ── Bottom Save ──
    bottomFixedWrap: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        backgroundColor: '#F5F0FF',
        shadowColor: '#BEA3D8', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
    },
    actionBtn: {
        width: '100%', height: 56, backgroundColor: '#BEA3D8',
        borderRadius: 14, justifyContent: 'center', alignItems: 'center',
        shadowColor: '#BEA3D8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
    },
    actionBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },

    // ── Modals ──
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    pickerSheet: {
        backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    },
    pickerHandle: {
        width: 40, height: 4, backgroundColor: '#E2D9F3',
        borderRadius: 2, alignSelf: 'center', marginBottom: 20,
    },
    pickerTitle: { fontSize: 17, fontWeight: '700', color: '#1E1B2E', marginBottom: 20, textAlign: 'center' },

    // DOB
    dobRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 28 },
    dobFieldWrap: { flex: 1, gap: 6 },
    dobFieldLabel: { fontSize: 11, fontWeight: '600', color: '#7B7487', textTransform: 'uppercase', letterSpacing: 0.8 },
    dobInput: {
        backgroundColor: '#F6F1FF', borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 14,
        fontSize: 18, fontWeight: '600', color: '#1C1A25', textAlign: 'center',
    },
    dobSep: { fontSize: 22, fontWeight: '600', color: '#BEA3D8', paddingBottom: 10 },
    pickerActions: { flexDirection: 'row', gap: 12 },
    cancelBtn: {
        flex: 1, height: 50, borderRadius: 12,
        backgroundColor: '#F6F1FF', justifyContent: 'center', alignItems: 'center',
    },
    cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#7B7487' },
    confirmBtn: {
        flex: 1, height: 50, borderRadius: 12,
        backgroundColor: '#BEA3D8', justifyContent: 'center', alignItems: 'center',
    },
    confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

    // Language list
    langItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 8,
        borderBottomWidth: 1, borderBottomColor: '#F6F1FF',
    },
    langItemActive: { backgroundColor: '#F6F1FF', borderRadius: 10, marginHorizontal: -8, paddingHorizontal: 16 },
    langItemText: { fontSize: 15, fontWeight: '500', color: '#1C1A25' },
    langItemTextActive: { fontWeight: '700', color: '#BEA3D8' },
    langCheck: { fontSize: 16, color: '#BEA3D8', fontWeight: '700' },
});
