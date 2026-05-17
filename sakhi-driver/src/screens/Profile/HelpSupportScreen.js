import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Linking, Modal,
  KeyboardAvoidingView, FlatList, ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, Search, Car, BadgeDollarSign, FileWarning,
  ShieldAlert, MessageSquare, Phone, Mail,
  ChevronRight, ChevronUp, ChevronDown, Send, X, Bot,
} from 'lucide-react-native';
import BottomNavBar from '../../components/BottomNavBar';
import ScreenHeader from '../../components/ScreenHeader';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PURPLE  = '#BEA3D8';
const DEEP    = '#7C3AED';
const DARK    = '#1E1B2E';
const MUTED   = '#6B7280';
const WHITE   = '#FFFFFF';
const BG      = '#F5F0FF';
const GREEN   = '#059669';
const CARD_SH = {
  shadowColor: 'rgba(124, 58, 237, 1)',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 3,
};

// ─── Quick Help cards ─────────────────────────────────────────────────────────
const QUICK_HELP = [
  { id: 'ride',       label: 'Ride Issue',        icon: <Car           size={18} color={PURPLE} strokeWidth={2} />, iconBg: 'rgba(190,163,216,0.1)' },
  { id: 'commission', label: 'Commission Help',   icon: <BadgeDollarSign size={22} color={PURPLE} strokeWidth={2} />, iconBg: 'rgba(190,163,216,0.1)' },
  { id: 'docs',       label: 'Document\nProblem', icon: <FileWarning   size={16} color='#7D3D00' strokeWidth={2} />, iconBg: 'rgba(255,183,132,0.2)' },
  { id: 'safety',     label: 'Safety Concern',    icon: <ShieldAlert   size={16} color='#BA1A1A' strokeWidth={2} />, iconBg: 'rgba(186,26,26,0.1)' },
];

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQS = [
  { id: 'q1', q: 'How is my commission calculated?',   a: 'Commission is calculated based on the distance and time of each completed ride.' },
  { id: 'q3', q: 'How do I update expired documents?', a: 'Go to My Profile → Documents and tap "Re-upload" next to the expired document. The review team will approve it within 24 hours.' },
  { id: 'q4', q: 'When does Sakhi pay me?',             a: 'On-demand rides are settled directly by customers. Subscription ride payments are made every 7 completed rides.' },
];

// ─── Chatbot knowledge base ───────────────────────────────────────────────────
const BOT_RESPONSES = [
  { keywords: ['commission', 'earning', 'money', 'pay', 'salary', 'income'],     answer: 'Your commission is calculated per ride based on distance + time. You can view your daily earnings on the home screen or in My Earnings. Payments for subscription rides are made every 7 completed rides.' },
  { keywords: ['document', 'kyc', 'license', 'dl', 'expired', 'upload', 'reupload', 're-upload'], answer: 'To update expired documents, go to My Profile → My Documents → tap Re-upload. Our team reviews uploads within 24 hours.' },
  { keywords: ['ride', 'request', 'accept', 'cancel', 'booking'],                answer: 'Ride requests appear as a popup when you are online. You have 30 seconds to accept. Cancelled rides are noted against your acceptance rate.' },
  { keywords: ['online', 'offline', 'toggle', 'status', 'not receiving'],         answer: 'Make sure you are online (toggle the button on the home screen). Ensure GPS is enabled and the app has location permission.' },
  { keywords: ['safety', 'sos', 'emergency', 'danger', 'unsafe'],                answer: 'For emergencies, press the SOS button in the app. Our team will alert your emergency contacts and dispatch support.' },
  { keywords: ['subscription', 'scheduled', 'regular', 'weekly'],                answer: 'Subscription rides are pre-scheduled trips with regular customers. Check your upcoming subscriptions in the home screen.' },
  { keywords: ['rating', 'review', 'star', 'feedback'],                          answer: 'Your rating is the average of all customer reviews. Maintaining a high rating improves your ride priority in our matching system.' },
  { keywords: ['payment', 'upi', 'cash', 'digital', 'wallet'],                   answer: 'Customers can pay via cash or digital payment. Ensure you confirm payment receipt before ending the trip.' },
  { keywords: ['hello', 'hi', 'hey', 'namaste', 'hii'],                          answer: 'Hi! 👋 I am your Sakhi Support assistant. Ask me anything about rides, earnings, documents, or your account.' },
  { keywords: ['thank', 'thanks', 'ok', 'okay', 'great'],                         answer: 'Happy to help! 😊 Is there anything else I can assist you with?' },
  { keywords: ['complaint', 'issue', 'problem', 'report', 'raise'],               answer: 'To raise a complaint, use the Quick Help cards above or go to My Complaints in the sidebar menu. Our team responds within 24 hours.' },
  { keywords: ['app', 'crash', 'bug', 'slow', 'not working'],                    answer: 'If the app is not working well, try: 1) Force close and reopen the app, 2) Check your internet connection, 3) Clear app cache in Android settings.' },
];

function getBotReply(userText) {
  const lower = userText.toLowerCase();
  for (const item of BOT_RESPONSES) {
    if (item.keywords.some((k) => lower.includes(k))) {
      return item.answer;
    }
  }
  return "I'm not sure about that yet. For specific issues, you can call our support line at 1800-123-4567 (Mon–Sat 8AM–8PM) or raise a complaint via the Quick Help section.";
}

// ─── Support Chatbot Modal ────────────────────────────────────────────────────
function SupportChatModal({ visible, onClose, driverName }) {
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      id: '0',
      role: 'bot',
      text: `Hi ${driverName || 'there'}! 👋 I'm your Sakhi Support assistant.\n\nHow can I help you today?`,
      ts: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [botTyping, setBotTyping] = useState(false);

  const sendMessage = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg = { id: String(Date.now()), role: 'user', text: trimmed, ts: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    Keyboard.dismiss();

    // Simulate bot typing delay
    setBotTyping(true);
    const delay = 800 + Math.random() * 600;
    setTimeout(() => {
      const reply = getBotReply(trimmed);
      const botMsg = { id: String(Date.now() + 1), role: 'bot', text: reply, ts: new Date() };
      setMessages((prev) => [...prev, botMsg]);
      setBotTyping(false);
    }, delay);
  }, [input]);

  const sendQuickReply = (text) => {
    setInput(text);
    setTimeout(() => {
      const userMsg = { id: String(Date.now()), role: 'user', text, ts: new Date() };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setBotTyping(true);
      setTimeout(() => {
        const reply = getBotReply(text);
        const botMsg = { id: String(Date.now() + 1), role: 'bot', text: reply, ts: new Date() };
        setMessages((prev) => [...prev, botMsg]);
        setBotTyping(false);
      }, 900);
    }, 50);
  };

  const QUICK_CHIPS = ['Commission help', 'My documents', 'Ride issue', 'Not receiving rides'];

  const renderItem = ({ item }) => {
    const isBot = item.role === 'bot';
    return (
      <View style={[chat.msgRow, isBot ? chat.botRow : chat.userRow]}>
        {isBot && (
          <View style={chat.botAvatar}>
            <Bot size={14} color={WHITE} strokeWidth={2} />
          </View>
        )}
        <View style={[chat.bubble, isBot ? chat.botBubble : chat.userBubble]}>
          <Text style={[chat.bubbleText, isBot ? chat.botText : chat.userText]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[chat.root, { paddingTop: insets.top }]}>

        {/* ── Header ── */}
        <View style={chat.header}>
          <View style={chat.headerLeft}>
            <View style={chat.headerAvatar}>
              <Bot size={20} color={WHITE} strokeWidth={2} />
            </View>
            <View>
              <Text style={chat.headerName}>Sakhi Support</Text>
              <View style={chat.onlineRow}>
                <View style={chat.onlineDot} />
                <Text style={chat.onlineText}>Always available</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={chat.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={20} color={DARK} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* ── Message list ── */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={chat.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            botTyping ? (
              <View style={[chat.msgRow, chat.botRow]}>
                <View style={chat.botAvatar}>
                  <Bot size={14} color={WHITE} strokeWidth={2} />
                </View>
                <View style={[chat.bubble, chat.botBubble, chat.typingBubble]}>
                  <ActivityIndicator size="small" color={PURPLE} />
                </View>
              </View>
            ) : null
          }
        />

        {/* ── Quick-reply chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={chat.chips}
          keyboardShouldPersistTaps="always"
        >
          {QUICK_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip}
              style={chat.chip}
              onPress={() => sendQuickReply(chip)}
              activeOpacity={0.8}
            >
              <Text style={chat.chipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Input bar ── */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.bottom + 8}
        >
          <View style={[chat.inputBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TextInput
              style={chat.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type your question…"
              placeholderTextColor={MUTED}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
              multiline
              maxLength={400}
            />
            <TouchableOpacity
              style={[chat.sendBtn, !input.trim() && chat.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!input.trim()}
              activeOpacity={0.8}
            >
              <Send size={18} color={WHITE} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── ChatModal styles ─────────────────────────────────────────────────────────
const chat = StyleSheet.create({
  root:         { flex: 1, backgroundColor: BG },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: WHITE, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EDE9FE', ...CARD_SH },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  headerName:   { fontSize: 16, fontWeight: '700', color: DARK },
  onlineRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  onlineDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
  onlineText:   { fontSize: 12, color: GREEN, fontWeight: '500' },
  closeBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },

  listContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, gap: 12 },
  msgRow:      { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  botRow:      { alignSelf: 'flex-start', maxWidth: '82%' },
  userRow:     { alignSelf: 'flex-end',  maxWidth: '82%', flexDirection: 'row-reverse' },
  botAvatar:   { width: 28, height: 28, borderRadius: 14, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubble:      { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  botBubble:   { backgroundColor: WHITE, borderBottomLeftRadius: 4, ...CARD_SH },
  userBubble:  { backgroundColor: PURPLE, borderBottomRightRadius: 4 },
  bubbleText:  { fontSize: 15, lineHeight: 22 },
  botText:     { color: DARK },
  userText:    { color: WHITE },
  typingBubble: { paddingVertical: 14, paddingHorizontal: 20 },

  chips:       { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip:        { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: WHITE, borderRadius: 20, borderWidth: 1.5, borderColor: PURPLE, ...CARD_SH },
  chipText:    { fontSize: 13, fontWeight: '600', color: DEEP },

  inputBar:    { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 10, backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: '#EDE9FE' },
  input:       { flex: 1, backgroundColor: BG, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: DARK, maxHeight: 100, lineHeight: 21 },
  sendBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  sendBtnDisabled: { opacity: 0.45 },
});

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
  card:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: WHITE, borderRadius: 12, ...CARD_SH },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  label:      { marginTop: 12, fontSize: 14, fontWeight: '600', color: DARK, textAlign: 'center', lineHeight: 20 },
});

// ─── Accordion FAQ row ────────────────────────────────────────────────────────
function FaqRow({ item, isOpen, onToggle, isFirst }) {
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
function ContactRow({ item, isFirst }) {
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HelpSupportScreen({ navigation }) {
  const { t } = useTranslation();
  const { driver } = useAuth();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery]   = useState('');
  const [openFaq, setOpenFaq]           = useState('q1');
  const [chatVisible, setChatVisible]   = useState(false);

  const toggleFaq = useCallback((id) => {
    setOpenFaq((prev) => (prev === id ? null : id));
  }, []);

  const handleQuickHelp = (item) => {
    navigation?.navigate('RaiseAComplaint', { category: item.id });
  };

  const CONTACTS = [
    {
      id: 'chat',
      icon: <MessageSquare size={20} color={PURPLE} strokeWidth={2} />,
      iconBg: 'rgba(190,163,216,0.1)',
      title: 'Chat with Support',
      sub: '● Online',
      subColor: GREEN,
      // ✅ Opens in-app chatbot instead of browser
      onPress: () => setChatVisible(true),
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

  const filteredFaqs = searchQuery.trim()
    ? FAQS.filter((f) =>
        f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.a.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : FAQS;

  return (
    <View style={s.root}>
      <ScreenHeader title={t('sidebar.helpSupport')} onBack={() => navigation?.goBack()} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: 16, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
              <View style={s.quickRow}>
                <QuickCard item={QUICK_HELP[0]} onPress={handleQuickHelp} />
                <View style={{ width: 16 }} />
                <QuickCard item={QUICK_HELP[1]} onPress={handleQuickHelp} />
              </View>
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
              />
            ))}
          </View>
        </View>

      </ScrollView>

      <BottomNavBar navigation={navigation} activeTab="account" />

      {/* ════ In-app Support Chatbot ════ */}
      <SupportChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        driverName={driver?.name?.split(' ')?.[0]}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  scroll:  { paddingHorizontal: 24, gap: 32 },

  searchWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE, borderRadius: 12, paddingLeft: 48, paddingRight: 16, height: 55, position: 'relative', ...CARD_SH },
  searchIconWrap: { position: 'absolute', left: 16, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', width: 18 },
  searchInput:    { flex: 1, fontSize: 16, fontWeight: '400', color: DARK, lineHeight: 19 },

  section:      { gap: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: MUTED, letterSpacing: 1.4, textTransform: 'uppercase', lineHeight: 20, paddingLeft: 4 },

  quickGrid: { gap: 0 },
  quickRow:  { flexDirection: 'row' },

  card:       { backgroundColor: WHITE, borderRadius: 12, overflow: 'hidden', ...CARD_SH },
  noResults:  { padding: 24, textAlign: 'center', color: MUTED, fontSize: 14 },
});
