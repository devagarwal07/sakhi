import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, Linking, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

// ── FAQ Data ──────────────────────────────────────────────────────────────────
const FAQ_CATEGORIES = [
    {
        id: 'rides',
        icon: 'navigation',
        label: 'Rides',
        color: '#BEA3D8',
        bg: '#F5F0FF',
        questions: [
            { q: 'How do I book a ride?', a: 'Tap "Book Now" on the home screen, enter your pickup and drop-off location, then confirm your booking.' },
            { q: 'Can I cancel a ride?', a: 'Yes. During the ride-finding stage, tap "Cancel" on the finding screen. Cancellation fees may apply after driver confirmation.' },
            { q: 'What is a subscription ride?', a: 'A subscription lets you schedule recurring rides on selected days. Tap "Subscribe" on the home screen to set one up.' },
            { q: 'What happens if no driver is found?', a: 'If no Sakhi is available at that moment, you will see a friendly message. Please try booking again in a few minutes.' },
        ],
    },
    {
        id: 'payments',
        icon: 'credit-card',
        label: 'Payments',
        color: '#059669',
        bg: '#ECFDF5',
        questions: [
            { q: 'How do I pay for a single ride?', a: 'Single rides are paid in Cash to the driver at the end of the trip.' },
            { q: 'How do subscriptions get paid?', a: 'Subscriptions are paid via UPI after a driver is successfully assigned to your route.' },
            { q: 'How do I add a UPI ID?', a: 'Go to Profile → Payment Methods, then tap "Add UPI ID" and enter your UPI address (e.g. yourname@upi).' },
            { q: 'I was charged but the booking failed. What do I do?', a: 'Please contact our support team immediately. We will investigate and refund you within 3–5 business days.' },
        ],
    },
    {
        id: 'safety',
        icon: 'shield',
        label: 'Safety',
        color: '#DC2626',
        bg: '#FFF1F2',
        questions: [
            { q: 'How do I use the SOS feature?', a: 'During an active ride, tap the red SOS button. Your emergency contacts and our team will be notified immediately.' },
            { q: 'Are all Sakhi drivers verified?', a: 'Yes. All drivers undergo gender verification, KYC, and identity checks before being approved.' },
            { q: 'How do I share my trip with family?', a: 'During an active ride, tap "Share Trip" to send your live location to trusted contacts.' },
        ],
    },
    {
        id: 'account',
        icon: 'user',
        label: 'Account',
        color: '#D97706',
        bg: '#FFFBEB',
        questions: [
            { q: 'How do I edit my profile?', a: 'Go to Profile and tap "Edit Profile" to update your name, email, or phone number.' },
            { q: 'How do I change my phone number?', a: 'Go to Profile → Settings (⋮) → Change Phone, then verify with an OTP.' },
            { q: 'How do I delete my account?', a: 'Please contact support to request an account deletion. We will process it within 7 business days.' },
        ],
    },
];

// ── Accordion Item ─────────────────────────────────────────────────────────────
function AccordionItem({ q, a }) {
    const [open, setOpen] = useState(false);
    return (
        <View style={ac.wrap}>
            <TouchableOpacity
                style={ac.header}
                onPress={() => setOpen(!open)}
                activeOpacity={0.8}
            >
                <Text style={ac.question}>{q}</Text>
                <Feather name={open ? "minus" : "plus"} size={18} color={open ? "#7C3AED" : "#BEA3D8"} style={{ marginTop: 1 }} />
            </TouchableOpacity>
            {open && <Text style={ac.answer}>{a}</Text>}
        </View>
    );
}
const ac = StyleSheet.create({
    wrap:        { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
    question:    { flex: 1, fontSize: 14, fontWeight: '600', color: '#1E1B2E', lineHeight: 21 },
    chevron:     { fontSize: 18, fontWeight: '700', color: '#BEA3D8', marginTop: 1 },
    chevronOpen: { color: '#7C3AED' },
    answer:      { fontSize: 13, fontWeight: '400', color: '#64748B', lineHeight: 21, paddingHorizontal: 16, paddingBottom: 14 },
});

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function HelpSupportScreen() {
    const router = useRouter();

    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState(null);

    const filteredFaqs = FAQ_CATEGORIES.map(cat => ({
        ...cat,
        questions: cat.questions.filter(
            item =>
                item.q.toLowerCase().includes(search.toLowerCase()) ||
                item.a.toLowerCase().includes(search.toLowerCase())
        ),
    })).filter(cat => cat.questions.length > 0);

    const displayFaqs = search
        ? filteredFaqs
        : activeCategory
            ? FAQ_CATEGORIES.filter(c => c.id === activeCategory)
            : FAQ_CATEGORIES;

    return (
        <SafeAreaView style={s.root} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor="#F5F0FF" />
            {/* ── Header ── */}
            <View style={s.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        style={s.backBtn}
                        onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')}
                    >
                        <Feather name="arrow-left" size={24} color="#BEA3D8" />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Help & Support</Text>
                </View>
                <View style={s.backBtn} />
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                {/* Search Bar */}
                <View style={s.searchWrap}>
                    <Feather name="search" size={16} color="#94A3B8" />
                    <TextInput
                        style={s.searchInput}
                        placeholder="Search for help…"
                        placeholderTextColor="rgba(100,116,139,0.5)"
                        value={search}
                        onChangeText={setSearch}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Feather name="x" size={16} color="#94A3B8" style={{ paddingHorizontal: 4 }} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Category Pills */}
                {!search && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={s.catPills}
                    >
                        <TouchableOpacity
                            style={[s.catPill, !activeCategory && s.catPillActive]}
                            onPress={() => setActiveCategory(null)}
                        >
                            <Text style={[s.catPillText, !activeCategory && s.catPillTextActive]}>All</Text>
                        </TouchableOpacity>
                        {FAQ_CATEGORIES.map(cat => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[s.catPill, activeCategory === cat.id && { backgroundColor: cat.bg, borderColor: cat.color }]}
                                onPress={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                            >
                                <Feather name={cat.icon} size={14} color={activeCategory === cat.id ? cat.color : '#64748B'} />
                                <Text style={[s.catPillText, activeCategory === cat.id && { color: cat.color }]}>{cat.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* Quick Actions */}
                {!search && !activeCategory && (
                    <View style={s.quickWrap}>
                        <Text style={s.sectionLabel}>QUICK HELP</Text>
                        <View style={s.quickRow}>
                            {/* Chat with Bot */}
                            <TouchableOpacity
                                style={[s.quickCard, { backgroundColor: '#F5F0FF', borderColor: '#BEA3D8' }]}
                                onPress={() => router.push('/support-chat')}
                                activeOpacity={0.82}
                            >
                                <Feather name="message-square" size={22} color="#7C3AED" style={{ marginBottom: 4 }} />
                                <Text style={[s.quickTitle, { color: '#7C3AED' }]}>Chat with{'\n'}Sakhi Bot</Text>
                                <Text style={[s.quickSub, { color: '#BEA3D8' }]}>24/7 instant help</Text>
                            </TouchableOpacity>

                            {/* Call Support */}
                            <TouchableOpacity
                                style={[s.quickCard, { backgroundColor: '#ECFDF5', borderColor: '#059669' }]}
                                onPress={() => Linking.openURL('tel:+918800000000').catch(() => {})}
                                activeOpacity={0.82}
                            >
                                <Feather name="phone-call" size={22} color="#065F46" style={{ marginBottom: 4 }} />
                                <Text style={[s.quickTitle, { color: '#065F46' }]}>Call{'\n'}Support</Text>
                                <Text style={[s.quickSub, { color: '#059669' }]}>Mon–Sat 9AM–8PM</Text>
                            </TouchableOpacity>

                            {/* Raise Complaint */}
                            <TouchableOpacity
                                style={[s.quickCard, { backgroundColor: '#FFF7ED', borderColor: '#F97316' }]}
                                onPress={() => router.push('/complaint')}
                                activeOpacity={0.82}
                            >
                                <Feather name="file-text" size={22} color="#7C2D12" style={{ marginBottom: 4 }} />
                                <Text style={[s.quickTitle, { color: '#7C2D12' }]}>Raise{'\n'}Issue</Text>
                                <Text style={[s.quickSub, { color: '#F97316' }]}>Track your ticket</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* FAQs */}
                <View style={s.faqWrap}>
                    <Text style={s.sectionLabel}>
                        {search ? `RESULTS FOR "${search.toUpperCase()}"` : 'COMMON QUESTIONS'}
                    </Text>
                    {displayFaqs.length === 0 && (
                        <View style={s.emptyWrap}>
                            <Feather name="search" size={40} color="#CBD5E1" style={{ marginBottom: 12 }} />
                            <Text style={s.emptyText}>No results found</Text>
                            <Text style={s.emptySub}>Try a different search or chat with our bot</Text>
                            <TouchableOpacity style={s.emptyCta} onPress={() => router.push('/support-chat')}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text style={s.emptyCtaText}>Chat with Sakhi Bot</Text>
                                    <Feather name="arrow-right" size={14} color="#FFFFFF" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                    {displayFaqs.map(cat => (
                        <View key={cat.id}>
                            {!activeCategory && !search && (
                                <View style={[s.catHeader, { backgroundColor: cat.bg }]}>
                                    <Feather name={cat.icon} size={16} color={cat.color} />
                                    <Text style={[s.catHeaderLabel, { color: cat.color }]}>{cat.label}</Text>
                                </View>
                            )}
                            <View style={s.faqCard}>
                                {cat.questions.map((item, i) => (
                                    <AccordionItem key={i} q={item.q} a={item.a} />
                                ))}
                            </View>
                        </View>
                    ))}
                </View>

                {/* Bottom CTA — Chat with bot always visible */}
                <TouchableOpacity
                    style={s.chatCta}
                    onPress={() => router.push('/support-chat')}
                    activeOpacity={0.88}
                >
                    <Feather name="message-circle" size={28} color="#FFFFFF" />
                    <View style={s.chatCtaText}>
                        <Text style={s.chatCtaTitle}>Still need help?</Text>
                        <Text style={s.chatCtaSub}>Chat with Sakhi Bot — available 24/7</Text>
                    </View>
                    <Feather name="arrow-right" size={20} color="#BEA3D8" />
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F0FF' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 64,
        backgroundColor: '#F5F0FF',
    },
    backBtn: {
        width: 32, height: 32,
        justifyContent: 'center', alignItems: 'flex-start',
        backgroundColor: 'transparent',
    },
    backArrow: { fontSize: 24, color: '#BEA3D8', fontWeight: 'bold' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.5, marginLeft: 16 },

    scroll: { paddingBottom: 40 },

    // Search
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 20,
        marginBottom: 20,
        marginTop: 4,
        gap: 10,
        shadowColor: 'rgba(124,58,237,1)',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    searchIcon: { fontSize: 16 },
    searchInput: { flex: 1, fontSize: 15, fontWeight: '400', color: '#1E1B2E' },
    searchClear: { fontSize: 14, color: '#94A3B8', fontWeight: '600', paddingHorizontal: 4 },

    // Category pills
    catPills: { paddingHorizontal: 20, gap: 8, paddingBottom: 20 },
    catPill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#FFFFFF', borderRadius: 9999,
        paddingHorizontal: 14, paddingVertical: 8,
        borderWidth: 1.5, borderColor: '#E5E0EF',
    },
    catPillActive: { backgroundColor: '#BEA3D8', borderColor: '#BEA3D8' },
    catPillText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    catPillTextActive: { color: '#FFFFFF' },

    // Quick actions
    quickWrap: { paddingHorizontal: 20, marginBottom: 24 },
    sectionLabel: {
        fontSize: 11, fontWeight: '700', color: '#94A3B8',
        letterSpacing: 1.2, textTransform: 'uppercase',
        marginBottom: 14,
    },
    quickRow: { flexDirection: 'row', gap: 12 },
    quickCard: {
        flex: 1, borderRadius: 16, padding: 16, borderWidth: 1.5,
        shadowColor: 'rgba(0,0,0,0.05)', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1, shadowRadius: 8, elevation: 2, gap: 4,
    },
    quickEmoji: { fontSize: 22, marginBottom: 4 },
    quickTitle: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
    quickSub: { fontSize: 10, fontWeight: '400', lineHeight: 14, marginTop: 2 },

    // FAQ section
    faqWrap: { paddingHorizontal: 20 },
    catHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 8, marginBottom: 6,
    },
    catHeaderLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
    faqCard: {
        backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, overflow: 'hidden',
        shadowColor: 'rgba(124,58,237,1)', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
    },

    // Empty state
    emptyWrap: { alignItems: 'center', paddingVertical: 40 },
    emptyEmoji: { fontSize: 40, marginBottom: 12 },
    emptyText: { fontSize: 16, fontWeight: '700', color: '#1E1B2E', marginBottom: 6 },
    emptySub: { fontSize: 13, fontWeight: '400', color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    emptyCta: { backgroundColor: '#BEA3D8', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
    emptyCtaText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

    // Bottom CTA
    chatCta: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: '#1E1B2E', borderRadius: 18, marginHorizontal: 20,
        padding: 20, marginTop: 8,
        shadowColor: 'rgba(30,27,46,1)', shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.2, shadowRadius: 24, elevation: 8,
    },
    chatCtaEmoji: { fontSize: 28 },
    chatCtaText: { flex: 1 },
    chatCtaTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
    chatCtaSub: { fontSize: 12, fontWeight: '400', color: 'rgba(255,255,255,0.65)', lineHeight: 17 },
    chatCtaArrow: { fontSize: 20, color: '#BEA3D8', fontWeight: '700' },
});
