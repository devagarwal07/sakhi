import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const DOCS = [
  { key: 'dl',          label: 'Driving Licence',       sub: 'Front & Back', iconName: 'card-account-details-outline' },
  { key: 'vehicle_rc',  label: 'Vehicle RC',            iconName: 'car' },
  { key: 'insurance',   label: 'Insurance Certificate', iconName: 'shield-check-outline' },
  { key: 'aadhaar',     label: 'Aadhaar Card',          iconName: 'card-account-details-outline' },
  { key: 'profile',     label: 'Profile Photo',         iconName: 'account-outline' },
];

export default function DriverKycUploadScreen({ navigation }) {
  const { updateDriver } = useAuth();
  const [uploads, setUploads] = useState({});
  const [loading, setLoading] = useState(false);

  const allUploaded = DOCS.every((d) => uploads[d.key]);
  const completedCount = Object.keys(uploads).length;
  const pct = Math.round((completedCount / DOCS.length) * 100);

  const pickImage = async (key) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to upload documents.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });
    if (!result.canceled) {
      setUploads((prev) => ({ ...prev, [key]: result.assets[0] }));
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const form = new FormData();
      DOCS.forEach(({ key }) => {
        const asset = uploads[key];
        form.append(key, {
          uri:  asset.uri,
          type: 'image/jpeg',
          name: `${key}.jpg`,
        });
      });
      await client.post('/drivers/kyc/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateDriver({ onboarding_status: 'kyc_submitted' });
      navigation.navigate('VehicleDetailsEntry');
    } catch (err) {
      Alert.alert('Upload Error', err.response?.data?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Nav - TopAppBar */}
      <View style={styles.topAppBar}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Feather name="arrow-left" size={24} color="#BEA3D8" />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle}>KYC Verification</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.mainCanvas}>
          
          {/* Progress Bar Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressStepLabel}>STEP 4 OF 5</Text>
              <Text style={styles.progressPctLabel}>{pct}% Complete</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
          </View>

          {/* Section - Header Titles */}
          <View style={styles.headerTitles}>
            <Text style={styles.headline}>Upload Your Documents</Text>
            <Text style={styles.subline}>Required for verification and account activation</Text>
          </View>

          {/* Section - Document List Card */}
          <View style={styles.docsCard}>
            {DOCS.map((doc, idx) => {
              const uploaded = !!uploads[doc.key];
              return (
                <View key={doc.key}>
                  <View style={styles.row}>
                    
                    <View style={styles.rowLeft}>
                      <View style={styles.iconBg}>
                        <MaterialCommunityIcons name={doc.iconName} size={20} color="#BEA3D8" />
                      </View>
                      <View style={styles.rowTextCol}>
                        <Text style={styles.rowLabel}>{doc.label}</Text>
                        {doc.sub && <Text style={styles.rowSub}>{doc.sub}</Text>}
                      </View>
                    </View>

                    <View style={styles.rowRight}>
                      {uploaded ? (
                        <View style={styles.uploadedState}>
                          <View style={styles.uploadedCheckRow}>
                            <MaterialCommunityIcons name="check-circle" size={14} color="#059669" />
                            <Text style={styles.uploadedText}>Uploaded</Text>
                            <Feather name="check" size={12} color="#059669" />
                          </View>
                          <TouchableOpacity onPress={() => pickImage(doc.key)}>
                            <Text style={styles.reuploadText}>Re-upload</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage(doc.key)}>
                          <Text style={styles.uploadBtnText}>Upload</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                  </View>
                  {idx < DOCS.length - 1 && <View style={styles.divider} />}
                </View>
              );
            })}
          </View>

          {/* Section - Info Box */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#BEA3D8" style={{ marginTop: 2 }} />
            <Text style={styles.infoText}>
              Clean documents are auto-approved. Flagged ones go to manual review.
            </Text>
          </View>

        </View>
      </ScrollView>

      {/* Bottom Action Footer */}
      <View style={styles.bottomFooter}>
        <SafeAreaView edges={['bottom']} style={{ width: '100%', alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.submitBtn, (!allUploaded || loading) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!allUploaded || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Submit for Verification</Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },
  topAppBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(245, 240, 255, 0.95)',
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 4,
    zIndex: 10,
  },
  safeAreaHeader: {
    width: '100%',
  },
  headerContent: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 28,
    color: '#1E1B2E',
    letterSpacing: -0.45,
    marginLeft: 4,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 160,
  },
  mainCanvas: {
    paddingHorizontal: 24,
    paddingTop: 140, // Needs space for Header + Padding (96 per design, depending on safe area)
    paddingBottom: 128,
    gap: 32,
    alignItems: 'center',
    width: '100%',
  },
  progressSection: {
    width: '100%',
    gap: 12,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
  progressStepLabel: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 12,
    color: '#BEA3D8',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  progressPctLabel: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    color: '#6B7280',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#EDE9FA',
    borderRadius: 9999,
  },
  progressFill: {
    height: 8,
    backgroundColor: '#BEA3D8',
    borderRadius: 9999,
  },
  headerTitles: {
    width: '100%',
    gap: 7,
  },
  headline: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 30,
    color: '#1E1B2E',
    letterSpacing: -0.6,
  },
  subline: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 23,
    color: '#6B7280',
  },
  docsCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    minHeight: 80,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: '#F5F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTextCol: {
    flexShrink: 1,
  },
  rowLabel: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 24,
    color: '#1E1B2E',
  },
  rowSub: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 10,
    lineHeight: 15,
    color: '#6B7280',
  },
  rowRight: {
    marginLeft: 16,
  },
  uploadBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 9999,
    paddingVertical: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtnText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 16,
    color: '#BEA3D8',
  },
  uploadedState: {
    alignItems: 'flex-end',
    gap: 4,
  },
  uploadedCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  uploadedText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 12,
    color: '#059669',
  },
  reuploadText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 10,
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
  divider: {
    width: '88%',
    alignSelf: 'center',
    height: 1,
    backgroundColor: '#F5F0FF',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 20,
    color: '#6B7280',
  },
  bottomFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  submitBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#BEA3D8',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
