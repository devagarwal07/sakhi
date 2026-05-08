import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Pressable, Platform, Animated, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as SecureStore from 'expo-secure-store';
import { Zap, ImageIcon, Lock, Play } from 'lucide-react-native';
import { createFaceLivenessSession, getFaceLivenessResult } from '../../src/api/endpoints';
import { useAuth } from '../../src/context/AuthContext';
import { API_BASE_URL, LIVENESS_BASE_URL, STORAGE_KEYS } from '../../src/utils/constants';
import livenessHtml from '../../src/liveness/livenessHtml.js';
import SakhiModal from '../../src/components/SakhiModal';

export default function FaceVerificationScreen() {
    const router = useRouter();
    const { updateUser, logout } = useAuth();
    const [permission, requestPermission] = useCameraPermissions();
    const [loading, setLoading] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [modal, setModal] = useState(null);
    const [webSession, setWebSession] = useState(null); // { sessionId, region }
    const [webToken, setWebToken] = useState(null);
    const cameraRef = useRef(null);
    const webviewRef = useRef(null);
    const scanLineAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    // Animate scanning line
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scanLineAnim, {
                    toValue: 1,
                    duration: 2500,
                    useNativeDriver: true,
                }),
                Animated.timing(scanLineAnim, {
                    toValue: 0,
                    duration: 2500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    // Simulate progress
    useEffect(() => {
        const interval = setInterval(() => {
            setScanProgress(prev => {
                if (prev >= 65) {
                    clearInterval(interval);
                    return 65;
                }
                return prev + 1;
            });
        }, 60);
        return () => clearInterval(interval);
    }, []);

    const topNavPaddingTop = Platform.OS === 'ios'
        ? insets.top + 12
        : Math.max(insets.top, 24);
    const topNavHeightEstimate = topNavPaddingTop + 32 + 16;

    const bottomControlsPaddingBottom = Math.max(
        insets.bottom + (Platform.OS === 'ios' ? 14 : 12),
        24
    );
    const bottomControlsHeightEstimate = 24 + bottomControlsPaddingBottom + 64 + 165;

    const scanAreaTop = topNavHeightEstimate + 16;
    const scanAreaBottom = Math.max(bottomControlsHeightEstimate - 40, 0);
    const scanAreaHeight = Math.max(windowHeight - scanAreaTop - scanAreaBottom, 0);

    const frameAspect = 420 / 300;
    const instructionBlockHeightEstimate = 108;
    const maxFrameHeight = Math.max(scanAreaHeight - instructionBlockHeightEstimate, 0);
    const maxFrameWidth = Math.min(windowWidth - 48, 320);

    let frameWidth = maxFrameWidth;
    let frameHeight = frameWidth * frameAspect;
    if (maxFrameHeight > 0 && frameHeight > maxFrameHeight) {
        frameHeight = maxFrameHeight;
        frameWidth = frameHeight / frameAspect;
    }

    if (frameWidth <= 0 || frameHeight <= 0) {
        frameWidth = Math.max(Math.min(windowWidth - 48, 240), 160);
        frameHeight = frameWidth * frameAspect;
    }

    const ovalBorderRadius = frameWidth * 0.6;
    const scanTravel = frameHeight * (150 / 420);
    const scanTranslateY = scanLineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-scanTravel, scanTravel],
    });

    if (!permission) return <View style={{ flex: 1, backgroundColor: '#121121' }} />;

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionTitle}>Camera Access Required</Text>
                <Text style={styles.permissionSubtitle}>
                    We need your camera to verify your identity.
                </Text>
                <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                    <Text style={styles.permissionBtnText}>Grant Camera Access</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const startLiveness = async () => {
        setLoading(true);
        try {
            const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
            if (!token) {
                setModal({
                    icon: '⚠️',
                    title: 'Login required',
                    message: 'Please log in again to continue verification.',
                    buttons: [{ text: 'OK', onPress: () => setModal(null) }],
                });
                return;
            }

            const { data } = await createFaceLivenessSession();
            setWebToken(token);
            setWebSession({ sessionId: data.session_id, region: data.region, ts: Date.now() });
        } catch (err) {
            const code = err?.response?.data?.error?.code;
            const message = err?.response?.data?.error?.message || err?.message || 'Unable to start liveness. Please try again.';

            if (code === 'MANUAL_REVIEW_REQUIRED') {
                updateUser({ verification_status: 'pending', face_review_required: true });
                router.replace('/(kyc)/pending');
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

            setModal({
                icon: '⚠️',
                title: 'Could not start',
                message,
                buttons: [{ text: 'OK', onPress: () => setModal(null) }],
            });
        } finally {
            setLoading(false);
        }
    };

    const completeLiveness = async (sessionId) => {
        setLoading(true);
        try {
            const { data } = await getFaceLivenessResult(sessionId);
            const status = data?.status;

            if (status === 'approved') {
                updateUser({ verification_status: 'approved', gender_verified: true, face_review_required: false });
                setWebSession(null);
                router.replace('/');
                return;
            }

            if (status === 'manual_review') {
                updateUser({ verification_status: 'pending', face_review_required: true });
                setWebSession(null);
                router.replace('/(kyc)/pending');
                return;
            }

            if (status === 'retry') {
                setWebSession(null);
                setModal({
                    icon: '⚠️',
                    title: 'Try again',
                    message: 'We couldn\'t confidently verify your face. Please retry (good lighting, face centered).',
                    buttons: [
                        { text: 'Retry', onPress: () => { setModal(null); startLiveness(); } },
                        { text: 'Cancel', onPress: () => setModal(null) },
                    ],
                });
                return;
            }

            if (status === 'rejected') {
                setWebSession(null);
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

            setWebSession(null);
            setModal({
                icon: '⚠️',
                title: 'Verification error',
                message: 'Unexpected verification status. Please try again.',
                buttons: [{ text: 'OK', onPress: () => setModal(null) }],
            });
        } catch (err) {
            setWebSession(null);
            const message = err?.response?.data?.error?.message || err?.message || 'Failed to complete liveness. Please try again.';
            setModal({
                icon: '⚠️',
                title: 'Verification failed',
                message,
                buttons: [{ text: 'OK', onPress: () => setModal(null) }],
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Camera background */}
            <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing="front"
            />

            {/* Dark overlay */}
            <View style={styles.darkOverlay} />

            {/* Top Navigation */}
            <View style={[styles.topNav, { paddingTop: topNavPaddingTop }]}>
                <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn}>
                    <Text style={styles.backIcon}>←</Text>
                </Pressable>
                <Text style={styles.navTitle}>Identity Verification</Text>
                <Text style={styles.stepBadge}>Step 2 of 2</Text>
            </View>

            {/* Main Scanning Area */}
            <View style={[styles.scanArea, { top: scanAreaTop, bottom: scanAreaBottom }]}>
                {/* Face guide frame */}
                <View style={[styles.faceFrame, { width: frameWidth, height: frameHeight }]}>
                    {/* Oval dashed frame */}
                    <View style={[styles.ovalDashed, { width: frameWidth, height: frameHeight, borderRadius: ovalBorderRadius }]} />

                    {/* Scanning line */}
                    <Animated.View
                        style={[
                            styles.scanLine,
                            { transform: [{ translateY: scanTranslateY }] },
                        ]}
                    />

                    {/* Corner indicators */}
                    <View style={styles.cornersWrapper}>
                        <View style={[styles.corner, styles.cornerTL]} />
                        <View style={[styles.corner, styles.cornerTR]} />
                        <View style={[styles.corner, styles.cornerBL]} />
                        <View style={[styles.corner, styles.cornerBR]} />
                    </View>
                </View>

                {/* Instruction text */}
                <View style={styles.instructionBlock}>
                    <Text style={styles.instructionTitle}>Hold still, scanning...</Text>
                    <Text style={styles.instructionSub}>Position your face within the frame</Text>
                </View>
            </View>

            {/* Bottom Controls */}
            <View style={[styles.bottomControls, { paddingBottom: bottomControlsPaddingBottom }]}>
                {/* Progress Indicator */}
                <View style={styles.progressSection}>
                    <View style={styles.progressLabelRow}>
                        {/* <Text style={styles.progressLabel}>SCANNING PROGRESS</Text> */}
                        <Text style={styles.progressPercent}>{scanProgress}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${scanProgress}%` }]} />
                    </View>
                </View>

                {/* Shutter & Controls Row */}
                <View style={styles.controlsRow}>
                    {/* Flash button */}
                    <TouchableOpacity style={styles.sideBtn} onPress={() => setModal({
                        icon: '💡',
                        title: 'Flash',
                        message: 'Flash is not available on the front camera.',
                        buttons: [{ text: 'OK', onPress: () => setModal(null) }]
                    })}>
                        <Zap size={22} color="#fff" strokeWidth={2} />
                    </TouchableOpacity>

                    {/* Large Shutter Button */}
                    <TouchableOpacity
                        style={styles.shutterOuter}
                        onPress={startLiveness}
                        disabled={loading}
                        activeOpacity={0.9}
                    >
                        <View style={styles.shutterInner}>
                            {loading ? (
                                <ActivityIndicator color="#0F172A" size="small" />
                            ) : (
                                <Play size={22} color="#0F172A" fill="#0F172A" strokeWidth={0} />
                            )}
                        </View>
                    </TouchableOpacity>

                    {/* Gallery button */}
                    <TouchableOpacity style={styles.sideBtn} onPress={() => setModal({
                        icon: '⚠️',
                        title: 'Upload from Gallery',
                        message: 'For security, KYC selfies must be taken live with your camera.',
                        buttons: [{ text: 'OK', onPress: () => setModal(null) }]
                    })}>
                        <ImageIcon size={22} color="#fff" strokeWidth={2} />
                    </TouchableOpacity>
                </View>

                {/* Security Badge */}
                <View style={styles.securityBadge}>
                    <Lock size={11} color="#BEA3D8" strokeWidth={2.5} />
                    <Text style={styles.securityText}>SECURE VERIFICATION BY SAKHI SAFETY</Text>
                </View>
            </View>

            {!!webSession && (
                <View style={StyleSheet.absoluteFill}>
                    <WebView
                        source={(() => {
                            // Inject session data directly into the HTML so it's available
                            // before ANY script in the bundle executes. Much more reliable than
                            // injectedJavaScriptBeforeContentLoaded for source={{ html }}.
                            const sessionScript = `<script>window.__SAKHI_SESSION__=${JSON.stringify({
                                sessionId: webSession?.sessionId || '',
                                region:    webSession?.region    || '',
                                token:     webToken || '',
                            })};</script>`;
                            return {
                                html: livenessHtml.replace('</head>', sessionScript + '</head>'),
                                baseUrl: LIVENESS_BASE_URL,
                            };
                        })()}
                        ref={webviewRef}
                        style={{ flex: 1, backgroundColor: '#000000' }}
                        originWhitelist={['*']}
                        javaScriptEnabled
                        domStorageEnabled
                        allowsInlineMediaPlayback
                        mediaPlaybackRequiresUserAction={false}
                        mixedContentMode="always"
                        androidLayerType="hardware"
                        cacheEnabled={false}
                        setSupportMultipleWindows={false}
                        renderLoading={() => (
                            <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                                <ActivityIndicator size="large" color="#9B59B6" />
                            </View>
                        )}
                        startInLoadingState={true}
                        onHttpError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.warn('WebView HTTP error', nativeEvent.statusCode, nativeEvent.url);
                        }}
                        onPermissionRequest={(event) => {
                            try { event.grant(event.resources); } catch { }
                        }}
                        // Inject session params + isSecureContext patch BEFORE inline script executes
                        injectedJavaScriptBeforeContentLoaded={`
                            (function() {
                                try {
                                    // Expose session info to the liveness React app
                                    window.__SAKHI_SESSION__ = {
                                        sessionId: ${JSON.stringify(webSession?.sessionId || '')},
                                        region:    ${JSON.stringify(webSession?.region    || '')},
                                        token:     ${JSON.stringify(webToken || '')},
                                    };
                                    // Ensure camera APIs are available (secure context)
                                    Object.defineProperty(window, 'isSecureContext', {
                                        get: function() { return true; },
                                        configurable: true,
                                    });
                                } catch(e) {}
                            })();
                            true;
                        `}
                        // Inject layout fixes AFTER DOM is ready
                        injectedJavaScript={`
                            (function applyLivenessFix() {
                                var css = [
                                    // Hide the hint text that collides with the toast
                                    '.amplify-liveness-hint--mobile { display: none !important; }',
                                    '.amplify-liveness-hint__text { display: none !important; }',
                                    // Push the toast container (progress bar area) down so it
                                    // doesn't overlap with the large scanning toast text
                                    '.amplify-liveness-toast__container { margin-top: 32px !important; flex-direction: column !important; align-items: center !important; gap: 10px !important; }',
                                    '.amplify-liveness-match-indicator { margin-top: 8px !important; }',
                                ].join('\n');
                                var s = document.createElement('style');
                                s.id = 'sakhi-liveness-fix';
                                s.textContent = css;
                                document.head.appendChild(s);
                            })();
                            true;
                        `}
                        onLoadEnd={() => {
                            // Re-apply as guaranteed fallback after full page load
                            try {
                                webviewRef.current?.injectJavaScript?.(`
                                    (function() {
                                        if (document.getElementById('sakhi-liveness-fix')) return;
                                        var css = [
                                            '.amplify-liveness-hint--mobile { display: none !important; }',
                                            '.amplify-liveness-hint__text { display: none !important; }',
                                            '.amplify-liveness-toast__container { margin-top: 32px !important; flex-direction: column !important; align-items: center !important; gap: 10px !important; }',
                                            '.amplify-liveness-match-indicator { margin-top: 8px !important; }',
                                        ].join('\\n');
                                        var s = document.createElement('style');
                                        s.id = 'sakhi-liveness-fix';
                                        s.textContent = css;
                                        document.head.appendChild(s);
                                    })();
                                    true;
                                `);
                            } catch (e) { }
                        }}
                        onMessage={(event) => {
                            try {
                                const msg = JSON.parse(event.nativeEvent.data);
                                if (msg?.type === 'analysis_complete') {
                                    completeLiveness(msg.sessionId || webSession.sessionId);
                                } else if (msg?.type === 'error') {
                                    const message =
                                        typeof msg.message === 'string'
                                            ? msg.message
                                            : (() => {
                                                try { return JSON.stringify(msg.message, null, 2); } catch { return 'Liveness failed. Please try again.'; }
                                            })();
                                    setModal({
                                        icon: '⚠️',
                                        title: 'Liveness error',
                                        message,
                                        buttons: [
                                            { text: 'Retry', onPress: () => { setModal(null); setWebSession(null); startLiveness(); } },
                                            { text: 'Close', onPress: () => { setModal(null); setWebSession(null); } },
                                        ],
                                    });
                                }
                            } catch {
                                // ignore
                            }
                        }}
                        onError={(e) => {
                            setModal({
                                icon: '⚠️',
                                title: 'WebView error',
                                message: e?.nativeEvent?.description || 'Failed to open liveness page.',
                                buttons: [{ text: 'OK', onPress: () => { setModal(null); setWebSession(null); } }],
                            });
                        }}
                    />

                    <View style={styles.webCloseWrap}>
                        <TouchableOpacity
                            style={styles.webCloseBtn}
                            onPress={() => setWebSession(null)}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.webCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
            {modal && <SakhiModal config={modal} onClose={() => setModal(null)} />}
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121121',
    },

    // Permission fallback
    permissionContainer: {
        flex: 1,
        backgroundColor: '#121121',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    permissionTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 12,
    },
    permissionSubtitle: {
        fontSize: 16,
        fontWeight: '400',
        color: '#CBD5E1',
        textAlign: 'center',
        marginBottom: 28,
    },
    permissionBtn: {
        backgroundColor: '#C0A6D6',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 32,
    },
    permissionBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // Dark overlay
    darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },

    // Top Navigation
    topNav: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 16,
        zIndex: 10,
    },
    backBtn: {
        width: 32,
        height: 32,
        borderRadius: 9999,
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    navTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: -0.45,
        lineHeight: 28,
    },
    stepBadge: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
        lineHeight: 26,
    },

    // Main Scanning Area
    scanArea: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },

    // Face guide frame — 300×420
    faceFrame: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Oval dashed — 4px dashed rgba border, radius 180
    ovalDashed: {
        borderRadius: 180,
        borderWidth: 4,
        borderStyle: 'dashed',
        borderColor: 'rgba(192, 166, 214, 0.6)',
    },

    // Scanning line — gradient-like glow
    scanLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: '#C0A6D6',
        opacity: 0.8,
        shadowColor: 'rgba(80, 72, 229, 1)',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
    },

    // Corner indicators — 0.4 opacity
    cornersWrapper: {
        position: 'absolute',
        left: -16,
        right: -16,
        top: -16,
        bottom: -16,
        opacity: 0.4,
    },
    corner: {
        position: 'absolute',
        width: 32,
        height: 32,
    },
    cornerTL: {
        top: 0,
        left: 0,
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderColor: '#C0A6D6',
        borderTopLeftRadius: 32,
    },
    cornerTR: {
        top: 0,
        right: 0,
        borderTopWidth: 2,
        borderRightWidth: 2,
        borderColor: '#C0A6D6',
        borderTopRightRadius: 32,
    },
    cornerBL: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 2,
        borderLeftWidth: 2,
        borderColor: '#C0A6D6',
        borderBottomLeftRadius: 32,
    },
    cornerBR: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 2,
        borderRightWidth: 2,
        borderColor: '#C0A6D6',
        borderBottomRightRadius: 32,
    },

    // Instruction text
    instructionBlock: {
        alignItems: 'center',
        paddingTop: 48,
        gap: 8,
    },
    instructionTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: -0.6,
        lineHeight: 32,
        textAlign: 'center',
    },
    instructionSub: {
        fontSize: 14,
        fontWeight: '500',
        color: '#CBD5E1',
        lineHeight: 20,
        textAlign: 'center',
    },

    // Bottom Controls
    bottomControls: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingTop: 24,
        gap: 32,
    },

    // Progress section
    progressSection: {
        width: '100%',
        maxWidth: 320,
        gap: 12,
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    progressLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#C0A6D6',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        lineHeight: 16,
    },
    progressPercent: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
        lineHeight: 20,
    },
    progressTrack: {
        height: 6,
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        borderRadius: 9999,
        overflow: 'hidden',
    },
    progressFill: {
        height: 6,
        backgroundColor: '#C0A6D6',
        borderRadius: 9999,
    },

    // Shutter controls row
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
    },

    // Side buttons — 48px
    sideBtn: {
        width: 48,
        height: 48,
        borderRadius: 9999,
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sideBtnIcon: {
        fontSize: 18,
        color: '#FFFFFF',
    },

    // Large shutter — 96px outer, 80px inner
    shutterOuter: {
        width: 96,
        height: 96,
        borderRadius: 9999,
        borderWidth: 4,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    shutterInner: {
        width: 80,
        height: 80,
        borderRadius: 9999,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    shutterIcon: {
        fontSize: 28,
        color: '#0F172A',
    },

    // Security badge — pill
    securityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
        backgroundColor: 'rgba(192, 166, 214, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(192, 166, 214, 0.2)',
        borderRadius: 9999,
    },
    securityIcon: {
        fontSize: 10,
        color: '#C0A6D6',
    },
    securityText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#C0A6D6',
        letterSpacing: 1,
        textTransform: 'uppercase',
        lineHeight: 15,
    },

    // WebView close affordance
    webCloseWrap: {
        position: 'absolute',
        top: 54,
        right: 16,
    },
    webCloseBtn: {
        backgroundColor: 'rgba(30, 41, 59, 0.75)',
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.6)',
        borderRadius: 9999,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    webCloseText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 12,
        letterSpacing: 0.4,
    },
});
