import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    Animated,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const progressAnim = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.7)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const taglineOpacity = useRef(new Animated.Value(0)).current;
    const footerOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.parallel([
                Animated.spring(logoScale, {
                    toValue: 1,
                    tension: 60,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(taglineOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(footerOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        Animated.timing(progressAnim, {
            toValue: 1,
            duration: 2800,
            useNativeDriver: false,
        }).start();

        const timer = setTimeout(() => {
            router.replace('/(auth)/login');
        }, 3200);

        return () => clearTimeout(timer);
    }, []);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    const containerPaddingTop = Math.max(insets.top + 56, 72);
    const containerPaddingBottom = Math.max(insets.bottom + 36, 72);

    return (
        <View
            style={[
                styles.container,
                { paddingTop: containerPaddingTop, paddingBottom: containerPaddingBottom },
            ]}
        >
            {/* Gradient simulation — bottom half is slightly darker */}
            <View style={styles.gradientBottom} />

            {/* Decorative glow — top-left */}
            <View style={styles.glowTopLeft} />
            {/* Decorative glow — bottom-right */}
            <View style={styles.glowBottomRight} />

            {/* Center Brand Cluster */}
            <View style={styles.brandCluster}>
                {/* Sakhi logo image — 169×118 from CSS */}
                <Animated.View
                    style={[
                        styles.logoWrapper,
                        { transform: [{ scale: logoScale }], opacity: logoOpacity },
                    ]}
                >
                    <Image
                        source={require('../../../assets/sakhi.jpeg')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                </Animated.View>

                {/* Tagline — "Safe Rides, Every Time" */}
                <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
                    Safe Rides, Every Time
                </Animated.Text>
            </View>

            {/* Editorial Spacing Layer — dots + progress + text */}
            <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
                {/* Abstract dot pattern — 6px, gap 8px, opacity 0.2 */}
                <View style={styles.dotsRow}>
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                </View>

                {/* Loading indicator — 48px margin-top from dots */}
                <View style={styles.loadingSection}>
                    {/* Progress track — 4px, #E5E0EF bg */}
                    <View style={styles.progressTrack}>
                        <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
                    </View>
                    {/* "EMPOWERING WOMEN" */}
                    <Text style={styles.empoweringText}>EMPOWERING WOMEN</Text>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0FF',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 32,
        overflow: 'hidden',
    },
    // Simulate linear-gradient bottom portion
    gradientBottom: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: height * 0.5,
        backgroundColor: '#EDE9FE',
        opacity: 0.6,
    },
    // Decorative glow — top left
    glowTopLeft: {
        position: 'absolute',
        left: '-10%',
        top: '-10%',
        width: width * 0.66,
        height: width * 0.66,
        borderRadius: 9999,
        backgroundColor: 'rgba(190,163,216,0.05)',
    },
    // Decorative glow — bottom right
    glowBottomRight: {
        position: 'absolute',
        right: '-10%',
        bottom: '5%',
        width: width * 0.82,
        height: width * 0.82,
        borderRadius: 9999,
        backgroundColor: 'rgba(103, 75, 181, 0.1)',
    },
    brandCluster: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Logo: 169×118 from CSS
    logoImage: {
        width: 169,
        height: 118,
    },
    // Tagline: Inter 300, 18px, #C0A6D6, letter-spacing 0.45
    tagline: {
        fontSize: 18,
        fontWeight: '300',
        color: '#C0A6D6',
        letterSpacing: 0.45,
        lineHeight: 28,
        textAlign: 'center',
        marginTop: 32,
    },
    footer: {
        alignItems: 'center',
        width: 200,
        maxWidth: 200,
    },
    // Dots: 6px, #C0A6D6, gap 8px, opacity 0.2
    dotsRow: {
        flexDirection: 'row',
        gap: 8,
        opacity: 0.2,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 9999,
        backgroundColor: '#C0A6D6',
    },
    // 48px gap between dots and loading indicator
    loadingSection: {
        width: 200,
        marginTop: 48,
        gap: 16,
        alignItems: 'center',
    },
    // Progress track: 4px, #E5E0EF bg
    progressTrack: {
        width: 200,
        height: 4,
        backgroundColor: '#E5E0EF',
        borderRadius: 9999,
        overflow: 'hidden',
    },
    // Progress bar fill: #C0A6D6
    progressBar: {
        height: '100%',
        backgroundColor: '#C0A6D6',
        borderRadius: 9999,
    },
    // Text: Inter 400, 10px, #7B7487, letter-spacing 2px, uppercase
    empoweringText: {
        fontSize: 10,
        fontWeight: '400',
        color: '#94A3B8',
        letterSpacing: 2,
        lineHeight: 15,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
});
