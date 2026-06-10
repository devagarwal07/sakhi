import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Share, Clipboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

const REWARDS = [
    { iconName: 'gift', who: 'You Earn', value: '₹200', desc: 'For every driver who completes 10 rides using your code' },
    { iconName: 'award', who: 'They Earn', value: '₹100', desc: 'New driver joining bonus applied to first payout' },
];

const HOW = [
    'Share your referral code with another driver',
    'They sign up and complete 10 rides on Sakhi',
    'You both get your reward in the next earnings payout',
];

export default function DriverReferralsScreen({ navigation }) {
  const { t } = useTranslation();
    const { driver } = useAuth();
    const insets = useSafeAreaInsets();
    const referralCode = driver?.referral_code ?? `DRV${(driver?.phone ?? '').slice(-4).padStart(4, '0')}`;
    const [copied, setCopied] = useState(false);

    const copyCode = () => {
        Clipboard.setString(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareCode = async () => {
        try {
            await Share.share({
                message: `Join Sakhi as a driver and earn great commissions! Use my code **${referralCode}** when you sign up and get ₹100 bonus after 10 rides. Apply: https://sakhi.app/driver`,
                title: 'Drive with Sakhi',
            });
        } catch {}
    };

    return (
        <View style={[s.root, { paddingTop: Math.max(insets.top, 24) }]}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                    <Feather name="arrow-left" size={20} color="#BEA3D8" />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Referrals & Rewards</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

                {/* Hero */}
                <View style={s.hero}>
                    <Feather name="truck" size={44} color="#BEA3D8" style={{ marginBottom: 12 }} />
                    <Text style={s.heroTitle}>Refer a Driver,{'\n'}Earn Together</Text>
                    <Text style={s.heroSub}>Help other women drivers join Sakhi and earn rewards on every successful referral</Text>
                </View>

                {/* Code card */}
                <View style={s.codeCard}>
                    <Text style={s.codeLabel}>YOUR REFERRAL CODE</Text>
                    <View style={s.codeRow}>
                        <Text style={s.codeText}>{referralCode}</Text>
                        <TouchableOpacity style={s.copyBtn} onPress={copyCode} activeOpacity={0.8}>
                            <Text style={s.copyBtnText}>{copied ? '✓ Copied' : 'Copy'}</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={s.codeSub}>Share this with other drivers who want to join Sakhi</Text>
                </View>

                {/* Reward tiles */}
                <Text style={s.sectionLabel}>WHAT YOU GET</Text>
                <View style={s.rewardRow}>
                    {REWARDS.map((r, i) => (
                        <View key={i} style={s.rewardCard}>
                            <Feather name={r.iconName} size={28} color="#BEA3D8" style={{ marginBottom: 8 }} />
                            <Text style={s.rewardWho}>{r.who}</Text>
                            <Text style={s.rewardValue}>{r.value}</Text>
                            <Text style={s.rewardDesc}>{r.desc}</Text>
                        </View>
                    ))}
                </View>

                {/* Stats */}
                <View style={s.statsCard}>
                    {[
                        { v: '0', l: 'Drivers Referred' },
                        { v: '0', l: 'Active Referrals' },
                        { v: '₹0', l: 'Total Earned' },
                    ].map((st, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <View style={s.statDiv} />}
                            <View style={s.statItem}>
                                <Text style={s.statVal}>{st.v}</Text>
                                <Text style={s.statLbl}>{st.l}</Text>
                            </View>
                        </React.Fragment>
                    ))}
                </View>

                {/* How it works */}
                <Text style={s.sectionLabel}>HOW IT WORKS</Text>
                <View style={s.howCard}>
                    {HOW.map((step, i) => (
                        <View key={i} style={[s.howRow, i < HOW.length - 1 && s.howRowBorder]}>
                            <View style={s.howStep}><Text style={s.howStepText}>{i + 1}</Text></View>
                            <Text style={s.howText}>{step}</Text>
                        </View>
                    ))}
                </View>

                {/* Share CTA */}
                <TouchableOpacity style={s.shareCta} onPress={shareCode} activeOpacity={0.88}>
                    <MaterialCommunityIcons name="share-outline" size={20} color="#FFFFFF" />
                    <Text style={s.shareCtaText}>Invite a Driver</Text>
                </TouchableOpacity>

                <Text style={s.terms}>
                    * Reward is paid after the referred driver completes 10 rides. Valid for new drivers only. Terms apply.
                </Text>
            </ScrollView>
        </View>
    );
}

const PURPLE = '#BEA3D8';
const LPURPLE = '#BEA3D8';
const DARK = '#1E1B2E';
const MID = '#64748B';
const WHITE = '#FFFFFF';
const BG = '#F5F3FF';

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: BG },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 12,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: WHITE,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    },
    headerTitle: { fontSize: 17, fontWeight: '800', color: DARK, letterSpacing: -0.4 },

    scroll: { paddingHorizontal: 20, paddingBottom: 48 },

    hero: {
        backgroundColor: DARK, borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 20,
        shadowColor: DARK, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.18, shadowRadius: 32, elevation: 8,
    },
    heroEmoji: { fontSize: 44, marginBottom: 12 },
    heroTitle: { fontSize: 24, fontWeight: '900', color: WHITE, textAlign: 'center', letterSpacing: -0.6, lineHeight: 32, marginBottom: 10 },
    heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 20 },

    codeCard: {
        backgroundColor: WHITE, borderRadius: 16, padding: 20, marginBottom: 24,
        shadowColor: PURPLE, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
    },
    codeLabel: { fontSize: 10, fontWeight: '700', color: MID, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 },
    codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    codeText: { flex: 1, fontSize: 28, fontWeight: '900', color: DARK, letterSpacing: 2 },
    copyBtn: { backgroundColor: BG, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1.5, borderColor: LPURPLE },
    copyBtnText: { fontSize: 13, fontWeight: '700', color: PURPLE },
    codeSub: { fontSize: 12, color: MID },

    sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14, marginTop: 4 },

    rewardRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    rewardCard: {
        flex: 1, backgroundColor: WHITE, borderRadius: 16, padding: 16, alignItems: 'center',
        shadowColor: PURPLE, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    },
    rewardEmoji: { fontSize: 28, marginBottom: 8 },
    rewardWho: { fontSize: 10, fontWeight: '700', color: MID, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
    rewardValue: { fontSize: 22, fontWeight: '900', color: DARK, letterSpacing: -0.5, marginBottom: 4 },
    rewardDesc: { fontSize: 11, color: MID, textAlign: 'center', lineHeight: 16 },

    statsCard: {
        backgroundColor: WHITE, borderRadius: 16, flexDirection: 'row', paddingVertical: 20, marginBottom: 24,
        shadowColor: PURPLE, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statDiv: { width: 1, backgroundColor: '#F1F5F9' },
    statVal: { fontSize: 22, fontWeight: '900', color: DARK, letterSpacing: -0.5, marginBottom: 4 },
    statLbl: { fontSize: 11, fontWeight: '500', color: MID, textAlign: 'center' },

    howCard: {
        backgroundColor: WHITE, borderRadius: 16, marginBottom: 24, overflow: 'hidden',
        shadowColor: PURPLE, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    },
    howRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
    howRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    howStep: { width: 32, height: 32, borderRadius: 16, backgroundColor: LPURPLE, alignItems: 'center', justifyContent: 'center' },
    howStepText: { fontSize: 14, fontWeight: '800', color: WHITE },
    howText: { flex: 1, fontSize: 14, fontWeight: '500', color: DARK, lineHeight: 21 },

    shareCta: {
        backgroundColor: PURPLE, borderRadius: 16, height: 60, flexDirection: 'row', gap: 10,
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        shadowColor: PURPLE, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 6,
    },
    shareCtaText: { fontSize: 16, fontWeight: '700', color: WHITE, letterSpacing: 0.3 },

    terms: { fontSize: 11, color: '#94A3B8', textAlign: 'center', lineHeight: 17, paddingHorizontal: 12 },
});
