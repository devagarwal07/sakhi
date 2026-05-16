import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRide } from '../src/context/RideContext';
import SakhiModal from '../src/components/SakhiModal';
import { Feather } from '@expo/vector-icons';
import { ANDROID_STATUS_BAR_HEIGHT } from '../src/utils/androidUtils';

export default function PaymentSuccessScreen() {
    const router = useRouter();
    const { ride } = useRide();
    const sub = ride.subscription || {};
    const [modal, setModal] = useState(null);

    const insets = useSafeAreaInsets();

    const topInset = Platform.OS === 'ios' ? insets.top : ANDROID_STATUS_BAR_HEIGHT;
    const topNavPaddingTop = topInset + (Platform.OS === 'ios' ? 0 : 8);
    const topNavHeight = topInset + (Platform.OS === 'ios' ? 60 : 56);
    const mainContentPaddingTop = topNavHeight + (Platform.OS === 'ios' ? 16 : 8);

    const price = sub.price || 364;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.topNav, { height: topNavHeight, paddingTop: topNavPaddingTop }]}>
                <TouchableOpacity onPress={() => router.replace('/(tabs)/subscriptions')} style={styles.backBtn}>
                    <Feather name="arrow-left" size={24} color="#BEA3D8" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuBtn} onPress={() => setModal({
                    icon: 'ⓘ',
                    title: 'Options',
                    message: 'What would you like to do?',
                    buttons: [
                        { text: 'Share Receipt', onPress: () => {
                            setModal({
                                icon: '✅',
                                title: 'Shared!',
                                message: 'Receipt link copied to clipboard.',
                                buttons: [{ text: 'OK', onPress: () => setModal(null) }]
                            });
                        }},
                        { text: 'View Subscriptions', onPress: () => { setModal(null); router.replace('/(tabs)/subscriptions'); } },
                        { text: 'Cancel', style: 'cancel', onPress: () => setModal(null) },
                    ]
                })}>
                    <Feather name="more-vertical" size={24} color="#BEA3D8" />
                </TouchableOpacity>
            </View>

            <View style={[styles.mainContent, { paddingTop: mainContentPaddingTop }]}>
                {/* Success Indicator */}
                <View style={styles.successIndicatorWrapper}>
                    <View style={styles.successBlur} />
                    <View style={styles.successCircle}>
                        <View style={styles.successInner}>
                            <Feather name="check" size={32} color="#10B981" />
                        </View>
                    </View>
                </View>

                {/* Headings */}
                <View style={styles.headerTitles}>
                    <Text style={styles.title}>Payment Successful!</Text>
                    <Text style={styles.subtitle}>₹{price} has been successfully paid to Sakhi</Text>
                </View>

                {/* Transaction Card */}
                <View style={styles.txCard}>
                    <View style={styles.txRow}>
                        <Text style={styles.txLabel}>TRANSACTION ID</Text>
                        <Text style={styles.txValue}>TXN{Math.floor(Math.random() * 1000000000)}</Text>
                    </View>
                    
                    <View style={styles.txRow}>
                        <Text style={styles.txLabel}>DATE & TIME</Text>
                        <Text style={styles.txValue}>{dateStr} | {timeStr}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.methodRow}>
                        <View style={styles.methodLeft}>
                            <View style={styles.payIconBox}>
                                <Feather name="credit-card" size={12} color="#BEA3D8" />
                            </View>
                            <Text style={styles.methodText}>Paid via UPI</Text>
                        </View>
                        <Feather name="check" size={14} color="#BEA3D8" />
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actionsBox}>
                    <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)/subscriptions')} activeOpacity={0.8}>
                        <Text style={styles.doneText}>Done</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.receiptBtn} activeOpacity={0.8} onPress={() => setModal({
                        icon: '📥',
                        title: 'Download Receipt',
                        message: 'Your receipt has been saved to Downloads.',
                        buttons: [{ text: 'OK', onPress: () => setModal(null) }]
                    })}>
                        <Feather name="download" size={14} color="#BEA3D8" />
                        <Text style={styles.receiptText}>Download Receipt</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <SakhiModal config={modal} onClose={() => setModal(null)} />
        </View>
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
    topNav: {
        position: 'absolute', top: 0, left: 0, right: 0,
        paddingHorizontal: 24,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 10,
    },
    backBtn: { width: 32, height: 32, justifyContent: 'center' },
    backIcon: { fontSize: 24, color: '#BEA3D8' },
    menuBtn: { width: 32, height: 32, alignItems: 'flex-end', justifyContent: 'center' },
    menuIcon: { fontSize: 24, color: '#BEA3D8', fontWeight: 'bold' },

    mainContent: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 24,
    },

    successIndicatorWrapper: {
        width: 96, height: 96,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
        position: 'relative'
    },
    successBlur: {
        position: 'absolute', width: '100%', height: '100%',
        backgroundColor: '#ECFDF5',
        opacity: 0.4, borderRadius: 48,
        shadowColor: '#10B981', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 20,
    },
    successCircle: {
        width: 96, height: 96, borderRadius: 48,
        backgroundColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
    },
    successInner: {
        width: 80, height: 80, borderRadius: 40,
        borderWidth: 4, borderColor: '#ECFDF5',
        alignItems: 'center', justifyContent: 'center',
    },
    tickIcon: { color: '#10B981', fontSize: 32, fontWeight: 'bold' },

    headerTitles: { alignItems: 'center', marginBottom: 40, width: '100%' },
    title: { fontSize: 24, fontWeight: '800', color: '#1E1B2E', marginBottom: 8, letterSpacing: -0.6 },
    subtitle: { fontSize: 16, fontWeight: '400', color: '#6B7280', textAlign: 'center', lineHeight: 26, paddingHorizontal: 16 },

    txCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16, padding: 24,
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 6,
        marginBottom: 40,
    },
    txRow: { gap: 4, marginBottom: 20 },
    txLabel: { fontSize: 10, fontWeight: '500', color: '#1E1B2E', letterSpacing: 1, textTransform: 'uppercase' },
    txValue: { fontSize: 14, fontWeight: '600', color: '#1E1B2E' },

    divider: { height: 1, backgroundColor: '#E5E0EF', marginBottom: 16 },

    methodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    methodLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    payIconBox: { width: 40, height: 24, backgroundColor: '#EDE9FA', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(204, 195, 216, 0.2)', alignItems: 'center', justifyContent: 'center' },
    payIcon: { fontSize: 12 },
    methodText: { fontSize: 14, fontWeight: '500', color: '#1E1B2E' },
    verifiedIcon: { fontSize: 14, color: '#BEA3D8' },

    actionsBox: { width: '100%', alignItems: 'center', gap: 24 },
    doneBtn: {
        width: '100%', height: 56,
        backgroundColor: '#A36CEC',
        borderRadius: 12, alignItems: 'center', justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 32, elevation: 8,
    },
    doneText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

    receiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    receiptIcon: { fontSize: 14, color: '#BEA3D8' },
    receiptText: { fontSize: 14, fontWeight: '600', color: '#BEA3D8' },
});
