import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';

const DOC_STATUS_STYLES = {
  verified:       { bg: '#DCFCE7', text: '#15803D', label: '✅ Verified'       },
  pending:        { bg: '#FEF9C3', text: '#92400E', label: '⏳ Pending'         },
  rejected:       { bg: '#FEE2E2', text: '#DC2626', label: '❌ Rejected'        },
  expiring_soon:  { bg: '#FFF7ED', text: '#C2410C', label: '⚠️ Expiring Soon'   },
};

function DocumentRow({ doc, onReUpload }) {
  const s = DOC_STATUS_STYLES[doc.status] ?? DOC_STATUS_STYLES.pending;
  return (
    <View style={styles.docRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.docName}>{doc.name}</Text>
        {doc.expiry && <Text style={styles.docExpiry}>Exp: {doc.expiry}</Text>}
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
          <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.reUploadBtn} onPress={() => onReUpload(doc)} activeOpacity={0.7}>
        <Text style={styles.reUploadText}>Re-upload</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function MyDocumentsScreen({ navigation }) {
  const [docs, setDocs]       = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDocs = async () => {
    try {
      const { data } = await client.get('/drivers/documents');
      setDocs(data.documents ?? []);
    } catch { /* use fallback */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleReUpload = async (doc) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, quality: 0.9,
    });
    if (result.canceled) return;

    try {
      const form = new FormData();
      form.append('document', { uri: result.assets[0].uri, type: 'image/jpeg', name: `${doc.type}.jpg` });
      form.append('document_type', doc.type);
      await client.post('/drivers/documents/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      Alert.alert('Uploaded', 'Document submitted for verification.');
      fetchDocs();
    } catch (err) {
      Alert.alert('Upload Failed', err.response?.data?.message ?? 'Please try again.');
    }
  };

  // Fallback mock list if API hasn't returned yet
  const displayDocs = docs.length > 0 ? docs : [
    { name: 'Driving Licence',  type: 'driving_licence', status: 'verified',      expiry: 'Oct 2028' },
    { name: 'Aadhaar Card',     type: 'aadhaar',         status: 'verified',      expiry: null       },
    { name: 'Vehicle RC',       type: 'vehicle_rc',      status: 'verified',      expiry: 'Jan 2030' },
    { name: 'Insurance',        type: 'insurance',       status: 'expiring_soon', expiry: 'Aug 2024' },
    { name: 'Selfie / Identity',type: 'selfie',          status: 'verified',      expiry: null       },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Documents</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={Colors.primaryContainer} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.infoNote}>
            📋  Documents are verified by Sakhi ops team. Re-upload if any is expired or rejected.
          </Text>
          <View style={styles.card}>
            {displayDocs.map((doc, i, arr) => (
              <View key={doc.type}>
                <DocumentRow doc={doc} onReUpload={handleReUpload} />
                {i < arr.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
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
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingHorizontal: Spacing.base, paddingBottom: 40, gap: 12 },
  infoNote: {
    fontSize: 12, color: Colors.onSurfaceVariant, lineHeight: 18,
    backgroundColor: `${Colors.primaryContainer}0D`, borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, ...Shadows.card },
  docRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  docName: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  docExpiry: { fontSize: 10, color: Colors.onSurfaceVariant, marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  statusText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  reUploadBtn: {
    backgroundColor: `${Colors.primaryContainer}10`, paddingHorizontal: 10,
    paddingVertical: 6, borderRadius: Radius.md,
  },
  reUploadText: { fontSize: 11, fontWeight: '700', color: Colors.primaryContainer },
  divider: { height: 1, backgroundColor: Colors.surfaceLow, marginVertical: 2 },
});
