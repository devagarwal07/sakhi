import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

// ─── Refund Policy Sections ───────────────────────────────────────────────────

const SECTIONS = [
    {
        title: 'About This Policy',
        body: `Effective Date: May 2026\n\nAt Sakhi, we are committed to providing safe, reliable, and transparent transportation services for women. This Refund Policy explains when refunds may be issued for rides, subscriptions, payments, and platform-related transactions on the Sakhi platform.\n\nBy using the Sakhi app, you agree to this Refund Policy.`,
    },
    {
        title: '1. Ride Refund Eligibility',
        body: `Refunds may be issued for on-demand rides in situations including, but not limited to:\n\n• Incorrect fare charged\n• Duplicate payment\n• Ride charged but not completed\n• Technical or app-related errors\n• Driver cancellation after payment\n• Verified safety or misconduct complaints\n• Incorrect waiting charges due to app/GPS issues\n• Unauthorized or fraudulent transactions\n\nRefund requests are reviewed individually by the Sakhi Support Team.`,
    },
    {
        title: '2. Waiting Charge Refunds',
        body: `Sakhi may apply waiting charges after the free waiting period once the driver arrives at the pickup location.\n\nA refund of waiting charges may be issued if:\n\n• The driver incorrectly marked arrival\n• GPS/location errors caused incorrect timing\n• Technical issues resulted in inaccurate waiting fees\n• The rider provides valid evidence supporting the dispute`,
    },
    {
        title: '3. Subscription Refunds',
        body: `Subscription plans on Sakhi are prepaid in advance.\n\n3.1 Non-Cancellable Window\nOnce a subscription plan has started, it cannot be cancelled within the first 7 days of the active subscription period.\n\n3.2 Eligible Subscription Refund Cases\nA subscription refund may be considered if:\n• Sakhi is unable to provide rides consistently on the subscribed route\n• Repeated driver unavailability occurs\n• Duplicate payment was made\n• Technical issues caused incorrect billing\n• Subscription activation failed\n• Verified safety concerns require service termination\n\n3.3 Partial Refunds\nIf a subscription refund is approved: completed rides, used benefits, discounts, promotional credits, applicable charges or taxes may be deducted before calculating the refundable amount. Refunds are generally processed only for the unused portion of the subscription.`,
    },
    {
        title: '4. Non-Refundable Situations',
        body: `Refunds may not be issued for:\n\n• Delays caused by traffic, weather, or road conditions\n• Incorrect pickup or drop details entered by the rider\n• Rider no-shows\n• Cancellations after excessive waiting time\n• Dissatisfaction unrelated to safety or service quality\n• Promotional offers, referral rewards, or discount credits\n• Cash payments already handed directly to the driver unless verified through investigation`,
    },
    {
        title: '5. Driver Platform Fee Refunds',
        body: `Driver commission payments, platform fees, or subscription-related payments may only be refunded in limited situations such as:\n\n• Duplicate payment\n• Billing or technical errors\n• Incorrect deductions verified by Sakhi\n• Failed onboarding after payment due to verification rejection\n\nAll such requests are subject to Sakhi review and approval.`,
    },
    {
        title: '6. Refund Request Process',
        body: `Refund requests can be submitted through:\n\n• The in-app Support section\n• Ride history dispute option\n• Official Sakhi customer support channels\n\nUsers may be asked to provide:\n• Ride ID\n• Payment details\n• Screenshots or supporting evidence`,
    },
    {
        title: '7. Refund Processing Timeline',
        body: `Approved refunds are generally processed within:\n\n• 5–10 business days for UPI, bank transfer, or card payments\n• Depending on banking and payment gateway timelines`,
    },
    {
        title: '8. Fraud Prevention',
        body: `Sakhi reserves the right to:\n\n• Reject fraudulent or abusive refund claims\n• Suspend accounts involved in suspicious activity\n• Investigate repeated refund abuse\n• Recover amounts obtained through misuse of the platform`,
    },
    {
        title: '9. Safety Exceptions',
        body: `In cases involving harassment, unsafe behaviour, identity mismatch, serious misconduct, or verified safety threats — Sakhi may issue full or partial refunds at its sole discretion and take appropriate action against the involved account.`,
    },
    {
        title: '10. Changes to This Policy',
        body: `Sakhi may update this Refund Policy from time to time. Updated versions will be published within the app or official platforms. Continued use of Sakhi services after updates constitutes acceptance of the revised policy.`,
    },
    {
        title: 'Contact Us',
        body: `Questions about a refund or payment dispute? We're here to help.\n\nSahi Mobility Solutions Private Limited\nRegistered Address: C/o Jitesh, Utsaav Park, Kkv Circle, Kalawad Road, Rajkot Sau Uni Area, Rajkot, Rajkot, Gujarat, India, 360005\n\nEmail: support@sakhiwomen.com\nPhone: +91 63619 33364`,
    },
];

export default function RefundPolicyScreen() {
    const router = useRouter();

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
                    <Text style={styles.headerTitle}>Refund Policy</Text>
                    <View style={styles.iconBtn} />
                </View>

                {/* Scroll Content */}
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Policy Header Card */}
                    <View style={styles.policyHeader}>
                        <View style={styles.policyBadge}>
                            <Feather name="refresh-ccw" size={16} color="#BEA3D8" />
                            <Text style={styles.policyBadgeText}>REFUND POLICY</Text>
                        </View>
                        <Text style={styles.policyTitle}>Sakhi Refund Policy</Text>
                        <Text style={styles.policyDate}>Effective Date: May 2026</Text>
                        <Text style={styles.policySubtitle}>
                            Safe rides for women, by women
                        </Text>
                    </View>

                    {/* Sections */}
                    {SECTIONS.map((section, idx) => (
                        <View key={idx} style={styles.section}>
                            <Text style={styles.sectionTitle}>{section.title}</Text>
                            <Text style={styles.sectionBody}>{section.body}</Text>
                        </View>
                    ))}

                    {/* Footer */}
                    <View style={styles.footer}>
                        <View style={styles.footerDivider} />
                        <Text style={styles.footerText}>
                            © {new Date().getFullYear()} Sahi Mobility Solutions Private Limited.{'\n'}All rights reserved.
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

    // ── Header ──
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
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E1B2E',
        letterSpacing: -0.5,
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
        borderRadius: 20,
        padding: 20,
        marginBottom: 2,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 4,
        borderLeftWidth: 4,
        borderLeftColor: '#BEA3D8',
    },
    policyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    policyBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#BEA3D8',
        letterSpacing: 1.5,
    },
    policyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1E1B2E',
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    policyDate: {
        fontSize: 13,
        color: '#CCC3D8',
        fontWeight: '500',
        marginBottom: 8,
    },
    policySubtitle: {
        fontSize: 13,
        color: '#BEA3D8',
        fontWeight: '600',
        fontStyle: 'italic',
    },

    // ── Sections ──
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
