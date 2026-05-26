import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Pressable, Share
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';
import { getWalletDetails } from '../src/api/endpoints';
import SakhiModal from '../src/components/SakhiModal';
import { Feather } from '@expo/vector-icons';

export default function WalletScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [wallet, setWallet] = useState(null);
    const [modal, setModal] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all');

    useEffect(() => {
        getWalletDetails()
            .then(({ data }) => setWallet(data.wallet || { balance: 0, referral_code: 'SAKHI100', history: [] }))
            .catch(() => {
                // Fallback or handle error
                setWallet({ balance: 0, referral_code: 'SAKHI100', history: [] });
            })
            .finally(() => setLoading(false));
    }, []);

    const copyReferral = async () => {
        try {
            await Share.share({ message: `Use my referral code ${wallet?.referral_code || 'SAKHI100'} on Sakhi and get ₹50 off your first ride!` });
        } catch (e) {
            setModal({
                icon: '✅',
                title: 'Copied!',
                message: `Referral code: ${wallet?.referral_code || 'SAKHI100'} copied to clipboard.`,
                buttons: [{ text: 'OK', onPress: () => setModal(null) }]
            });
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={Colors.primaryContainer} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
                    <Feather name="arrow-left" size={20} color="#BEA3D8" />
                </Pressable>
                <Text style={styles.headerTitle}>Wallet & Referrals</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Wallet Balance */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Available Balance</Text>
                    <Text style={styles.balanceAmount}>₹{wallet?.balance?.toFixed(2) || '0.00'}</Text>
                    <Text style={styles.balanceSub}>Can be applied to your next rides</Text>
                </View>

                {/* Referrals Section */}
                <Text style={styles.sectionTitle}>Refer & Earn</Text>
                <View style={styles.referralCard}>
                    <View style={styles.referralIconRow}>
                        <View style={styles.giftIconBg}>
                            <Feather name="gift" size={24} color="#BEA3D8" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.referralTitle}>Give ₹50, Get ₹50</Text>
                            <Text style={styles.referralSub}>
                                Share your code with friends. They get a discount on their first ride, and you get ₹50 in your wallet.
                            </Text>
                        </View>
                    </View>
                    <View style={styles.codeRow}>
                        <Text style={styles.codeText}>{wallet?.referral_code || 'SAKHINEW'}</Text>
                        <TouchableOpacity style={styles.copyBtn} onPress={copyReferral}>
                            <Text style={styles.copyBtnText}>Copy</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Transaction History */}
                <Text style={styles.sectionTitle}>Transaction History</Text>

                {/* Filter Selector */}
                <View style={styles.filterRow}>
                    {[
                        { key: 'all', label: 'All' },
                        { key: 'rides', label: 'Rides' },
                        { key: 'rewards', label: 'Rewards' }
                    ].map((f) => (
                        <TouchableOpacity
                            key={f.key}
                            style={[
                                styles.filterPill,
                                activeFilter === f.key && styles.filterPillActive
                            ]}
                            onPress={() => setActiveFilter(f.key)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.filterPillText,
                                    activeFilter === f.key && styles.filterPillTextActive
                                ]}
                            >
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.historyCard}>
                    {(() => {
                        const filteredHistory = (wallet?.history || []).filter(tx => {
                            if (activeFilter === 'rides') return tx.type === 'debit';
                            if (activeFilter === 'rewards') return tx.type === 'credit';
                            return true;
                        });

                        if (filteredHistory.length > 0) {
                            return filteredHistory.map((tx, idx) => (
                                <View key={idx}>
                                    {idx > 0 && <View style={styles.divider} />}
                                    <View style={styles.txRow}>
                                        <View style={styles.txInfo}>
                                            <Text style={styles.txTitle}>{tx.description}</Text>
                                            <Text style={styles.txDate}>{tx.date}</Text>
                                        </View>
                                        <Text style={[styles.txAmount, tx.type === 'credit' ? styles.txCredit : styles.txDebit]}>
                                            {tx.type === 'credit' ? '+' : '-'}₹{Math.abs(tx.amount).toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            ));
                        } else {
                            return (
                                <View style={styles.emptyHistory}>
                                    <Text style={styles.emptyHistoryText}>
                                        {activeFilter === 'rides' ? 'No rides transactions.' : activeFilter === 'rewards' ? 'No rewards transactions.' : 'No transactions yet.'}
                                    </Text>
                                </View>
                            );
                        }
                    })()}
                </View>
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
    centered: { alignItems: 'center', justifyContent: 'center' },
    filterRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
        marginTop: 4,
    },
    filterPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.surfaceContainerLowest,
        borderWidth: 1.5,
        borderColor: Colors.outlineVariant,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterPillActive: {
        backgroundColor: Colors.primaryContainer,
        borderColor: Colors.primaryContainer,
    },
    filterPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.outline,
    },
    filterPillTextActive: {
        color: '#FFFFFF',
    },
    
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.surfaceContainer, alignItems: 'center', justifyContent: 'center',
    },
    backArrow: { fontSize: 20, color: Colors.primaryContainer, fontWeight: '700' },
    
    content: { paddingHorizontal: 20, paddingBottom: 48, gap: 16 },
    balanceCard: {
        backgroundColor: Colors.primaryContainer,
        borderRadius: 20, padding: 24, alignItems: 'center',
        ...Shadows.editorial,
    },
    balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    balanceAmount: { fontSize: 42, color: '#fff', fontWeight: '800', marginBottom: 6 },
    balanceSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 12 },
    referralCard: {
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: 16, padding: 16, ...Shadows.card,
    },
    referralIconRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
    giftIconBg: {
        width: 48, height: 48, borderRadius: 12, backgroundColor: '#fdf4ff',
        alignItems: 'center', justifyContent: 'center',
    },
    referralTitle: { fontSize: 16, fontWeight: '700', color: Colors.onBackground, marginBottom: 4 },
    referralSub: { fontSize: 13, color: Colors.onSurfaceVariant, lineHeight: 18 },
    codeRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.surfaceContainerLow, borderRadius: 12,
        borderWidth: 1, borderColor: '#f0abfc', borderStyle: 'dashed',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    codeText: { fontSize: 18, fontWeight: '800', color: Colors.primaryContainer, letterSpacing: 2 },
    copyBtn: { backgroundColor: Colors.primaryFixed, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
    copyBtnText: { color: Colors.primaryContainer, fontWeight: '700', fontSize: 13 },
    historyCard: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: 16, padding: 16, ...Shadows.card },
    emptyHistory: { paddingVertical: 20, alignItems: 'center' },
    emptyHistoryText: { fontSize: 13, color: Colors.outline },
    txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    divider: { height: 1, backgroundColor: Colors.outlineVariant },
    txInfo: { flex: 1 },
    txTitle: { fontSize: 15, fontWeight: '600', color: Colors.onSurface },
    txDate: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 4 },
    txAmount: { fontSize: 16, fontWeight: '700' },
    txCredit: { color: Colors.success },
    txDebit: { color: Colors.onBackground },
});
