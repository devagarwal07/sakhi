import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const CALLBACK_URL = `${BACKEND_URL}/webhooks/signzy/digilocker-callback`;

// ─ States of this screen ─────────────────────────────────────────────────────
// 'intro'       — explain what DigiLocker is, CTA to start
// 'webview'     — WebView open showing DigiLocker consent page
// 'fetching'    — WebView closed, calling get-eaadhaar
// 'success'     — eAadhaar fetched and identity confirmed
// 'error'       — something went wrong

export default function DigiLockerConsentScreen({ navigation }) {
  const { updateDriver } = useAuth();
  const [phase, setPhase]             = useState('intro');
  const [loadingLabel, setLoadingLabel] = useState('');
  const [consentUrl, setConsentUrl]   = useState(null);
  const [aadhaarData, setAadhaarData] = useState(null);
  const [linkedDocs, setLinkedDocs]   = useState([]); // from get-details
  const [errorMsg, setErrorMsg]       = useState('');

  // ── Step 1: Call backend to get the DigiLocker URL ─────────────────────────
  const startDigiLocker = useCallback(async () => {
    try {
      setPhase('loading');
      const { data } = await client.post('/drivers/digilocker/create-url', {
        redirectUrl: CALLBACK_URL,
      });
      if (!data?.url) throw new Error('No consent URL returned from server.');
      setConsentUrl(data.url);
      setPhase('webview');
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? err.message ?? 'Could not start DigiLocker. Please try again.';
      setErrorMsg(msg);
      setPhase('error');
    }
  }, []);

  // ── Step 2: WebView navigation — detect callback URL ──────────────────────
  const onWebViewNavigationChange = useCallback((navState) => {
    const url = navState.url || '';
    if (!url.includes('/digilocker-callback')) return;

    if (url.includes('status=failed')) {
      // DigiLocker authorisation was declined or cancelled
      setErrorMsg('DigiLocker authorisation was not completed. Please try again or skip to upload manually.');
      setPhase('error');
    } else {
      // Success — proceed with document fetch + eAadhaar pull
      setPhase('fetching');
      fetchDetails();
    }
  }, []);

  // ── Step 3a: Fetch linked document inventory ("Get Details") ──────────────
  const fetchDetails = useCallback(async () => {
    try {
      setLoadingLabel('Reading your DigiLocker documents…');
      const { data } = await client.post('/drivers/digilocker/get-details', {});
      const files = data?.result?.files ?? [];
      setLinkedDocs(files);
    } catch {
      // Non-fatal: proceed even if get-details fails
    } finally {
      fetchEAadhaar();
    }
  }, []);

  // ── Step 3b: Fetch e-Aadhaar identity ─────────────────────────────────────
  const fetchEAadhaar = useCallback(async () => {
    try {
      setLoadingLabel('Fetching your verified Aadhaar identity…');
      const { data } = await client.post('/drivers/digilocker/get-eaadhaar', {
        extraDigitalCertificateParams: true,  // fetch DSC details
        getEAadhaarJpeg: true,                // fetch Aadhaar JPEG
      });
      const result = data?.result;
      if (!result?.name) throw new Error('Aadhaar data incomplete — please try again.');
      setAadhaarData(result);
      updateDriver({ aadhaar_status: 'verified' });
      setPhase('success');
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? err.message ?? 'Could not retrieve Aadhaar. Please try again.';
      setErrorMsg(msg);
      setPhase('error');
    }
  }, [updateDriver]);

  // ── Step 4: Proceed to document upload ─────────────────────────────────────
  const handleContinue = useCallback(() => {
    updateDriver({ onboarding_status: 'aadhaar_verified' });
    navigation.navigate('DriverKycUpload');
  }, [navigation, updateDriver]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  if (phase === 'webview' && consentUrl) {
    return (
      <View style={styles.fullScreen}>
        <SafeAreaView edges={['top']} style={styles.webviewBar}>
          <View style={styles.webviewHeader}>
            <TouchableOpacity
              onPress={() => { setConsentUrl(null); setPhase('intro'); }}
              style={styles.backBtn}
            >
              <Feather name="x" size={22} color="#1E1B2E" />
            </TouchableOpacity>
            <Text style={styles.webviewTitle}>DigiLocker — Aadhaar</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
        <WebView
          source={{ uri: consentUrl }}
          onNavigationStateChange={onWebViewNavigationChange}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.webviewLoader}>
              <ActivityIndicator size="large" color="#9B70D4" />
            </View>
          )}
          style={{ flex: 1 }}
        />
      </View>
    );
  }

  if (phase === 'fetching' || phase === 'loading') {
    return (
      <View style={styles.centered}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#9B70D4" />
          <Text style={styles.loadingTitle}>
            {phase === 'loading' ? 'Connecting to DigiLocker…' : 'Verifying your identity…'}
          </Text>
          <Text style={styles.loadingSubtitle}>
            {phase === 'loading'
              ? 'Generating your secure consent URL'
              : loadingLabel || 'Retrieving your verified identity details'}
          </Text>
        </View>
      </View>
    );
  }

  if (phase === 'success' && aadhaarData) {
    const dob = aadhaarData.dob ?? '';
    const maskedUid = aadhaarData.uid ?? '';
    const gender = aadhaarData.gender ?? '';
    const city   = aadhaarData.splitAddress?.city?.[0] ?? '';
    const state  = aadhaarData.splitAddress?.state?.[0]?.[0] ?? '';
    const valid  = aadhaarData.x509Data?.validAadhaarDSC === 'yes';

    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          <View style={styles.headerContent}>
            <View style={{ width: 40 }} />
            <Text style={styles.headerTitle}>Aadhaar Verified</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Success badge */}
          <View style={styles.successBadge}>
            <View style={styles.successIconRing}>
              <MaterialCommunityIcons name="check-decagram" size={48} color="#059669" />
            </View>
            <Text style={styles.successTitle}>Identity Confirmed</Text>
            <Text style={styles.successSub}>Your Aadhaar has been linked via DigiLocker</Text>
          </View>

          {/* Identity card */}
          <View style={styles.identityCard}>
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>Name</Text>
              <Text style={styles.identityValue}>{aadhaarData.name}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>Date of Birth</Text>
              <Text style={styles.identityValue}>{dob}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>Gender</Text>
              <Text style={styles.identityValue}>{gender}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>Aadhaar UID</Text>
              <Text style={styles.identityValue}>{maskedUid}</Text>
            </View>
            {(city || state) ? (
              <>
                <View style={styles.divider} />
                <View style={styles.identityRow}>
                  <Text style={styles.identityLabel}>Location</Text>
                  <Text style={styles.identityValue}>{[city, state].filter(Boolean).join(', ')}</Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Linked documents from get-details */}
          {linkedDocs.length > 0 && (
            <View style={styles.linkedDocsCard}>
              <Text style={styles.linkedDocsTitle}>Documents in your DigiLocker</Text>
              {linkedDocs.map((doc, idx) => (
                <View key={doc.id ?? idx} style={styles.linkedDocRow}>
                  <MaterialCommunityIcons
                    name={
                      doc.doctype === 'DRVLC'  ? 'card-account-details-outline' :
                      doc.doctype === 'PANCR'  ? 'card-bulleted-outline' :
                      doc.doctype === 'AADHAAR'? 'shield-account-outline' :
                      'file-outline'
                    }
                    size={16}
                    color="#9B70D4"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.linkedDocName}>{doc.name ?? doc.description}</Text>
                    <Text style={styles.linkedDocIssuer}>{doc.issuer}</Text>
                  </View>
                  <MaterialCommunityIcons name="check-circle" size={14} color="#059669" />
                </View>
              ))}
            </View>
          )}

          {/* DSC validity badge */}
          <View style={[styles.dscBadge, valid ? styles.dscValid : styles.dscInvalid]}>
            <MaterialCommunityIcons
              name={valid ? 'shield-check' : 'shield-alert'}
              size={16}
              color={valid ? '#059669' : '#D97706'}
            />
            <Text style={[styles.dscText, valid ? styles.dscTextValid : styles.dscTextInvalid]}>
              {valid ? 'Digital Signature Verified (Valid DSC)' : 'DSC could not be verified'}
            </Text>
          </View>

          {/* Info notice */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information-outline" size={16} color="#BEA3D8" />
            <Text style={styles.infoText}>
              Your Aadhaar details are securely stored and encrypted. They will only be used for KYC verification.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.bottomFooter}>
          <SafeAreaView edges={['bottom']}>
            <TouchableOpacity style={styles.ctaBtn} onPress={handleContinue} activeOpacity={0.85}>
              <Text style={styles.ctaBtnText}>Continue to Upload Documents</Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => setPhase('intro')} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color="#BEA3D8" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Aadhaar Verification</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>

        <View style={styles.errorContent}>
          <View style={styles.errorIconRing}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#DC2626" />
          </View>
          <Text style={styles.errorTitle}>Verification Failed</Text>
          <Text style={styles.errorMsg}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={startDigiLocker} activeOpacity={0.85}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skipLink}
            onPress={() => navigation.navigate('DriverKycUpload')}
          >
            <Text style={styles.skipLinkText}>Skip for now — upload Aadhaar manually</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Default: intro phase
  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#BEA3D8" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Aadhaar via DigiLocker</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Step indicator */}
        <View style={styles.stepRow}>
          <Text style={styles.stepLabel}>STEP 2 OF 5</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '40%' }]} />
          </View>
        </View>

        {/* Hero icon */}
        <View style={styles.heroIconWrap}>
          <View style={styles.heroIconRing}>
            <MaterialCommunityIcons name="card-account-details-outline" size={44} color="#9B70D4" />
          </View>
        </View>

        <Text style={styles.headline}>Link Your Aadhaar</Text>
        <Text style={styles.subline}>
          Securely verify your identity using your government-issued Aadhaar via DigiLocker — no manual upload needed.
        </Text>

        {/* Feature pills */}
        {[
          { icon: 'shield-check-outline', label: 'Govt-verified identity' },
          { icon: 'lock-outline',          label: 'End-to-end encrypted' },
          { icon: 'lightning-bolt',        label: 'Instant verification' },
          { icon: 'eye-off-outline',       label: 'Your data stays private' },
        ].map((f) => (
          <View key={f.label} style={styles.featurePill}>
            <View style={styles.featureIconBg}>
              <MaterialCommunityIcons name={f.icon} size={18} color="#9B70D4" />
            </View>
            <Text style={styles.featureText}>{f.label}</Text>
          </View>
        ))}

        {/* How it works */}
        <View style={styles.stepsCard}>
          <Text style={styles.stepsCardTitle}>How it works</Text>
          {[
            { n: '1', t: 'Open DigiLocker',       s: "We'll launch the DigiLocker consent page" },
            { n: '2', t: 'Log in & Authorise',    s: 'Log in with your Aadhaar / Mobile OTP' },
            { n: '3', t: 'Identity Confirmed',    s: 'We fetch your verified details automatically' },
          ].map((step) => (
            <View key={step.n} style={styles.stepItem}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{step.n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{step.t}</Text>
                <Text style={styles.stepSub}>{step.s}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Manual fallback notice */}
        <TouchableOpacity
          style={styles.manualLink}
          onPress={() => navigation.navigate('DriverKycUpload')}
        >
          <Text style={styles.manualLinkText}>
            Don't have DigiLocker? Upload Aadhaar manually instead →
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomFooter}>
        <SafeAreaView edges={['bottom']}>
          <TouchableOpacity style={styles.ctaBtn} onPress={startDigiLocker} activeOpacity={0.85}>
            <MaterialCommunityIcons name="open-in-new" size={18} color="#FFFFFF" />
            <Text style={styles.ctaBtnText}>Open DigiLocker</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    backgroundColor: '#F5F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  safeHeader: { width: '100%' },
  headerContent: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '600',
    color: '#1E1B2E',
    letterSpacing: -0.4,
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 140,
    paddingTop: 8,
    gap: 16,
  },

  // ── Step indicator ────────────────────────────────────────────────────────
  stepRow: { gap: 8 },
  stepLabel: {
    fontFamily: 'Inter', fontSize: 11, fontWeight: '600',
    color: '#BEA3D8', letterSpacing: 1.2, textTransform: 'uppercase',
  },
  progressTrack: {
    width: '100%', height: 6,
    backgroundColor: '#EDE9FA', borderRadius: 9999,
  },
  progressFill: {
    height: 6, backgroundColor: '#9B70D4', borderRadius: 9999,
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroIconWrap: { alignItems: 'center', marginVertical: 8 },
  heroIconRing: {
    width: 96, height: 96,
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 6,
  },
  headline: {
    fontFamily: 'Inter', fontSize: 26, fontWeight: '800',
    color: '#1E1B2E', letterSpacing: -0.65, textAlign: 'center',
  },
  subline: {
    fontFamily: 'Inter', fontSize: 14, fontWeight: '400',
    color: '#6B7280', lineHeight: 22, textAlign: 'center',
  },

  // ── Feature pills ─────────────────────────────────────────────────────────
  featurePill: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 2,
  },
  featureIconBg: {
    width: 36, height: 36, borderRadius: 9999,
    backgroundColor: '#F5F0FF',
    alignItems: 'center', justifyContent: 'center',
  },
  featureText: {
    fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: '#1E1B2E',
  },

  // ── How it works card ─────────────────────────────────────────────────────
  stepsCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 20, gap: 18,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07, shadowRadius: 24, elevation: 3,
  },
  stepsCardTitle: {
    fontFamily: 'Inter', fontSize: 13, fontWeight: '700',
    color: '#9B70D4', letterSpacing: 0.5, textTransform: 'uppercase',
  },
  stepItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F5F0FF',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  stepNumText: {
    fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: '#9B70D4',
  },
  stepTitle: {
    fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: '#1E1B2E',
    marginBottom: 2,
  },
  stepSub: {
    fontFamily: 'Inter', fontSize: 12, fontWeight: '400',
    color: '#6B7280', lineHeight: 18,
  },

  // ── Manual fallback ───────────────────────────────────────────────────────
  manualLink: { alignItems: 'center', paddingVertical: 4 },
  manualLinkText: {
    fontFamily: 'Inter', fontSize: 12, fontWeight: '500',
    color: '#9B70D4', textDecorationLine: 'underline', textAlign: 'center',
  },

  // ── Bottom footer ─────────────────────────────────────────────────────────
  bottomFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(245,240,255,0.96)',
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.07, shadowRadius: 24,
    elevation: 8,
  },
  ctaBtn: {
    height: 56, borderRadius: 14,
    backgroundColor: '#9B70D4',
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    gap: 10,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 6,
  },
  ctaBtnText: {
    fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: '#FFFFFF',
  },

  // ── Loading card ──────────────────────────────────────────────────────────
  loadingCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20,
    padding: 40, alignItems: 'center', gap: 16,
    width: '100%',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 24, elevation: 4,
  },
  loadingTitle: {
    fontFamily: 'Inter', fontSize: 18, fontWeight: '700',
    color: '#1E1B2E', textAlign: 'center', marginTop: 8,
  },
  loadingSubtitle: {
    fontFamily: 'Inter', fontSize: 13, fontWeight: '400',
    color: '#6B7280', textAlign: 'center',
  },

  // ── Success ───────────────────────────────────────────────────────────────
  successBadge: { alignItems: 'center', gap: 8, marginBottom: 8 },
  successIconRing: {
    width: 96, height: 96, borderRadius: 9999,
    backgroundColor: '#ECFDF5',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  successTitle: {
    fontFamily: 'Inter', fontSize: 24, fontWeight: '800',
    color: '#1E1B2E', letterSpacing: -0.6,
  },
  successSub: {
    fontFamily: 'Inter', fontSize: 13, fontWeight: '400',
    color: '#6B7280', textAlign: 'center',
  },

  identityCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07, shadowRadius: 24, elevation: 3,
  },
  identityRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 20,
  },
  identityLabel: {
    fontFamily: 'Inter', fontSize: 12, fontWeight: '500',
    color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  identityValue: {
    fontFamily: 'Inter', fontSize: 14, fontWeight: '700',
    color: '#1E1B2E', maxWidth: '60%', textAlign: 'right',
  },
  divider: { height: 1, backgroundColor: '#F5F0FF', marginHorizontal: 20 },

  // ── Linked documents card ─────────────────────────────────────────────────
  linkedDocsCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07, shadowRadius: 24, elevation: 3,
    padding: 16, gap: 12,
  },
  linkedDocsTitle: {
    fontFamily: 'Inter', fontSize: 12, fontWeight: '700',
    color: '#9B70D4', textTransform: 'uppercase', letterSpacing: 0.6,
    marginBottom: 4,
  },
  linkedDocRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  linkedDocName: {
    fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: '#1E1B2E',
  },
  linkedDocIssuer: {
    fontFamily: 'Inter', fontSize: 11, fontWeight: '400', color: '#9CA3AF',
  },

  // DSC badge
  dscBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
  },
  dscValid:        { backgroundColor: '#ECFDF5' },
  dscInvalid:      { backgroundColor: '#FFFBEB' },
  dscText:         { fontFamily: 'Inter', fontSize: 12, fontWeight: '600', flex: 1 },
  dscTextValid:    { color: '#059669' },
  dscTextInvalid:  { color: '#D97706' },

  // Info box
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#EDE9FE', borderRadius: 12, padding: 14,
  },
  infoText: {
    fontFamily: 'Inter', fontSize: 12, fontWeight: '400',
    color: '#6B7280', lineHeight: 18, flex: 1,
  },

  // ── Error ─────────────────────────────────────────────────────────────────
  errorContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 16,
  },
  errorIconRing: {
    width: 96, height: 96, borderRadius: 9999,
    backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  errorTitle: {
    fontFamily: 'Inter', fontSize: 22, fontWeight: '800',
    color: '#1E1B2E', letterSpacing: -0.5,
  },
  errorMsg: {
    fontFamily: 'Inter', fontSize: 13, fontWeight: '400',
    color: '#6B7280', textAlign: 'center', lineHeight: 20,
  },
  retryBtn: {
    height: 50, borderRadius: 12,
    backgroundColor: '#9B70D4',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, marginTop: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 4,
  },
  retryBtnText: {
    fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: '#FFFFFF',
  },
  skipLink: { marginTop: 4 },
  skipLinkText: {
    fontFamily: 'Inter', fontSize: 12, fontWeight: '500',
    color: '#9CA3AF', textDecorationLine: 'underline', textAlign: 'center',
  },

  // ── WebView header ────────────────────────────────────────────────────────
  webviewBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#EDE9F0',
  },
  webviewHeader: {
    height: 56, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  webviewTitle: {
    fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: '#1E1B2E',
  },
  webviewLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F5F0FF',
  },
});
