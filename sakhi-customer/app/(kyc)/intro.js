import React from 'react';
import {
    View, Text, Image, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function KYCIntroScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const headerPaddingTop = Platform.OS === 'ios'
        ? insets.top + 12
        : Math.max(insets.top, 24);
    const footerPaddingBottom = Math.max(insets.bottom, 32);

    return (
        <View style={styles.container}>
            {/* Decorative gradient blur — top */}
            <View style={styles.gradientBlur} />

            {/* Header — Top Navigation */}
            <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerRight}>
                    <Text style={styles.shieldIcon}>🛡️</Text>
                    <Text style={styles.headerTitle}>Verification</Text>
                </View>
            </View>

            {/* Main Content */}
            <View style={styles.main}>
                {/* Hero Editorial Section */}
                <View style={styles.heroSection}>
                    <Text style={styles.title}>Verify Your Identity</Text>
                    <Text style={styles.subtitle}>
                        Sakhi is a women-only platform. Please complete identity verification to activate your account.
                    </Text>
                </View>

                {/* Options Container */}
                <View style={styles.optionsContainer}>
                    {/* Card: Upload Aadhaar — Selected State */}
                    <TouchableOpacity
                        style={styles.optionCard}
                        onPress={() => router.push('/(kyc)/aadhaar')}
                        activeOpacity={0.85}
                    >
                        {/* Selected border ring */}
                        <View style={styles.cardBorderRing} />

                        {/* Icon */}
                        <View style={styles.optionIconBg}>
                            <Image
                                source={require('../../assets/aadhar-verification.jpeg')}
                                style={styles.optionIconImage}
                                resizeMode="contain"
                            />
                        </View>

                        {/* Text */}
                        <View style={styles.optionBody}>
                            <Text style={styles.optionTitle}>Upload Aadhaar</Text>
                            <Text style={styles.optionDesc}>
                                Upload front & back of your Aadhaar card
                            </Text>
                        </View>

                        {/* Arrow */}
                        <Text style={styles.optionArrow}>›</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Footer — Bottom Action */}
            <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>
                <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={() => router.push('/(kyc)/aadhaar')}
                    activeOpacity={0.88}
                >
                    <Text style={styles.ctaButtonText}>Continue</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingBottom: 12,
        backgroundColor: '#F5F0FF', 
        zIndex: 10
    },
    iconBtn: { 
        width: 32, 
        height: 32, 
        justifyContent: 'center', 
        alignItems: 'flex-start',
        backgroundColor: 'transparent'
    },
    headerIcon: { 
        fontSize: 24, 
        color: '#BEA3D8', 
        fontWeight: 'bold' 
    },
    headerTitle: { 
        fontSize: 20, 
        fontWeight: '700', 
        color: '#1E1B2E', 
        letterSpacing: -0.5,
        marginLeft: 16
    },
    container: {
        flex: 1,
        backgroundColor: '#F5F0FF',
    },

    // Decorative gradient blur — top
    gradientBlur: {
        position: 'absolute',
        height: 120,
        left: 0,
        right: 0,
        top: 0,
        backgroundColor: 'rgba(167, 139, 250, 0.06)',
        borderRadius: 9999,
    },

    // Header — glassmorphic
    
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        fontSize: 18,
        color: '#C0A6D6',
        fontWeight: '600',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    shieldIcon: {
        fontSize: 16,
        color: '#C0A6D6',
    },
    

    // Main content
    main: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 32,
        gap: 32,
    },

    // Hero section
    heroSection: {
        gap: 12,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1E1B2E',
        letterSpacing: -0.96,
        lineHeight: 40,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '400',
        color: '#6B7280',
        lineHeight: 26,
    },

    // Options
    optionsContainer: {
        gap: 24,
    },

    // Card — selected state: #EDE9FE bg, 2px #BEA3D8 border
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
        gap: 20,
        backgroundColor: '#EDE9FE',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#BEA3D8',
    },
    cardBorderRing: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        borderRadius: 12,
    },

    // Icon bg — 56×56, white, radius 12
    optionIconBg: {
        width: 56,
        height: 56,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionIconImage: {
        width: 25,
        height: 25,
        tintColor: '#C0A6D6',
    },

    // Text
    optionBody: {
        flex: 1,
        gap: 4,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E1B2E',
        lineHeight: 24,
    },
    optionDesc: {
        fontSize: 14,
        fontWeight: '400',
        color: '#6B7280',
        lineHeight: 19,
    },

    // Arrow
    optionArrow: {
        fontSize: 18,
        color: '#C0A6D6',
        fontWeight: '600',
    },

    // Footer — sticky bottom
    footer: {
        paddingHorizontal: 24,
        paddingTop: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        alignItems: 'center',
    },
    ctaButton: {
        width: '100%',
        maxWidth: 342,
        height: 56,
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
    ctaButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        lineHeight: 24,
    },
});
