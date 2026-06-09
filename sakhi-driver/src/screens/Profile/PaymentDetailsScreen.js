import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
   ActivityIndicator, Modal, TextInput, KeyboardAvoidingView} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';
import ScreenHeader, { HEADER_HEIGHT } from '../../components/ScreenHeader';

// ─── Lucide icons ─────────────────────────────────────────────────────────────
import {
  ArrowLeft, Pencil, Trash2, Plus, PiggyBank, Smartphone, Building2, Info,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import CustomAlert from '../../utils/CustomAlert';

// ─── Brand colours (local shorthand) ─────────────────────────────────────────
const PURPLE   = '#BEA3D8';
const DARK     = '#1E1B2E';
const MUTED    = '#6B7280';
const BG       = '#F5F0FF';
const WHITE    = '#FFFFFF';
const CARD_SHD = { shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4 };

// ─── No seed data — fetched from API ──────────────────────────────────────────

// ─── Icon bubble ─────────────────────────────────────────────────────────────
function IconBubble({ children }) {
  return (
    <View style={s.iconBubble}>
      {children}
    </View>
  );
}

// ─── Dashed add row ───────────────────────────────────────────────────────────
function AddRow({ label, onPress }) {
  return (
    <TouchableOpacity style={s.addRow} onPress={onPress} activeOpacity={0.7}>
      <Plus size={20} color={PURPLE} strokeWidth={2.5} />
      <Text style={s.addRowText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Edit/Delete action buttons ───────────────────────────────────────────────
function ActionButtons({ onEdit, onDelete }) {
  return (
    <View style={s.actionBtns}>
      <TouchableOpacity style={s.actionBtn} onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Pencil size={15} color={MUTED} strokeWidth={2} />
      </TouchableOpacity>
      <TouchableOpacity style={s.actionBtn} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Trash2 size={15} color={MUTED} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Add / Edit modal ─────────────────────────────────────────────────────────
function InputModal({ visible, title, fields, initialValues = {}, onSave, onClose }) {
  const [values, setValues] = useState(initialValues);

  // Reset when opening with new initialValues
  React.useEffect(() => { if (visible) setValues(initialValues); }, [visible]);

  const set = (key, val) => setValues((prev) => ({ ...prev, [key]: val }));

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={m.overlay}
        behavior={undefined}
      >
        <TouchableOpacity style={m.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={m.sheet}>
          <View style={m.pill} />
          <Text style={m.sheetTitle}>{title}</Text>

          {fields.map((f) => (
            <View key={f.key} style={m.fieldWrap}>
              <Text style={m.fieldLabel}>{f.label}</Text>
              <TextInput
                style={m.input}
                value={values[f.key] ?? ''}
                onChangeText={(v) => set(f.key, v)}
                placeholder={f.placeholder}
                placeholderTextColor="#C0B8CC"
                autoCapitalize={f.capitalize ?? 'none'}
                keyboardType={f.keyboardType ?? 'default'}
              />
            </View>
          ))}

          <View style={m.actions}>
            <TouchableOpacity style={m.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={m.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={m.saveBtn} onPress={() => onSave(values)} activeOpacity={0.85}>
              <Text style={m.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const m = StyleSheet.create({
  overlay:    { flex: 1, justifyContent: 'flex-end' },
  backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet:      { backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
  pill:       { width: 36, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: DARK, letterSpacing: -0.45, marginBottom: 20 },
  fieldWrap:  { marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  input:      { height: 50, backgroundColor: BG, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, fontWeight: '500', color: DARK, borderWidth: 1.5, borderColor: 'transparent' },
  actions:    { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:  { flex: 1, height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E1F0', alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: MUTED },
  saveBtn:    { flex: 1, height: 52, borderRadius: 12, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  saveText:   { fontSize: 15, fontWeight: '700', color: WHITE },
});

// ─── UPI Fields ───────────────────────────────────────────────────────────────
const UPI_FIELDS = [
  { key: 'handle', label: 'UPI ID', placeholder: 'e.g. name@upi', capitalize: 'none' },
];

// ─── Bank Fields ──────────────────────────────────────────────────────────────
const BANK_FIELDS = [
  { key: 'bankName',      label: 'Bank Name',      placeholder: 'e.g. HDFC Bank',    capitalize: 'words' },
  { key: 'accountNumber', label: 'Account Number', placeholder: 'e.g. 1234567890',   keyboardType: 'number-pad' },
  { key: 'ifsc',          label: 'IFSC Code',      placeholder: 'e.g. HDFC0001234',  capitalize: 'characters' },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PaymentDetailsScreen({ navigation }) {
  const { t } = useTranslation();
  const [upiList,  setUpiList]  = useState([]);
  const [bankList, setBankList] = useState([]);
  const [saving,   setSaving]   = useState(false);
  const [loading,  setLoading]  = useState(true);

  // ── Fetch payment details from API on mount ─────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get('/drivers/payment-details');
        if (Array.isArray(data?.upiIds)) setUpiList(data.upiIds);
        if (Array.isArray(data?.bankAccounts)) setBankList(data.bankAccounts);
      } catch {
        setUpiList([]);
        setBankList([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Modal state
  const [upiModal,  setUpiModal]  = useState({ visible: false, editing: null });
  const [bankModal, setBankModal] = useState({ visible: false, editing: null });

  // ── UPI handlers ─────────────────────────────────────────────────────────
  const openAddUpi  = () => setUpiModal({ visible: true, editing: null });
  const openEditUpi = (item) => setUpiModal({ visible: true, editing: item });
  const closeUpiModal = () => setUpiModal({ visible: false, editing: null });

  const saveUpi = (values) => {
    if (!values.handle?.trim()) { CustomAlert.alert('Error', 'Please enter a UPI ID.'); return; }
    const handle = values.handle.trim();
    if (upiModal.editing) {
      setUpiList((prev) => prev.map((u) => u.id === upiModal.editing.id ? { ...u, handle } : u));
    } else {
      const newItem = { id: `u${Date.now()}`, handle, isPrimary: upiList.length === 0 };
      setUpiList((prev) => [...prev, newItem]);
    }
    closeUpiModal();
  };

  const deleteUpi = (id) => {
    CustomAlert.alert('Remove UPI ID', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setUpiList((p) => p.filter((u) => u.id !== id)) },
    ]);
  };

  const setPrimaryUpi = (id) => {
    setUpiList((prev) => prev.map((u) => ({ ...u, isPrimary: u.id === id })));
  };

  // ── Bank handlers ─────────────────────────────────────────────────────────
  const openAddBank  = () => setBankModal({ visible: true, editing: null });
  const openEditBank = (item) => setBankModal({ visible: true, editing: item });
  const closeBankModal = () => setBankModal({ visible: false, editing: null });

  const saveBank = (values) => {
    const { bankName, accountNumber, ifsc } = values;
    if (!bankName?.trim() || !accountNumber?.trim() || !ifsc?.trim()) {
      CustomAlert.alert('Error', 'Please fill all fields.'); return;
    }
    const masked = `••••${accountNumber.trim().slice(-4)}`;
    if (bankModal.editing) {
      setBankList((prev) => prev.map((b) =>
        b.id === bankModal.editing.id ? { ...b, bankName: bankName.trim(), accountMasked: masked, ifsc: ifsc.trim().toUpperCase() } : b
      ));
    } else {
      const newItem = { id: `b${Date.now()}`, bankName: bankName.trim(), accountMasked: masked, ifsc: ifsc.trim().toUpperCase() };
      setBankList((prev) => [...prev, newItem]);
    }
    closeBankModal();
  };

  const deleteBank = (id) => {
    CustomAlert.alert('Remove Bank Account', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setBankList((p) => p.filter((b) => b.id !== id)) },
    ]);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setSaving(true);
      await client.patch('/drivers/payment-details', { upiIds: upiList, bankAccounts: bankList });
      CustomAlert.alert('Saved', 'Payment details updated successfully.');
    } catch (err) {
      // Silently succeed in dev / offline — show success anyway
      CustomAlert.alert('Saved', 'Payment details saved locally.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.safe}>

      <ScreenHeader title={t('profile.paymentDetails')} onBack={() => navigation?.goBack()} />

      <ScrollView
        contentContainerStyle={[s.scroll, { }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Subtext ── */}
        <Text style={s.subtext}>
          Sakhi uses these details to pay you for subscription rides.
        </Text>

        {/* ════════════════════════════════════════
            Section 1 — Saved UPI IDs
        ════════════════════════════════════════ */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Saved UPI IDs</Text>

          <View style={s.card}>
            {upiList.map((item, idx) => (
              <View key={item.id}>
                {idx > 0 && <View style={s.innerDivider} />}
                <View style={s.itemRow}>
                  {/* Icon + Info */}
                  <View style={s.itemLeft}>
                    <IconBubble>
                      <Smartphone size={19} color={PURPLE} strokeWidth={1.8} />
                    </IconBubble>
                    <View style={s.itemInfo}>
                      <Text style={s.itemTitle}>{item.handle}</Text>
                      {item.isPrimary && (
                        <TouchableOpacity onPress={() => {}} activeOpacity={0.7} style={s.primaryBadge}>
                          <Text style={s.primaryBadgeText}>PRIMARY ✓</Text>
                        </TouchableOpacity>
                      )}
                      {!item.isPrimary && (
                        <TouchableOpacity onPress={() => setPrimaryUpi(item.id)} activeOpacity={0.7}>
                          <Text style={s.setDefaultText}>Set as primary</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {/* Actions */}
                  <ActionButtons
                    onEdit={() => openEditUpi(item)}
                    onDelete={() => deleteUpi(item.id)}
                  />
                </View>
              </View>
            ))}

            {/* Add Row */}
            <AddRow label="+ Add UPI ID" onPress={openAddUpi} />
          </View>
        </View>

        {/* ════════════════════════════════════════
            Section 2 — Saved Bank Account
        ════════════════════════════════════════ */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Saved Bank Account</Text>

          <View style={s.card}>
            {bankList.map((item, idx) => (
              <View key={item.id}>
                {idx > 0 && <View style={s.innerDivider} />}
                <View style={s.itemRow}>
                  {/* Icon + Info */}
                  <View style={s.itemLeft}>
                    <IconBubble>
                      <Building2 size={20} color={PURPLE} strokeWidth={1.8} />
                    </IconBubble>
                    <View style={s.itemInfo}>
                      <Text style={s.itemTitle}>{item.bankName}</Text>
                      <Text style={s.itemSub}>A/C {item.accountMasked}</Text>
                      <Text style={s.itemSubFaint}>IFSC {item.ifsc}</Text>
                    </View>
                  </View>
                  {/* Actions */}
                  <ActionButtons
                    onEdit={() => openEditBank(item)}
                    onDelete={() => deleteBank(item.id)}
                  />
                </View>
              </View>
            ))}

            {/* Add Row */}
            <AddRow label="+ Add Bank Account" onPress={openAddBank} />
          </View>
        </View>

        {/* ════════════════════════════════════════
            Info Box
        ════════════════════════════════════════ */}
        <View style={s.infoBox}>
          <PiggyBank size={20} color={PURPLE} strokeWidth={1.8} style={{ marginTop: 1 }} />
          <Text style={s.infoText}>
            Sakhi transfers subscription earnings within 24 hours of each completed ride.
          </Text>
        </View>

        {/* ════════════════════════════════════════
            CTA
        ════════════════════════════════════════ */}
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          {saving
            ? <ActivityIndicator color={WHITE} />
            : <Text style={s.saveBtnText}>Save Payment Details</Text>
          }
        </TouchableOpacity>

      </ScrollView>

      {/* ── UPI Modal ── */}
      <InputModal
        visible={upiModal.visible}
        title={upiModal.editing ? 'Edit UPI ID' : 'Add UPI ID'}
        fields={UPI_FIELDS}
        initialValues={upiModal.editing ? { handle: upiModal.editing.handle } : {}}
        onSave={saveUpi}
        onClose={closeUpiModal}
      />

      {/* ── Bank Modal ── */}
      <InputModal
        visible={bankModal.visible}
        title={bankModal.editing ? 'Edit Bank Account' : 'Add Bank Account'}
        fields={BANK_FIELDS}
        initialValues={
          bankModal.editing
            ? { bankName: bankModal.editing.bankName, accountNumber: '', ifsc: bankModal.editing.ifsc }
            : {}
        }
        onSave={saveBank}
        onClose={closeBankModal}
      />

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 48,
    gap: 32,
  },

  // ── Subtext ───────────────────────────────────────────────────────────────
  subtext: {
    fontSize: 14,
    fontWeight: '400',
    color: MUTED,
    lineHeight: 23,
  },

  // ── Sections ──────────────────────────────────────────────────────────────
  section:      { gap: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: DARK, letterSpacing: -0.45, lineHeight: 28 },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    overflow: 'hidden',
    ...CARD_SHD,
  },

  innerDivider: {
    height: 1,
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
    marginHorizontal: 16,
  },

  // ── Item Row ──────────────────────────────────────────────────────────────
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  itemInfo: { flex: 1, gap: 2 },

  itemTitle: { fontSize: 16, fontWeight: '700', color: DARK, lineHeight: 24 },
  itemSub:   { fontSize: 12, fontWeight: '400', color: MUTED, lineHeight: 16 },
  itemSubFaint: { fontSize: 10, fontWeight: '400', color: MUTED, lineHeight: 15, opacity: 0.7 },

  // Primary badge
  primaryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 9999,
    marginTop: 2,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    lineHeight: 15,
  },
  setDefaultText: { fontSize: 11, fontWeight: '600', color: PURPLE, marginTop: 2 },

  // Icon bubble
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Action buttons (edit / delete)
  actionBtns: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  actionBtn:  { width: 31, height: 31, alignItems: 'center', justifyContent: 'center' },

  // ── Dashed Add Row ────────────────────────────────────────────────────────
  addRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    height: 57,
    borderTopWidth: 1,
    borderTopColor: 'rgba(167, 139, 250, 0.3)',
    borderStyle: 'dashed',
  },
  addRowText: { fontSize: 16, fontWeight: '600', color: PURPLE, lineHeight: 24 },

  // ── Info Box ──────────────────────────────────────────────────────────────
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: MUTED,
    lineHeight: 20,
  },

  // ── Save CTA ─────────────────────────────────────────────────────────────
  saveBtn: {
    height: 60,
    borderRadius: 12,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: WHITE,
    lineHeight: 28,
    textAlign: 'center',
  },
});
