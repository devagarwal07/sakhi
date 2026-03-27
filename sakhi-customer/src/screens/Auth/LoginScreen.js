import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
    const router = useRouter();
    const { requestOtp } = useAuth();
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;

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
            Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
            return;
        }

        setLoading(true);
        try {
            const formattedPhone = `+91${cleaned}`;
            await requestOtp(formattedPhone);
            router.push({ pathname: '/(auth)/otp', params: { phone: formattedPhone } });
        } catch (err) {
            const msg = err?.response?.data?.message || 'Failed to send OTP. Please try again.';
            Alert.alert('Error', msg);
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
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Background decorators */}
                <View style={styles.glowTop} />
                <View style={styles.glowBottom} />

                {/* Logo */}
                <View style={styles.logoSection}>
                    <View style={styles.logoPolygon}>
                        <Text style={styles.logoLetter}>S</Text>
                    </View>
                    <Text style={styles.appName}>Sakhi</Text>
                    <Text style={styles.appTagline}>Safe Rides, Every Time</Text>
                </View>

                {/* Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Welcome back 👋</Text>
                    <Text style={styles.cardSubtitle}>
                        Enter your mobile number to sign in or create an account.
                    </Text>

                    {/* Phone Input */}
                    <Animated.View
                        style={[styles.inputWrapper, { transform: [{ translateX: shakeAnim }] }]}
                    >
                        <View style={styles.countryCode}>
                            <Text style={styles.countryCodeText}>🇮🇳  +91</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Mobile Number"
                            placeholderTextColor={Colors.outline}
                            keyboardType="phone-pad"
                            maxLength={10}
                            value={phone}
                            onChangeText={setPhone}
                            autoFocus
                        />
                    </Animated.View>

                    {/* Send OTP Button */}
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
                                <ActivityIndicator color={Colors.onPrimary} />
                            ) : (
                                <Text style={styles.ctaButtonText}>Send OTP</Text>
                            )}
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Disclaimer */}
                    <Text style={styles.disclaimer}>
                        By continuing, you agree to Sakhi's{' '}
                        <Text style={styles.disclaimerLink}>Terms of Service</Text> and{' '}
                        <Text style={styles.disclaimerLink}>Privacy Policy</Text>.
                    </Text>
                </View>

                {/* Women-only badge */}
                <View style={styles.badge}>
                    <Text style={styles.badgeIcon}>🛡️</Text>
                    <Text style={styles.badgeText}>Exclusively for women. Safe, verified, trusted.</Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: '#F5F0FF' },
    container: {
        flexGrow: 1,
        backgroundColor: '#F5F0FF',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 40,
        overflow: 'hidden',
    },
    glowTop: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(124, 58, 237, 0.08)',
    },
    glowBottom: {
        position: 'absolute',
        bottom: 0,
        left: -60,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(103, 75, 181, 0.06)',
    },
    logoSection: {
        alignItems: 'center',
        marginTop: 72,
        marginBottom: 40,
    },
    logoPolygon: {
        width: 80,
        height: 80,
        backgroundColor: Colors.primaryContainer,
        borderRadius: 20,
        borderTopLeftRadius: 32,
        borderBottomRightRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.editorial,
        marginBottom: 16,
    },
    logoLetter: {
        fontSize: 42,
        fontWeight: '700',
        color: Colors.onPrimary,
        lineHeight: 50,
    },
    appName: {
        fontSize: 32,
        fontWeight: '700',
        color: Colors.onBackground,
        letterSpacing: -1,
    },
    appTagline: {
        fontSize: 13,
        color: Colors.secondary,
        marginTop: 4,
        letterSpacing: 0.5,
    },
    card: {
        width: '100%',
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 24,
        padding: 24,
        ...Shadows.editorial,
    },
    cardTitle: {
        ...Typography.headlineSmall,
        color: Colors.onBackground,
        marginBottom: 6,
    },
    cardSubtitle: {
        ...Typography.bodyMedium,
        color: Colors.onSurfaceVariant,
        marginBottom: 24,
        lineHeight: 20,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceContainerLow,
        borderRadius: BorderRadius.md,
        borderWidth: 1.5,
        borderColor: Colors.outlineVariant,
        marginBottom: 20,
        overflow: 'hidden',
    },
    countryCode: {
        paddingHorizontal: 14,
        paddingVertical: 16,
        borderRightWidth: 1,
        borderRightColor: Colors.outlineVariant,
        backgroundColor: Colors.surfaceContainer,
    },
    countryCodeText: {
        fontSize: 15,
        color: Colors.onSurface,
        fontWeight: '500',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: Colors.onSurface,
        paddingHorizontal: 14,
        paddingVertical: 16,
        letterSpacing: 1.5,
    },
    ctaButton: {
        backgroundColor: Colors.primaryContainer,
        borderRadius: BorderRadius.md,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.editorial,
    },
    ctaButtonDisabled: {
        opacity: 0.7,
    },
    ctaButtonText: {
        color: Colors.onPrimary,
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    disclaimer: {
        fontSize: 11,
        color: Colors.outline,
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 16,
    },
    disclaimerLink: {
        color: Colors.primary,
        fontWeight: '600',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 24,
        backgroundColor: Colors.primaryFixed,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: BorderRadius.full,
    },
    badgeIcon: { fontSize: 14 },
    badgeText: {
        fontSize: 12,
        color: Colors.onPrimaryFixed,
        fontWeight: '500',
    },
});
