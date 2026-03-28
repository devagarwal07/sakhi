import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    Image,
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
import { VERIFICATION_STATUSES } from '../../utils/constants';

const OTP_LENGTH = 6;
const { width } = Dimensions.get('window');

export default function OtpScreen() {
    const router = useRouter();
    const { phone } = useLocalSearchParams();
    const { login } = useAuth();
    const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(30);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const inputRefs = useRef([]);
    const shakeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const interval = setInterval(() => {
            setResendTimer((t) => (t > 0 ? t - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
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
        const updated = [...otp];
        updated[index] = value;
        setOtp(updated);
        if (value && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
        // Dismiss keyboard when all digits are filled
        if (value && index === OTP_LENGTH - 1) {
            Keyboard.dismiss();
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

    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length !== OTP_LENGTH) {
            shake();
            Alert.alert('Incomplete OTP', 'Please enter the full 6-digit code.');
            return;
        }

        setLoading(true);
        try {
            const user = await login(phone, code);
            if (
                user.verification_status === VERIFICATION_STATUSES.NOT_SUBMITTED ||
                user.verification_status === VERIFICATION_STATUSES.REJECTED
            ) {
                router.replace('/(kyc)/intro');
            } else if (user.verification_status === VERIFICATION_STATUSES.PENDING) {
                router.replace('/(kyc)/pending');
            } else {
                router.replace('/(tabs)');
            }
        } catch (err) {
            shake();
            const msg = err?.response?.data?.message || 'Invalid OTP. Please try again.';
            Alert.alert('Verification Failed', msg);
            setOtp(Array(OTP_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    // Format phone: "+91 98765 43210"
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
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
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
                            <Pressable onPress={() => router.back()}>
                                <Text style={styles.editLink}>Edit</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* OTP Inputs Grid — 6 boxes, 48×56, gap 10 */}
                <Animated.View
                    style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}
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
                        <Pressable onPress={() => setResendTimer(30)}>
                            <Text style={styles.resendLink}>Resend OTP</Text>
                        </Pressable>
                    )}
                </View>

                {/* Lock illustration */}
                <View style={styles.illustrationSection}>
                    <View style={styles.illustrationCircle}>
                        <Image
                            source={require('../../../assets/lock-icon.jpeg')}
                            style={styles.lockIcon}
                            resizeMode="contain"
                        />
                    </View>
                </View>
            </View>

            {/* Footer — sticky CTA */}
            <View style={styles.footer}>
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
        backgroundColor: '#FCF8FF',
    },

    // Decorative glows
    glowTopRight: {
        position: 'absolute',
        right: -39,
        top: -80,
        width: 256,
        height: 256,
        borderRadius: 9999,
        backgroundColor: 'rgba(99, 14, 212, 0.05)',
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
        paddingTop: Platform.OS === 'ios' ? 56 : 16,
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
        color: '#1C1A25',
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
        color: '#1C1A25',
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

    // Lock illustration — 128px circle, opacity 0.4
    illustrationSection: {
        marginTop: 64,
        alignItems: 'center',
    },
    illustrationCircle: {
        width: 128,
        height: 128,
        borderRadius: 9999,
        backgroundColor: 'rgba(99, 14, 212, 0.08)',
        opacity: 0.6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lockIcon: {
        width: 48,
        height: 48,
    },

    // Footer — sticky CTA
    footer: {
        paddingHorizontal: 32,
        paddingBottom: 40,
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
