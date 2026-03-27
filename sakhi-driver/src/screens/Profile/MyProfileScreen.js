import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';

const DETAIL_ROW = ({ label, value, onEdit }) => (
  <View style={styles.detailRow}>
    <View style={{ flex: 1 }}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || '—'}</Text>
    </View>
    {onEdit && (
      <TouchableOpacity onPress={onEdit} hitSlop={8}>
        <Text style={styles.editIcon}>✏️</Text>
      </TouchableOpacity>
    )}
  </View>
);

export default function MyProfileScreen({ navigation }) {
  const { driver, checkAuth } = useContext(AuthContext);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue]  = useState('');
  const [saving, setSaving]        = useState(false);
  const [uploading, setUploading]  = useState(false);

  const handleEditField = (field, current) => {
    setEditField(field);
    setEditValue(current ?? '');
  };

  const handleSaveField = async () => {
    if (!editField) return;
    try {
      setSaving(true);
      await client.patch('/drivers/profile', { [editField]: editValue });
      await checkAuth();
      setEditField(null);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (result.canceled) return;

    try {
      setUploading(true);
      const form = new FormData();
      form.append('avatar', { uri: result.assets[0].uri, type: 'image/jpeg', name: 'avatar.jpg' });
      await client.post('/drivers/profile/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      await checkAuth();
    } catch { Alert.alert('Upload failed'); }
    finally { setUploading(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarLeft}>
            <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarWrap} activeOpacity={0.8}>
              {driver?.profile_photo
                ? <Image source={{ uri: driver.profile_photo }} style={styles.avatar} />
                : <Text style={styles.avatarFallback}>👤</Text>
              }
              <View style={styles.editAvatarBtn}>
                {uploading ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={{ fontSize: 12 }}>✏️</Text>}
              </View>
            </TouchableOpacity>
            <View>
              <Text style={styles.driverName}>{driver?.name ?? 'Driver'}</Text>
              <Text style={styles.vehicleSubtitle}>{driver?.vehicle_model ?? '—'}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.rating}>⭐ {driver?.average_rating?.toFixed(1) ?? '4.9'}</Text>
                {driver?.is_approved && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✅ Verified</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => handleEditField('name', driver?.name)}
          >
            <Text style={styles.editProfileBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Edit field inline */}
        {editField && (
          <View style={styles.editCard}>
            <Text style={styles.editCardLabel}>Editing: {editField}</Text>
            <TextInput
              style={styles.editInput}
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveField}
            />
            <View style={styles.editActions}>
              <TouchableOpacity onPress={() => setEditField(null)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveField} style={styles.saveBtn} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Personal Details */}
        <Text style={styles.sectionTitle}>PERSONAL DETAILS</Text>
        <View style={styles.card}>
          {[
            { label: 'Full Name', field: 'name',  value: driver?.name  },
            { label: 'Phone',     field: 'phone', value: driver?.phone  },
            { label: 'Email',     field: 'email', value: driver?.email  },
          ].map((row, i, arr) => (
            <View key={row.field}>
              <DETAIL_ROW
                label={row.label}
                value={row.value}
                onEdit={() => handleEditField(row.field, row.value)}
              />
              {i < arr.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>

        {/* Vehicle Details */}
        <Text style={styles.sectionTitle}>VEHICLE DETAILS</Text>
        <View style={styles.card}>
          {[
            { label: 'Vehicle Type', field: 'vehicle_type',  value: driver?.vehicle_type  },
            { label: 'Reg Number',   field: 'vehicle_reg',   value: driver?.vehicle_reg   },
            { label: 'Colour',       field: 'vehicle_color', value: driver?.vehicle_color },
            { label: 'Model',        field: 'vehicle_model', value: driver?.vehicle_model },
          ].map((row, i, arr) => (
            <View key={row.field}>
              <DETAIL_ROW label={row.label} value={row.value} onEdit={() => handleEditField(row.field, row.value)} />
              {i < arr.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>

        {/* Documents shortcut */}
        <TouchableOpacity style={styles.docsBtn} onPress={() => navigation.navigate('MyDocuments')} activeOpacity={0.8}>
          <Text style={styles.docsBtnIcon}>📄</Text>
          <Text style={styles.docsBtnText}>View My Documents</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceLow },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 22, color: Colors.primaryContainer },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.onSurface },

  scroll: { paddingHorizontal: Spacing.base, paddingBottom: 40, gap: 12 },

  // Avatar card
  avatarCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, ...Shadows.card,
  },
  avatarLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarWrap: {
    width: 72, height: 72, borderRadius: 36, overflow: 'hidden',
    backgroundColor: Colors.surfaceContainer, position: 'relative',
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: { fontSize: 36 },
  editAvatarBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  driverName: { fontSize: 17, fontWeight: '700', color: Colors.onSurface },
  vehicleSubtitle: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  rating: { fontSize: 13, color: Colors.onSurface, fontWeight: '600' },
  verifiedBadge: {
    backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full,
  },
  verifiedText: { fontSize: 10, fontWeight: '700', color: '#15803D' },
  editProfileBtn: {
    borderWidth: 2, borderColor: `${Colors.primaryContainer}30`,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.lg,
  },
  editProfileBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primaryContainer },

  // Inline edit
  editCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, gap: 10, borderWidth: 2, borderColor: Colors.primaryContainer,
    ...Shadows.lavender,
  },
  editCardLabel: { fontSize: 11, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 0.5 },
  editInput: {
    height: 48, backgroundColor: Colors.surfaceLow, borderRadius: Radius.md,
    paddingHorizontal: 14, fontSize: 15, color: Colors.onSurface,
  },
  editActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, height: 44, borderRadius: Radius.md, borderWidth: 1.5,
    borderColor: Colors.outlineVariant, alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: Colors.onSurfaceVariant },
  saveBtn: {
    flex: 2, height: 44, borderRadius: Radius.md,
    backgroundColor: Colors.primaryContainer, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },

  sectionTitle: {
    fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant,
    letterSpacing: 1.5, marginTop: 4,
  },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, ...Shadows.card },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  detailLabel: { fontSize: 9, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 1, marginBottom: 3 },
  detailValue: { fontSize: 14, fontWeight: '500', color: Colors.onSurface },
  editIcon: { fontSize: 16 },
  rowDivider: { height: 1, backgroundColor: Colors.surfaceLow },

  docsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, ...Shadows.card,
  },
  docsBtnIcon: { fontSize: 22 },
  docsBtnText: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  chevron: { fontSize: 22, color: Colors.onSurfaceVariant },
});
