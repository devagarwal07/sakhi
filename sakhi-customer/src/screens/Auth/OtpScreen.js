import React, { useState, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Animated,
    Pressable,
    Platform,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { ANDROID_STATUS_BAR_HEIGHT } from '../../utils/androidUtils';
import { API_BASE_URL } from '../../utils/constants';

const OTP_LENGTH = 6;
const { width } = Dimensions.get('window');

export default function OtpScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const phone = Array.isArray(params.phone) ? params.phone[0] : params.phone;
    const devBypass = Array.isArray(params.devBypass) ? params.devBypass[0] : params.devBypass;
    const { login, requestOtp } = useAuth();
    const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(30);
    const [resendLoading, setResendLoading] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const inputRefs = useRef([]);
    const shakeAnim = useRef(new Animated.Value(0)).current;

    const getOtpCode = (digits = otp) => {
        const normalized = (digits ?? []).map((d) => String(d ?? '').trim());
        const isComplete = normalized.length === OTP_LENGTH && normalized.every((d) => /^\d$/.test(d));
        return { code: normalized.join(''), isComplete, digits: normalized };
    };

    const headerPaddingTop = Platform.OS === 'ios'
        ? Math.max(insets.top + 12, 56)
        : Math.max(insets.top + 12, ANDROID_STATUS_BAR_HEIGHT + 12);
    const footerPaddingBottom = Math.max(40, insets.bottom + 16);

    useEffect(() => {
        const interval = setInterval(() => {
            setResendTimer((t) => (t > 0 ? t - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Auto-fill bypass code when navigated from dev bypass button
    useEffect(() => {
        if (devBypass && String(devBypass).length === OTP_LENGTH) {
            const digits = String(devBypass).split('');
            setOtp(digits);
            // Small delay so UI renders first
            setTimeout(() => {
                handleVerify(digits.join(''));
            }, 300);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 12, duration: 80, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -12, duration: 80, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const handleOtpChange = (value, index) => {
        // Keep only the last digit typed (prevents spaces / non-digits)
        const digit = String(value ?? '').replace(/\D/g, '').slice(-1);

        const updated = [...otp];
        updated[index] = digit;
        setOtp(updated);

        if (digit && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // Dismiss keyboard when last digit is entered
        if (digit && index === OTP_LENGTH - 1) {
            Keyboard.dismiss();
        }

        // Auto-submit when all digits are present (avoids race where user taps Verify
        // before the last onChangeText has fully propagated)
        const { code, isComplete } = getOtpCode(updated);
        if (isComplete) {
            setTimeout(() => handleVerify(code), 50);
        }
    };

    const handleKeyPress = ({ nativeEvent }, index) => {
        if (nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
            const updated = [...otp];
            updated[index - 1] = '';
            setOtp(updated);
        }
    };

    const handleVerify = async (overrideCode) => {
        const { code, isComplete, digits } = overrideCode
            ? { code: String(overrideCode).trim(), isComplete: String(overrideCode).trim().length === OTP_LENGTH, digits: null }
            : getOtpCode(otp);

        if (!isComplete) {
            shake();
            Alert.alert('Incomplete OTP', 'Please enter the full 6-digit code.');

            // Focus the first missing digit box for faster correction
            if (digits) {
                const firstEmpty = digits.findIndex((d) => !/^\d$/.test(d));
                if (firstEmpty >= 0) inputRefs.current[firstEmpty]?.focus();
            }
            return;
        }

        setLoading(true);
        try {
            await login(phone, code);
            // Route through the root guard so onboarding logic stays in one place.
            router.replace('/');
        } catch (err) {
            shake();
            const msg =
                err?.response?.data?.error?.message ||
                err?.response?.data?.message ||
                err?.message ||
                'Invalid OTP. Please try again.';
            Alert.alert('Verification Failed', `${msg}\n\nAPI: ${API_BASE_URL}`);
            setOtp(Array(OTP_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleDevBypass = () => {
        const code = process.env.EXPO_PUBLIC_OTP_BYPASS ?? '123456';
        if (String(code).length !== OTP_LENGTH) {
            Alert.alert('Dev bypass misconfigured', 'EXPO_PUBLIC_OTP_BYPASS must be 6 digits.');
            return;
        }
        const digits = String(code).split('');
        setOtp(digits);
        setTimeout(() => {
            handleVerify(digits.join(''));
        }, 200);
    };
    const handleResend = async () => {
        if (resendTimer > 0 || resendLoading) return;
        setResendLoading(true);
        try {
            await requestOtp(phone);
            setResendTimer(30);
            setOtp(Array(OTP_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
        } catch (err) {
            Alert.alert('Error', 'Failed to resend OTP. Please try again.');
        } finally {
            setResendLoading(false);
        }
    };


    const displayPhone = phone
        ? `${phone.slice(0, 3)} ${phone.slice(3, 8)} ${phone.slice(8)}`
        : '+91 XXXXX XXXXX';

    const timerDisplay = `0:${resendTimer < 10 ? '0' : ''}${resendTimer}`;

    return (
        <View style={styles.container}>
            {/* Decorative glows */}
            <View style={styles.glowTopRight} />
            <View style={styles.glowBottomLeft} />

            {/* Header — glassmorphic */}
            <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
                <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.backButton}>
                    <Text style={styles.backArrow}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Sakhi</Text>
                <View style={{ width: 18 }} />
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
                {/* Heading Section */}
                <View style={styles.headingSection}>
                    <Text style={styles.title}>Verify Your Number</Text>
                    <View style={styles.subtitleArea}>
                        <Text style={styles.subtitle}>We sent a 6-digit code to</Text>
                        <View style={styles.phoneRow}>
                            <Text style={styles.phoneText}>{displayPhone}</Text>
                            <Text style={styles.phoneDot}> · </Text>
                            <Pressable onPress={() => router.replace('/(auth)/login')}>
                                <Text style={styles.editLink}>Edit</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* OTP Inputs Grid — 6 boxes, 48×56, gap 10 */}
                <Animated.View
                    style={[styles.otpRow, { transform: [{ translateX: 8 }, { translateX: shakeAnim }] }]}
                >
                    {otp.map((digit, i) => {
                        const isFocused = focusedIndex === i;
                        const isFilled = !!digit;
                        return (
                            <TextInput
                                key={i}
                                ref={(ref) => (inputRefs.current[i] = ref)}
                                style={[
                                    styles.otpBox,
                                    isFocused && styles.otpBoxFocused,
                                    isFilled && styles.otpBoxFilled,
                                ]}
                                value={digit}
                                onChangeText={(val) => handleOtpChange(val.slice(-1), i)}
                                onKeyPress={(e) => handleKeyPress(e, i)}
                                onFocus={() => setFocusedIndex(i)}
                                keyboardType="number-pad"
                                maxLength={1}
                                autoFocus={i === 0}
                                selectTextOnFocus
                            />
                        );
                    })}
                </Animated.View>

                {/* Countdown — clock icon + text */}
                <View style={styles.countdownRow}>
                    <Text style={styles.clockIcon}>⏱</Text>
                    <Text style={styles.countdownText}>
                        {resendTimer > 0
                            ? `Resend OTP in ${timerDisplay}`
                            : ''}
                    </Text>
                    {resendTimer === 0 && (
                        <Pressable onPress={handleResend} disabled={resendLoading}>
                            {resendLoading
                                ? <ActivityIndicator size="small" color="#C0A6D6" />
                                : <Text style={styles.resendLink}>Resend OTP</Text>
                            }
                        </Pressable>
                    )}
                </View>

                {process.env.EXPO_PUBLIC_OTP_BYPASS ? (
                    <Pressable onPress={handleDevBypass} disabled={loading}>
                        <Text style={styles.resendLink}>
                            ⚡ Dev: Skip OTP (use {process.env.EXPO_PUBLIC_OTP_BYPASS})
                        </Text>
                    </Pressable>
                ) : null}
            </View>

            {/* Footer — sticky CTA */}
            <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>
                <TouchableOpacity
                    style={[styles.ctaButton, loading && { opacity: 0.7 }]}
                    onPress={handleVerify}
                    disabled={loading}
                    activeOpacity={0.88}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.ctaButtonText}>Verify & Continue</Text>
                    )}
                </TouchableOpacity>

                <Text style={styles.termsText}>
                    By continuing, you agree to Sakhi's{' '}
                    <Text style={styles.termsLink}>Terms of Service</Text>
                    {'\n'}and <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0FF',
    },

    // Decorative glows
    glowTopRight: {
        position: 'absolute',
        right: -39,
        top: -80,
        width: 256,
        height: 256,
        borderRadius: 9999,
        backgroundColor: 'rgba(190,163,216,0.05)',
    },
    glowBottomLeft: {
        position: 'absolute',
        left: -58,
        bottom: 40,
        width: 320,
        height: 320,
        borderRadius: 9999,
        backgroundColor: 'rgba(103, 75, 181, 0.1)',
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
        color: '#C0A6D6',
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#C0A6D6',
        letterSpacing: -1.2,
    },

    // Main content
    mainContent: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 32,
    },

    // Heading section
    headingSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#1E1B2E',
        letterSpacing: -0.8,
        lineHeight: 48,
        textAlign: 'center',
    },
    subtitleArea: {
        alignItems: 'center',
        marginTop: 12,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '400',
        color: '#6B7280',
        lineHeight: 26,
        textAlign: 'center',
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    phoneText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#6B7280',
        lineHeight: 26,
    },
    phoneDot: {
        fontSize: 16,
        color: '#6B7280',
    },
    editLink: {
        fontSize: 16,
        fontWeight: '600',
        color: '#C0A6D6',
        lineHeight: 26,
    },

    // OTP boxes — 48×56, gap 10, radius 12
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 32,
    },
    otpBox: {
        width: 48,
        height: 56,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(204, 195, 216, 0.3)',
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: '700',
        color: '#1E1B2E',
    },
    otpBoxFocused: {
        borderWidth: 2,
        borderColor: '#C0A6D6',
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
    },
    otpBoxFilled: {
        borderWidth: 2,
        borderColor: '#C0A6D6',
    },

    // Countdown
    countdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    clockIcon: {
        fontSize: 14,
        color: '#6B7280',
    },
    countdownText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
        letterSpacing: 0.35,
        lineHeight: 20,
    },
    resendLink: {
        fontSize: 14,
        fontWeight: '600',
        color: '#C0A6D6',
    },

    // Footer — sticky CTA
    footer: {
        paddingHorizontal: 32,
        paddingTop: 32,
        gap: 24,
        alignItems: 'center',
    },
    ctaButton: {
        width: '100%',
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
    ctaButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        lineHeight: 28,
    },
    termsText: {
        fontSize: 12,
        fontWeight: '400',
        color: '#64748B',
        lineHeight: 20,
        textAlign: 'center',
    },
    termsLink: {
        color: '#C0A6D6',
        fontWeight: '500',
    },
});
