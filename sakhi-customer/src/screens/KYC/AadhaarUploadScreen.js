import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert, Image,
    ScrollView, ActivityIndicator, Pressable, Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
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
            allowsEditing: true, aspect: [16, 10], quality: 0.85,
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
            allowsEditing: true, aspect: [16, 10], quality: 0.85,
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
                uri: frontImage.uri, name: 'aadhaar_front.jpg', type: 'image/jpeg',
            });
            formData.append('back', {
                uri: backImage.uri, name: 'aadhaar_back.jpg', type: 'image/jpeg',
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

    // Empty upload box
    const EmptyBox = ({ side, label }) => (
        <TouchableOpacity
            style={styles.emptyBox}
            onPress={() => showImageOptions(side)}
            activeOpacity={0.85}
        >
            {/* Cloud icon */}
            <View style={styles.cloudIconBg}>
                <Svg width="28" height="20" viewBox="0 0 28 20" fill="none">
                    <Path d="M6.875 20C4.97917 20 3.35938 19.3438 2.01562 18.0312C0.671875 16.7188 0 15.1146 0 13.2188C0 11.5938 0.489583 10.1458 1.46875 8.875C2.44792 7.60417 3.72917 6.79167 5.3125 6.4375C5.83333 4.52083 6.875 2.96875 8.4375 1.78125C10 0.59375 11.7708 0 13.75 0C16.1875 0 18.2552 0.848958 19.9531 2.54688C21.651 4.24479 22.5 6.3125 22.5 8.75C23.9375 8.91667 25.1302 9.53646 26.0781 10.6094C27.026 11.6823 27.5 12.9375 27.5 14.375C27.5 15.9375 26.9531 17.2656 25.8594 18.3594C24.7656 19.4531 23.4375 20 21.875 20H15C14.3125 20 13.724 19.7552 13.2344 19.2656C12.7448 18.776 12.5 18.1875 12.5 17.5V11.0625L10.5 13L8.75 11.25L13.75 6.25L18.75 11.25L17 13L15 11.0625V17.5H21.875C22.75 17.5 23.4896 17.1979 24.0938 16.5938C24.6979 15.9896 25 15.25 25 14.375C25 13.5 24.6979 12.7604 24.0938 12.1562C23.4896 11.5521 22.75 11.25 21.875 11.25H20V8.75C20 7.02083 19.3906 5.54688 18.1719 4.32812C16.9531 3.10938 15.4792 2.5 13.75 2.5C12.0208 2.5 10.5469 3.10938 9.32812 4.32812C8.10938 5.54688 7.5 7.02083 7.5 8.75H6.875C5.66667 8.75 4.63542 9.17708 3.78125 10.0312C2.92708 10.8854 2.5 11.9167 2.5 13.125C2.5 14.3333 2.92708 15.3646 3.78125 16.2188C4.63542 17.0729 5.66667 17.5 6.875 17.5H10V20H6.875Z" fill="#BEA3D8"/>
                </Svg>
            </View>
            {/* Title */}
            <Text style={styles.boxTitle}>{label}</Text>
            {/* Hint */}
            <Text style={styles.boxHint}>Tap to capture or upload</Text>
            {/* Upload Photo pill */}
            <View style={styles.uploadPill}>
                <Text style={styles.uploadPillText}>Upload Photo</Text>
            </View>
        </TouchableOpacity>
    );

    // Uploaded box with preview
    const UploadedBox = ({ side, image, label }) => (
        <View style={styles.uploadedBox}>
            {/* Header row */}
            <View style={styles.uploadedHeader}>
                <View>
                    <Text style={styles.uploadedTitle}>{label}</Text>
                    <Text style={styles.uploadedSubtext}>File uploaded successfully</Text>
                </View>
                <View style={styles.successBadge}>
                    <Text style={styles.successCheck}>✓</Text>
                </View>
            </View>

            {/* Preview */}
            <View style={styles.previewContainer}>
                <Image source={{ uri: image.uri }} style={styles.previewImage} resizeMode="cover" />
                <View style={styles.previewOverlay} />
            </View>

            {/* Re-upload */}
            <TouchableOpacity
                style={styles.reuploadRow}
                onPress={() => showImageOptions(side)}
            >
                <Text style={styles.reuploadText}>↻ Re-upload</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backButton}>
                        <Text style={styles.backIcon}>←</Text>
                    </Pressable>
                    <Text style={styles.headerTitle}>Upload Aadhaar Card</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Step indicator */}
                <Text style={styles.stepText}>Step 1 of 2</Text>

                {/* Subtitle */}
                <Text style={styles.subtitle}>
                    Upload clear photos of both sides of your Aadhaar
                </Text>

                {/* Upload sections */}
                <View style={styles.uploadStack}>
                    {/* Front */}
                    {frontImage ? (
                        <UploadedBox side="front" image={frontImage} label="Front of Aadhaar" />
                    ) : (
                        <EmptyBox side="front" label="Front of Aadhaar" />
                    )}

                    {/* Back */}
                    {backImage ? (
                        <UploadedBox side="back" image={backImage} label="Back of Aadhaar" />
                    ) : (
                        <EmptyBox side="back" label="Back of Aadhaar" />
                    )}
                </View>

                {/* Step complete text */}
                <Text style={styles.stepCompleteText}>Step 1 of 2 Complete</Text>

                {/* Privacy notice */}
                <View style={styles.privacyRow}>
                    <Text style={styles.privacyIcon}>🔒</Text>
                    <Text style={styles.privacyText}>
                        Your Aadhaar data is encrypted and never shared. We only use this for identity verification purposes.
                    </Text>
                </View>
            </ScrollView>

            {/* Bottom CTA */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.ctaButton,
                        (!frontImage || !backImage || loading) && styles.ctaButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={!frontImage || !backImage || loading}
                    activeOpacity={0.88}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.ctaButtonText}>Submit Verification</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0FF',
    },

    // Header — glassmorphic, 60px
    header: {
        paddingTop: Platform.OS === 'ios' ? 52 : 16,
        backgroundColor: 'rgba(245, 240, 255, 0.8)',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        gap: 16,
    },
    backButton: {
        width: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        fontSize: 16,
        color: '#C0A6D6',
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '400',
        color: '#1E1B2E',
        letterSpacing: -0.45,
        lineHeight: 28,
    },

    // Scroll
    scrollContent: {
        paddingBottom: 140,
    },

    // Step text — bold
    stepText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#6B7280',
        lineHeight: 26,
        paddingHorizontal: 24,
        paddingTop: 16,
    },

    // Subtitle
    subtitle: {
        fontSize: 16,
        fontWeight: '400',
        color: '#6B7280',
        lineHeight: 26,
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 24,
    },

    // Upload stack
    uploadStack: {
        paddingHorizontal: 24,
        gap: 24,
    },

    // Empty box — white, dashed #A78BFA, radius 12
    emptyBox: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#A78BFA',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        height: 236,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 2,
    },

    // Cloud icon bg — #F5F0FF circle
    cloudIconBg: {
        width: 52,
        height: 52,
        borderRadius: 9999,
        backgroundColor: '#F5F0FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    cloudIcon: {
        fontSize: 22,
    },

    // Box title — 18px 400
    boxTitle: {
        fontSize: 18,
        fontWeight: '400',
        color: '#1E1B2E',
        lineHeight: 28,
        textAlign: 'center',
        marginBottom: 4,
    },

    // Box hint
    boxHint: {
        fontSize: 14,
        fontWeight: '400',
        color: '#6B7280',
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 24,
    },

    // Upload Photo pill — #F5F0FF bg
    uploadPill: {
        paddingHorizontal: 24,
        paddingVertical: 10,
        backgroundColor: '#F5F0FF',
        borderRadius: 9999,
    },
    uploadPillText: {
        fontSize: 14,
        fontWeight: '400',
        color: '#BEA3D8',
        lineHeight: 20,
    },

    // Uploaded box — white, solid, radius 12
    uploadedBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 24,
        gap: 16,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 2,
    },

    // Uploaded header row
    uploadedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    uploadedTitle: {
        fontSize: 18,
        fontWeight: '400',
        color: '#1E1B2E',
        lineHeight: 28,
    },
    uploadedSubtext: {
        fontSize: 14,
        fontWeight: '400',
        color: '#6B7280',
        lineHeight: 20,
    },

    // Success badge — #DCFCE7
    successBadge: {
        width: 27,
        height: 23,
        borderRadius: 9999,
        backgroundColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    successCheck: {
        fontSize: 12,
        fontWeight: '700',
        color: '#16A34A',
    },

    // Preview
    previewContainer: {
        width: '100%',
        height: 184,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#F6F1FF',
        borderWidth: 1,
        borderColor: 'rgba(167, 139, 250, 0.2)',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        opacity: 0.6,
    },
    previewOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(124, 58, 237, 0.05)',
    },

    // Re-upload
    reuploadRow: {
        alignItems: 'center',
    },
    reuploadText: {
        fontSize: 14,
        fontWeight: '400',
        color: '#BEA3D8',
        lineHeight: 20,
    },

    // Step complete text — opacity 0.6
    stepCompleteText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4A4455',
        lineHeight: 20,
        textAlign: 'center',
        opacity: 0.6,
        marginTop: 24,
        paddingHorizontal: 24,
    },

    // Privacy row
    privacyRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 32,
        paddingTop: 16,
        gap: 12,
    },
    privacyIcon: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    privacyText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '400',
        color: '#6B7280',
        lineHeight: 20,
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        backgroundColor: 'rgba(245, 240, 255, 0.95)',
    },
    ctaButton: {
        height: 60,
        backgroundColor: '#BEA3D8',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 4,
    },
    ctaButtonDisabled: {
        opacity: 0.5,
    },
    ctaButtonText: {
        fontSize: 18,
        fontWeight: '400',
        color: '#FFFFFF',
        lineHeight: 28,
        letterSpacing: -0.45,
    },
});
