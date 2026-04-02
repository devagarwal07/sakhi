import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator, TextInput, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Pencil } from 'lucide-react-native';
import BottomNavBar, { NAV_HEIGHT } from '../../components/BottomNavBar';
import ScreenHeader, { HEADER_HEIGHT } from '../../components/ScreenHeader';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PURPLE  = '#BEA3D8';
const DEEP    = '#7C3AED';
const VIOLET  = '#630ED4';
const DARK    = '#1C1A25';
const MID     = '#4A4455';
const MUTED   = '#7B7487';
const WHITE   = '#FFFFFF';
const BG      = '#F5F0FF';
const GREEN   = '#047857';
const AMBER   = '#F59E0B';
const CARD_SH = {
  shadowColor: '#7C3AED',
  shadowOffset: { width: 0, height: 16 },
  shadowOpacity: 0.08,
  shadowRadius: 32,
  elevation: 4,
};

// ─── Pencil icon button (edit field) ─────────────────────────────────────────
function EditIcon() {
  return (
    <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
      <Pencil size={14} color="rgba(99,14,212,0.4)" strokeWidth={2} />
    </View>
  );
}

// ─── Detail row ───────────────────────────────────────────────────────────────
function DetailRow({ label, value, onEdit, isFirst }) {
  return (
    <View style={[dr.wrap, !isFirst && dr.border]}>
      <View style={dr.textCol}>
        <Text style={dr.label}>{label}</Text>
        <Text style={dr.value}>{value || '—'}</Text>
      </View>
      {onEdit && (
        <TouchableOpacity
          onPress={onEdit}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <EditIcon />
        </TouchableOpacity>
      )}
    </View>
  );
}
const dr = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  border:  { borderTopWidth: 1, borderTopColor: '#EBE6F5' },
  textCol: { flex: 1, gap: 2 },
  label:   { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5, textTransform: 'uppercase', lineHeight: 15 },
  value:   { fontSize: 14, fontWeight: '500', color: DARK, lineHeight: 20 },
});

// ─── Document row ─────────────────────────────────────────────────────────────
const BADGE_MAP = {
  verified: { bg: '#D1FAE5', text: GREEN,    label: 'VERIFIED'      },
  expiring: { bg: '#FFEDD5', text: '#C2410C', label: 'EXPIRING SOON' },
  expired:  { bg: '#FFE4E6', text: '#BE123C', label: 'EXPIRED'       },
};

function DocRow({ title, expiry, badgeState = 'verified', onReUpload, isFirst }) {
  const b = BADGE_MAP[badgeState] ?? BADGE_MAP.verified;
  return (
    <View style={[doc.wrap, !isFirst && doc.border]}>
      <View style={doc.left}>
        <Text style={doc.title}>{title}</Text>
        <Text style={doc.expiry}>Exp: {expiry}</Text>
        <View style={[doc.badge, { backgroundColor: b.bg }]}>
          <Text style={[doc.badgeText, { color: b.text }]}>{b.label}</Text>
        </View>
      </View>
      <TouchableOpacity style={doc.btn} onPress={onReUpload} activeOpacity={0.8}>
        <Text style={doc.btnText}>Re-upload</Text>
      </TouchableOpacity>
    </View>
  );
}
const doc = StyleSheet.create({
  wrap:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  border:    { borderTopWidth: 1, borderTopColor: '#EBE6F5' },
  left:      { flex: 1, gap: 2 },
  title:     { fontSize: 14, fontWeight: '700', color: DARK, lineHeight: 20 },
  expiry:    { fontSize: 10, fontWeight: '400', color: MUTED, lineHeight: 15 },
  badge:     { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 9999 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: -0.45, textTransform: 'uppercase', lineHeight: 14 },
  btn:       { backgroundColor: 'rgba(99,14,212,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  btnText:   { fontSize: 12, fontWeight: '700', color: VIOLET, lineHeight: 16 },
});

// ─── Inline field edit card ───────────────────────────────────────────────────
function EditCard({ field, value, onChange, onSave, onCancel, saving }) {
  return (
    <View style={ec.card}>
      <Text style={ec.label}>EDITING {field?.toUpperCase()}</Text>
      <TextInput
        style={ec.input}
        value={value}
        onChangeText={onChange}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={onSave}
        placeholderTextColor="#B0AAC0"
      />
      <View style={ec.actions}>
        <TouchableOpacity style={ec.cancelBtn} onPress={onCancel}>
          <Text style={ec.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ec.saveBtn} onPress={onSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color={WHITE} size="small" />
            : <Text style={ec.saveText}>Save</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}
const ec = StyleSheet.create({
  card:      { backgroundColor: WHITE, borderRadius: 16, padding: 20, borderWidth: 2, borderColor: PURPLE, marginBottom: 24, gap: 12 },
  label:     { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: MUTED },
  input:     { height: 48, backgroundColor: BG, borderRadius: 8, paddingHorizontal: 16, fontSize: 16, fontWeight: '500', color: DARK },
  actions:   { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  cancelText:{ fontSize: 14, fontWeight: '600', color: '#64748B' },
  saveBtn:   { flex: 1, height: 48, borderRadius: 12, backgroundColor: VIOLET, alignItems: 'center', justifyContent: 'center' },
  saveText:  { fontSize: 14, fontWeight: '700', color: WHITE },
});



// ─── Initials avatar ──────────────────────────────────────────────────────────
function InitialsAvatar({ name, size = 68 }) {
  const initials = (name ?? 'M')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#D4A373', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: WHITE, fontWeight: '700', fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MyProfileScreen({ navigation }) {
  const { driver, checkAuth } = useAuth();

  const [editField, setEditField]     = useState(null);
  const [editValue, setEditValue]     = useState('');
  const [saving,    setSaving]        = useState(false);
  const [uploading, setUploading]     = useState(false);

  // ── Field edit handlers ──────────────────────────────────────────────────
  const openEdit = (field, current) => {
    setEditField(field);
    setEditValue(current ?? '');
  };

  const saveEdit = async () => {
    if (!editField) return;
    try {
      setSaving(true);
      await client.patch('/drivers/profile', { [editField]: editValue });
      await checkAuth?.();
      setEditField(null);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message ?? 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  // ── Avatar picker ─────────────────────────────────────────────────────────
  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required', 'Allow photo access to change your avatar.'); return; }

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
      await checkAuth?.();
    } catch { Alert.alert('Upload failed', 'Could not upload photo. Try again.'); }
    finally { setUploading(false); }
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={s.root}>

      <ScreenHeader title="My Profile" onBack={() => navigation?.goBack()} />

      {/* ── Scrollable body ── */}
      <ScrollView
        contentContainerStyle={[s.scroll, {
          paddingTop: 16,
          paddingBottom: 24,
        }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ════════════════════════════════
            Profile Header Card
        ═══════════════════════════════ */}
        <View style={s.profileCard}>
          {/* Avatar + name */}
          <View style={s.profileLeft}>
            <TouchableOpacity style={s.avatarWrap} onPress={pickAvatar} activeOpacity={0.8}>
              {driver?.profile_photo
                ? <Image source={{ uri: driver.profile_photo }} style={s.avatarImg} />
                : <InitialsAvatar name={driver?.name ?? 'Meena Ramesh'} size={68} />
              }
              {/* Edit pencil badge */}
              <View style={s.avatarEditBtn}>
                {uploading
                  ? <ActivityIndicator size={10} color={WHITE} />
                  : <Pencil size={8} color={WHITE} strokeWidth={3} />
                }
              </View>
            </TouchableOpacity>

            {/* Info */}
            <View style={s.profileInfo}>
              <Text style={s.profileName}>{driver?.name ?? 'Meena R.'}</Text>
              <Text style={s.profileSub}>{driver?.vehicle_model ?? 'Maruti Suzuki Swift'}</Text>
              {/* Rating + Verified */}
              <View style={s.metaRow}>
                <Text style={s.ratingVal}>{Number(driver?.average_rating ?? 4.8).toFixed(1)}</Text>
                <View style={s.starIcon} />
                <View style={s.verifiedPill}>
                  <Text style={s.verifiedText}>Verified</Text>
                  <View style={s.verifiedDot} />
                </View>
              </View>
            </View>
          </View>

          {/* Edit Profile button */}
          <TouchableOpacity
            style={s.editBtn}
            onPress={() => navigation?.navigate('EditProfile')}
            activeOpacity={0.8}
          >
            <Text style={s.editBtnText}>{'Edit\nProfile'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Inline edit card ── */}
        {editField && (
          <EditCard
            field={editField}
            value={editValue}
            onChange={setEditValue}
            onSave={saveEdit}
            onCancel={() => setEditField(null)}
            saving={saving}
          />
        )}

        {/* ════════════════════════════════
            Personal Details
        ═══════════════════════════════ */}
        <Text style={s.sectionTitle}>Personal Details</Text>
        <View style={s.sectionCard}>
          <DetailRow label="Full Name" value={driver?.name         ?? 'Meena Ramesh'}       onEdit={() => openEdit('name',  driver?.name)}  isFirst />
          <DetailRow label="Phone"     value={driver?.phone        ?? '+91 98765 43210'}     onEdit={() => navigation.navigate('ChangePhoneInput')} />
          <DetailRow label="Email"     value={driver?.email        ?? 'meena.r@sakhi.com'}   onEdit={() => openEdit('email', driver?.email)} />
        </View>

        {/* ════════════════════════════════
            Vehicle Details
        ═══════════════════════════════ */}
        <Text style={s.sectionTitle}>Vehicle Details</Text>
        <View style={s.sectionCard}>
          <DetailRow label="Vehicle Type"  value={driver?.vehicle_type  ?? 'Hatchback (4-seater)'}  onEdit={() => openEdit('vehicle_type',  driver?.vehicle_type)}  isFirst />
          <DetailRow label="Reg Number"    value={driver?.vehicle_reg   ?? 'KA 01 MG 4521'}         onEdit={() => openEdit('vehicle_reg',   driver?.vehicle_reg)}   />
          <DetailRow label="Colour"        value={driver?.vehicle_color ?? 'Midnight White'}         onEdit={() => openEdit('vehicle_color', driver?.vehicle_color)} />
          <DetailRow label="Model"         value={driver?.vehicle_model ?? 'Swift VXI 2023'}         onEdit={() => openEdit('vehicle_model', driver?.vehicle_model)} />
        </View>

        {/* ════════════════════════════════
            Documents
        ═══════════════════════════════ */}
        <Text style={s.sectionTitle}>Documents</Text>
        <View style={s.sectionCard}>
          <DocRow
            title="Driving Licence"
            expiry="14 Oct 2028"
            badgeState="verified"
            onReUpload={() => navigation?.navigate('MyDocuments')}
            isFirst
          />
          <DocRow
            title="Vehicle RC"
            expiry="22 Jan 2030"
            badgeState="verified"
            onReUpload={() => navigation?.navigate('MyDocuments')}
          />
          <DocRow
            title="Insurance"
            expiry="15 Aug 2024"
            badgeState="expiring"
            onReUpload={() => navigation?.navigate('MyDocuments')}
          />
        </View>

      </ScrollView>

      <BottomNavBar navigation={navigation} activeTab="account" />

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },



  // ── Scroll ────────────────────────────────────────────────────────────────
  scroll: { paddingHorizontal: 24, paddingTop: 16, gap: 24 },

  // ── Profile Header Card ───────────────────────────────────────────────────
  profileCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: WHITE, borderRadius: 16, padding: 24, ...CARD_SH,
  },
  profileLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1 },

  avatarWrap: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: WHITE,
    backgroundColor: '#EBE6F5', overflow: 'visible', position: 'relative',
  },
  avatarImg:    { width: 68, height: 68, borderRadius: 34 },
  avatarEditBtn:{
    position: 'absolute', right: -2, bottom: -2,
    width: 22.5, height: 22.5, borderRadius: 11.25,
    backgroundColor: VIOLET, alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },

  profileInfo: { marginLeft: 16, flex: 1, gap: 0 },
  profileName: { fontSize: 18, fontWeight: '700', color: DARK, lineHeight: 28 },
  profileSub:  { fontSize: 14, fontWeight: '400', color: MID,  lineHeight: 20 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3.5 },
  ratingVal:   { fontSize: 14, fontWeight: '600', color: DARK, lineHeight: 20 },
  starIcon:    { width: 11.67, height: 11, borderRadius: 5.5, backgroundColor: AMBER },
  verifiedPill:{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, marginLeft: 4 },
  verifiedText:{ fontSize: 10, fontWeight: '700', color: GREEN },
  verifiedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN },

  editBtn:     { borderWidth: 2, borderColor: 'rgba(99,14,212,0.2)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', width: 88 },
  editBtnText: { fontSize: 12, fontWeight: '700', color: VIOLET, lineHeight: 16, textAlign: 'center' },

  // ── Section ───────────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: MID,
    letterSpacing: 1.2, textTransform: 'uppercase', lineHeight: 16,
    paddingLeft: 4, marginBottom: -12, // collapse gap between title and card
  },
  sectionCard: {
    backgroundColor: WHITE, borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 8, ...CARD_SH,
  },

});
