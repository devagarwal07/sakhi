import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Pressable, Alert, Share
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../src/utils/theme';
import { getWalletDetails } from '../src/api/endpoints';

export default function WalletScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [wallet, setWallet] = useState(null);

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
            Alert.alert('Copied!', `Referral code: ${wallet?.referral_code || 'SAKHI100'}`);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={Colors.primaryContainer} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backArrow}>←</Text>
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
                            <Text style={{ fontSize: 24 }}>🎁</Text>
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

                {/* Transaction History (Mock representation if empty) */}
                <Text style={styles.sectionTitle}>Transaction History</Text>
                <View style={styles.historyCard}>
                    {wallet?.history && wallet.history.length > 0 ? (
                        wallet.history.map((tx, idx) => (
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
                        ))
                    ) : (
                        <View style={styles.emptyHistory}>
                            <Text style={styles.emptyHistoryText}>No transactions yet.</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0FF' },
    centered: { alignItems: 'center', justifyContent: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.surfaceContainer, alignItems: 'center', justifyContent: 'center',
    },
    backArrow: { fontSize: 20, color: Colors.primaryContainer, fontWeight: '700' },
    headerTitle: { ...Typography.titleMedium, color: Colors.onBackground },
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
