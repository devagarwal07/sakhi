import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, Alert, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';
import apiClient from '../src/api/client';

const COMPLAINT_CATEGORIES = [
    { id: 'driver_behavior', label: 'Driver Behavior', emoji: '⚠️' },
    { id: 'payment', label: 'Payment Issue', emoji: '💸' },
    { id: 'lost_item', label: 'Lost Item', emoji: '📦' },
    { id: 'safety', label: 'Safety Concern', emoji: '🛡️' },
    { id: 'app_issue', label: 'App Issue', emoji: '📱' },
    { id: 'other', label: 'Other', emoji: '💬' },
];

export default function RaiseComplaintScreen() {
    const router = useRouter();
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (!category) {
            Alert.alert('Select Category', 'Please choose a complaint category.');
            return;
        }
        if (description.trim().length < 20) {
            Alert.alert('Too Short', 'Please describe your issue in at least 20 characters.');
            return;
        }
        setSubmitting(true);
        try {
            await apiClient.post('/support/complaints', { category, description: description.trim() });
            setSubmitted(true);
        } catch (err) {
            Alert.alert('Submission Failed', err?.response?.data?.message || 'Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <View style={styles.successContainer}>
                <View style={styles.successIcon}><Text style={{ fontSize: 56 }}>✅</Text></View>
                <Text style={styles.successTitle}>Complaint Submitted</Text>
                <Text style={styles.successSubtitle}>
                    Our support team will review your complaint and get back to you within 24 hours.
                </Text>
                <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(tabs)')}>
                    <Text style={styles.homeBtnText}>Back to Home</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backArrow}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Raise a Complaint</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionLabel}>What's the issue?</Text>
                <View style={styles.categoryGrid}>
                    {COMPLAINT_CATEGORIES.map((c) => (
                        <TouchableOpacity
                            key={c.id}
                            style={[styles.categoryCard, category === c.id && styles.categoryCardSelected]}
                            onPress={() => setCategory(c.id)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.categoryEmoji}>{c.emoji}</Text>
                            <Text style={[styles.categoryLabel, category === c.id && styles.categoryLabelSelected]}>
                                {c.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionLabel}>Describe the issue</Text>
                <TextInput
                    style={styles.descriptionInput}
                    placeholder="Please provide as much detail as possible — this helps us resolve it faster…"
                    placeholderTextColor={Colors.outline}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={6}
                    maxLength={1000}
                    textAlignVertical="top"
                />
                <Text style={styles.charCount}>{description.length}/1000</Text>

                <TouchableOpacity
                    style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting
                        ? <ActivityIndicator color={Colors.onPrimary} />
                        : <Text style={styles.submitBtnText}>Submit Complaint</Text>
                    }
                </TouchableOpacity>
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
    content: { paddingHorizontal: 20, paddingBottom: 48, gap: 14 },
    sectionLabel: {
        fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant,
        textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4,
    },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    categoryCard: {
        width: '47%', backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 14, padding: 14, alignItems: 'center', gap: 6,
        borderWidth: 2, borderColor: 'transparent', ...Shadows.card,
    },
    categoryCardSelected: {
        borderColor: Colors.primaryContainer, backgroundColor: Colors.primaryFixed,
    },
    categoryEmoji: { fontSize: 24 },
    categoryLabel: { fontSize: 12, fontWeight: '600', color: Colors.onSurfaceVariant, textAlign: 'center' },
    categoryLabelSelected: { color: Colors.primaryContainer },
    descriptionInput: {
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 14, padding: 16, fontSize: 14, color: Colors.onSurface,
        minHeight: 120, borderWidth: 1.5, borderColor: Colors.outlineVariant,
        ...Shadows.card,
    },
    charCount: { fontSize: 11, color: Colors.outline, textAlign: 'right', marginTop: -8 },
    submitBtn: {
        backgroundColor: Colors.primaryContainer, borderRadius: BorderRadius.md,
        paddingVertical: 16, alignItems: 'center', marginTop: 8, ...Shadows.editorial,
    },
    submitBtnText: { color: Colors.onPrimary, fontSize: 16, fontWeight: '700' },
    successContainer: {
        flex: 1, backgroundColor: '#F5F0FF',
        alignItems: 'center', justifyContent: 'center', padding: 32,
    },
    successIcon: {
        width: 96, height: 96, borderRadius: 48,
        backgroundColor: Colors.primaryFixed, alignItems: 'center', justifyContent: 'center',
        marginBottom: 24, ...Shadows.editorial,
    },
    successTitle: { ...Typography.headlineSmall, color: Colors.onBackground, textAlign: 'center', marginBottom: 12 },
    successSubtitle: {
        ...Typography.bodyLarge, color: Colors.onSurfaceVariant,
        textAlign: 'center', lineHeight: 24, marginBottom: 28,
    },
    homeBtn: {
        backgroundColor: Colors.primaryContainer, borderRadius: BorderRadius.md,
        paddingVertical: 14, paddingHorizontal: 32, ...Shadows.editorial,
    },
    homeBtnText: { color: Colors.onPrimary, fontSize: 15, fontWeight: '700' },
});
