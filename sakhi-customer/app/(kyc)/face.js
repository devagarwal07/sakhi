import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Alert, ActivityIndicator, Pressable, Platform, Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { uploadFaceSelfie } from '../../src/api/endpoints';
import { useAuth } from '../../src/context/AuthContext';

export default function FaceVerificationScreen() {
    const router = useRouter();
    const { updateUser } = useAuth();
    const [permission, requestPermission] = useCameraPermissions();
    const [captured, setCaptured] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const cameraRef = useRef(null);
    const scanLineAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

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

    const scanTranslateY = scanLineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-150, 150],
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

    const takeSelfie = async () => {
        if (!cameraRef.current) return;
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
        setCaptured(photo);
    };

    const handleSubmit = async () => {
        if (!captured) return;
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('selfie', {
                uri: captured.uri,
                name: 'selfie.jpg',
                type: 'image/jpeg',
            });
            await uploadFaceSelfie(formData);
            updateUser({ verification_status: 'pending' });
            router.replace('/(kyc)/pending');
        } catch (err) {
            const msg = err?.response?.data?.message || 'Selfie upload failed. Please try again.';
            Alert.alert('Upload Failed', msg);
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
            <View style={styles.topNav}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backIcon}>←</Text>
                </Pressable>
                <Text style={styles.navTitle}>Identity Verification</Text>
                <Text style={styles.stepBadge}>Step 2 of 2</Text>
            </View>

            {/* Main Scanning Area */}
            <View style={styles.scanArea}>
                {/* Face guide frame */}
                <View style={styles.faceFrame}>
                    {/* Oval dashed frame */}
                    <View style={styles.ovalDashed} />

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
            <View style={styles.bottomControls}>
                {/* Progress Indicator */}
                <View style={styles.progressSection}>
                    <View style={styles.progressLabelRow}>
                        <Text style={styles.progressLabel}>SCANNING PROGRESS</Text>
                        <Text style={styles.progressPercent}>{scanProgress}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${scanProgress}%` }]} />
                    </View>
                </View>

                {/* Shutter & Controls Row */}
                <View style={styles.controlsRow}>
                    {/* Flash button */}
                    <TouchableOpacity style={styles.sideBtn}>
                        <Text style={styles.sideBtnIcon}>💡</Text>
                    </TouchableOpacity>

                    {/* Large Shutter Button */}
                    <TouchableOpacity
                        style={styles.shutterOuter}
                        onPress={captured ? handleSubmit : takeSelfie}
                        disabled={loading}
                        activeOpacity={0.9}
                    >
                        <View style={styles.shutterInner}>
                            {loading ? (
                                <ActivityIndicator color="#0F172A" size="small" />
                            ) : (
                                <Text style={styles.shutterIcon}>📷</Text>
                            )}
                        </View>
                    </TouchableOpacity>

                    {/* Gallery button */}
                    <TouchableOpacity style={styles.sideBtn}>
                        <Text style={styles.sideBtnIcon}>🖼️</Text>
                    </TouchableOpacity>
                </View>

                {/* Security Badge */}
                <View style={styles.securityBadge}>
                    <Text style={styles.securityIcon}>🔒</Text>
                    <Text style={styles.securityText}>SECURE VERIFICATION BY SAKHI SAFETY</Text>
                </View>
            </View>
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
        paddingTop: Platform.OS === 'ios' ? 56 : 24,
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
        top: 120,
        bottom: 236,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },

    // Face guide frame — 300×420
    faceFrame: {
        width: 300,
        height: 420,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Oval dashed — 4px dashed rgba border, radius 180
    ovalDashed: {
        width: 300,
        height: 420,
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
        paddingBottom: Platform.OS === 'ios' ? 48 : 24,
        gap: 32,
    },

    // Progress section
    progressSection: {
        width: 320,
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
});
