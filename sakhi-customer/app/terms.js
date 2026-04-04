import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';

// ─── Policy Content ───────────────────────────────────────────────────────────

const POLICIES = {
    terms: {
        label: 'Terms of Service',
        lastUpdated: 'April 1, 2025',
        sections: [
            {
                title: '1. Acceptance of Terms',
                body: `By downloading, installing, or using the Sakhi application ("App"), you agree to be legally bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the App.\n\nThese Terms constitute a legally binding agreement between you ("User") and Sakhi Technologies Private Limited ("Sakhi", "we", "our", or "us"), a company incorporated under the laws of India.`
            },
            {
                title: '2. Eligibility',
                body: `The App is intended exclusively for women aged 18 years and above. By using the App, you represent and warrant that:\n\n• You are at least 18 years of age.\n• You have the legal capacity to enter into a binding agreement.\n• You are not barred from using the App under any applicable laws.\n\nSakhi reserves the right to request proof of identity or age at any time and to terminate access if eligibility criteria are not met.`
            },
            {
                title: '3. Services Provided',
                body: `Sakhi provides a women-first ride-hailing and safety platform that includes:\n\n• Booking rides with verified women drivers.\n• Real-time GPS tracking and live-share with emergency contacts.\n• SOS alerts and emergency response features.\n• Wallet and payment management.\n• In-trip safety monitoring tools.\n\nWe reserve the right to modify, suspend, or discontinue any service feature at any time with reasonable notice.`
            },
            {
                title: '4. User Responsibilities',
                body: `You agree to:\n\n• Provide accurate, current, and complete registration information.\n• Keep your account credentials confidential and not share them with others.\n• Use the App only for lawful purposes and in compliance with these Terms.\n• Treat all drivers on the platform with respect and dignity.\n• Not use the SOS feature for false emergencies or malicious purposes.\n• Not attempt to reverse-engineer, hack, or disrupt the App or its services.\n\nYou are solely responsible for all activities that occur under your account.`
            },
            {
                title: '5. Payments & Refunds',
                body: `Fare Calculation: Ride fares are dynamically calculated based on distance, time, surge pricing, and applicable taxes.\n\nPayments: You may pay via the in-app Sakhi Wallet, UPI, credit/debit cards, or other supported methods. All transactions are secured through PCI-DSS compliant payment partners.\n\nRefunds: Refund requests will be considered on a case-by-case basis. Approved refunds are processed within 5–7 business days. Fraudulent refund requests may result in account suspension.\n\nCancellation: Cancellations after driver acceptance may attract a cancellation fee as displayed in the App.`
            },
            {
                title: '6. Safety Features & Limitations',
                body: `Sakhi provides safety tools including live-tracking, SOS alerts, and emergency contact notifications. These features are intended to assist users and are not a substitute for contacting emergency services.\n\nSakhi does not guarantee that SOS features will function in areas with poor network connectivity or in cases of device malfunction. In any emergency, always contact local emergency services (100/112) as your primary recourse.`
            },
            {
                title: '7. Intellectual Property',
                body: `All content, logos, trademarks, software, and materials in the App are the exclusive property of Sakhi Technologies Private Limited. You may not copy, reproduce, distribute, or create derivative works without our express written consent.\n\nUser-generated content (such as ratings and reviews) grants Sakhi a non-exclusive, royalty-free, worldwide license to use, reproduce, and display such content for operational and promotional purposes.`
            },
            {
                title: '8. Limitation of Liability',
                body: `To the maximum extent permitted by applicable law, Sakhi shall not be liable for:\n\n• Any indirect, incidental, special, consequential, or punitive damages.\n• Loss of data, revenue, or profits arising from your use of the App.\n• Actions or omissions of drivers or third-party service providers.\n• Service interruptions, technical failures, or force majeure events.\n\nOur aggregate liability for any claim shall not exceed the amount paid by you to Sakhi in the 3 months preceding the claim.`
            },
            {
                title: '9. Termination',
                body: `We may suspend or terminate your account immediately, without prior notice, if you:\n\n• Violate these Terms or any applicable law.\n• Engage in abusive, fraudulent, or harmful conduct.\n• Provide false information during registration.\n\nYou may delete your account at any time through the App settings. Upon termination, your right to use the App ceases immediately, but these Terms survive termination to the extent applicable.`
            },
            {
                title: '10. Governing Law & Disputes',
                body: `These Terms are governed by the laws of India. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of courts in Bengaluru, Karnataka, India.\n\nFor informal resolution, please contact us at legal@sakhi.app before initiating any legal proceedings.`
            },
            {
                title: '11. Changes to Terms',
                body: `We may update these Terms from time to time. We will notify you of significant changes via the App or registered email. Continued use of the App after changes constitutes your acceptance of the revised Terms.`
            },
            {
                title: '12. Contact Us',
                body: `For questions about these Terms, contact:\n\nSakhi Technologies Private Limited\nEmail: legal@sakhi.app\nAddress: Bengaluru, Karnataka, India – 560001\nSupport: support@sakhi.app`
            },
        ]
    },
    privacy: {
        label: 'Privacy Policy',
        lastUpdated: 'April 1, 2025',
        sections: [
            {
                title: '1. Introduction',
                body: `Sakhi Technologies Private Limited ("Sakhi", "we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use the Sakhi application.\n\nBy using the App, you consent to the practices described in this Policy.`
            },
            {
                title: '2. Information We Collect',
                body: `We collect the following categories of information:\n\nIdentity Information: Full name, phone number, email address, gender, date of birth, and profile photo.\n\nLocation Data: Precise real-time GPS location during rides; approximate location when the App is in use.\n\nDevice Information: Device type, OS version, app version, unique device identifiers, and push notification tokens.\n\nPayment Information: Transaction history, payment method (processed securely by our payment partners — we do not store card numbers).\n\nEmergency Contacts: Names and phone numbers of contacts you designate for SOS alerts.\n\nUsage Data: App activity, ride history, ratings given/received, and in-app navigation patterns.`
            },
            {
                title: '3. How We Use Your Information',
                body: `We use your information to:\n\n• Provide, operate, and improve the App and its services.\n• Match you with available drivers and process bookings.\n• Send real-time location to your emergency contacts during SOS events.\n• Process payments and manage your Sakhi Wallet.\n• Send transactional notifications (booking confirmations, OTPs, receipts).\n• Detect, prevent, and investigate fraud or safety incidents.\n• Comply with legal obligations and respond to law enforcement requests.\n• Improve our AI and safety algorithms using anonymized data.\n• Send promotional communications (with your consent; opt-out anytime).`
            },
            {
                title: '4. Location Data',
                body: `Location data is the core of our service and safety features:\n\nDuring Rides: Your precise location is continuously collected and shared with your assigned driver and, upon SOS activation, with your emergency contacts.\n\nBackground Location: If you grant background location permission, we collect location data while the App is in the background to enable proactive safety monitoring. You may revoke this permission in your device settings, but this will limit certain safety features.\n\nWe do not sell your location history to advertisers or third parties.`
            },
            {
                title: '5. Information Sharing',
                body: `We share your information only in limited circumstances:\n\nWith Drivers: Your first name, rating, and pickup location are shared with your matched driver.\n\nWith Emergency Contacts: Your live location is shared during an SOS event.\n\nWith Service Providers: Payment processors, cloud vendors, analytics providers, and customer support tools — all bound by data processing agreements.\n\nWith Authorities: When required by law, court order, or to protect the safety of our users or the public.\n\nWe never sell your personal data to third parties for advertising purposes.`
            },
            {
                title: '6. Data Retention',
                body: `We retain your personal data for as long as your account is active or as needed to provide services.\n\nRide history and transaction records are retained for 7 years as required by Indian financial regulations.\n\nUpon account deletion, personal identifiers are anonymized or deleted within 30 days, except where retention is required by law.`
            },
            {
                title: '7. Data Security',
                body: `We implement industry-standard security measures:\n\n• AES-256 encryption for data at rest.\n• TLS 1.2+ encryption for data in transit.\n• Access controls limiting who can view your data.\n• Regular security audits and penetration testing.\n• PCI-DSS compliant payment processing.\n\nWhile we strive to protect your data, no system is 100% secure. Please report any suspicious activity to support@sakhi.app.`
            },
            {
                title: '8. Your Rights',
                body: `Under applicable Indian data protection laws, you have the right to:\n\n• Access: Request a copy of the personal data we hold about you.\n• Correction: Request correction of inaccurate data.\n• Deletion: Request deletion of your data (subject to legal retention requirements).\n• Portability: Receive your data in a structured, machine-readable format.\n• Withdraw Consent: Opt out of marketing communications at any time.\n\nTo exercise these rights, contact: privacy@sakhi.app`
            },
            {
                title: '9. Children\'s Privacy',
                body: `The App is not intended for individuals under 18 years of age. We do not knowingly collect personal data from minors. If you believe a minor has provided us with personal data, please contact us immediately at privacy@sakhi.app and we will delete such data promptly.`
            },
            {
                title: '10. Grievance Officer',
                body: `In accordance with the Information Technology Act, 2000, and applicable rules:\n\nName: Sakhi Grievance Team\nEmail: grievance@sakhi.app\nResponse Time: Within 30 days of receiving your complaint.`
            },
            {
                title: '11. Changes to This Policy',
                body: `We may update this Privacy Policy periodically. We will notify you of material changes via the App or registered email at least 14 days before changes take effect.\n\nContinued use of the App after changes constitutes acceptance of the revised Policy.`
            },
        ]
    },
    cookie: {
        label: 'Cookie Policy',
        lastUpdated: 'April 1, 2025',
        sections: [
            {
                title: '1. What Are Cookies?',
                body: `Cookies are small text files stored on your device by websites and applications. In the context of mobile apps, we use similar technologies including:\n\n• Local Storage: Persistent data stored on your device.\n• Session Tokens: Temporary tokens that keep you logged in during a session.\n• Analytics SDKs: Third-party libraries that collect usage statistics.\n• Device Identifiers: Unique IDs used to recognize your device across sessions.`
            },
            {
                title: '2. Types We Use',
                body: `Essential / Functional:\nRequired for the App to function. Includes authentication tokens, session management, and user preferences. These cannot be disabled.\n\nAnalytics:\nTools to understand how users interact with the App — which screens are visited most, crash reports, and performance metrics. Data is aggregated and anonymized.\n\nSecurity:\nTechnologies that help detect fraud, suspicious login attempts, and unusual activity.\n\nPersonalization:\nData used to remember your preferences such as saved locations, preferred payment method, and notification settings.`
            },
            {
                title: '3. Third-Party Technologies',
                body: `Some features rely on third-party SDKs that may collect data:\n\n• Google Maps SDK — for route mapping and navigation.\n• Razorpay SDK — for payment processing.\n• Firebase (Google) — for push notifications, analytics, and crash reporting.\n• Supabase — for secure backend data storage.\n\nThese third parties operate under their own privacy and cookie policies.`
            },
            {
                title: '4. Your Choices',
                body: `App Permissions: Revoke location, camera, or notification permissions at any time via your device settings.\n\nAnalytics Opt-Out: You may opt out of analytics data collection in App Settings → Privacy → Analytics.\n\nMarketing Opt-Out: Manage marketing notification preferences in App Settings → Notifications.\n\nAccount Deletion: Deleting your account will remove all associated stored data within 30 days.`
            },
            {
                title: '5. Data Retention',
                body: `Essential session tokens expire when you log out or after 30 days of inactivity.\n\nAnalytics data is retained in aggregated, anonymized form for up to 24 months.\n\nPersonalization data (saved locations, preferences) is retained until you manually clear it or delete your account.`
            },
            {
                title: '6. Changes & Contact',
                body: `We may update this Cookie Policy to reflect changes in our technologies or applicable law.\n\nFor questions:\nEmail: privacy@sakhi.app\nGrievance: grievance@sakhi.app\nAddress: Sakhi Technologies Private Limited, Bengaluru, Karnataka – 560001`
            },
        ]
    }
};

const TABS = [
    { key: 'terms', label: 'Terms' },
    { key: 'privacy', label: 'Privacy' },
    { key: 'cookie', label: 'Cookies' },
];

export default function TermsScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('terms');
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
                        <Text style={styles.headerIcon}>←</Text>
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