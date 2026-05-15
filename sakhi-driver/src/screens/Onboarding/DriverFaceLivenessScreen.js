import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Animated, useWindowDimensions, Platform,
    BackHandler,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';


const PURPLE = '#9B70D4';
const GREEN  = '#22C55E';
const RED    = '#EF4444';
const WHITE  = '#FFF';

const RETRY_MESSAGES = {
    no_face_detected:      'No face detected. Make sure your face is clearly visible within the frame.',
    multiple_faces:        'Multiple faces detected. Please ensure only your face is in frame.',
    gender_low_confidence: "We couldn't confirm your identity clearly. Try better lighting and keep your face centred.",
    sunglasses_detected:   'Please remove sunglasses.',
    eyes_not_open:         'Eyes were closed in the photo. Please try again.',
};

export default function DriverFaceLivenessScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { updateDriver, logout } = useAuth();

    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef    = useRef(null);
    const progressRef  = useRef(null);
    const scanLineAnim = useRef(new Animated.Value(0)).current;

    const [scanning, setScanning]     = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [statusMsg, setStatusMsg]   = useState('');
    const [phase, setPhase]           = useState('live');  // live | done | rejected | error | manual_review
    const [errMsg, setErrMsg]         = useState('');

    const { width: W, height: H } = useWindowDimensions();

    // ── Hardware back = logout → clears tokens → RootNavigator shows AuthStack (OTP login) ─
    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            logout();
            return true;
        });
        return () => sub.remove();
    }, [logout]);

    // ── Scan line animation ───────────────────────────────────────────────
    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
                Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, []);

    // ── Layout calculations (same as customer app) ────────────────────────
    const topNavPT     = Platform.OS === 'ios' ? insets.top + 12 : Math.max(insets.top, 24);
    const topNavH      = topNavPT + 32 + 16;
    const bottomPB     = Math.max(insets.bottom + (Platform.OS === 'ios' ? 14 : 12), 24);
    const bottomH      = 24 + bottomPB + 64 + 165;
    const scanAreaTop  = topNavH + 16;
    const scanAreaBot  = Math.max(bottomH - 40, 0);
    const scanAreaH    = Math.max(H - scanAreaTop - scanAreaBot, 0);

    const maxFW = Math.min(W - 48, 320);
    const maxFH = Math.max(scanAreaH - 108, 0);
    let fW = maxFW, fH = fW * (420 / 300);
    if (maxFH > 0 && fH > maxFH) { fH = maxFH; fW = fH / (420 / 300); }
    if (fW <= 0 || fH <= 0) { fW = Math.max(Math.min(W - 48, 240), 160); fH = fW * (420 / 300); }

    const ovalRadius  = fW * 0.6;
    const scanTravel  = fH * (150 / 420);
    const scanTransY  = scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [-scanTravel, scanTravel] });

    // ── Progress animation ────────────────────────────────────────────────
    const startProgress = () => {
        setScanProgress(0);
        let p = 0;
        progressRef.current = setInterval(() => {
            p += 1;
            if (p <= 90) setScanProgress(p);
            else clearInterval(progressRef.current);
        }, 40);
    };
    const finishProgress = () => { clearInterval(progressRef.current); setScanProgress(100); };
    const resetProgress  = () => { clearInterval(progressRef.current); setScanProgress(0); };

    // ── Capture + verify ──────────────────────────────────────────────────
    const handleVerify = async () => {
        if (scanning || !cameraRef.current) return;
        setScanning(true);
        setStatusMsg('Capturing…');
        startProgress();

        try {
            const photo = await cameraRef.current.takePictureAsync({
                base64: true, quality: 0.75, skipProcessing: true,
            });
            if (!photo?.base64) throw new Error('Capture failed');

            setStatusMsg('Analysing…');
            const { data } = await client.post('/drivers/face-photo', {
                image: `data:image/jpeg;base64,${photo.base64}`,
            });
            finishProgress();

            const status = data?.status;

            if (status === 'approved') {
                setStatusMsg('Verified ✓');
                updateDriver({ verification_status: 'approved', gender_verified: true });
                setScanning(false);
                setPhase('done');
                return;
            }

            if (status === 'rejected') {
                resetProgress();
                setScanning(false);
                setPhase('rejected');
                return;
            }

            if (status === 'manual_review') {
                updateDriver({ verification_status: 'pending', face_review_required: true });
                resetProgress();
                setScanning(false);
                setPhase('manual_review');
                return;
            }

            // retry
            resetProgress();
            setScanning(false);
            const reason  = data?.reason ?? 'unknown';
            setErrMsg(RETRY_MESSAGES[reason] ?? 'Please try again with better lighting and your face centred.');
            setPhase('error');

        } catch (err) {
            resetProgress();
            setScanning(false);
            const code    = err?.response?.data?.error?.code;
            const message = err?.response?.data?.error?.message || err?.message || 'Verification failed. Please try again.';

            if (code === 'ALREADY_VERIFIED') {
                updateDriver({ verification_status: 'approved', gender_verified: true });
                navigation.navigate('DriverKycUpload');
                return;
            }
            if (code === 'NOT_ELIGIBLE') { setPhase('rejected'); return; }
            if (code === 'MANUAL_REVIEW_REQUIRED') {
                updateDriver({ verification_status: 'pending', face_review_required: true });
                setPhase('manual_review');
                return;
            }
            setErrMsg(message);
            setPhase('error');
        }
    };

    const handleRetry = () => {
        setPhase('live');
        setErrMsg('');
        setScanProgress(0);
        setStatusMsg('');
    };

    // ── Permission screens ────────────────────────────────────────────────
    if (!permission) return <View style={s.root}><ActivityIndicator color={PURPLE} size="large" /></View>;

    if (!permission.granted) {
        return (
            <SafeAreaView style={s.permRoot}>
                <MaterialCommunityIcons name="camera-off" size={64} color={PURPLE} style={{ marginBottom: 24 }} />
                <Text style={s.permTitle}>Camera Access Required</Text>
                <Text style={s.permSub}>Sakhi needs your camera to verify your identity.</Text>
                <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
                    <Text style={s.btnTxt}>Grant Access</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={logout} style={{ marginTop: 14 }}>
                    <Text style={[s.btnTxt, { color: PURPLE }]}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // ── Result overlays ───────────────────────────────────────────────────
    if (phase === 'done') {
        return (
            <View style={s.root}>
                <CameraView style={StyleSheet.absoluteFill} facing="front" />
                <View style={[s.overlay, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
                    <View style={[s.rCircle, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                        <MaterialCommunityIcons name="check-circle" size={80} color={GREEN} />
                    </View>
                    <Text style={[s.ovTitle, { color: GREEN }]}>Identity Verified ✓</Text>
                    <Text style={s.ovSub}>Welcome to Sakhi!</Text>
                    <TouchableOpacity
                        style={[s.rBtn, { backgroundColor: GREEN }]}
                        onPress={() => navigation.navigate('DriverKycUpload')}
                    >
                        <Text style={s.btnTxt}>Continue →</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (phase === 'rejected') {
        return (
            <View style={s.root}>
                <View style={[s.overlay, { backgroundColor: '#0d0010' }]}>
                    <View style={[s.rCircle, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                        <MaterialCommunityIcons name="close-circle" size={80} color={RED} />
                    </View>
                    <Text style={[s.ovTitle, { color: RED }]}>Not Eligible</Text>
                    <Text style={s.ovSub}>Only verified women drivers can join Sakhi.</Text>
                    <TouchableOpacity
                        style={[s.rBtn, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
                        onPress={logout}
                    >
                        <Text style={s.btnTxt}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (phase === 'manual_review') {
        return (
            <View style={s.root}>
                <View style={[s.overlay, { backgroundColor: '#0d0010' }]}>
                    <View style={[s.rCircle, { backgroundColor: 'rgba(155,112,212,0.15)' }]}>
                        <MaterialCommunityIcons name="clock-outline" size={80} color={PURPLE} />
                    </View>
                    <Text style={[s.ovTitle, { color: PURPLE }]}>Under Review</Text>
                    <Text style={s.ovSub}>Your verification is being reviewed manually. We'll notify you shortly.</Text>
                    <TouchableOpacity
                        style={[s.rBtn, { backgroundColor: PURPLE }]}
                        onPress={() => navigation.navigate('DriverKycUpload')}
                    >
                        <Text style={s.btnTxt}>Continue</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (phase === 'error') {
        return (
            <View style={s.root}>
                <View style={[s.overlay, { backgroundColor: '#0d0010' }]}>
                    <View style={[s.rCircle, { backgroundColor: 'rgba(251,191,36,0.15)' }]}>
                        <MaterialCommunityIcons name="refresh-circle" size={80} color="#FBBF24" />
                    </View>
                    <Text style={[s.ovTitle, { color: '#FBBF24' }]}>Try Again</Text>
                    <Text style={s.ovSub}>{errMsg}</Text>
                    <TouchableOpacity style={[s.rBtn, { backgroundColor: PURPLE }]} onPress={handleRetry}>
                        <Text style={s.btnTxt}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── Main camera screen ────────────────────────────────────────────────
    return (
        <View style={s.root}>
            {/* Live camera */}
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />

            {/* Dark overlay */}
            <View style={s.darkOverlay} />
            {scanning && <View style={s.scanningOverlay} />}

            {/* Top nav */}
            <View style={[s.topNav, { paddingTop: topNavPT }]}>
                <TouchableOpacity style={s.backBtn} onPress={logout}>
                    <Feather name="arrow-left" size={18} color={WHITE} />
                </TouchableOpacity>
                <Text style={s.navTitle}>Face Verification</Text>
                <View style={{ width: 32 }} />
            </View>

            {/* Scan area with oval frame */}
            <View style={[s.scanArea, { top: scanAreaTop, bottom: scanAreaBot }]}>
                <View style={[s.faceFrame, { width: fW, height: fH }]}>
                    {/* Oval frame */}
                    <View style={[
                        s.ovalDashed,
                        { width: fW, height: fH, borderRadius: ovalRadius },
                        scanning && s.ovalScanning,
                    ]} />

                    {/* Scan line */}
                    <Animated.View style={[s.scanLine, { transform: [{ translateY: scanTransY }] }]} />

                    {/* Corner accents */}
                    <View style={s.cornersWrap}>
                        <View style={[s.corner, s.cornerTL]} />
                        <View style={[s.corner, s.cornerTR]} />
                        <View style={[s.corner, s.cornerBL]} />
                        <View style={[s.corner, s.cornerBR]} />
                    </View>
                </View>

                {/* Instruction text */}
                <View style={s.instrBlock}>
                    {scanning ? (
                        <>
                            <ActivityIndicator color={PURPLE} size="small" style={{ marginBottom: 6 }} />
                            <Text style={s.instrTitle}>{statusMsg || 'Analysing…'}</Text>
                            <Text style={s.instrSub}>Please hold still</Text>
                        </>
                    ) : (
                        <>
                            <Text style={s.instrTitle}>Hold still, scanning…</Text>
                            <Text style={s.instrSub}>Position your face within the frame</Text>
                        </>
                    )}
                </View>
            </View>

            {/* Bottom controls */}
            <View style={[s.bottomControls, { paddingBottom: bottomPB }]}>
                {/* Progress bar */}
                <View style={s.progressSection}>
                    <View style={s.progressLabelRow}>
                        <Text style={s.progressPct}>{scanProgress}%</Text>
                    </View>
                    <View style={s.progressTrack}>
                        <View style={[s.progressFill, { width: `${scanProgress}%` }]} />
                    </View>
                </View>

                {/* Shutter / Play button — centered */}
                <View style={s.controlsRow}>
                    <TouchableOpacity
                        style={s.shutterOuter}
                        onPress={handleVerify}
                        disabled={scanning}
                        activeOpacity={0.9}
                    >
                        <View style={[s.shutterInner, scanning && s.shutterActive]}>
                            {scanning
                                ? <ActivityIndicator color={PURPLE} size="small" />
                                : <MaterialCommunityIcons name="play" size={24} color="#0F172A" />
                            }
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Security badge */}
                <View style={s.securityBadge}>
                    <MaterialCommunityIcons name="shield-check" size={11} color="#BEA3D8" />
                    <Text style={s.securityTxt}>SECURE VERIFICATION — POWERED BY AWS REKOGNITION</Text>
                </View>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root:    { flex: 1, backgroundColor: '#121121' },
    darkOverlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    scanningOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(155,112,212,0.06)' },

    permRoot:  { flex: 1, backgroundColor: '#F5F0FF', alignItems: 'center', justifyContent: 'center', padding: 32 },
    permTitle: { fontSize: 22, fontWeight: '800', color: '#1E1B2E', marginBottom: 12, textAlign: 'center' },
    permSub:   { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
    permBtn:   { height: 52, borderRadius: 12, backgroundColor: PURPLE, paddingHorizontal: 40, alignItems: 'center', justifyContent: 'center' },
    btnTxt:    { fontSize: 15, fontWeight: '700', color: WHITE },

    topNav: {
        position: 'absolute', top: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingBottom: 14, zIndex: 10,
    },
    backBtn:  { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    navTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: WHITE, textAlign: 'center' },

    scanArea:  { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    faceFrame: { alignItems: 'center', justifyContent: 'center' },

    ovalDashed:   { borderWidth: 4, borderStyle: 'dashed', borderColor: 'rgba(155,112,212,0.6)' },
    ovalScanning: { borderColor: 'rgba(155,112,212,1)', borderStyle: 'solid' },

    scanLine: {
        position: 'absolute', left: 0, right: 0, height: 4,
        backgroundColor: PURPLE, opacity: 0.8,
        shadowColor: PURPLE, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9, shadowRadius: 14,
    },

    cornersWrap: { position: 'absolute', left: -16, right: -16, top: -16, bottom: -16, opacity: 0.5 },
    corner:     { position: 'absolute', width: 32, height: 32 },
    cornerTL:   { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderColor: PURPLE, borderTopLeftRadius: 32 },
    cornerTR:   { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderColor: PURPLE, borderTopRightRadius: 32 },
    cornerBL:   { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: PURPLE, borderBottomLeftRadius: 32 },
    cornerBR:   { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderColor: PURPLE, borderBottomRightRadius: 32 },

    instrBlock: { alignItems: 'center', paddingTop: 48, gap: 8, minHeight: 80 },
    instrTitle: { fontSize: 22, fontWeight: '700', color: WHITE, letterSpacing: -0.5, textAlign: 'center' },
    instrSub:   { fontSize: 13, fontWeight: '500', color: '#CBD5E1', textAlign: 'center' },

    bottomControls: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 32, paddingTop: 24, gap: 28 },
    progressSection: { width: '100%', maxWidth: 320, gap: 10 },
    progressLabelRow:{ flexDirection: 'row', justifyContent: 'flex-end' },
    progressPct:     { fontSize: 12, fontWeight: '600', color: PURPLE },
    progressTrack:   { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden' },
    progressFill:    { height: '100%', backgroundColor: PURPLE, borderRadius: 99 },

    controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32 },
    sideBtn:     { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    shutterOuter:{ width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
    shutterInner:{ width: 58, height: 58, borderRadius: 29, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' },
    shutterActive:{ backgroundColor: '#1E1B2E' },

    securityBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    securityTxt:   { fontSize: 9, fontWeight: '600', color: '#BEA3D8', letterSpacing: 0.8 },

    overlay:  { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 32 },
    rCircle:  { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    ovTitle:  { fontSize: 24, fontWeight: '800', color: WHITE, textAlign: 'center', marginBottom: 10 },
    ovSub:    { fontSize: 14, color: 'rgba(255,255,255,0.60)', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
    rBtn:     { height: 52, borderRadius: 14, paddingHorizontal: 44, alignItems: 'center', justifyContent: 'center' },
});
