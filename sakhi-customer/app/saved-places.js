import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';
import { getAddresses, saveAddress, deleteAddress } from '../src/api/endpoints';

const PLACE_TYPES = [
    { id: 'home', label: 'Home', emoji: '🏠' },
    { id: 'work', label: 'Work', emoji: '💼' },
    { id: 'other', label: 'Other', emoji: '📍' },
];

export default function SavedPlacesScreen() {
    const router = useRouter();
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAddresses()
            .then(({ data }) => setAddresses(data.addresses || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = (id, label) => {
        Alert.alert(`Remove ${label}`, 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive',
                onPress: async () => {
                    await deleteAddress(id);
                    setAddresses((a) => a.filter((x) => x.id !== id));
                },
            },
        ]);
    };

    const typeConfig = (type) =>
        PLACE_TYPES.find((t) => t.id === type) || { emoji: '📍', label: type };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backArrow}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Saved Places</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primaryContainer} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {addresses.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyEmoji}>🗺️</Text>
                            <Text style={styles.emptyTitle}>No Saved Places</Text>
                            <Text style={styles.emptySubtitle}>
                                Save your home and office locations for faster booking.
                            </Text>
                        </View>
                    ) : (
                        addresses.map((addr) => {
                            const cfg = typeConfig(addr.type);
                            return (
                                <View key={addr.id} style={styles.addressCard}>
                                    <View style={styles.addressIconBg}>
                                        <Text style={{ fontSize: 22 }}>{cfg.emoji}</Text>
                                    </View>
                                    <View style={styles.addressInfo}>
                                        <Text style={styles.addressLabel}>{cfg.label}</Text>
                                        <Text style={styles.addressText} numberOfLines={2}>{addr.address}</Text>
                                    </View>
                                    <Pressable onPress={() => handleDelete(addr.id, cfg.label)}>
                                        <Text style={styles.deleteIcon}>🗑️</Text>
                                    </Pressable>
                                </View>
                            );
                        })
                    )}

                    {/* Quick add chips */}
                    <Text style={styles.addSectionLabel}>Add a Place</Text>
                    <View style={styles.addChipsRow}>
                        {PLACE_TYPES.filter((t) => !addresses.find((a) => a.type === t.id)).map((t) => (
                            <TouchableOpacity
                                key={t.id}
                                style={styles.addChip}
                                onPress={() => router.push(`/location-search?mode=${t.id}`)}
                            >
                                <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
                                <Text style={styles.addChipText}>+ {t.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            )}
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
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
    emptyState: { alignItems: 'center', paddingTop: 40, gap: 10 },
    emptyEmoji: { fontSize: 56 },
    emptyTitle: { ...Typography.headlineSmall, color: Colors.onBackground },
    emptySubtitle: { ...Typography.bodyMedium, color: Colors.onSurfaceVariant, textAlign: 'center' },
    addressCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 14, padding: 14, ...Shadows.card,
    },
    addressIconBg: {
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: Colors.primaryFixed,
        alignItems: 'center', justifyContent: 'center',
    },
    addressInfo: { flex: 1 },
    addressLabel: { fontSize: 13, fontWeight: '700', color: Colors.onBackground, marginBottom: 2 },
    addressText: { fontSize: 12, color: Colors.onSurfaceVariant, lineHeight: 16 },
    deleteIcon: { fontSize: 18, padding: 4 },
    addSectionLabel: {
        fontSize: 12, fontWeight: '700', color: Colors.onSurfaceVariant,
        textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8,
    },
    addChipsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    addChip: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: BorderRadius.full, paddingHorizontal: 16, paddingVertical: 10,
        borderWidth: 1.5, borderColor: Colors.outlineVariant,
        borderStyle: 'dashed',
    },
    addChipText: { fontSize: 13, fontWeight: '600', color: Colors.primaryContainer },
});
