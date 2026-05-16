import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Pressable, Platform, Animated, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Lock, Play, ArrowLeft } from 'lucide-react-native';
import { verifyFacePhoto } from '../../src/api/endpoints';
import { useAuth } from '../../src/context/AuthContext';
import SakhiModal from '../../src/components/SakhiModal';

// Retry messages per reason code
const RETRY_MESSAGES = {
    no_face_detected:   "No face detected. Make sure your face is clearly visible within the frame.",
    multiple_faces:     "Multiple faces detected. Please ensure only your face is in frame.",
    gender_low_confidence: "We couldn't confirm your identity clearly. Try better lighting and keep your face centred.",
};

export default function FaceVerificationScreen() {
    const router = useRouter();
    const { updateUser, logout } = useAuth();
    const [permission, requestPermission] = useCameraPermissions();

    const [scanning, setScanning]     = useState(false);  // true while capturing + waiting for AWS
    const [scanProgress, setScanProgress] = useState(0);
    const [modal, setModal]           = useState(null);
    const [statusMsg, setStatusMsg]   = useState('');      // live status text during scan

    const cameraRef    = useRef(null);
    const progressRef  = useRef(null);                     // interval ref for progress animation
    const scanLineAnim = useRef(new Animated.Value(0)).current;

    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    // ── Scanning line animation (always running) ───────────────────────────
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

    // ── Animated progress bar during scanning ─────────────────────────────
    const startProgressAnimation = () => {
        setScanProgress(0);
        let p = 0;
        progressRef.current = setInterval(() => {
            p += 1;
            // Slow to 90 and wait — final 10% only after backend responds
            if (p <= 90) setScanProgress(p);
            else clearInterval(progressRef.current);
        }, 40);
    };

    const finishProgress = () => {
        clearInterval(progressRef.current);
        setScanProgress(100);
    };

    const resetProgress = () => {
        clearInterval(progressRef.current);
        setScanProgress(0);
    };

    // ── Layout calculations ────────────────────────────────────────────────
    const topNavPaddingTop        = Platform.OS === 'ios' ? insets.top + 12 : Math.max(insets.top, 24);
    const topNavHeightEstimate    = topNavPaddingTop + 32 + 16;
    const bottomCtrlPaddingBottom = Math.max(insets.bottom + (Platform.OS === 'ios' ? 14 : 12), 24);
    const bottomCtrlHeightEstimate = 24 + bottomCtrlPaddingBottom + 64 + 165;

    const scanAreaTop    = topNavHeightEstimate + 16;
    const scanAreaBottom = Math.max(bottomCtrlHeightEstimate - 40, 0);
    const scanAreaHeight = Math.max(windowHeight - scanAreaTop - scanAreaBottom, 0);

    const frameAspect  = 420 / 300;
    const maxFrameWidth  = Math.min(windowWidth - 48, 320);
    const maxFrameHeight = Math.max(scanAreaHeight - 108, 0);

    let frameWidth  = maxFrameWidth;
    let frameHeight = frameWidth * frameAspect;
    if (maxFrameHeight > 0 && frameHeight > maxFrameHeight) {
        frameHeight = maxFrameHeight;
        frameWidth  = frameHeight / frameAspect;
    }
    if (frameWidth <= 0 || frameHeight <= 0) {
        frameWidth  = Math.max(Math.min(windowWidth - 48, 240), 160);
        frameHeight = frameWidth * frameAspect;
    }

    const ovalBorderRadius = frameWidth * 0.6;
    const scanTravel       = frameHeight * (150 / 420);
    const scanTranslateY   = scanLineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-scanTravel, scanTravel],
    });

    // ── Permission gate ────────────────────────────────────────────────────
    if (!permission) return <View style={{ flex: 1, backgroundColor: '#121121' }} />;

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionTitle}>Camera Access Required</Text>
                <Text style={styles.permissionSubtitle}>We need your camera to verify your identity.</Text>
                <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                    <Text style={styles.permissionBtnText}>Grant Camera Access</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Take photo + send to backend ───────────────────────────────────────
    const handleVerify = async () => {
        if (scanning || !cameraRef.current) return;
        setScanning(true);
        setStatusMsg('Capturing…');
        startProgressAnimation();

        let imageBase64 = null;

        try {
            // 1. Capture photo as base64
            const photo = await cameraRef.current.takePictureAsync({
                base64: true,
                quality: 0.7,
                skipProcessing: true,
            });
            imageBase64 = photo.base64;

            setStatusMsg('Analysing…');

            // 2. Send to backend → AWS DetectFaces
            const { data } = await verifyFacePhoto(`data:image/jpeg;base64,${imageBase64}`);
            finishProgress();

            const status = data?.status;

            if (status === 'approved') {
                setStatusMsg(
                    <Text>
                        Verified <Feather name="check" size={16} color="#10B981" />
                    </Text>
                );
                updateUser({ verification_status: 'approved', gender_verified: true });
                setTimeout(() => router.replace('/'), 800);
                return;
            }

            if (status === 'rejected') {
                resetProgress();
                setScanning(false);
                setStatusMsg('');
                setModal({
                    icon: '⚠️',
                    title: 'Not eligible',
                    message: 'This app is currently available only for females.',
                    buttons: [{
                        text: 'OK',
                        onPress: async () => {
                            setModal(null);
                            await logout();
                            router.replace('/(auth)/login');
                        },
                    }],
                });
                return;
            }

            if (status === 'manual_review') {
                updateUser({ verification_status: 'pending', face_review_required: true });
                resetProgress();
                setScanning(false);
                setStatusMsg('');
                setModal({
                    icon: '🔍',
                    title: 'Under Review',
                    message: 'Your verification is being reviewed manually. We\'ll notify you once it\'s complete.',
                    buttons: [{ text: 'OK', onPress: () => { setModal(null); router.replace('/'); } }],
                });
                return;
            }

            // status === 'retry'
            resetProgress();
            setScanning(false);
            setStatusMsg('');
            const reason  = data?.reason ?? 'unknown';
            const message = RETRY_MESSAGES[reason] ?? 'Please try again with better lighting and your face centred in the frame.';
            setModal({
                icon: '🔄',
                title: 'Try again',
                message,
                buttons: [{ text: 'Retry', onPress: () => setModal(null) }],
            });

        } catch (err) {
            resetProgress();
            setScanning(false);
            setStatusMsg('');
            const code    = err?.response?.data?.error?.code;
            const message = err?.response?.data?.error?.message || err?.message || 'Verification failed. Please try again.';

            if (code === 'ALREADY_VERIFIED') {
                updateUser({ verification_status: 'approved' });
                router.replace('/');
                return;
            }
            if (code === 'NOT_ELIGIBLE') {
                setModal({
                    icon: '⚠️',
                    title: 'Not eligible',
                    message: 'This app is currently available only for females.',
                    buttons: [{
                        text: 'OK',
                        onPress: async () => {
                            setModal(null);
                            await logout();
                            router.replace('/(auth)/login');
                        },
                    }],
                });
                return;
            }
            if (code === 'MANUAL_REVIEW_REQUIRED') {
                updateUser({ verification_status: 'pending', face_review_required: true });
                router.replace('/');
                return;
            }
            setModal({
                icon: '⚠️',
                title: 'Error',
                message,
                buttons: [{ text: 'Retry', onPress: () => setModal(null) }],
            });
        }
    };

    return (
        <View style={styles.container}>
            {/* Live camera preview */}
            <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing="front"
            />

            {/* Dark overlay */}
            <View style={styles.darkOverlay} />

            {/* Scanning pulse overlay — shown while processing */}
            {scanning && <View style={styles.scanningOverlay} />}

            {/* Top Navigation */}
            <View style={[styles.topNav, { paddingTop: topNavPaddingTop }]}>
                <Pressable
                    onPress={() => !scanning && (router.canGoBack() ? router.back() : router.replace('/'))}
                    style={styles.backBtn}
                >
                    <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2.5} />
                </Pressable>
                <Text style={styles.navTitle}>Identity Verification</Text>
                <Text style={styles.stepBadge}>Step 1 of 1</Text>
            </View>

            {/* Scanning area */}
            <View style={[styles.scanArea, { top: scanAreaTop, bottom: scanAreaBottom }]}>
                <View style={[styles.faceFrame, { width: frameWidth, height: frameHeight }]}>
                    {/* Oval dashed frame */}
                    <View style={[
                        styles.ovalDashed,
                        { width: frameWidth, height: frameHeight, borderRadius: ovalBorderRadius },
                        scanning && styles.ovalScanning,
                    ]} />

                    {/* Animated scan line */}
                    <Animated.View
                        style={[styles.scanLine, { transform: [{ translateY: scanTranslateY }] }]}
                    />

                    {/* Corner accents */}
                    <View style={styles.cornersWrapper}>
                        <View style={[styles.corner, styles.cornerTL]} />
                        <View style={[styles.corner, styles.cornerTR]} />
                        <View style={[styles.corner, styles.cornerBL]} />
                        <View style={[styles.corner, styles.cornerBR]} />
                    </View>
                </View>

                <View style={styles.instructionBlock}>
                    {scanning ? (
                        <>
                            <ActivityIndicator color="#C0A6D6" size="small" style={{ marginBottom: 6 }} />
                            <Text style={styles.instructionTitle}>{statusMsg || 'Analysing…'}</Text>
                            <Text style={styles.instructionSub}>Please hold still</Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.instructionTitle}>Hold still, scanning…</Text>
                            <Text style={styles.instructionSub}>Position your face within the frame</Text>
                        </>
                    )}
                </View>
            </View>

            {/* Bottom controls */}
            <View style={[styles.bottomControls, { paddingBottom: bottomCtrlPaddingBottom }]}>
                {/* Progress bar */}
                <View style={styles.progressSection}>
                    <View style={styles.progressLabelRow}>
                        <Text style={styles.progressPercent}>{scanProgress}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <Animated.View style={[styles.progressFill, { width: `${scanProgress}%` }]} />
                    </View>
                </View>

                {/* Shutter / Play button — centered */}
                <View style={styles.controlsRow}>
                    <TouchableOpacity
                        style={styles.shutterOuter}
                        onPress={handleVerify}
                        disabled={scanning}
                        activeOpacity={0.9}
                    >
                        <View style={[styles.shutterInner, scanning && styles.shutterInnerActive]}>
                            {scanning
                                ? <ActivityIndicator color="#C0A6D6" size="small" />
                                : <Play size={22} color="#0F172A" fill="#0F172A" strokeWidth={0} />
                            }
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Security badge */}
                <View style={styles.securityBadge}>
                    <Lock size={11} color="#BEA3D8" strokeWidth={2.5} />
                    <Text style={styles.securityText}>SECURE VERIFICATION — POWERED BY AWS REKOGNITION</Text>
                </View>
            </View>

            {modal && <SakhiModal config={modal} onClose={() => setModal(null)} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121121' },

    permissionContainer: {
        flex: 1, backgroundColor: '#121121',
        alignItems: 'center', justifyContent: 'center', padding: 32,
    },
    permissionTitle:    { fontSize: 24, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: 12 },
    permissionSubtitle: { fontSize: 16, color: '#CBD5E1', textAlign: 'center', marginBottom: 28 },
    permissionBtn:      { backgroundColor: '#C0A6D6', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32 },
    permissionBtnText:  { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

    darkOverlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    scanningOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(192,166,214,0.06)' },

    topNav: {
        position: 'absolute', top: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 24, paddingBottom: 16, zIndex: 10,
    },
    backBtn: {
        width: 32, height: 32, borderRadius: 9999,
        backgroundColor: 'rgba(30,41,59,0.6)',
        alignItems: 'center', justifyContent: 'center',
    },
    backIcon:  { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
    navTitle:  { flex: 1, fontSize: 18, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', letterSpacing: -0.45 },
    stepBadge: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },

    scanArea:  { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    faceFrame: { alignItems: 'center', justifyContent: 'center' },

    ovalDashed: { borderWidth: 4, borderStyle: 'dashed', borderColor: 'rgba(192,166,214,0.6)' },
    ovalScanning: { borderColor: 'rgba(192,166,214,1)', borderStyle: 'solid' },

    scanLine: {
        position: 'absolute', left: 0, right: 0, height: 4,
        backgroundColor: '#C0A6D6', opacity: 0.8,
        shadowColor: 'rgba(80,72,229,1)', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8, shadowRadius: 15,
    },

    cornersWrapper: { position: 'absolute', left: -16, right: -16, top: -16, bottom: -16, opacity: 0.4 },
    corner:         { position: 'absolute', width: 32, height: 32 },
    cornerTL:       { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#C0A6D6', borderTopLeftRadius: 32 },
    cornerTR:       { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#C0A6D6', borderTopRightRadius: 32 },
    cornerBL:       { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#C0A6D6', borderBottomLeftRadius: 32 },
    cornerBR:       { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#C0A6D6', borderBottomRightRadius: 32 },

    instructionBlock: { alignItems: 'center', paddingTop: 48, gap: 8, minHeight: 80 },
    instructionTitle:  { fontSize: 24, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.6, textAlign: 'center' },
    instructionSub:    { fontSize: 14, fontWeight: '500', color: '#CBD5E1', textAlign: 'center' },

    bottomControls: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        alignItems: 'center', paddingHorizontal: 32, paddingTop: 24, gap: 32,
    },
    progressSection:  { width: '100%', maxWidth: 320, gap: 12 },
    progressLabelRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end' },
    progressPercent:  { fontSize: 13, fontWeight: '600', color: '#C0A6D6' },
    progressTrack:    { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 9999, overflow: 'hidden' },
    progressFill:     { height: '100%', backgroundColor: '#C0A6D6', borderRadius: 9999 },

    controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32 },
    sideBtn: {
        width: 48, height: 48, borderRadius: 9999,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center', justifyContent: 'center',
    },
    shutterOuter: {
        width: 72, height: 72, borderRadius: 9999,
        borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
        alignItems: 'center', justifyContent: 'center',
    },
    shutterInner: {
        width: 58, height: 58, borderRadius: 9999,
        backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    },
    shutterInnerActive: { backgroundColor: '#1E1B2E' },

    securityBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    securityText:  { fontSize: 10, fontWeight: '600', color: '#BEA3D8', letterSpacing: 0.8 },
});
