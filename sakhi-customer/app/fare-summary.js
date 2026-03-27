import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, Modal, TextInput, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';
import { useRide } from '../src/context/RideContext';
import { getRideDetails, rateDriver } from '../src/api/endpoints';

export default function FareSummaryScreen() {
    const router = useRouter();
    const { ride, clearRide } = useRide();
    const [rideDetails, setRideDetails] = useState(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submittingRating, setSubmittingRating] = useState(false);
    const checkAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(60)).current;

    useEffect(() => {
        // Entrance animations
        Animated.parallel([
            Animated.spring(checkAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
        ]).start();

        // Fetch final ride details
        if (ride.rideId) {
            getRideDetails(ride.rideId)
                .then(({ data }) => setRideDetails(data.ride || data))
                .catch(() => { });
        }

        // Show rating after 1.5s
        const t = setTimeout(() => setShowRatingModal(true), 1500);
        return () => clearTimeout(t);
    }, []);

    const handleRatingSubmit = async () => {
        if (rating === 0) return;
        setSubmittingRating(true);
        try {
            await rateDriver(ride.rideId, rating, comment);
        } catch (_) { }
        finally {
            setSubmittingRating(false);
            setShowRatingModal(false);
            clearRide();
            router.replace('/(tabs)');
        }
    };

    const fare = rideDetails?.fare || ride.fare || {};

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Success checkmark */}
                <Animated.View
                    style={[styles.checkCircle, { transform: [{ scale: checkAnim }] }]}
                >
                    <Text style={styles.checkEmoji}>✅</Text>
                </Animated.View>

                <Text style={styles.title}>Trip Completed!</Text>
                <Text style={styles.subtitle}>
                    {ride.dropoff?.address || 'Your destination'} — {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>

                {/* Fare Breakdown Card */}
                <Animated.View
                    style={[styles.fareCard, { transform: [{ translateY: slideAnim }] }]}
                >
                    <Text style={styles.fareCardTitle}>Fare Breakdown</Text>

                    {[
                        { label: 'Base Fare', value: fare.base },
                        { label: 'Distance Charge', value: fare.distance },
                        { label: 'Waiting Charge', value: fare.waiting },
                        { label: 'Promo Discount', value: fare.promo, isDiscount: true },
                    ].map((item, i) =>
                        item.value != null ? (
                            <View key={i} style={styles.fareRow}>
                                <Text style={styles.fareLabel}>{item.label}</Text>
                                <Text style={[styles.fareValue, item.isDiscount && styles.fareDiscount]}>
                                    {item.isDiscount ? '−' : ''}₹{(item.value || 0).toFixed(2)}
                                </Text>
                            </View>
                        ) : null,
                    )}

                    <View style={styles.fareDivider} />
                    <View style={styles.fareTotalRow}>
                        <Text style={styles.fareTotalLabel}>Total</Text>
                        <Text style={styles.fareTotalValue}>₹{(fare.total || 0).toFixed(2)}</Text>
                    </View>

                    <View style={styles.paymentBadge}>
                        <Text style={styles.paymentBadgeIcon}>💵</Text>
                        <Text style={styles.paymentBadgeText}>
                            {rideDetails?.payment_method === 'online' ? 'Paid Online' : 'Pay Driver in Cash'}
                        </Text>
                    </View>
                </Animated.View>

                {/* Route summary */}
                <View style={styles.routeCard}>
                    <View style={styles.routeRow}>
                        <View style={[styles.routeDot, { backgroundColor: '#16a34a' }]} />
                        <Text style={styles.routeAddr} numberOfLines={1}>{ride.pickup?.address || 'Pickup'}</Text>
                    </View>
                    <View style={styles.routeLine} />
                    <View style={styles.routeRow}>
                        <View style={[styles.routeDot, { backgroundColor: Colors.primaryContainer }]} />
                        <Text style={styles.routeAddr} numberOfLines={1}>{ride.dropoff?.address || 'Dropoff'}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.homeBtn}
                    onPress={() => {
                        clearRide();
                        router.replace('/(tabs)');
                    }}
                >
                    <Text style={styles.homeBtnText}>Back to Home</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Rating Modal */}
            <Modal
                visible={showRatingModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowRatingModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.ratingSheet}>
                        <Text style={styles.ratingTitle}>Rate Your Driver</Text>
                        {ride.driver && (
                            <Text style={styles.ratingDriverName}>{ride.driver.name}</Text>
                        )}

                        {/* Stars */}
                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                    <Text style={[styles.star, rating >= star && styles.starActive]}>★</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            style={styles.commentInput}
                            placeholder="Leave a comment (optional)"
                            placeholderTextColor={Colors.outline}
                            value={comment}
                            onChangeText={setComment}
                            multiline
                            numberOfLines={3}
                        />

                        <TouchableOpacity
                            style={[styles.ratingSubmitBtn, rating === 0 && { opacity: 0.5 }]}
                            onPress={handleRatingSubmit}
                            disabled={rating === 0 || submittingRating}
                        >
                            <Text style={styles.ratingSubmitText}>
                                {submittingRating ? 'Submitting…' : 'Submit Rating'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.skipBtn}
                            onPress={() => {
                                setShowRatingModal(false);
                                clearRide();
                                router.replace('/(tabs)');
                            }}
                        >
                            <Text style={styles.skipBtnText}>Skip</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0FF' },
    content: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 },
    checkCircle: {
        width: 96, height: 96, borderRadius: 48,
        backgroundColor: Colors.primaryFixed,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20, ...Shadows.editorial,
    },
    checkEmoji: { fontSize: 48 },
    title: { ...Typography.headlineSmall, color: Colors.onBackground, marginBottom: 4 },
    subtitle: { ...Typography.bodyMedium, color: Colors.onSurfaceVariant, marginBottom: 28 },
    fareCard: {
        width: '100%', backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 20, padding: 20, marginBottom: 16, ...Shadows.editorial,
    },
    fareCardTitle: { ...Typography.titleSmall, color: Colors.onBackground, marginBottom: 16 },
    fareRow: {
        flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10,
    },
    fareLabel: { ...Typography.bodyMedium, color: Colors.onSurfaceVariant },
    fareValue: { ...Typography.bodyMedium, color: Colors.onBackground, fontWeight: '600' },
    fareDiscount: { color: Colors.success },
    fareDivider: { height: 1, backgroundColor: Colors.outlineVariant, marginVertical: 12 },
    fareTotalRow: {
        flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16,
    },
    fareTotalLabel: { ...Typography.titleMedium, color: Colors.onBackground },
    fareTotalValue: {
        fontSize: 22, fontWeight: '800', color: Colors.primaryContainer,
    },
    paymentBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: Colors.surfaceContainerLow,
        borderRadius: BorderRadius.full, paddingHorizontal: 14, paddingVertical: 8,
        alignSelf: 'center',
    },
    paymentBadgeIcon: { fontSize: 14 },
    paymentBadgeText: { fontSize: 13, color: Colors.onSurfaceVariant, fontWeight: '500' },
    routeCard: {
        width: '100%', backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 16, padding: 16, marginBottom: 20, ...Shadows.card,
    },
    routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    routeDot: { width: 10, height: 10, borderRadius: 5 },
    routeLine: {
        width: 2, height: 16, backgroundColor: Colors.outlineVariant,
        marginLeft: 4, marginVertical: 2,
    },
    routeAddr: { flex: 1, fontSize: 13, color: Colors.onSurface, fontWeight: '500' },
    homeBtn: {
        width: '100%', backgroundColor: Colors.primaryContainer,
        borderRadius: BorderRadius.md, paddingVertical: 16,
        alignItems: 'center', ...Shadows.editorial,
    },
    homeBtnText: { color: Colors.onPrimary, fontSize: 16, fontWeight: '700' },
    // Rating modal
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(28,26,37,0.6)',
        justifyContent: 'flex-end',
    },
    ratingSheet: {
        backgroundColor: Colors.surfaceContainerLowest,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 28, paddingBottom: 40, alignItems: 'center',
        ...Shadows.editorial,
    },
    ratingTitle: { ...Typography.headlineSmall, color: Colors.onBackground, marginBottom: 4 },
    ratingDriverName: { ...Typography.bodyMedium, color: Colors.onSurfaceVariant, marginBottom: 20 },
    starsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    star: { fontSize: 40, color: Colors.outlineVariant },
    starActive: { color: '#f59e0b' },
    commentInput: {
        width: '100%', borderWidth: 1.5, borderColor: Colors.outlineVariant,
        borderRadius: 12, padding: 14, fontSize: 14, color: Colors.onSurface,
        backgroundColor: Colors.surfaceContainerLow,
        minHeight: 80, textAlignVertical: 'top', marginBottom: 16,
    },
    ratingSubmitBtn: {
        width: '100%', backgroundColor: Colors.primaryContainer,
        borderRadius: BorderRadius.md, paddingVertical: 14,
        alignItems: 'center', marginBottom: 10, ...Shadows.editorial,
    },
    ratingSubmitText: { color: Colors.onPrimary, fontSize: 16, fontWeight: '700' },
    skipBtn: { paddingVertical: 8 },
    skipBtnText: { color: Colors.outline, fontSize: 14, fontWeight: '500' },
});
