import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';
import { addEmergencyContact } from '../src/api/endpoints';
import SakhiModal from '../src/components/SakhiModal';

const RELATION_OPTIONS = ['Mother', 'Father', 'Sister', 'Brother', 'Husband', 'Friend', 'Other'];

export default function AddContactScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [relation, setRelation] = useState('');
    const [saving, setSaving] = useState(false);
    const [modal, setModal] = useState(null);

    const handleSave = async () => {
        if (!name.trim() || phone.trim().length < 10) {
            setModal({
                icon: '⚠️',
                title: 'Invalid Details',
                message: 'Please enter a valid name and 10-digit phone number.',
                buttons: [{ text: 'OK', onPress: () => setModal(null) }]
            });
            return;
        }
        setSaving(true);
        try {
            await addEmergencyContact({
                name: name.trim(),
                phone: `+91${phone.trim().replace(/\D/g, '')}`,
                relation,
            });
            if (router.canGoBack()) router.back(); else router.replace("/");
        } catch (err) {
            setModal({
                icon: '⚠️',
                title: 'Error',
                message: err?.response?.data?.message || 'Failed to add contact.',
                buttons: [{ text: 'OK', onPress: () => setModal(null) }]
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
                    <Text style={styles.backArrow}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Add Emergency Contact</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.infoCard}>
                    <Text style={styles.infoIcon}>🛡️</Text>
                    <Text style={styles.infoText}>
                        Emergency contacts will receive an SMS with your live GPS location when you trigger an SOS alert.
                    </Text>
                </View>

                {/* Name */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Full Name</Text>
                    <View style={styles.inputRow}>
                        <Text style={styles.inputIcon}>👤</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Contact's full name"
                            placeholderTextColor={Colors.outline}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>
                </View>

                {/* Phone */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Mobile Number</Text>
                    <View style={styles.inputRow}>
                        <View style={styles.countryCode}>
                            <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                        </View>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="10-digit number"
                            placeholderTextColor={Colors.outline}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            maxLength={10}
                        />
                    </View>
                </View>

                {/* Relation */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Relationship</Text>
                    <View style={styles.relationsGrid}>
                        {RELATION_OPTIONS.map((r) => (
                            <TouchableOpacity
                                key={r}
                                style={[styles.relationChip, relation === r && styles.relationChipSelected]}
                                onPress={() => setRelation(r)}
                            >
                                <Text style={[styles.relationChipText, relation === r && styles.relationChipTextSelected]}>
                                    {r}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving
                        ? <ActivityIndicator color={Colors.onPrimary} />
                        : <Text style={styles.saveBtnText}>Add Contact</Text>
                    }
                </TouchableOpacity>
            </ScrollView>
            {modal && <SakhiModal config={modal} onClose={() => setModal(null)} />}
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
    container: { flex: 1, backgroundColor: '#F5F0FF' },
    
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.surfaceContainer, alignItems: 'center', justifyContent: 'center',
    },
    backArrow: { fontSize: 20, color: Colors.primaryContainer, fontWeight: '700' },
    
    content: { paddingHorizontal: 20, paddingBottom: 48, gap: 20 },
    infoCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        backgroundColor: Colors.primaryFixed, borderRadius: 14, padding: 14,
    },
    infoIcon: { fontSize: 20 },
    infoText: { flex: 1, fontSize: 13, color: Colors.onPrimaryFixed, lineHeight: 18 },
    fieldGroup: { gap: 8 },
    fieldLabel: {
        fontSize: 11, fontWeight: '700', color: Colors.onSurfaceVariant,
        textTransform: 'uppercase', letterSpacing: 0.8,
    },
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 14, overflow: 'hidden', ...Shadows.card,
    },
    inputIcon: { fontSize: 18, paddingHorizontal: 14 },
    input: {
        flex: 1, paddingVertical: 15, paddingRight: 14,
        fontSize: 15, color: Colors.onSurface,
    },
    countryCode: {
        backgroundColor: Colors.surfaceContainerLow,
        paddingHorizontal: 14, paddingVertical: 15,
        borderRightWidth: 1, borderRightColor: Colors.outlineVariant,
    },
    countryCodeText: { fontSize: 14, fontWeight: '500', color: Colors.onSurface },
    relationsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    relationChip: {
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surfaceContainerLowest,
        borderWidth: 1.5, borderColor: Colors.outlineVariant,
    },
    relationChipSelected: {
        backgroundColor: Colors.primaryFixed, borderColor: Colors.primaryContainer,
    },
    relationChipText: { fontSize: 13, color: Colors.onSurfaceVariant, fontWeight: '500' },
    relationChipTextSelected: { color: Colors.primaryContainer, fontWeight: '700' },
    saveBtn: {
        backgroundColor: Colors.primaryContainer, borderRadius: BorderRadius.md,
        paddingVertical: 16, alignItems: 'center', marginTop: 8, ...Shadows.editorial,
    },
    saveBtnText: { color: Colors.onPrimary, fontSize: 16, fontWeight: '700' },
});
