import React, { useState, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, ActivityIndicator, Pressable,
    Animated, Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';
import { useAuth } from '../src/context/AuthContext';
import apiClient from '../src/api/client';
import SakhiModal from '../src/components/SakhiModal';
import { Feather } from '@expo/vector-icons';

const STEPS = { ENTER_PHONE: 'enter_phone', VERIFY_OTP: 'verify_otp', SUCCESS: 'success' };
const OTP_LENGTH = 6;

export default function ChangePhoneScreen() {
    const router = useRouter();
    const { user, updateUser } = useAuth();
    const [step, setStep] = useState(STEPS.ENTER_PHONE);
    const [newPhone, setNewPhone] = useState('');
    const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const [modal, setModal] = useState(null);
    const otpRefs = useRef(Array(OTP_LENGTH).fill(null));
    const checkScale = useRef(new Animated.Value(0)).current;
    const timerRef = useRef(null);

    const startResendTimer = () => {
        setResendTimer(30);
        timerRef.current = setInterval(() => {
            setResendTimer((t) => {
                if (t <= 1) { clearInterval(timerRef.current); return 0; }
                return t - 1;
            });
        }, 1000);
    };

    const handleSendOtp = async () => {
        const cleaned = newPhone.replace(/\D/g, '');
        if (cleaned.length !== 10) {
            setModal({
                icon: '⚠️',
                title: 'Invalid Number',
                message: 'Please enter a valid 10-digit mobile number.',
                buttons: [{ text: 'OK', onPress: () => setModal(null) }]
            });
            return;
        }
        setLoading(true);
        try {
            await apiClient.post('/auth/change-phone/send-otp', {
                new_phone: `+91${cleaned}`,
            });
            setStep(STEPS.VERIFY_OTP);
            startResendTimer();
            setTimeout(() => otpRefs.current[0]?.focus(), 300);
        } catch (err) {
            setModal({
                icon: '⚠️',
                title: 'Error',
                message: err?.response?.data?.message || 'Could not send OTP. Try again.',
                buttons: [{ text: 'OK', onPress: () => setModal(null) }]
            });
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (val, index) => {
        const digits = val.replace(/\D/g, '');
        if (!digits) {
            const next = [...otp];
            next[index] = '';
            setOtp(next);
            if (index > 0) otpRefs.current[index - 1]?.focus();
            return;
        }
        const next = [...otp];
        next[index] = digits[0];
        setOtp(next);
        if (index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
        if (next.every((d) => d !== '')) handleVerifyOtp(next.join(''));
    };

    const handleVerifyOtp = async (code) => {
        setLoading(true);
        try {
            await apiClient.post('/auth/change-phone/verify-otp', {
                new_phone: `+91${newPhone.replace(/\D/g, '')}`,
                otp: code || otp.join(''),
            });
            updateUser({ phone: `+91${newPhone.replace(/\D/g, '')}` });
            setStep(STEPS.SUCCESS);
            Animated.spring(checkScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();
        } catch (err) {
            setModal({
                icon: '⚠️',
                title: 'Incorrect OTP',
                message: err?.response?.data?.message || 'The code you entered is wrong. Try again.',
                buttons: [{ text: 'OK', onPress: () => setModal(null) }]
            });
            setOtp(Array(OTP_LENGTH).fill(''));
            otpRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendTimer > 0) return;
        setLoading(true);
        try {
            await apiClient.post('/auth/change-phone/send-otp', {
                new_phone: `+91${newPhone.replace(/\D/g, '')}`,
            });
            setOtp(Array(OTP_LENGTH).fill(''));
            startResendTimer();
            otpRefs.current[0]?.focus();
        } catch { } finally { setLoading(false); }
    };

    // ── STEP: SUCCESS ─────────────────────────────────────────────────────────
    if (step === STEPS.SUCCESS) {
        return (
            <SafeAreaView style={styles.successContainer}>
                <Animated.View style={[styles.successCircle, { transform: [{ scale: checkScale }] }]}>
                    <Feather name="check-circle" size={48} color="#10B981" />
                </Animated.View>
                <Text style={styles.successTitle}>Phone Number Updated!</Text>
                <Text style={styles.successSub}>
                    Your new phone number +91 {newPhone} is now linked to your account.
                </Text>
                <TouchableOpacity style={styles.doneBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
                    <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
                    <Feather name="arrow-left" size={20} color="#BEA3D8" />
                </Pressable>
                <Text style={styles.headerTitle}>Change Phone Number</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Current number info */}
                <View style={styles.currentCard}>
                    <Text style={styles.currentLabel}>Current Number</Text>
                    <Text style={styles.currentPhone}>{user?.phone || '—'}</Text>
                </View>

                {/* ── Step 1: Enter new phone ─────────────────────────────────── */}
                {step === STEPS.ENTER_PHONE && (
                    <>
                        <Text style={styles.stepTitle}>Enter New Phone Number</Text>
                        <Text style={styles.stepSubtitle}>
                            We'll send a 6-digit OTP to confirm this is your number.
                        </Text>

                        <View style={styles.phoneInputRow}>
                            <View style={styles.countryCode}>
                                <Text style={styles.countryCodeText}>🇮🇳  +91</Text>
                            </View>
                            <TextInput
                                style={styles.phoneInput}
                                placeholder="10-digit number"
                                placeholderTextColor={Colors.outline}
                                value={newPhone}
                                onChangeText={setNewPhone}
                                keyboardType="phone-pad"
                                maxLength={10}
                                autoFocus
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.ctaBtn, (loading || newPhone.length < 10) && { opacity: 0.6 }]}
                            onPress={handleSendOtp}
                            disabled={loading || newPhone.length < 10}
                        >
                            {loading
                                ? <ActivityIndicator color={Colors.onPrimary} />
                                : <Text style={styles.ctaBtnText}>Send OTP</Text>
                            }
                        </TouchableOpacity>
                    </>
                )}

                {/* ── Step 2: Verify OTP ──────────────────────────────────────── */}
                {step === STEPS.VERIFY_OTP && (
                    <>
                        <Text style={styles.stepTitle}>Verify OTP</Text>
                        <Text style={styles.stepSubtitle}>
                            Enter the 6-digit code sent to +91 {newPhone}
                        </Text>

                        <View style={styles.otpRow}>
                            {otp.map((digit, i) => (
                                <TextInput
                                    key={i}
                                    ref={(r) => { otpRefs.current[i] = r; }}
                                    style={[styles.otpBox, digit && styles.otpBoxFilled]}
                                    value={digit}
                                    onChangeText={(v) => handleOtpChange(v, i)}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    selectTextOnFocus
                                />
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.ctaBtn, loading && { opacity: 0.6 }]}
                            onPress={() => handleVerifyOtp()}
                            disabled={loading || otp.some((d) => !d)}
                        >
                            {loading
                                ? <ActivityIndicator color={Colors.onPrimary} />
                                : <Text style={styles.ctaBtnText}>Verify & Update</Text>
                            }
                        </TouchableOpacity>

                        <View style={styles.resendRow}>
                            <Text style={styles.resendLabel}>Didn't receive it?  </Text>
                            <TouchableOpacity onPress={handleResend} disabled={resendTimer > 0 || loading}>
                                <Text style={[styles.resendBtn, resendTimer > 0 && { color: Colors.outline }]}>
                                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.changeNumBtn}
                            onPress={() => { setStep(STEPS.ENTER_PHONE); setOtp(Array(OTP_LENGTH).fill('')); }}
                        >
                            <Text style={styles.changeNumText}><Feather name="arrow-left" size={13} color="#6B7280" /> Change number</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>

            <SakhiModal config={modal} onClose={() => setModal(null)} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        height: 64,
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
    container: { flex: 1, backgroundColor: '#F5F0FF' },
    
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.surfaceContainer, alignItems: 'center', justifyContent: 'center',
    },
    backArrow: { fontSize: 20, color: Colors.primaryContainer, fontWeight: '700' },
    
    content: { paddingHorizontal: 20, paddingBottom: 48, gap: 16 },
    currentCard: {
        backgroundColor: Colors.surfaceContainerLow, borderRadius: 14,
        padding: 14, borderWidth: 1, borderColor: Colors.outlineVariant,
    },
    currentLabel: { fontSize: 10, fontWeight: '700', color: Colors.outline, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
    currentPhone: { fontSize: 18, fontWeight: '700', color: Colors.onSurface },
    stepTitle: { ...Typography.titleMedium, color: Colors.onBackground, marginTop: 8 },
    stepSubtitle: { ...Typography.bodyMedium, color: Colors.onSurfaceVariant, lineHeight: 20 },
    phoneInputRow: {
        flexDirection: 'row', backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 14, overflow: 'hidden', ...Shadows.card,
        borderWidth: 1.5, borderColor: Colors.outlineVariant,
    },
    countryCode: {
        backgroundColor: Colors.surfaceContainerLow,
        paddingHorizontal: 16, paddingVertical: 15,
        borderRightWidth: 1, borderRightColor: Colors.outlineVariant,
    },
    countryCodeText: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
    phoneInput: {
        flex: 1, paddingHorizontal: 16, paddingVertical: 15,
        fontSize: 18, color: Colors.onSurface, fontWeight: '600', letterSpacing: 1,
    },
    otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
    otpBox: {
        width: 46, height: 56, borderRadius: 12, textAlign: 'center',
        fontSize: 22, fontWeight: '700', color: Colors.onSurface,
        backgroundColor: Colors.surfaceContainerLowest,
        borderWidth: 1.5, borderColor: Colors.outlineVariant,
        ...Shadows.card,
    },
    otpBoxFilled: {
        borderColor: Colors.primaryContainer, backgroundColor: Colors.primaryFixed,
        color: Colors.primaryContainer,
    },
    ctaBtn: {
        backgroundColor: Colors.primaryContainer, borderRadius: BorderRadius.md,
        paddingVertical: 16, alignItems: 'center', ...Shadows.editorial,
    },
    ctaBtnText: { color: Colors.onPrimary, fontSize: 16, fontWeight: '700' },
    resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    resendLabel: { fontSize: 13, color: Colors.onSurfaceVariant },
    resendBtn: { fontSize: 13, color: Colors.primaryContainer, fontWeight: '700' },
    changeNumBtn: { alignItems: 'center', paddingVertical: 4 },
    changeNumText: { fontSize: 13, color: Colors.onSurfaceVariant, fontWeight: '500' },
    // Success state
    successContainer: {
        flex: 1, backgroundColor: '#F5F0FF',
        alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16,
    },
    successCircle: {
        width: 96, height: 96, borderRadius: 48,
        backgroundColor: Colors.primaryFixed,
        alignItems: 'center', justifyContent: 'center', ...Shadows.editorial,
    },
    successTitle: { ...Typography.headlineSmall, color: Colors.onBackground, textAlign: 'center' },
    successSub: {
        ...Typography.bodyMedium, color: Colors.onSurfaceVariant,
        textAlign: 'center', lineHeight: 22,
    },
    doneBtn: {
        backgroundColor: Colors.primaryContainer, borderRadius: BorderRadius.md,
        paddingVertical: 14, paddingHorizontal: 48, ...Shadows.editorial,
    },
    doneBtnText: { color: Colors.onPrimary, fontSize: 16, fontWeight: '700' },
});
