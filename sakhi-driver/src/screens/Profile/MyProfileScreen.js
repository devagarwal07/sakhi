import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator, TextInput, Dimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');

const DETAIL_ROW = ({ label, value, onEdit, isFirst, isLast }) => (
  <View style={[styles.detailRowWrapper, !isFirst && styles.detailRowBorder]}>
    <View style={styles.detailRow}>
      <View style={styles.detailTextCol}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value || '—'}</Text>
      </View>
      {onEdit && (
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="edit-2" size={16} color="rgba(99, 14, 212, 0.4)" />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const DOC_PREVIEW_ROW = ({ title, expiry, badgeState, onReUpload, isFirst }) => {
  const BADGES = {
    verified: { bg: '#DCFCE7', text: '#15803D', label: 'VERIFIED' },
    expiring: { bg: '#FFEDD5', text: '#C2410C', label: 'EXPIRING SOON' },
  };
  const b = BADGES[badgeState] || BADGES.verified;

  return (
    <View style={[styles.docPreviewWrapper, !isFirst && styles.detailRowBorder]}>
      <View style={styles.docPreviewRow}>
        <View style={styles.docTextCol}>
          <Text style={styles.docTitle}>{title}</Text>
          <Text style={styles.docExpiry}>Exp: {expiry}</Text>
          <View style={[styles.badgeContainer, { backgroundColor: b.bg }]}>
            <Text style={[styles.badgeText, { color: b.text }]}>{b.label}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.reuploadBtn} onPress={onReUpload}>
          <Text style={styles.reuploadBtnText}>Re-upload</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function MyProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { driver, checkAuth } = useAuth();
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
    <View style={styles.root}>
      {/* Absolute Header */}
      <View style={[styles.headerAppBar, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={24} color="#7C3AED" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 16) + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Info Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.profileHeaderLeft}>
            <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarWrap} activeOpacity={0.8}>
              {driver?.profile_photo
                ? <Image source={{ uri: driver.profile_photo }} style={styles.avatarImg} />
                : <Image source={{ uri: 'https://ui-avatars.com/api/?name=Meena&background=D4A373&color=fff' }} style={styles.avatarImg} />
              }
              <View style={styles.editAvatarPencil}>
                {uploading ? (
                  <ActivityIndicator size={10} color="#FFF" />
                ) : (
                  <MaterialIcons name="edit" size={12} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.profileHeaderInfoCol}>
              <Text style={styles.profileName}>{driver?.name ?? 'Meena R.'}</Text>
              <Text style={styles.profileSubtitle}>{driver?.vehicle_model ?? 'Maruti Suzuki Swift'}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.ratingText}>{Number(driver?.average_rating ?? 4.8).toFixed(1)}</Text>
                <MaterialIcons name="star" size={14} color="#F59E0B" style={{ marginTop: -1 }} />
                <View style={styles.verifiedPill}>
                  <Text style={styles.verifiedText}>Verified</Text>
                  <MaterialIcons name="check-circle" size={10} color="#047857" style={{ marginLeft: 2 }} />
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.editProfileActionBtn}
            onPress={() => handleEditField('name', driver?.name)}
            activeOpacity={0.7}
          >
            <Text style={styles.editProfileActionBtnText}>Edit{'\n'}Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Inline Edit Overlay Box */}
        {editField && (
          <View style={styles.inlineEditCard}>
            <Text style={styles.editCardLabel}>EDITING {editField.toUpperCase()}</Text>
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
                {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Personal Details Section */}
        <Text style={styles.sectionTitle}>PERSONAL DETAILS</Text>
        <View style={styles.sectionCard}>
          <DETAIL_ROW 
            label="FULL NAME" 
            value={driver?.name ?? 'Meena Ramesh'} 
            onEdit={() => handleEditField('name', driver?.name)} 
            isFirst={true} 
          />
          <DETAIL_ROW 
            label="PHONE" 
            value={driver?.phone ?? '+91 98765 43210'} 
            onEdit={() => handleEditField('phone', driver?.phone)} 
          />
          <DETAIL_ROW 
            label="EMAIL" 
            value={driver?.email ?? 'meena.r@sakhi.com'} 
            onEdit={() => handleEditField('email', driver?.email)} 
          />
        </View>

        {/* Vehicle Details Section */}
        <Text style={styles.sectionTitle}>VEHICLE DETAILS</Text>
        <View style={styles.sectionCard}>
          <DETAIL_ROW 
            label="VEHICLE TYPE" 
            value={driver?.vehicle_type ?? 'Hatchback (4-seater)'} 
            onEdit={() => handleEditField('vehicle_type', driver?.vehicle_type)} 
            isFirst={true} 
          />
          <DETAIL_ROW 
            label="REG NUMBER" 
            value={driver?.vehicle_reg ?? 'KA 01 MG 4521'} 
            onEdit={() => handleEditField('vehicle_reg', driver?.vehicle_reg)} 
          />
          <DETAIL_ROW 
            label="COLOUR" 
            value={driver?.vehicle_color ?? 'Midnight White'} 
            onEdit={() => handleEditField('vehicle_color', driver?.vehicle_color)} 
          />
          <DETAIL_ROW 
            label="MODEL" 
            value={driver?.vehicle_model ?? 'Swift VXI 2023'} 
            onEdit={() => handleEditField('vehicle_model', driver?.vehicle_model)} 
          />
        </View>

        {/* Documents Section */}
        <Text style={styles.sectionTitle}>DOCUMENTS</Text>
        <View style={styles.sectionCard}>
          <DOC_PREVIEW_ROW 
            title="Driving Licence" 
            expiry="14 Oct 2028" 
            badgeState="verified" 
            onReUpload={() => navigation.navigate('MyDocuments')}
            isFirst={true} 
          />
          <DOC_PREVIEW_ROW 
            title="Vehicle RC" 
            expiry="22 Jan 2030" 
            badgeState="verified" 
            onReUpload={() => navigation.navigate('MyDocuments')}
          />
          <DOC_PREVIEW_ROW 
            title="Insurance" 
            expiry="15 Aug 2024" 
            badgeState="expiring" 
            onReUpload={() => navigation.navigate('MyDocuments')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },

  // Navbar
  headerAppBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 96, // Rough estimate, will flex with insets
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: 'rgba(245, 240, 255, 0.8)',
    zIndex: 10,
    // Note: To match Figma backdrop blur perfectly on native requires BlurView from expo-blur,
    // but rgba handles the tint securely here.
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 20,
    lineHeight: 28,
    color: '#1E1B2E',
    letterSpacing: -0.5,
  },

  // Scroll Content
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Header Card
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 4,
    marginBottom: 24,
  },
  profileHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#EBE6F5',
    marginRight: 16,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  editAvatarPencil: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#630ED4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileHeaderInfoCol: {
    justifyContent: 'center',
    flex: 1,
  },
  profileName: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 28,
    color: '#1C1A25',
  },
  profileSubtitle: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
    color: '#4A4455',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  ratingText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#1C1A25',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 4,
  },
  verifiedText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    color: '#047857',
  },
  editProfileActionBtn: {
    borderWidth: 2,
    borderColor: 'rgba(99, 14, 212, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editProfileActionBtnText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    color: '#630ED4',
  },

  // Titles
  sectionTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1.2,
    color: '#4A4455',
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingLeft: 4,
  },

  // Common Section Blocks
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 4,
    marginBottom: 24,
  },

  // Detail Row
  detailRowWrapper: {
    paddingVertical: 12,
  },
  detailRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#EBE6F5',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailTextCol: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#7B7487',
  },
  detailValue: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
    color: '#1C1A25',
  },

  // Document Preview Row
  docPreviewWrapper: {
    paddingVertical: 12,
  },
  docPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docTextCol: {
    flex: 1,
    gap: 2,
  },
  docTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 20,
    color: '#1C1A25',
  },
  docExpiry: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 10,
    lineHeight: 15,
    color: '#7B7487',
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 9,
    lineHeight: 14,
    letterSpacing: -0.45,
  },
  reuploadBtn: {
    backgroundColor: 'rgba(99, 14, 212, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reuploadBtnText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 16,
    color: '#630ED4',
  },

  // Edit Card
  inlineEditCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#BEA3D8',
    marginBottom: 24,
  },
  editCardLabel: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 1,
    color: '#7B7487',
    marginBottom: 8,
  },
  editInput: {
    height: 48,
    backgroundColor: '#F5F0FF',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 16,
    color: '#1C1A25',
    marginBottom: 16,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#64748B',
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#630ED4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
