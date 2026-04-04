import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Animated } from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function SOSWarningScreen() {
    const router = useRouter();
    const [timeLeft, setTimeLeft] = useState(5);
    const progressAnim = React.useRef(new Animated.Value(280)).current;

    // Countdown and automatic trigger logic
    useEffect(() => {
        // Start progress bar animation decreasing to 0 over 5 seconds
        Animated.timing(progressAnim, {
            toValue: 0,
            duration: 5000,
            useNativeDriver: false, // width is not supported by native driver
        }).start();

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (timeLeft === 0) {
            triggerSOS();
        }
    }, [timeLeft]);

    const triggerSOS = () => {
        router.replace('/sos-active');
    };

    const handleCancel = () => {
        // Go back safely
        if (router.canGoBack()) {
            if (router.canGoBack()) router.back(); else router.replace("/");
        } else {
            router.replace('/(tabs)/');
        }
    };

    return (
        <View style={styles.container}>
            {/* Ambient Background Glow */}
            <View style={styles.ambientGlow} />

            <View style={styles.mainContent}>
                {/* Urgent Warning Icon Section */}
                <View style={styles.iconSection}>
                    <View style={styles.ringOuter} />
                    <View style={styles.ringInner} />
                    <View style={styles.iconCircle}>
                        <Text style={styles.warningIcon}>⚠️</Text>
                    </View>
                </View>

                {/* Headings */}
                <View style={styles.headingSection}>
                    <Text style={styles.title}>Are you in danger?</Text>
                    <Text style={styles.subtitle}>
                        Your emergency contacts and{'\n'}Sakhi team will be notified{'\n'}immediately.
                    </Text>
                </View>

                {/* Action Stack */}
                <View style={styles.actionStack}>
                    <TouchableOpacity style={styles.yesBtn} onPress={triggerSOS} activeOpacity={0.8}>
                        <Text style={styles.yesIcon}>🚨</Text>
                        <Text style={styles.yesText}>YES — Send SOS Alert</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.noBtn} onPress={handleCancel} activeOpacity={0.8}>
                        <Text style={styles.noText}>No, I'm Safe — Go Back</Text>
                    </TouchableOpacity>
                </View>

                {/* Countdown & Progress */}
                <View style={styles.countdownSection}>
                    <View style={styles.countdownPill}>
                        <Text style={styles.countdownText}>Sending automatically in {timeLeft}…</Text>
                    </View>
                    <View style={styles.progressContainer}>
                        <Animated.View style={[styles.progressBar, { width: progressAnim }]} />
                    </View>
                </View>

                {/* Urgent Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>SOS WILL AUTO-SEND IF NO RESPONSE.</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#92400E' },
    ambientGlow: {
        position: 'absolute', bottom: -87, right: -39,
        width: 195, height: 353,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 9999,
    },
    mainContent: { flex: 1, alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 140 : 100 },
    
    iconSection: { width: 96, height: 96, justifyContent: 'center', alignItems: 'center', marginBottom: 64, position: 'relative' },
    ringOuter: { position: 'absolute', width: 192, height: 192, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 96 },
    ringInner: { position: 'absolute', width: 128, height: 128, backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 64 },
    iconCircle: { 
        width: 96, height: 96, backgroundColor: '#FFFFFF', borderRadius: 48, 
        justifyContent: 'center', alignItems: 'center', 
        shadowColor: '#000', shadowOffset: { width: 0, height: 25 }, shadowOpacity: 0.25, shadowRadius: 50, elevation: 10 
    },
    warningIcon: { fontSize: 44 },

    headingSection: { alignItems: 'center', marginBottom: 80 },
    title: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.9, marginBottom: 16 },
    subtitle: { fontSize: 18, fontWeight: '400', color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center', lineHeight: 29 },

    actionStack: { width: '100%', paddingHorizontal: 32, gap: 16, marginBottom: 48 },
    yesBtn: { 
        width: '100%', height: 64, backgroundColor: '#BA1A1A', borderRadius: 16, 
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12,
        shadowColor: 'rgba(186, 26, 26, 0.4)', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 20, elevation: 8
    },
    yesIcon: { fontSize: 16 },
    yesText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

    noBtn: { width: '100%', height: 64, backgroundColor: '#FFFFFF', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    noText: { fontSize: 16, fontWeight: '600', color: '#1E1B2E' },

    countdownSection: { alignItems: 'center', width: '100%' },
    countdownPill: { 
        backgroundColor: 'rgba(255, 255, 255, 0.1)', 
        paddingVertical: 12, paddingHorizontal: 24, borderRadius: 9999, marginBottom: 16,
    },
    countdownText: { fontSize: 16, fontWeight: '500', color: '#FFFFFF', letterSpacing: 0.4 },
    progressContainer: { width: 280, height: 6, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 3, overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 3 },

    footer: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
    footerText: { fontSize: 12, fontWeight: '500', color: 'rgba(255, 255, 255, 0.6)', letterSpacing: 1.2, textTransform: 'uppercase' },
});
