import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    SafeAreaView, TextInput, Image, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';

export default function EditProfileScreen() {
    const router = useRouter();

    const [name, setName] = useState("Priya Sharma");
    const [email, setEmail] = useState("priya.sharma@example.com");

    const handleSave = () => {
        router.back();
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView 
                style={styles.keyboardView} 
                behavior={Platform.OS === 'ios' ? 'padding' : null}
            >
                {/* Header AppBar */}
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

                {/* Main Content Area */}
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Avatar Header */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarWrap}>
                            {/* Simple simulated graphic placeholder for avatar. Can use a real Image here too. */}
                            <View style={styles.avatarImagePlaceholder}>
                                <Text style={{fontSize: 40}}>👩🏽</Text>
                            </View>
                            <TouchableOpacity style={styles.avatarEditBtn} activeOpacity={0.8}>
                                <Text style={styles.avatarEditIcon}>📷</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Main Form Card */}
                    <View style={styles.formCard}>
                        
                        {/* Name Field */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>FULL NAME</Text>
                            <View style={styles.inputWrap}>
                                <TextInput 
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Enter full name"
                                    placeholderTextColor="#7B7487"
                                />
                            </View>
                        </View>

                        {/* Email Field */}
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
                                />
                            </View>
                        </View>

                        {/* Phone Field (Read Only style mostly, with link inside) */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>PHONE</Text>
                            <View style={[styles.inputWrap, styles.inputRow]}>
                                <Text style={styles.inputText}>+91 98765 43210</Text>
                                <TouchableOpacity>
                                    <Text style={styles.changeLinkText}>Change Number <Text style={{fontSize: 12}}>→</Text></Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Date of Birth Field (Simulated Picker) */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>DATE OF BIRTH</Text>
                            <TouchableOpacity style={[styles.inputWrap, styles.inputRow]} activeOpacity={0.7}>
                                <Text style={styles.inputText}>12/05/1995</Text>
                                <Text style={styles.inputEndIcon}>📅</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Preferred Language Field (Simulated Dropdown) */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>PREFERRED LANGUAGE</Text>
                            <TouchableOpacity style={[styles.inputWrap, styles.inputRow]} activeOpacity={0.7}>
                                <Text style={styles.inputText}>English</Text>
                                <Text style={[styles.inputEndIcon, { fontSize: 14 }]}>▼</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Verification Status Area */}
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

                {/* Fixed Bottom Save Action */}
                <View style={styles.bottomFixedWrap}>
                    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={handleSave}>
                        <Text style={styles.actionBtnText}>Save Changes</Text>
                    </TouchableOpacity>
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F5F0FF' },
    keyboardView: { flex: 1 },
    
    /* Header AppBar */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24, paddingVertical: 16,
        backgroundColor: 'rgba(245, 240, 255, 0.9)',
        zIndex: 10,
    },
    headerLeftWrap: { width: 60, alignItems: 'flex-start' },
    headerRightWrap: { width: 60, alignItems: 'flex-end' },
    iconBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'flex-start' },
    headerIcon: { fontSize: 24, color: '#BEA3D8', fontWeight: 'bold' },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#1E1B2E', letterSpacing: -0.45, textAlign: 'center' },
    saveTopBtn: { paddingVertical: 4 },
    saveTopText: { fontSize: 16, fontWeight: '700', color: '#BEA3D8' },

    /* Scroll Payload */
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 32, 
        paddingBottom: 140, // Space for the fixed bottom save button
    },

    /* Avatar Element */
    avatarSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarWrap: {
        position: 'relative',
        width: 100, height: 100,
        backgroundColor: '#FFFFFF',
        borderRadius: 50,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 4, borderColor: '#FFFFFF',
        shadowColor: 'rgba(0, 0, 0, 0.1)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 8, elevation: 4,
    },
    avatarImagePlaceholder: {
        width: '100%', height: '100%',
        backgroundColor: '#FFDAC1', // Simulated skin tone aesthetic
        borderRadius: 50,
        justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
    },
    avatarEditBtn: {
        position: 'absolute', right: -4, bottom: 0,
        width: 32, height: 32,
        backgroundColor: '#BEA3D8',
        borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#FFFFFF',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    },
    avatarEditIcon: { fontSize: 14, color: '#FFF' },

    /* Main Form Area */
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24, gap: 24,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 6,
    },
    fieldGroup: { gap: 6 },
    fieldLabel: {
        fontSize: 12, fontWeight: '700', color: '#7B7487', letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 4,
    },
    inputWrap: {
        backgroundColor: '#F6F1FF',
        borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 12,
        minHeight: 48, justifyContent: 'center',
    },
    inputRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    input: {
        fontSize: 16, fontWeight: '500', color: '#1C1A25',
        flex: 1, padding: 0, margin: 0,
    },
    inputText: {
        fontSize: 16, fontWeight: '500', color: '#1C1A25',
    },
    changeLinkText: {
        fontSize: 14, fontWeight: '700', color: '#BEA3D8',
    },
    inputEndIcon: {
        fontSize: 16, color: '#7B7487',
    },

    /* Verified Box Segment */
    verificationBox: {
        backgroundColor: '#F6F1FF',
        borderRadius: 12,
        padding: 20, gap: 16,
        marginTop: 8,
    },
    verifyRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    verifyIconWrap: {
        width: 18, height: 18, borderRadius: 9, backgroundColor: '#059669',
        justifyContent: 'center', alignItems: 'center',
    },
    verifyIcon: { fontSize: 10, fontWeight: 'bold', color: '#FFF' },
    verifyLabel: { fontSize: 14, fontWeight: '600', color: '#059669' },

    /* Fixed Bottom Form Action */
    bottomFixedWrap: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 104, padding: 24,
        alignItems: 'center',
        backgroundColor: '#F5F0FF',
        // Slight simulated shadow up
        shadowColor: '#F5F0FF', shadowOffset: { width: 0, height: -20 }, shadowOpacity: 1, shadowRadius: 20, elevation: 10,
    },
    actionBtn: {
        width: '100%', height: 56,
        backgroundColor: '#9867D9', // To simulate linear-grad: linear-gradient(90deg, #9867D9 0%, #BEA3D8 100%)
        borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: 'rgba(0,0,0,0.1)', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 15, elevation: 5,
    },
    actionBtnText: {
        fontSize: 16, fontWeight: '700', color: '#FFFFFF',
    },
});
