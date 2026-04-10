import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Share,
    Platform, ScrollView, Clipboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { ANDROID_STATUS_BAR_HEIGHT } from '../src/utils/androidUtils';

const REFERRAL_REWARDS = [
    { icon: '🎉', title: 'You Get', value: '₹50 off', desc: 'Your next ride after friend books their first ride' },
    { icon: '🎁', title: 'Friend Gets', value: '₹30 off', desc: 'Their first ride with Sakhi' },
];

const HOW_IT_WORKS = [
    { step: '1', text: 'Share your unique referral code with a friend' },
    { step: '2', text: 'Friend signs up using your code and books their first ride' },
    { step: '3', text: 'You both get rewards automatically applied' },
];

export default function ReferralsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const topInset = Platform.OS === 'ios' ? insets.top : ANDROID_STATUS_BAR_HEIGHT;

    const referralCode = user?.referral_code ?? `SAKHI${(user?.phone ?? '').slice(-4).padStart(4, '0')}`;
    const [copied, setCopied] = useState(false);

    const copyCode = () => {
        Clipboard.setString(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareCode = async () => {
        try {
            await Share.share({
                message: `Join Sakhi — India's safest women-only ride service! Use my code **${referralCode}** when you sign up and get ₹30 off your first ride. Download: https://sakhi.app`,
                title: 'Ride safe with Sakhi 🛺',
            });
        } catch {}
    };

    return (
        <View style={[s.root, { paddingTop: topInset }]}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity
                    style={s.backBtn}
                    onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')}
                >
                    <Text style={s.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={s.headerTitle}>Referrals & Rewards</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                {/* Hero Banner */}
                <View style={s.heroBanner}>
                    <Text style={s.heroEmoji}>💜</Text>
                    <Text style={s.heroTitle}>Invite a Sister,{'\n'}Earn Together</Text>
                    <Text style={s.heroSub}>Share the Sakhi experience and get rewarded when your friend joins</Text>
                </View>

                {/* Your Referral Code */}
                <View style={s.codeCard}>
                    <Text style={s.codeLabel}>YOUR REFERRAL CODE</Text>
                    <View style={s.codeRow}>
                        <Text style={s.codeText}>{referralCode}</Text>
                        <TouchableOpacity style={s.copyBtn} onPress={copyCode} activeOpacity={0.8}>
                            <Text style={s.copyBtnText}>{copied ? '✓ Copied' : 'Copy'}</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={s.codeSub}>Share this code with friends & family</Text>
                </View>

                {/* Reward tiles */}
                <Text style={s.sectionLabel}>WHAT YOU GET</Text>
                <View style={s.rewardRow}>
                    {REFERRAL_REWARDS.map((r, i) => (
                        <View key={i} style={s.rewardCard}>
                            <Text style={s.rewardEmoji}>{r.icon}</Text>
                            <Text style={s.rewardTitle}>{r.title}</Text>
                            <Text style={s.rewardValue}>{r.value}</Text>
                            <Text style={s.rewardDesc}>{r.desc}</Text>
                        </View>
                    ))}
                </View>

                {/* Stats row */}
                <View style={s.statsCard}>
                    <View style={s.statItem}>
                        <Text style={s.statValue}>0</Text>
                        <Text style={s.statLabel}>Friends Invited</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.statItem}>
                        <Text style={s.statValue}>₹0</Text>
                        <Text style={s.statLabel}>Rewards Earned</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.statItem}>
                        <Text style={s.statValue}>0</Text>
                        <Text style={s.statLabel}>Pending</Text>
                    </View>
                </View>

                {/* How it works */}
                <Text style={s.sectionLabel}>HOW IT WORKS</Text>
                <View style={s.howCard}>
                    {HOW_IT_WORKS.map((item, i) => (
                        <View key={i} style={[s.howRow, i < HOW_IT_WORKS.length - 1 && s.howRowBorder]}>
                            <View style={s.howStep}>
                                <Text style={s.howStepText}>{item.step}</Text>
                            </View>
                            <Text style={s.howText}>{item.text}</Text>
                        </View>
                    ))}
                </View>

                {/* Share CTA */}
                <TouchableOpacity style={s.shareCta} onPress={shareCode} activeOpacity={0.88}>
                    <Text style={s.shareCtaText}>📤  Invite Friends Now</Text>
                </TouchableOpacity>

                <Text style={s.termsNote}>
                    * Rewards are applied after your friend completes their first Sakhi ride. Valid for new users only.
                </Text>

            </ScrollView>
        </View>
    );
}

const PURPLE = '#BEA3D8';
const DARK   = '#1E1B2E';
const MID    = '#64748B';
const WHITE  = '#FFFFFF';
const BG     = '#F5F0FF';

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: BG },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 12,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center',
        shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    },
    backArrow: { fontSize: 20, color: PURPLE, fontWeight: '700' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: DARK, letterSpacing: -0.4 },

    scroll: { paddingHorizontal: 20, paddingBottom: 48 },

    // Hero
    heroBanner: {
        backgroundColor: DARK, borderRadius: 20, padding: 28,
        alignItems: 'center', marginBottom: 20, marginTop: 4,
        shadowColor: 'rgba(30,27,46,1)', shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.18, shadowRadius: 32, elevation: 8,
    },
    heroEmoji: { fontSize: 44, marginBottom: 12 },
    heroTitle: { fontSize: 24, fontWeight: '900', color: WHITE, textAlign: 'center', letterSpacing: -0.6, lineHeight: 32, marginBottom: 10 },
    heroSub:   { fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 20 },

    // Referral Code Card
    codeCard: {
        backgroundColor: WHITE, borderRadius: 16, padding: 20,
        marginBottom: 24,
        shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
    },
    codeLabel: { fontSize: 10, fontWeight: '700', color: MID, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 },
    codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    codeText: { flex: 1, fontSize: 28, fontWeight: '900', color: DARK, letterSpacing: 2 },
    copyBtn: {
        backgroundColor: BG, borderRadius: 10,
        paddingHorizontal: 16, paddingVertical: 8,
        borderWidth: 1.5, borderColor: PURPLE,
    },
    copyBtnText: { fontSize: 13, fontWeight: '700', color: PURPLE },
    codeSub: { fontSize: 12, fontWeight: '400', color: MID },

    // Reward cards
    sectionLabel: {
        fontSize: 11, fontWeight: '700', color: '#94A3B8',
        letterSpacing: 1.2, textTransform: 'uppercase',
        marginBottom: 14, marginTop: 4,
    },
    rewardRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    rewardCard: {
        flex: 1, backgroundColor: WHITE, borderRadius: 16, padding: 16, alignItems: 'center',
        shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    },
    rewardEmoji: { fontSize: 28, marginBottom: 8 },
    rewardTitle: { fontSize: 10, fontWeight: '700', color: MID, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
    rewardValue: { fontSize: 22, fontWeight: '900', color: DARK, letterSpacing: -0.5, marginBottom: 4 },
    rewardDesc:  { fontSize: 11, fontWeight: '400', color: MID, textAlign: 'center', lineHeight: 16 },

    // Stats
    statsCard: {
        backgroundColor: WHITE, borderRadius: 16, flexDirection: 'row',
        paddingVertical: 20, marginBottom: 24,
        shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, backgroundColor: '#F1F5F9' },
    statValue: { fontSize: 22, fontWeight: '900', color: DARK, letterSpacing: -0.5, marginBottom: 4 },
    statLabel: { fontSize: 11, fontWeight: '500', color: MID },

    // How it works
    howCard: {
        backgroundColor: WHITE, borderRadius: 16, marginBottom: 24, overflow: 'hidden',
        shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    },
    howRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
    howRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    howStep: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center',
    },
    howStepText: { fontSize: 14, fontWeight: '800', color: WHITE },
    howText: { flex: 1, fontSize: 14, fontWeight: '500', color: DARK, lineHeight: 21 },

    // Share CTA
    shareCta: {
        backgroundColor: PURPLE, borderRadius: 16, height: 60,
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2, shadowRadius: 20, elevation: 6,
    },
    shareCtaText: { fontSize: 16, fontWeight: '700', color: WHITE, letterSpacing: 0.3 },

    // Terms
    termsNote: {
        fontSize: 11, fontWeight: '400', color: '#94A3B8',
        textAlign: 'center', lineHeight: 17, paddingHorizontal: 12,
    },
});
