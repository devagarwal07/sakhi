import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Share,
    ScrollView, Clipboard, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

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
        <SafeAreaView style={s.root} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor={BG} />
            {/* Header — matches About/Wallet screen pattern exactly */}
            <View style={s.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        style={s.iconBtn}
                        onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')}
                    >
                        <Text style={s.headerIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Referrals & Rewards</Text>
                </View>
                <View style={s.iconBtn} />
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                {/* Hero Banner — lavender card matching app's missionCard style */}
                <View style={s.heroBanner}>
                    <View style={s.heroIconWrap}>
                        <Text style={s.heroEmoji}>💜</Text>
                    </View>
                    <Text style={s.heroLabel}>OUR REFERRAL PROGRAM</Text>
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
                            <View style={s.rewardIconWrap}>
                                <Text style={s.rewardEmoji}>{r.icon}</Text>
                            </View>
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
        </SafeAreaView>
    );
}

const PURPLE         = '#BEA3D8';    // Colors.primary
const DARK           = '#1E1B2E';    // Colors.onBackground
const MID            = '#64748B';    // Colors.onSurfaceVariant
const WHITE          = '#FFFFFF';    // Colors.surfaceContainerLowest
const BG             = '#F5F0FF';    // Colors.background
const LAVENDER       = '#E8DDFF';    // matches About's missionCard bg
const LAVENDER_LABEL = '#21005E';    // matches About's missionLabel color

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: BG },

    // ── Header — exact match to About/Wallet screens ──────────────────────
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, height: 64,
        backgroundColor: BG, zIndex: 10,
    },
    iconBtn: {
        width: 32, height: 32,
        justifyContent: 'center', alignItems: 'flex-start',
        backgroundColor: 'transparent',
    },
    headerIcon: { fontSize: 24, color: PURPLE, fontWeight: 'bold' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: DARK, letterSpacing: -0.5, marginLeft: 16 },

    scroll: { paddingHorizontal: 20, paddingBottom: 48, paddingTop: 8 },

    // ── Hero Banner — lavender card matching About's missionCard ──────────
    heroBanner: {
        backgroundColor: LAVENDER,
        borderRadius: 20, padding: 24,
        alignItems: 'center', marginBottom: 20,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.04, shadowRadius: 32, elevation: 2,
    },
    heroIconWrap: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.55)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
    },
    heroEmoji: { fontSize: 36 },
    heroLabel: {
        fontSize: 11, fontWeight: '700', color: LAVENDER_LABEL,
        letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8,
    },
    heroTitle: { fontSize: 24, fontWeight: '800', color: DARK, textAlign: 'center', letterSpacing: -0.5, lineHeight: 32, marginBottom: 10 },
    heroSub:   { fontSize: 13, fontWeight: '400', color: MID, textAlign: 'center', lineHeight: 20 },

    // ── Referral Code Card ────────────────────────────────────────────────
    codeCard: {
        backgroundColor: WHITE, borderRadius: 16, padding: 20,
        marginBottom: 24,
        shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04, shadowRadius: 12, elevation: 4,
    },
    codeLabel: { fontSize: 10, fontWeight: '700', color: MID, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 },
    codeRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8,
        backgroundColor: BG, borderRadius: 12,
        borderWidth: 1, borderColor: PURPLE, borderStyle: 'dashed',
        paddingHorizontal: 16, paddingVertical: 10,
    },
    codeText: { flex: 1, fontSize: 24, fontWeight: '900', color: DARK, letterSpacing: 2 },
    copyBtn: {
        backgroundColor: BG, borderRadius: 10,
        paddingHorizontal: 16, paddingVertical: 8,
        borderWidth: 1.5, borderColor: PURPLE,
    },
    copyBtnText: { fontSize: 13, fontWeight: '700', color: PURPLE },
    codeSub: { fontSize: 12, fontWeight: '400', color: MID, marginTop: 8 },

    // ── Section label ─────────────────────────────────────────────────────
    sectionLabel: {
        fontSize: 11, fontWeight: '700', color: '#94A3B8',
        letterSpacing: 1.2, textTransform: 'uppercase',
        marginBottom: 14, marginTop: 4,
    },
    // ── Reward cards ──────────────────────────────────────────────────────
    rewardRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    rewardCard: {
        flex: 1, backgroundColor: WHITE, borderRadius: 16, padding: 16, alignItems: 'center',
        shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04, shadowRadius: 12, elevation: 3,
    },
    rewardIconWrap: {
        width: 48, height: 48, borderRadius: 12,
        backgroundColor: '#EDE9FA', alignItems: 'center', justifyContent: 'center',
        marginBottom: 10,
    },
    rewardEmoji: { fontSize: 24 },
    rewardTitle: { fontSize: 10, fontWeight: '700', color: MID, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
    rewardValue: { fontSize: 22, fontWeight: '900', color: DARK, letterSpacing: -0.5, marginBottom: 4 },
    rewardDesc:  { fontSize: 11, fontWeight: '400', color: MID, textAlign: 'center', lineHeight: 16 },

    // ── Stats card ────────────────────────────────────────────────────────
    statsCard: {
        backgroundColor: WHITE, borderRadius: 16, flexDirection: 'row',
        paddingVertical: 20, marginBottom: 24,
        shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04, shadowRadius: 12, elevation: 3,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, backgroundColor: '#F1F5F9' },
    statValue: { fontSize: 22, fontWeight: '900', color: DARK, letterSpacing: -0.5, marginBottom: 4 },
    statLabel: { fontSize: 11, fontWeight: '500', color: MID },

    // ── How it works ──────────────────────────────────────────────────────
    howCard: {
        backgroundColor: WHITE, borderRadius: 16, marginBottom: 24, overflow: 'hidden',
        shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04, shadowRadius: 12, elevation: 3,
    },
    howRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
    howRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    howStep: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center',
    },
    howStepText: { fontSize: 14, fontWeight: '800', color: WHITE },
    howText: { flex: 1, fontSize: 14, fontWeight: '500', color: DARK, lineHeight: 21 },

    // ── Share CTA — consistent with app's primary button style ───────────
    shareCta: {
        backgroundColor: PURPLE, borderRadius: 16, height: 60,
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15, shadowRadius: 16, elevation: 5,
    },
    shareCtaText: { fontSize: 16, fontWeight: '700', color: WHITE, letterSpacing: 0.3 },

    // Terms
    termsNote: {
        fontSize: 11, fontWeight: '400', color: '#94A3B8',
        textAlign: 'center', lineHeight: 17, paddingHorizontal: 12,
    },
});
