import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Animated, Easing, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';
import { useRide } from '../src/context/RideContext';
import { useSocket } from '../src/context/SocketContext';
import { cancelRide } from '../src/api/endpoints';

export default function SearchingScreen() {
    const router = useRouter();
    const { ride, startRide, clearRide } = useRide();
    const { on, off } = useSocket();

    // Radar pulse rings
    const ring1 = useRef(new Animated.Value(0)).current;
    const ring2 = useRef(new Animated.Value(0)).current;
    const ring3 = useRef(new Animated.Value(0)).current;

    const pulse = (anim, delay) =>
        Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(anim, {
                    toValue: 1, duration: 2000,
                    easing: Easing.out(Easing.ease), useNativeDriver: true,
                }),
                Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
            ]),
        );

    useEffect(() => {
        pulse(ring1, 0).start();
        pulse(ring2, 600).start();
        pulse(ring3, 1200).start();

        const handleAssigned = (payload) => {
            startRide(payload.rideId, payload.driver, payload.fare);
            router.replace('/active-ride');
        };

        const handleNoDrivers = () => {
            Alert.alert(
                'No Drivers Available',
                'We couldn\'t find a driver nearby. Please try again in a moment.',
                [{
                    text: 'OK', onPress: () => {
                        clearRide();
                        router.replace('/(tabs)');
                    },
                }],
            );
        };

        on('ride_assigned', handleAssigned);
        on('ride:no_drivers', handleNoDrivers);

        return () => {
            off('ride_assigned', handleAssigned);
            off('ride:no_drivers', handleNoDrivers);
        };
    }, []);

    const handleCancel = () => {
        Alert.alert('Cancel Search', 'Stop looking for a driver?', [
            { text: 'Keep Searching', style: 'cancel' },
            {
                text: 'Cancel',
                style: 'destructive',
                onPress: async () => {
                    try {
                        if (ride.rideId) await cancelRide(ride.rideId);
                    } catch (_) { }
                    clearRide();
                    router.replace('/(tabs)');
                },
            },
        ]);
    };

    const ringStyle = (anim) => ({
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.5] }) }],
        opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.3, 0] }),
    });

    return (
        <View style={styles.container}>
            <View style={styles.glowBg} />

            {/* Radar animation */}
            <View style={styles.radarWrapper}>
                <Animated.View style={[styles.radarRing, ringStyle(ring1)]} />
                <Animated.View style={[styles.radarRing, ringStyle(ring2)]} />
                <Animated.View style={[styles.radarRing, ringStyle(ring3)]} />
                <View style={styles.radarCenter}>
                    <Text style={styles.radarEmoji}>🛺</Text>
                </View>
            </View>

            <Text style={styles.title}>Finding Your Driver…</Text>
            <Text style={styles.subtitle}>We're matching you with the nearest verified Sakhi driver</Text>

            {/* Trip summary chip */}
            {ride.pickup && ride.dropoff && (
                <View style={styles.tripChip}>
                    <Text style={styles.tripChipText} numberOfLines={1}>
                        📍 {ride.pickup.address}  →  🏁 {ride.dropoff.address}
                    </Text>
                </View>
            )}

            {/* Animated dots */}
            <View style={styles.dotsRow}>
                {[0, 1, 2].map((i) => {
                    const dotAnim = useRef(new Animated.Value(0.4)).current;
                    useEffect(() => {
                        Animated.loop(
                            Animated.sequence([
                                Animated.delay(i * 250),
                                Animated.timing(dotAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                                Animated.timing(dotAnim, { toValue: 0.4, duration: 500, useNativeDriver: true }),
                            ]),
                        ).start();
                    }, []);
                    return (
                        <Animated.View key={i} style={[styles.dot, { opacity: dotAnim }]} />
                    );
                })}
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Text style={styles.cancelBtnText}>Cancel Search</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1, backgroundColor: '#F5F0FF',
        alignItems: 'center', justifyContent: 'center', padding: 32,
    },
    glowBg: {
        position: 'absolute', alignSelf: 'center', top: '20%',
        width: 300, height: 300, borderRadius: 150,
        backgroundColor: 'rgba(124,58,237,0.07)',
    },
    radarWrapper: {
        width: 200, height: 200, alignItems: 'center',
        justifyContent: 'center', marginBottom: 36,
    },
    radarRing: {
        position: 'absolute', width: 120, height: 120, borderRadius: 60,
        borderWidth: 2, borderColor: Colors.primaryContainer,
    },
    radarCenter: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: Colors.primaryFixed,
        alignItems: 'center', justifyContent: 'center',
        ...Shadows.editorial,
    },
    radarEmoji: { fontSize: 36 },
    title: {
        ...Typography.headlineSmall, color: Colors.onBackground,
        textAlign: 'center', marginBottom: 10,
    },
    subtitle: {
        ...Typography.bodyMedium, color: Colors.onSurfaceVariant,
        textAlign: 'center', lineHeight: 22, marginBottom: 24,
    },
    tripChip: {
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: BorderRadius.full, paddingHorizontal: 16, paddingVertical: 10,
        maxWidth: '100%', marginBottom: 28, ...Shadows.card,
        borderWidth: 1, borderColor: Colors.outlineVariant,
    },
    tripChipText: { fontSize: 12, color: Colors.onSurfaceVariant, fontWeight: '500' },
    dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 40 },
    dot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: Colors.primaryContainer,
    },
    cancelBtn: {
        borderWidth: 1.5, borderColor: Colors.outlineVariant,
        borderRadius: BorderRadius.md, paddingVertical: 14, paddingHorizontal: 32,
    },
    cancelBtnText: { color: Colors.onSurfaceVariant, fontWeight: '600', fontSize: 15 },
});
