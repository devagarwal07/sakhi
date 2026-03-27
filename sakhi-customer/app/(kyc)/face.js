import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Alert, ActivityIndicator, Pressable,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../../src/utils/theme';
import { uploadFaceSelfie } from '../../src/api/endpoints';
import { useAuth } from '../../src/context/AuthContext';

export default function FaceVerificationScreen() {
    const router = useRouter();
    const { updateUser } = useAuth();
    const [permission, requestPermission] = useCameraPermissions();
    const [captured, setCaptured] = useState(null);
    const [loading, setLoading] = useState(false);
    const cameraRef = React.useRef(null);

    if (!permission) return <View style={{ flex: 1, backgroundColor: '#F5F0FF' }} />;

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionTitle}>Camera Access Required</Text>
                <Text style={styles.permissionSubtitle}>
                    We need your camera to take a selfie for verification.
                </Text>
                <TouchableOpacity style={styles.ctaButton} onPress={requestPermission}>
                    <Text style={styles.ctaButtonText}>Grant Camera Access</Text>
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
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backArrow}>←</Text>
            </Pressable>

            {captured ? (
                // Preview state
                <View style={styles.previewContainer}>
                    <View style={styles.previewFrame}>
                        <View style={styles.capturedBadge}>
                            <Text style={styles.capturedCheck}>✓</Text>
                            <Text style={styles.capturedText}>Selfie Captured</Text>
                        </View>
                    </View>
                    <Text style={styles.previewHint}>
                        Make sure your face is clearly visible, well-lit, and matches your Aadhaar photo.
                    </Text>
                    <View style={styles.previewActions}>
                        <TouchableOpacity
                            style={styles.retakeBtn}
                            onPress={() => setCaptured(null)}
                        >
                            <Text style={styles.retakeBtnText}>↻  Retake</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.ctaButton, { flex: 1 }, loading && { opacity: 0.7 }]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator color={Colors.onPrimary} />
                                : <Text style={styles.ctaButtonText}>Submit Selfie</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                // Camera viewfinder
                <View style={styles.cameraContainer}>
                    <Text style={styles.cameraTitle}>Face Verification</Text>
                    <Text style={styles.cameraSubtitle}>
                        Position your face within the oval and ensure good lighting
                    </Text>
                    <View style={styles.ovalFrame}>
                        <CameraView
                            ref={cameraRef}
                            style={StyleSheet.absoluteFill}
                            facing="front"
                        />
                        {/* Oval overlay */}
                        <View style={styles.ovalOverlay} pointerEvents="none" />
                    </View>
                    <TouchableOpacity style={styles.captureBtn} onPress={takeSelfie}>
                        <View style={styles.captureBtnInner} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1E1B2E', paddingTop: 56 },
    backBtn: {
        position: 'absolute', top: 56, left: 24, zIndex: 10,
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    backArrow: { fontSize: 20, color: '#fff', fontWeight: '700' },
    permissionContainer: {
        flex: 1, backgroundColor: '#F5F0FF',
        alignItems: 'center', justifyContent: 'center', padding: 32,
    },
    permissionTitle: { ...Typography.headlineSmall, color: Colors.onBackground, textAlign: 'center', marginBottom: 12 },
    permissionSubtitle: { ...Typography.bodyLarge, color: Colors.onSurfaceVariant, textAlign: 'center', marginBottom: 28 },
    cameraContainer: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
    cameraTitle: { ...Typography.titleLarge, color: '#fff', textAlign: 'center', marginTop: 16, marginBottom: 8 },
    cameraSubtitle: { ...Typography.bodyMedium, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: 32 },
    ovalFrame: {
        width: 260, height: 320, borderRadius: 130,
        overflow: 'hidden', borderWidth: 3, borderColor: Colors.primaryFixed,
        marginBottom: 40,
    },
    ovalOverlay: {
        position: 'absolute', inset: 0,
        borderRadius: 130,
        borderWidth: 3, borderColor: 'rgba(210,187,255,0.5)',
    },
    captureBtn: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    captureBtnInner: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: Colors.primaryFixed,
    },
    previewContainer: {
        flex: 1, backgroundColor: '#F5F0FF',
        paddingHorizontal: 24, paddingTop: 48, alignItems: 'center',
    },
    previewFrame: {
        width: 240, height: 300, borderRadius: 120,
        backgroundColor: Colors.primaryFixed,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 24, ...Shadows.editorial,
    },
    capturedBadge: { alignItems: 'center', gap: 8 },
    capturedCheck: { fontSize: 48, color: Colors.primaryContainer },
    capturedText: { ...Typography.titleSmall, color: Colors.primary },
    previewHint: {
        ...Typography.bodySmall, color: Colors.onSurfaceVariant,
        textAlign: 'center', lineHeight: 18, marginBottom: 28, paddingHorizontal: 8,
    },
    previewActions: { flexDirection: 'row', gap: 12, width: '100%' },
    retakeBtn: {
        borderWidth: 1.5, borderColor: Colors.outlineVariant,
        borderRadius: BorderRadius.md, paddingVertical: 16, paddingHorizontal: 20,
        alignItems: 'center',
    },
    retakeBtnText: { color: Colors.primaryContainer, fontWeight: '600', fontSize: 14 },
    ctaButton: {
        backgroundColor: Colors.primaryContainer,
        borderRadius: BorderRadius.md, paddingVertical: 16,
        alignItems: 'center', ...Shadows.editorial,
    },
    ctaButtonText: { color: Colors.onPrimary, fontSize: 16, fontWeight: '700' },
});
