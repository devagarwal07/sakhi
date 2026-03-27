import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';
import { VERIFICATION_STATUSES } from '../../utils/constants';

const OTP_LENGTH = 6;

export default function OtpScreen() {
    const router = useRouter();
    const { phone } = useLocalSearchParams();
    const { login } = useAuth();
    const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(30);
    const inputRefs = useRef([]);
    const shakeAnim = useRef(new Animated.Value(0)).current;

    // Countdown timer for resend
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

        // Auto-advance to next box
        if (value && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
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
            // Navigate based on verification status
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

    const maskedPhone = phone
        ? `${phone.slice(0, 3)} XXXXX ${phone.slice(-2)}`
        : '•••••••••••';

    return (
        <View style={styles.container}>
            <View style={styles.glowTop} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backArrow}>←</Text>
                </Pressable>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.iconBadge}>
                    <Text style={styles.iconEmoji}>📱</Text>
                </View>

                <Text style={styles.title}>Enter OTP</Text>
                <Text style={styles.subtitle}>
                    We've sent a 6-digit code to{'\n'}
                    <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
                </Text>

                {/* OTP Boxes */}
                <Animated.View
                    style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}
                >
                    {otp.map((digit, i) => (
                        <TextInput
                            key={i}
                            ref={(ref) => (inputRefs.current[i] = ref)}
                            style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                            value={digit}
                            onChangeText={(val) => handleOtpChange(val.slice(-1), i)}
                            onKeyPress={(e) => handleKeyPress(e, i)}
                            keyboardType="number-pad"
                            maxLength={1}
                            autoFocus={i === 0}
                            selectTextOnFocus
                        />
                    ))}
                </Animated.View>

                {/* Verify Button */}
                <TouchableOpacity
                    style={[styles.ctaButton, loading && { opacity: 0.7 }]}
                    onPress={handleVerify}
                    disabled={loading}
                    activeOpacity={0.88}
                >
                    {loading ? (
                        <ActivityIndicator color={Colors.onPrimary} />
                    ) : (
                        <Text style={styles.ctaButtonText}>Verify & Continue</Text>
                    )}
                </TouchableOpacity>

                {/* Resend */}
                <View style={styles.resendRow}>
                    <Text style={styles.resendText}>Didn't receive the code? </Text>
                    {resendTimer > 0 ? (
                        <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
                    ) : (
                        <Pressable onPress={() => setResendTimer(30)}>
                            <Text style={styles.resendLink}>Resend OTP</Text>
                        </Pressable>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0FF',
        paddingHorizontal: 24,
    },
    glowTop: {
        position: 'absolute',
        top: -80,
        right: -80,
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: 'rgba(124, 58, 237, 0.07)',
    },
    header: {
        paddingTop: 56,
        marginBottom: 8,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.surfaceContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backArrow: {
        fontSize: 20,
        color: Colors.primaryContainer,
        fontWeight: '700',
    },
    content: {
        flex: 1,
        paddingTop: 32,
    },
    iconBadge: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: Colors.primaryFixed,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    iconEmoji: { fontSize: 30 },
    title: {
        ...Typography.headlineMedium,
        color: Colors.onBackground,
        marginBottom: 8,
    },
    subtitle: {
        ...Typography.bodyLarge,
        color: Colors.onSurfaceVariant,
        lineHeight: 24,
        marginBottom: 36,
    },
    phoneHighlight: {
        fontWeight: '700',
        color: Colors.primary,
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 36,
        gap: 10,
    },
    otpBox: {
        flex: 1,
        height: 60,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surfaceContainerLowest,
        borderWidth: 2,
        borderColor: Colors.outlineVariant,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: '700',
        color: Colors.onSurface,
    },
    otpBoxFilled: {
        borderColor: Colors.primaryContainer,
        backgroundColor: Colors.primaryFixed,
        color: Colors.primary,
    },
    ctaButton: {
        backgroundColor: Colors.primaryContainer,
        borderRadius: BorderRadius.md,
        paddingVertical: 17,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.editorial,
    },
    ctaButtonText: {
        color: Colors.onPrimary,
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    resendRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    resendText: {
        fontSize: 14,
        color: Colors.onSurfaceVariant,
    },
    resendTimer: {
        fontSize: 14,
        color: Colors.outline,
        fontWeight: '500',
    },
    resendLink: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '600',
    },
});
