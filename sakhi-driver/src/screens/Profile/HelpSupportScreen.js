import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Linking, Alert, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, Search, Car, BadgeDollarSign, FileWarning,
  ShieldAlert, MessageSquare, Phone, Mail,
  ChevronRight, ChevronUp, ChevronDown,
  Home, TrendingUp, Wallet, User,
} from 'lucide-react-native';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PURPLE  = '#BEA3D8';
const DEEP    = '#7C3AED';
const DARK    = '#1C1A25';
const HEADER  = '#1E1B2E';
const MUTED   = '#6B7280';
const MID     = '#4A4455';
const WHITE   = '#FFFFFF';
const BG      = '#F5F0FF';
const GREEN   = '#059669';
const CARD_SH = {
  shadowColor: '#7C3AED',
  shadowOffset: { width: 0, height: 16 },
  shadowOpacity: 0.08,
  shadowRadius: 32,
  elevation: 3,
};

// ─── Quick Help cards ─────────────────────────────────────────────────────────
const QUICK_HELP = [
  {
    id: 'ride',
    label: 'Ride Issue',
    icon: <Car    size={18} color={PURPLE} strokeWidth={2} />,
    iconBg: 'rgba(190,163,216,0.1)',
  },
  {
    id: 'commission',
    label: 'Commission Help',
    icon: <BadgeDollarSign size={22} color={PURPLE} strokeWidth={2} />,
    iconBg: 'rgba(190,163,216,0.1)',
  },
  {
    id: 'docs',
    label: 'Document\nProblem',
    icon: <FileWarning size={16} color='#7D3D00' strokeWidth={2} />,
    iconBg: 'rgba(255,183,132,0.2)',
  },
  {
    id: 'safety',
    label: 'Safety Concern',
    icon: <ShieldAlert size={16} color='#BA1A1A' strokeWidth={2} />,
    iconBg: 'rgba(186,26,26,0.1)',
  },
];

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQS = [
  {
    id: 'q1',
    q: 'How is my commission calculated?',
    a: 'Commission is calculated based on the distance and time of each completed ride, minus standard platform fees and applicable taxes.',
  },
  { id: 'q2', q: 'What if a rider cancels?', a: 'If a rider cancels after you have already accepted the ride and are en-route, you may receive a cancellation fee. Details depend on the time elapsed.' },
  { id: 'q3', q: 'How do I update expired documents?', a: 'Go to My Profile → Documents and tap "Re-upload" next to the expired document. The review team will approve it within 24 hours.' },
  { id: 'q4', q: 'When does Sakhi pay me?', a: "Earnings are settled to your registered bank account every Monday for the previous week's completed rides." },
];

// ─── Contact channels ─────────────────────────────────────────────────────────
const CONTACTS = [
  {
    id: 'chat',
    icon: <MessageSquare size={20} color={PURPLE} strokeWidth={2} />,
    iconBg: 'rgba(190,163,216,0.1)',
    title: 'Chat with Support',
    sub: '● Online',
    subColor: GREEN,
    onPress: () => Linking.openURL('https://sakhi.app/support-chat'),
  },
  {
    id: 'call',
    icon: <Phone size={18} color={PURPLE} strokeWidth={2} />,
    iconBg: 'rgba(190,163,216,0.1)',
    title: 'Call Support',
    sub: 'Mon–Sat 8AM–8PM',
    subColor: MUTED,
    onPress: () => Linking.openURL('tel:18001234567'),
  },
  {
    id: 'email',
    icon: <Mail size={20} color='#7D3D00' strokeWidth={2} />,
    iconBg: 'rgba(255,183,132,0.2)',
    title: 'Email Us',
    sub: null,
    onPress: () => Linking.openURL('mailto:support@sakhi.app'),
  },
];

// ─── Quick Help Card ──────────────────────────────────────────────────────────
function QuickCard({ item, onPress }) {
  return (
    <TouchableOpacity style={qc.card} onPress={() => onPress(item)} activeOpacity={0.8}>
      <View style={[qc.iconCircle, { backgroundColor: item.iconBg }]}>
        {item.icon}
      </View>
      <Text style={qc.label}>{item.label}</Text>
    </TouchableOpacity>
  );
}
const qc = StyleSheet.create({
  card:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: WHITE, borderRadius: 12, gap: 0, ...CARD_SH },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  label:      { marginTop: 12, fontSize: 14, fontWeight: '600', color: DARK, textAlign: 'center', lineHeight: 20 },
});

// ─── Accordion FAQ row ────────────────────────────────────────────────────────
function FaqRow({ item, isOpen, onToggle, isFirst, isLast }) {
  return (
    <View style={[fr.wrap, !isFirst && fr.border]}>
      <TouchableOpacity style={fr.header} onPress={onToggle} activeOpacity={0.7}>
        <Text style={fr.question}>{item.q}</Text>
        {isOpen
          ? <ChevronUp   size={12} color={PURPLE} strokeWidth={2.5} />
          : <ChevronRight size={7.4} color={MUTED}  strokeWidth={2.5} />
        }
      </TouchableOpacity>
      {isOpen && (
        <Text style={fr.answer}>{item.a}</Text>
      )}
    </View>
  );
}
const fr = StyleSheet.create({
  wrap:     { paddingVertical: 0 },
  border:   { borderTopWidth: 1, borderTopColor: BG },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, gap: 16 },
  question: { flex: 1, fontSize: 15, fontWeight: '500', color: DARK, lineHeight: 22 },
  answer:   { fontSize: 14, fontWeight: '400', color: MUTED, lineHeight: 23, paddingHorizontal: 16, paddingBottom: 16 },
});

// ─── Contact row ──────────────────────────────────────────────────────────────
function ContactRow({ item, isFirst, isLast }) {
  return (
    <TouchableOpacity
      style={[cr.wrap, !isFirst && cr.border]}
      onPress={item.onPress}
      activeOpacity={0.8}
    >
      <View style={cr.iconWrap}>
        <View style={[cr.iconCircle, { backgroundColor: item.iconBg }]}>
          {item.icon}
        </View>
      </View>
      <View style={cr.textCol}>
        <Text style={cr.title}>{item.title}</Text>
        {item.sub && (
          <View style={cr.subRow}>
            {item.id === 'chat' && <View style={cr.onlineDot} />}
            <Text style={[cr.sub, { color: item.subColor }]}>{item.sub}</Text>
          </View>
        )}
      </View>
      <ChevronRight size={7.4} color={MUTED} strokeWidth={2.5} />
    </TouchableOpacity>
  );
}
const cr = StyleSheet.create({
  wrap:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 16 },
  border:     { borderTopWidth: 1, borderTopColor: BG },
  iconWrap:   { marginRight: 16 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  textCol:    { flex: 1, gap: 2 },
  title:      { fontSize: 15, fontWeight: '600', color: DARK, lineHeight: 22 },
  subRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
  sub:        { fontSize: 12, fontWeight: '500', lineHeight: 16 },
});

// ─── Bottom nav tab ───────────────────────────────────────────────────────────
function NavTab({ icon, label, active, onPress }) {
  const color = active ? DEEP : MUTED;
  return (
    <TouchableOpacity
      style={[nav.tab, active && nav.tabActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {React.cloneElement(icon, { color, size: 18, strokeWidth: 2 })}
      <Text style={[nav.label, active && nav.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
const nav = StyleSheet.create({
  tab:         { alignItems: 'center', justifyContent: 'center', gap: 4, flex: 1, paddingVertical: 4 },
  tabActive:   { backgroundColor: BG, borderRadius: 12, paddingHorizontal: 12 },
  label:       { fontSize: 10, fontWeight: '500', color: MUTED, letterSpacing: 1, textTransform: 'uppercase', lineHeight: 15 },
  labelActive: { color: DEEP },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HelpSupportScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq]         = useState('q1'); // first FAQ open by default

  const toggleFaq = useCallback((id) => {
    setOpenFaq((prev) => (prev === id ? null : id));
  }, []);

  const handleQuickHelp = (item) => {
    navigation?.navigate('RaiseAComplaint', { category: item.id });
  };

  // Filter FAQs by search
  const filteredFaqs = searchQuery.trim()
    ? FAQS.filter((f) =>
        f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.a.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : FAQS;

  const HEADER_H = Math.max(insets.top, 0) + 64;
  const NAV_H    = 77 + Math.max(insets.bottom, 0);

  return (
    <View style={s.root}>

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={s.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={16} color={PURPLE} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Help &amp; Support</Text>
        </View>
      </View>

      {/* ── Scroll body ── */}
      <ScrollView
        contentContainerStyle={[s.scroll, {
          paddingTop: HEADER_H + 24,
          paddingBottom: NAV_H + 24,
        }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ════ Search Bar ════ */}
        <View style={s.searchWrap}>
          <View style={s.searchIconWrap}>
            <Search size={18} color={MUTED} strokeWidth={2} />
          </View>
          <TextInput
            style={s.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search help topics…"
            placeholderTextColor={MUTED}
            returnKeyType="search"
          />
        </View>

        {/* ════ Quick Help ════ */}
        {!searchQuery && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Quick Help</Text>
            <View style={s.quickGrid}>
              {/* Row 1 */}
              <View style={s.quickRow}>
                <QuickCard item={QUICK_HELP[0]} onPress={handleQuickHelp} />
                <View style={{ width: 16 }} />
                <QuickCard item={QUICK_HELP[1]} onPress={handleQuickHelp} />
              </View>
              {/* Row 2 */}
              <View style={[s.quickRow, { marginTop: 16 }]}>
                <QuickCard item={QUICK_HELP[2]} onPress={handleQuickHelp} />
                <View style={{ width: 16 }} />
                <QuickCard item={QUICK_HELP[3]} onPress={handleQuickHelp} />
              </View>
            </View>
          </View>
        )}

        {/* ════ Common Questions ════ */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Common Questions</Text>
          <View style={[s.card, { padding: 0 }]}>
            {filteredFaqs.length === 0
              ? <Text style={s.noResults}>No results for "{searchQuery}"</Text>
              : filteredFaqs.map((faq, i) => (
                  <FaqRow
                    key={faq.id}
                    item={faq}
                    isOpen={openFaq === faq.id}
                    onToggle={() => toggleFaq(faq.id)}
                    isFirst={i === 0}
                    isLast={i === filteredFaqs.length - 1}
                  />
                ))
            }
          </View>
        </View>

        {/* ════ Contact Us ════ */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Contact Us</Text>
          <View style={[s.card, { padding: 0 }]}>
            {CONTACTS.map((c, i) => (
              <ContactRow
                key={c.id}
                item={c}
                isFirst={i === 0}
                isLast={i === CONTACTS.length - 1}
              />
            ))}
          </View>
        </View>

      </ScrollView>

      {/* ── Bottom Nav ── */}
      <View style={[s.bottomNav, { paddingBottom: Math.max(insets.bottom, 8), height: NAV_H }]}>
        <NavTab icon={<Home />}       label="HOME"     active={false} onPress={() => navigation?.navigate('DriverHome')} />
        <NavTab icon={<TrendingUp />} label="EARNINGS" active={false} onPress={() => navigation?.navigate('MyEarnings')} />
        <NavTab icon={<Wallet />}     label="WALLET"   active={true}  onPress={() => {}} />
        <NavTab icon={<User />}       label="ACCOUNT"  active={false} onPress={() => navigation?.navigate('MyProfile')} />
      </View>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingBottom: 14,
    backgroundColor: 'rgba(245, 240, 255, 0.88)',
    ...Platform.select({
      ios: { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32 },
      android: { elevation: 4 },
    }),
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: HEADER, letterSpacing: -0.5, lineHeight: 28 },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scroll: { paddingHorizontal: 24, gap: 32 },

  // ── Search ────────────────────────────────────────────────────────────────
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, borderRadius: 12,
    paddingLeft: 48, paddingRight: 16,
    height: 55, position: 'relative', ...CARD_SH,
  },
  searchIconWrap: {
    position: 'absolute', left: 16, top: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', width: 18,
  },
  searchInput: {
    flex: 1, fontSize: 16, fontWeight: '400', color: DARK,
    lineHeight: 19,
  },

  // ── Section ───────────────────────────────────────────────────────────────
  section:      { gap: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: MUTED, letterSpacing: 1.4, textTransform: 'uppercase', lineHeight: 20, paddingLeft: 4 },

  // ── Quick Help grid ───────────────────────────────────────────────────────
  quickGrid: { gap: 0 },
  quickRow:  { flexDirection: 'row' },

  // ── Generic white card ────────────────────────────────────────────────────
  card: { backgroundColor: WHITE, borderRadius: 12, overflow: 'hidden', ...CARD_SH },

  // ── No results ────────────────────────────────────────────────────────────
  noResults: { padding: 24, textAlign: 'center', color: MUTED, fontSize: 14 },

  // ── Bottom Nav ────────────────────────────────────────────────────────────
  bottomNav: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingTop: 8,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    ...Platform.select({
      ios: { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: -16 }, shadowOpacity: 0.08, shadowRadius: 32 },
      android: { elevation: 12 },
    }),
  },
});
