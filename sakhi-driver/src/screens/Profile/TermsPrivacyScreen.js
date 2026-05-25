import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import ScreenHeader from '../../components/ScreenHeader';
import { useTranslation } from 'react-i18next';

// ─── Policy Content ───────────────────────────────────────────────────────────

const POLICIES = {
    privacy: {
        label: 'Privacy Policy',
        lastUpdated: 'April 5, 2026',
        sections: [
            {
                title: 'Introduction',
                body: `Welcome to Sakhi, akka! You are the heart of this platform. We've written these policies in simple language — please read them before you start accepting rides. By joining Sakhi, you agree to these terms.\n\nGoverned by Indian law: IT Act 2000, DPDP Act 2023, Motor Vehicles Act 1988, and applicable gig-worker regulations.`
            },
            {
                title: '1. What We Collect From You',
                body: `• Full name, date of birth, phone number, and profile photo\n• Government-issued ID: Aadhaar number, PAN card, driver's licence\n• Auto details: vehicle registration number, auto permit, insurance certificate, PUC\n• Bank account or UPI ID for earnings payout\n• Real-time GPS location while you are online on the Sakhi Driver App\n• Performance data: ride counts, ratings, acceptance rate, cancellation rate`
            },
            {
                title: '2. Why We Use It',
                body: `• To verify your identity, licence, and eligibility to drive on the platform\n• To match you with nearby passengers\n• To share your first name, photo, and auto registration with the assigned passenger, only during the active ride\n• To calculate and pay your earnings\n• To send you ride requests, payout alerts, and important updates\n• To resolve passenger disputes with accurate trip data\n• To comply with government and transport authority requirements`
            },
            {
                title: '3. Who Sees Your Data',
                body: `• Passengers: see your name, photo, and auto number plate, only during the active ride\n• Sakhi support team: for dispute resolution and account assistance\n• Transport authorities / police: only when legally required (e.g., permit checks, court orders)\n• We do NOT share your Aadhaar number, bank details, or home address with passengers\n• We do NOT sell your data to any third party`
            },
            {
                title: '4. GPS & Trip Tracking',
                body: `• Your location is tracked only while you are online in the Driver App\n• The moment you go offline, location tracking stops completely\n• You can review your trip history anytime in Driver App > My Rides`
            },
            {
                title: '5. How Long We Keep Your Data',
                body: `• Active partner data: while your account is open\n• Earnings and payout records: 7 years (required under Indian tax law)\n• ID and verification documents: 3 years after account closure\n• Deleted account data: anonymised within 30 days, except legally mandated records`
            },
            {
                title: '6. Your Rights',
                body: `• Correction — update your documents or bank details via Driver App > Profile`
            }
        ]
    },
    terms: {
        label: 'Driver Partner Terms',
        lastUpdated: 'April 5, 2026',
        sections: [
            {
                title: '1. Eligibility to Join',
                body: `• Must be a woman, 18 years or older\n• Must hold a valid commercial driver's licence for auto-rickshaw\n• Auto must have valid registration, insurance, permit, and PUC in your name or a permitted owner\n• Must pass Sakhi's background and police verification process\n• Must own or have authorised access to a smartphone running Android 8.0+ or iOS 13+\n\nSakhi reserves the right to reject or revoke partner status if verification fails at any point.`
            },
            {
                title: '2. Your Relationship With Sakhi',
                body: `• You are an independent service provider, not an employee of Sakhi\n• You choose your own working hours — go online and offline as you wish\n• Sakhi is a technology platform that connects you with passengers; we do not control how you drive\n• You are responsible for all vehicle expenses: fuel, maintenance, permit renewals, and fines\n• You are responsible for filing your own income tax on Sakhi earnings`
            },
            {
                title: '3. Earnings & Payouts',
                body: `• Your share of every fare is displayed in the Driver App before you accept each ride\n• Earnings are credited to your UPI / bank account directly\n• Weekly earnings summaries are available in Driver App\n• Sakhi's platform fee (subscription or commission) is deducted transparently — no hidden charges\n• Any outstanding platform dues may be deducted from your earnings with prior notice`
            },
            {
                title: '4. Accepting & Completing Rides',
                body: `• You are free to accept or decline any ride request\n• Consistently declining requests while staying online may lower your matching priority — you will be informed if this happens\n• Once you accept a ride, please make a genuine effort to complete it\n• If you cancel a confirmed ride without a valid reason, a small penalty may be deducted and the passenger will be refunded\n• Never collect payment outside the app for app-booked rides`
            },
            {
                title: '5. Passenger Privacy & Safety Rules',
                body: `• You may see a passenger's name during the active ride only — do not save or misuse this information after the ride ends\n• Do not contact a passenger after the ride is completed for any personal reason\n• Do not share a passenger's pick-up, drop, or home address with anyone\n• Do not photograph, record, or screen-share a passenger's details without their explicit consent\n• These rules are strictly enforced — violation leads to immediate account suspension`
            },
            {
                title: '6. Code of Conduct',
                body: `• Be punctual, polite, and professional at all times\n• Keep your auto clean and in safe working condition\n• Do not drive under the influence of alcohol, drugs, or any impairing medication\n• Follow the route shown in the app; do not take unnecessary detours without passenger consent\n• Wear your Sakhi ID badge visibly during all rides\n• Do not carry male passengers on Sakhi-booked rides — Sakhi is a women-only platform`
            },
            {
                title: '7. Safety',
                body: `• Always wear your seatbelt\n• Obey all traffic laws — penalties and legal liability are your personal responsibility\n• Use the in-app SOS button if you feel unsafe — our safety team responds immediately\n• Share the trip OTP only with the assigned passenger before starting the ride\n• Report any aggressive or threatening passenger behaviour immediately via Help > Report Safety Issue`
            },
            {
                title: '8. Ratings & Performance',
                body: `• Your rating is visible to passengers and affects your ride matching priority\n• Consistent low ratings or repeated policy violations may lead to account suspension\n• You can dispute an unfair rating via Driver App in Support Section`
            },
            {
                title: '9. Account Suspension & Exit',
                body: `• Immediate suspension for: sharing passenger data, harassment, fraud, driving without valid licence or permit, or carrying male passengers on platform rides\n• For other violations: warning first, with a 7-day window to respond or appeal\n• You may voluntarily deactivate your account anytime via Driver App > Settings > Deactivate\n• All pending earnings (less any outstanding dues) are paid within 15 business days of exit`
            },
            {
                title: '10. Insurance & Liability',
                body: `• Your own vehicle (auto) is your responsibility — maintain comprehensive insurance\n• Sakhi is not liable for damage to your auto or personal injury caused by your own negligence`
            },
            {
                title: '11. Taxes',
                body: `• You are solely responsible for filing income tax returns on your Sakhi earnings\n• Sakhi will provide an annual earnings statement by May 31 each financial year\n• GST registration and filing, if applicable to your income level, is your responsibility`
            },
            {
                title: '12. Changes to These Terms',
                body: `We will notify you via the Driver App or SMS at least 7 days before any material change. Continuing to accept rides after that date means you agree to the updated terms.\n\nYou are not just a driver — you are a changemaker. We are with you every step of the way.\n\nsupport@sakhiwomen.in`
            }
        ]
    }
};

const TABS = [
    { key: 'privacy', label: 'Privacy' },
    { key: 'terms', label: 'Terms' },
];

export default function TermsPrivacyScreen({ navigation, route }) {
  const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState(route?.params?.initialTab || 'privacy');
    const scrollRef = useRef(null);

    const policy = POLICIES[activeTab];

    const handleTabChange = (key) => {
        setActiveTab(key);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
    };

    return (
        <View style={styles.safeArea}>
            <ScreenHeader title={t('sidebar.termsPrivacy')} onBack={() => navigation?.goBack()} />

            <View style={styles.container}>
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
        </View>
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

    // ── Tabs ──
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#F5F0FF',
        paddingHorizontal: 20,
        paddingBottom: 14,
        paddingTop: 16,
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
