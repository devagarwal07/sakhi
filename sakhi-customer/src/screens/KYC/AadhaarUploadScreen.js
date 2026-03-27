import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Image,
    ScrollView,
    ActivityIndicator,
    Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../../utils/theme';
import { uploadAadhaar } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

export default function AadhaarUploadScreen() {
    const router = useRouter();
    const { updateUser } = useAuth();
    const [frontImage, setFrontImage] = useState(null);
    const [backImage, setBackImage] = useState(null);
    const [loading, setLoading] = useState(false);

    const pickImage = async (side) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'We need photo library access to upload your Aadhaar.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 10],
            quality: 0.85,
        });

        if (!result.canceled && result.assets[0]) {
            if (side === 'front') setFrontImage(result.assets[0]);
            else setBackImage(result.assets[0]);
        }
    };

    const captureImage = async (side) => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'We need camera access to capture your Aadhaar.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [16, 10],
            quality: 0.85,
        });

        if (!result.canceled && result.assets[0]) {
            if (side === 'front') setFrontImage(result.assets[0]);
            else setBackImage(result.assets[0]);
        }
    };

    const showImageOptions = (side) => {
        Alert.alert('Upload Aadhaar', 'Choose how to add your Aadhaar photo', [
            { text: 'Take Photo', onPress: () => captureImage(side) },
            { text: 'Choose from Library', onPress: () => pickImage(side) },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const handleSubmit = async () => {
        if (!frontImage || !backImage) {
            Alert.alert('Missing Photos', 'Please upload both the front and back of your Aadhaar card.');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('front', {
                uri: frontImage.uri,
                name: 'aadhaar_front.jpg',
                type: 'image/jpeg',
            });
            formData.append('back', {
                uri: backImage.uri,
                name: 'aadhaar_back.jpg',
                type: 'image/jpeg',
            });

            await uploadAadhaar(formData);
            updateUser({ verification_status: 'pending' });
            router.replace('/(kyc)/pending');
        } catch (err) {
            const msg = err?.response?.data?.message || 'Upload failed. Please try again.';
            Alert.alert('Upload Failed', msg);
        } finally {
            setLoading(false);
        }
    };

    const UploadBox = ({ side, image, label }) => (
        <View style={[styles.uploadBox, image && styles.uploadBoxFilled]}>
            {image ? (
                <>
                    <View style={styles.uploadedHeader}>
                        <View>
                            <Text style={styles.uploadLabel}>{label}</Text>
                            <Text style={styles.uploadedSubtitle}>File uploaded successfully</Text>
                        </View>
                        <View style={styles.successBadge}>
                            <Text style={styles.successCheck}>✓</Text>
                        </View>
                    </View>
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: image.uri }} style={styles.previewImage} resizeMode="cover" />
                    </View>
                    <TouchableOpacity style={styles.reuploadBtn} onPress={() => showImageOptions(side)}>
                        <Text style={styles.reuploadText}>↻  Re-upload</Text>
                    </TouchableOpacity>
                </>
            ) : (
                <>
                    <View style={styles.uploadIconBg}>
                        <Text style={styles.uploadIcon}>☁️</Text>
                    </View>
                    <Text style={styles.uploadLabel}>{label}</Text>
                    <Text style={styles.uploadHint}>Tap to capture or upload</Text>
                    <TouchableOpacity style={styles.uploadBtn} onPress={() => showImageOptions(side)}>
                        <Text style={styles.uploadBtnText}>Upload Photo</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
    );

    return (
        <View style={styles.flex}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backArrow}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Upload Aadhaar Card</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.subtitle}>
                    Upload clear photos of both sides of your Aadhaar
                </Text>

                <View style={styles.uploadStack}>
                    <UploadBox side="front" image={frontImage} label="Front of Aadhaar" />
                    <UploadBox side="back" image={backImage} label="Back of Aadhaar" />
                </View>

                {/* Privacy note */}
                <View style={styles.privacyNote}>
                    <Text style={styles.lockIcon}>🔒</Text>
                    <Text style={styles.privacyText}>
                        Your Aadhaar data is encrypted and never shared. We only use this for identity
                        verification purposes.
                    </Text>
                </View>
            </ScrollView>

            {/* Floating CTA */}
            <View style={styles.footerCTA}>
                <TouchableOpacity
                    style={[
                        styles.submitBtn,
                        (!frontImage || !backImage || loading) && styles.submitBtnDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={!frontImage || !backImage || loading}
                    activeOpacity={0.88}
                >
                    {loading ? (
                        <ActivityIndicator color={Colors.onPrimary} />
                    ) : (
                        <Text style={styles.submitBtnText}>Submit Verification</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: '#F5F0FF' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 56,
        paddingHorizontal: 24,
        paddingBottom: 16,
        backgroundColor: 'rgba(245,240,255,0.9)',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.surfaceContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backArrow: { fontSize: 20, color: Colors.primaryContainer, fontWeight: '700' },
    headerTitle: {
        ...Typography.titleMedium,
        color: Colors.brandPurpleDark,
    },
    container: {
        paddingHorizontal: 24,
        paddingBottom: 120,
        paddingTop: 8,
    },
    subtitle: {
        ...Typography.bodyMedium,
        color: Colors.brandGray,
        marginBottom: 20,
        lineHeight: 22,
    },
    uploadStack: { gap: 16 },
    uploadBox: {
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 16,
        padding: 24,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#A78BFA',
        alignItems: 'center',
        ...Shadows.editorial,
    },
    uploadBoxFilled: {
        borderStyle: 'solid',
        borderColor: Colors.outlineVariant,
        alignItems: 'stretch',
    },
    uploadedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    uploadLabel: {
        ...Typography.titleSmall,
        color: Colors.brandPurpleDark,
        marginBottom: 4,
    },
    uploadedSubtitle: {
        ...Typography.bodySmall,
        color: Colors.brandGray,
    },
    successBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#dcfce7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    successCheck: { color: '#16a34a', fontWeight: '700', fontSize: 16 },
    previewContainer: {
        width: '100%',
        aspectRatio: 1.6,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: Colors.surfaceContainerLow,
        marginBottom: 12,
    },
    previewImage: { width: '100%', height: '100%', opacity: 0.85 },
    reuploadBtn: {
        alignSelf: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    reuploadText: {
        color: Colors.primaryContainer,
        fontWeight: '600',
        fontSize: 13,
    },
    uploadIconBg: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F5F0FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    uploadIcon: { fontSize: 28 },
    uploadHint: {
        ...Typography.bodySmall,
        color: Colors.brandGray,
        marginBottom: 16,
        marginTop: 4,
    },
    uploadBtn: {
        backgroundColor: '#F5F0FF',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: BorderRadius.full,
    },
    uploadBtnText: {
        color: Colors.primaryContainer,
        fontWeight: '600',
        fontSize: 13,
    },
    privacyNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginTop: 24,
        paddingHorizontal: 4,
    },
    lockIcon: { fontSize: 16, marginTop: 1 },
    privacyText: {
        flex: 1,
        fontSize: 11,
        color: Colors.brandGray,
        lineHeight: 16,
    },
    footerCTA: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        backgroundColor: 'rgba(245,240,255,0.95)',
    },
    submitBtn: {
        backgroundColor: Colors.primaryContainer,
        borderRadius: BorderRadius.md,
        paddingVertical: 18,
        alignItems: 'center',
        ...Shadows.editorial,
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: {
        color: Colors.onPrimary,
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
});
