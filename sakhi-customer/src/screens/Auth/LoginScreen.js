import React, { useState, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    View,
    Text,
    Image,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Animated,
    Dimensions,
    StatusBar} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { ANDROID_STATUS_BAR_HEIGHT } from '../../utils/androidUtils';
import { API_BASE_URL } from '../../utils/constants';
import CustomAlert from '../../utils/CustomAlert';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { requestOtp } = useAuth();
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;

    const headerPaddingTop = Platform.OS === 'ios'
        ? Math.max(insets.top + 12, 56)
        : Math.max(insets.top + 12, ANDROID_STATUS_BAR_HEIGHT + 12);
    const scrollPaddingBottom = Math.max(40, insets.bottom + 16);

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const pressIn = () => {
        Animated.spring(buttonScale, { toValue: 0.97, useNativeDriver: true }).start();
    };
    const pressOut = () => {
        Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();
    };

    const handleSendOtp = async () => {
        const cleaned = phone.replace(/\s/g, '');
        if (cleaned.length !== 10 || !/^\d+$/.test(cleaned)) {
            shake();
            CustomAlert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
            return;
        }

        setLoading(true);
        try {
            const formattedPhone = `+91${cleaned}`;
            await requestOtp(formattedPhone);
            router.push({ pathname: '/(auth)/otp', params: { phone: formattedPhone } });
        } catch (err) {
            const msg =
                err?.response?.data?.error?.message ||
                err?.response?.data?.message ||
                err?.message ||
                'Failed to send OTP. Please try again.';
            CustomAlert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.flex}
        >
            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Decorative glow — top right */}
                <View style={styles.glowTopRight} />

                {/* Header — glassmorphic top bar */}
                <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
                    <View style={{ width: 18 }} />
                    <Text style={styles.headerTitle}>Sakhi</Text>
                    <View style={{ width: 18 }} />
                </View>

                {/* Hero Image — women illustration */}
                <View style={styles.heroContainer}>
                    <Image
                        source={require('../../../assets/LoginPeople.jpeg')}
                        style={styles.heroImage}
                        resizeMode="cover"
                    />
                </View>

                {/* Welcome text */}
                <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeTitle}>Welcome to Sakhi</Text>
                    <Text style={styles.welcomeSubtitle}>
                        Reliable & Safe rides for women.{'\n'}
                        Community-driven transport for peace of mind.
                    </Text>
                </View>

                {/* Phone input section */}
                <View style={styles.inputSection}>
                    {/* Label */}
                    <Text style={styles.inputLabel}>Phone Number</Text>

                    {/* Input field */}
                    <Animated.View
                        style={[styles.inputWrapper, { transform: [{ translateX: shakeAnim }] }]}
                    >
                        {/* Country code area */}
                        <View style={styles.countryCodeArea}>
                            <Text style={styles.flagText}>🇮🇳</Text>
                            <Text style={styles.countryCodeText}>+91</Text>
                            <Feather name="chevron-down" size={14} color="#94A3B8" style={{ marginLeft: 2 }} />
                        </View>
                        {/* Vertical divider */}
                        <View style={styles.verticalDivider} />
                        {/* Input */}
                        <TextInput
                            style={styles.phoneInput}
                            placeholder="Phone Number"
                            placeholderTextColor="#94A3B8"
                            keyboardType="phone-pad"
                            maxLength={10}
                            value={phone}
                            onChangeText={(text) => {
                                setPhone(text);
                                if (text.length === 10) Keyboard.dismiss();
                            }}
                        />
                    </Animated.View>

                    {/* Get OTP button */}
                    <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                        <TouchableOpacity
                            style={[styles.ctaButton, loading && styles.ctaButtonDisabled]}
                            onPress={handleSendOtp}
                            onPressIn={pressIn}
                            onPressOut={pressOut}
                            disabled={loading}
                            activeOpacity={0.9}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <View style={styles.ctaInner}>
                                    <Text style={styles.ctaButtonText}>Get OTP</Text>
                                    <Feather name="arrow-right" size={20} color="#FFFFFF" />
                                </View>
                            )}
                        </TouchableOpacity>
                    </Animated.View>

                </View>

                {/* Terms */}
                <View style={styles.termsSection}>
                    <Text style={styles.termsText}>
                        By continuing, you agree to Sakhi's{' '}
                        <Text style={styles.termsLink} onPress={() => router.push('/terms')}>Terms of Service</Text>
                        {'\n'}and <Text style={styles.termsLink} onPress={() => router.push('/terms')}>Privacy Policy</Text>
                    </Text>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: '#F5F0FF' },
    scrollContent: {
        flexGrow: 1,
        backgroundColor: '#F5F0FF',
    },

    // Decorative glow — top right
    glowTopRight: {
        position: 'absolute',
        right: -39,
        top: -80,
        width: 256,
        height: 256,
        borderRadius: 9999,
        backgroundColor: 'rgba(109, 0, 255, 0.05)',
    },

    // Header — glassmorphic
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 12,
        backgroundColor: 'rgba(245, 240, 255, 0.8)',
    },
    backButton: {
        width: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backArrow: {
        fontSize: 20,
        color: '#BDA3D4',
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#BDA3D4',
        letterSpacing: -1.2,
    },

    // Hero image — 326×256, border-radius 48
    heroContainer: {
        paddingHorizontal: 32,
        paddingTop: 16,
    },
    heroImage: {
        width: width - 64,
        height: 256,
        borderRadius: 48,
        backgroundColor: '#F0E8D8',
    },

    // Welcome section
    welcomeSection: {
        paddingHorizontal: 64,
        paddingTop: 24,
        alignItems: 'center',
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#0F172A',
        letterSpacing: -0.6,
        lineHeight: 30,
        textAlign: 'center',
    },
    welcomeSubtitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#475569',
        lineHeight: 20,
        textAlign: 'center',
        marginTop: 8,
    },

    // Input section
    inputSection: {
        paddingHorizontal: 40,
        paddingTop: 40,
        gap: 24,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        lineHeight: 20,
        paddingLeft: 4,
    },

    // Phone input — white bg, #E2E8F0 border, radius 16
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        height: 56,
        marginTop: -16,
    },
    countryCodeArea: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 17,
        paddingRight: 12,
        gap: 4,
    },
    flagText: {
        fontSize: 16,
    },
    countryCodeText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#0F172A',
        lineHeight: 24,
    },
    dropdownArrow: {
        fontSize: 10,
        color: '#94A3B8',
        marginLeft: 2,
    },
    verticalDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E2E8F0',
    },
    phoneInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: '#0F172A',
        paddingHorizontal: 12,
        paddingVertical: 10,
        lineHeight: 19,
    },

    // CTA button — #BEA3D8 bg, radius 12, shadow
    ctaButton: {
        backgroundColor: '#BEA3D8',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.2,
        shadowRadius: 32,
        elevation: 8,
    },
    ctaButtonDisabled: {
        opacity: 0.7,
    },
    ctaInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ctaButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 24,
    },
    ctaArrow: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '500',
    },

    // Terms — 12px, #64748B
    termsSection: {
        paddingHorizontal: 40,
        paddingTop: 24,
        alignItems: 'center',
    },
    termsText: {
        fontSize: 12,
        fontWeight: '400',
        color: '#64748B',
        lineHeight: 20,
        textAlign: 'center',
    },
    termsLink: {
        color: '#BDA3D4',
        fontWeight: '500',
    },
});
