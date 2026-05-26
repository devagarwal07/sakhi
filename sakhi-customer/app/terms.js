import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

// ─── Policy Content ───────────────────────────────────────────────────────────

const POLICIES = {
    privacy: {
        label: 'Privacy Policy',
        lastUpdated: 'April 5, 2026',
        sections: [
            {
                title: 'Introduction',
                body: `Welcome to Sakhi — a platform built exclusively for women. Every auto driver on Sakhi is a woman, and every passenger is a woman. These policies explain how we protect your data and what you can expect from us. We've kept it brief and in plain language.\n\nGoverned by Indian law: IT Act 2000, DPDP Act 2023, Consumer Protection Act 2019, and Motor Vehicles Act 1988.`
            },
            {
                title: '1. What We Collect',
                body: `• Name, phone number, address and profile photo\n• Your real-time location while the app is in use (pick-up, drop, and live trip tracking)\n• Payment information — UPI ID or card details (processed securely; we never store your full card number)\n• Ride history and ratings`
            },
            {
                title: '2. Why We Use It',
                body: `• To match you with a nearby Sakhi auto driver\n• To share your pick-up location and first name with your assigned driver — only during the active ride\n• To process your payment and send receipts\n• To send ride status updates via push notification or SMS\n• To resolve disputes and improve service quality\n• To comply with legal and regulatory requirements`
            },
            {
                title: '3. Who Sees Your Data',
                body: `• Your assigned driver: your first name, pick-up & drop address — visible only during the active ride, masked after it ends\n• Our support team: only when you raise a concern or dispute\n• Payment gateway partners: transaction details only, for processing payment\n• Government / law enforcement: only when legally required\n• We do NOT sell your personal data — ever`
            },
            {
                title: '4. How Long We Keep It',
                body: `• Account and ride history: as long as your account is active\n• Financial records: up to 3 years (required for tax and audit)`
            },
            {
                title: '5. Your Rights',
                body: `• Correction — update your name or phone number in Settings > Profile`
            }
        ]
    },
    terms: {
        label: 'Terms of Service',
        lastUpdated: 'April 5, 2026',
        sections: [
            {
                title: '1. Who Can Use Sakhi',
                body: `• Sakhi is exclusively for women passengers and women drivers\n• You must provide your real name and a valid phone number\n• One account per person`
            },
            {
                title: '2. Booking a Ride',
                body: `• Enter your pick-up and drop location — you will see the estimated fare before confirming\n• Fares are based on distance and time; no surge pricing`
            },
            {
                title: '3. Payments',
                body: `• Accepted: UPI / Cash directly to the driver\n• Only subscription is paid upfront`
            },
            {
                title: '4. Refunds & Disputes',
                body: `• Dispute Filing: Raise a dispute within 24 hours of a ride via the Help & Support section in the app.\n• Refunds Timeframe: Approved refunds for ride payment disputes, double-deductions, or overcharges will be automatically processed and credited to your original payment method (bank account, UPI, or card) within 5–7 business days.\n• Subscription Refunds: Subscription plans are pre-paid and are non-refundable once activated. For exceptional transaction issues, please contact our support team.`
            },
            {
                title: '5. Your Responsibilities as a Passenger',
                body: `• Provide the correct pick-up address and be ready on time\n• Do not book rides for male passengers — Sakhi is a women-only platform\n• Treat your driver with respect; abusive or threatening behaviour will result in account suspension\n• Do not request the driver to deviate significantly from the agreed route without mutual consent\n• Rate your ride honestly — your feedback helps the whole community`
            },
            {
                title: '6. Your Safety Features',
                body: `• Live ride sharing: share your real-time trip with trusted contacts directly from the app\n• In-app SOS button: immediately alerts our safety team and shares your location with emergency contacts\n• Driver details — name, photo, auto registration number — visible before you board\n• All Sakhi drivers are verified women with background and police checks completed`
            },
            {
                title: '7. Account Suspension',
                body: `• We may suspend accounts for fraudulent activity, abuse towards drivers, or repeated policy violations\n• You will be notified and given 7 days to appeal`
            },
            {
                title: '8. Our Liability',
                body: `• Sakhi is a technology platform connecting passengers with independent auto drivers\n• We are not liable for delays due to traffic or weather, or for road accidents caused by third parties\n• Our liability for any service issue is limited to the fare paid for that specific ride`
            },
            {
                title: 'Contact',
                body: `Questions or feedback? We're always here to support you.\n\nSahi Mobility Solutions Private Limited\nRegistered Address: C/o Jitesh, Utsaav Park, Kkv Circle, Kalawad Road, Rajkot Sau Uni Area, Rajkot, Rajkot, Gujarat, India, 360005\n\nEmail: support@sakhiwomen.com\nPhone: +91 63619 33364`
            }
        ]
    }
};

const TABS = [
    { key: 'privacy', label: 'Privacy' },
    { key: 'terms', label: 'Terms' },
];

export default function TermsScreen() {
    const router = useRouter();
    const { tab } = useLocalSearchParams();
    const [activeTab, setActiveTab] = useState(tab === 'terms' ? 'terms' : 'privacy');
    const scrollRef = useRef(null);

    const policy = POLICIES[activeTab];

    const handleTabChange = (key) => {
        setActiveTab(key);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Feather name="arrow-left" size={24} color="#BEA3D8" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Terms & Privacy</Text>
                    <View style={styles.iconBtn} />
                </View>

                {/* Tab Switcher */}
                <View style={styles.tabBar}>
                    {TABS.map(tab => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                            onPress={() => handleTabChange(tab.key)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Scroll Content */}
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Policy Header Card */}
                    <View style={styles.policyHeader}>
                        <Text style={styles.policyTitle}>{policy.label}</Text>
                        <Text style={styles.policyDate}>Last updated: {policy.lastUpdated}</Text>
                    </View>

                    {/* Sections */}
                    {policy.sections.map((section, idx) => (
                        <View key={idx} style={styles.section}>
                            <Text style={styles.sectionTitle}>{section.title}</Text>
                            <Text style={styles.sectionBody}>{section.body}</Text>
                        </View>
                    ))}

                    {/* Footer */}
                    <View style={styles.footer}>
                        <View style={styles.footerDivider} />
                        <Text style={styles.footerText}>
                            © {new Date().getFullYear()} Sakhi Technologies Private Limited.{'\n'}All rights reserved.
                        </Text>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F5F0FF',
    },
    container: {
        flex: 1,
    },

    // ── Header ── matches profile.js header exactly
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: '#F5F0FF',
        zIndex: 10,
    },
    iconBtn: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerIcon: {
        fontSize: 24,
        color: '#BEA3D8',
        fontWeight: '500',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E1B2E',
        letterSpacing: -0.5,
    },

    // ── Tabs ──
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#F5F0FF',
        paddingHorizontal: 20,
        paddingBottom: 14,
        paddingTop: 4,
        gap: 8,
    },
    tab: {
        flex: 1,
        paddingVertical: 9,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
    },
    tabActive: {
        backgroundColor: '#BEA3D8',
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 4,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#BEA3D8',
    },
    tabTextActive: {
        color: '#FFFFFF',
    },

    // ── Scroll ──
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 60,
        gap: 10,
    },

    // ── Policy Header Card ──
    policyHeader: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        marginBottom: 2,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
        elevation: 3,
    },
    policyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E1B2E',
        letterSpacing: -0.4,
        marginBottom: 4,
    },
    policyDate: {
        fontSize: 13,
        color: '#CCC3D8',
        fontWeight: '500',
    },

    // ── Sections ── same card style as cardGroup in profile
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#BEA3D8',
        marginBottom: 8,
        letterSpacing: -0.1,
    },
    sectionBody: {
        fontSize: 14,
        lineHeight: 22,
        color: '#1E1B2E',
        opacity: 0.75,
        fontWeight: '400',
    },

    // ── Footer ──
    footer: {
        marginTop: 8,
        alignItems: 'center',
        paddingBottom: 8,
    },
    footerDivider: {
        width: 40,
        height: 3,
        borderRadius: 2,
        backgroundColor: '#F5F0FF',
        marginBottom: 14,
    },
    footerText: {
        fontSize: 13,
        color: '#CCC3D8',
        textAlign: 'center',
        lineHeight: 20,
        fontWeight: '500',
    },
});