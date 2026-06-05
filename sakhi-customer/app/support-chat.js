import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    FlatList, KeyboardAvoidingView, Platform, Animated,
    ActivityIndicator, Dimensions, StatusBar, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { sendSupportMessage, getSupportHistory, getSupportSessions } from '../src/api/endpoints';
import { Feather } from '@expo/vector-icons';
import { ANDROID_STATUS_BAR_HEIGHT, KEYBOARD_BEHAVIOR } from '../src/utils/androidUtils';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Quick suggestion chips ────────────────────────────────────────────────────
const QUICK_CHIPS = [
    { label: 'Cancel Ride', icon: 'x-circle', text: 'How do I cancel my ride?' },
    { label: 'Refund', icon: 'credit-card', text: 'I need a refund for my last ride' },
    { label: 'Lost Item', icon: 'package', text: 'I forgot something in the auto' },
    { label: 'Payment Issue', icon: 'alert-circle', text: 'My payment failed but I was charged' },
    { label: 'Subscription', icon: 'refresh-cw', text: 'Help me with my subscription plan' },
    { label: 'Account', icon: 'user', text: 'I need help with my account' },
];

// ── Intro messages shown before session starts ────────────────────────────────
const INTRO_MESSAGES = [
    {
        id: 'intro-1',
        sender: 'bot',
        message: '👋 Hello! I\'m **Sakhi Assistant** — your 24/7 support companion.\n\nI can help you with ride issues, payments, lost items, and more.',
        created_at: new Date().toISOString(),
    },
    {
        id: 'intro-2',
        sender: 'bot',
        message: 'Choose a topic below or type your question in any language.',
        created_at: new Date().toISOString(),
    },
];

// ── Format time ───────────────────────────────────────────────────────────────
function formatTime(iso) {
    try {
        const d = new Date(iso);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return ''; }
}

// ── Parse **bold** markdown inline ────────────────────────────────────────────
function BoldText({ text, style }) {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return (
        <Text style={style}>
            {parts.map((part, i) =>
                i % 2 === 1
                    ? <Text key={i} style={[style, { fontWeight: '800', color: style?.color }]}>{part}</Text>
                    : <Text key={i}>{part}</Text>
            )}
        </Text>
    );
}

// ── Single Message Bubble ─────────────────────────────────────────────────────
const MessageBubble = React.memo(({ item, prevSender }) => {
    const isUser = item.sender === 'user';
    const isBot  = item.sender === 'bot';
    const showAvatar = isBot && prevSender !== 'bot';
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(isUser ? 20 : -20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 280, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
        ]).start();
    }, []);

    if (item.isTyping) {
        return (
            <View style={[styles.row, styles.rowBot]}>
                <View style={styles.botAvatar}>
                    <Text style={styles.botAvatarText}>S</Text>
                </View>
                <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
                    <View style={styles.typingDots}>
                        {[0, 1, 2].map(i => <TypingDot key={i} delay={i * 160} />)}
                    </View>
                </View>
            </View>
        );
    }

    return (
        <Animated.View
            style={[
                styles.row,
                isUser ? styles.rowUser : styles.rowBot,
                { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }
            ]}
        >
            {isBot && (
                <View style={[styles.botAvatar, !showAvatar && { opacity: 0 }]}>
                    <Text style={styles.botAvatarText}>S</Text>
                </View>
            )}

            <View style={[
                styles.bubbleWrapper,
                isUser ? styles.bubbleWrapperUser : styles.bubbleWrapperBot
            ]}>
                <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
                    <BoldText
                        text={item.message}
                        style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextBot]}
                    />
                </View>
                <Text style={[styles.timestamp, isUser ? styles.timestampRight : styles.timestampLeft]}>
                    {formatTime(item.created_at)}
                    {isUser && <Feather name="check" size={10} color="#F5F0FF" style={{ marginLeft: 2 }} />}
                </Text>
            </View>
        </Animated.View>
    );
});

function TypingDot({ delay }) {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(anim, { toValue: -6, duration: 300, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0,  duration: 300, useNativeDriver: true }),
                Animated.delay(600 - delay),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return <Animated.View style={[styles.dot, { transform: [{ translateY: anim }] }]} />;
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Screen
// ═════════════════════════════════════════════════════════════════════════════
export default function SupportChatScreen() {
    const router  = useRouter();
    const { user } = useAuth();
    const listRef = useRef(null);

    const insets = useSafeAreaInsets();
    const topInset = Platform.OS === 'ios' ? insets.top : ANDROID_STATUS_BAR_HEIGHT;
    const headerPaddingTop = topInset + 12;
    const keyboardVerticalOffset = headerPaddingTop + 60;
    const inputBarPaddingBottom = Math.max(insets.bottom, 0) + 10;

    const [messages, setMessages]       = useState(INTRO_MESSAGES);
    const [input, setInput]             = useState('');
    const [sending, setSending]         = useState(false);
    const [sessionId, setSessionId]     = useState(null);
    const [isTyping, setIsTyping]       = useState(false);
    const [escalated, setEscalated]     = useState(false);
    const [showChips, setShowChips]     = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const inputRef                      = useRef(null);
    const chipFade                      = useRef(new Animated.Value(1)).current;

    // Load existing active/escalated support session on mount
    useEffect(() => {
        const loadActiveSession = async () => {
            setLoadingHistory(true);
            try {
                const { data } = await getSupportSessions();
                const sessions = data?.sessions || [];
                // Find first non-closed session
                const active = sessions.find((s) => s.status !== 'closed');
                if (active) {
                    setSessionId(active.id);
                    setEscalated(active.status === 'escalated' || active.status === 'urgent');
                    setShowChips(false);

                    // Fetch messages history
                    const { data: histData } = await getSupportHistory(active.id);
                    const histMsgs = histData?.messages || [];
                    if (histMsgs.length > 0) {
                        setMessages([...INTRO_MESSAGES, ...histMsgs]);
                    }
                }
            } catch (err) {
                console.warn('[SupportChat] Error loading active session:', err);
            } finally {
                setLoadingHistory(false);
            }
        };
        loadActiveSession();
    }, []);

    // Poll active session messages every 4 seconds
    useEffect(() => {
        if (!sessionId) return;

        let active = true;
        const poll = async () => {
            try {
                const { data: histData } = await getSupportHistory(sessionId);
                if (!active) return;

                const histMsgs = histData?.messages || [];
                setMessages((prev) => {
                    const typingMsg = prev.find((m) => m.isTyping);
                    const nonTypingPrev = prev.filter((m) => !m.isTyping);

                    const lastHistMsg = histMsgs[histMsgs.length - 1];
                    const lastPrevMsg = nonTypingPrev[nonTypingPrev.length - 1];

                    if (
                        histMsgs.length !== (nonTypingPrev.length - INTRO_MESSAGES.length) ||
                        (lastHistMsg && lastPrevMsg && lastHistMsg.id !== lastPrevMsg.id)
                    ) {
                        if (typingMsg) {
                            return [...INTRO_MESSAGES, ...histMsgs, typingMsg];
                        }
                        return [...INTRO_MESSAGES, ...histMsgs];
                    }
                    return prev;
                });

                if (histData?.session?.status) {
                    setEscalated(
                        histData.session.status === 'escalated' || histData.session.status === 'urgent'
                    );
                }
            } catch (err) {
                console.warn('[SupportChat] Poll error:', err);
            }
        };

        const interval = setInterval(poll, 4000);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [sessionId]);

    // Scroll to bottom whenever messages change
    useEffect(() => {
        const timer = setTimeout(() => {
            listRef.current?.scrollToEnd?.({ animated: true });
        }, 80);
        return () => clearTimeout(timer);
    }, [messages]);

    const hideChips = () => {
        Animated.timing(chipFade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
            setShowChips(false);
        });
    };

    const handleSend = useCallback(async (overrideText) => {
        const text = (overrideText ?? input).trim();
        if (!text || sending) return;

        setInput('');
        setSending(true);
        hideChips();

        // Optimistically add user message
        const userMsg = {
            id: `local-${Date.now()}`,
            sender: 'user',
            message: text,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMsg]);

        // Show typing indicator
        setTimeout(() => {
            setIsTyping(true);
            setMessages(prev => [...prev, { id: 'typing', sender: 'bot', isTyping: true, created_at: new Date().toISOString() }]);
        }, 300);

        try {
            const { data } = await sendSupportMessage(text, sessionId);

            // Remove typing indicator + add real bot reply
            setIsTyping(false);
            setMessages(prev => [
                ...prev.filter(m => m.id !== 'typing'),
                data.bot_reply,
            ]);

            if (data.session_id) setSessionId(data.session_id);
            if (data.escalated) setEscalated(true);
        } catch (err) {
            setIsTyping(false);
            setMessages(prev => [
                ...prev.filter(m => m.id !== 'typing'),
                {
                    id: `err-${Date.now()}`,
                    sender: 'bot',
                    message: '⚠️ I\'m having trouble connecting right now. Please try again in a moment.',
                    created_at: new Date().toISOString(),
                },
            ]);
        } finally {
            setSending(false);
        }
    }, [input, sending, sessionId]);

    const renderItem = useCallback(({ item, index }) => {
        const prev = messages[index - 1];
        return <MessageBubble item={item} prevSender={prev?.sender} />;
    }, [messages]);

    const keyExtractor = useCallback((item) => item.id || item.created_at, []);

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="#9E7FC4" />

            {/* ── Header ── */}
            <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/')}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Feather name="arrow-left" size={20} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <View style={styles.botHeaderAvatar}>
                        <Text style={styles.botHeaderAvatarText}>S</Text>
                        <View style={styles.onlineDot} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Sakhi Support</Text>
                        <Text style={styles.headerSub}>
                            {escalated ? '🔴 Connecting to agent…' : '🟢 Bot online · Usually replies instantly'}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.menuBtn} onPress={() => router.push('/complaint')}>
                    <Feather name="more-vertical" size={22} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={KEYBOARD_BEHAVIOR}
                keyboardVerticalOffset={keyboardVerticalOffset}
            >
                {/* ── Message List ── */}
                {loadingHistory ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#9E7FC4" />
                        <Text style={{ marginTop: 10, color: '#64748B', fontSize: 13 }}>Loading active chat...</Text>
                    </View>
                ) : (
                    <FlatList
                        ref={listRef}
                        data={messages}
                        renderItem={renderItem}
                        keyExtractor={keyExtractor}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: true })}
                        ListFooterComponent={<View style={{ height: 12 }} />}
                    />
                )}

                {/* ── Quick Chips ── */}
                {showChips && (
                    <Animated.View style={[styles.chipsWrapper, { opacity: chipFade }]}>
                        <FlatList
                            horizontal
                            data={QUICK_CHIPS}
                            keyExtractor={(item) => item.label}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.chipsList}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.chip}
                                    onPress={() => handleSend(item.text)}
                                    activeOpacity={0.75}
                                >
                                    <Text style={styles.chipText}>
                                        <Feather name={item.icon} size={13} color="#BEA3D8" />{' '}{item.label}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    </Animated.View>
                )}

                {/* ── Input Bar ── */}
                <View style={[styles.inputBar, { paddingBottom: inputBarPaddingBottom }]}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            ref={inputRef}
                            style={styles.input}
                            placeholder="Type a message…"
                            placeholderTextColor="rgba(190, 163, 216, 0.6)"
                            value={input}
                            onChangeText={setInput}
                            multiline
                            maxLength={1000}
                            onFocus={hideChips}
                            returnKeyType="default"
                            blurOnSubmit={false}
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
                        onPress={() => handleSend()}
                        disabled={!input.trim() || sending}
                        activeOpacity={0.8}
                    >
                        {sending
                            ? <ActivityIndicator size="small" color="#1E1B2E" />
                            : <Feather name="arrow-up" size={20} color="#1E1B2E" />
                        }
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const PURPLE_DARK  = '#BEA3D8';
const PURPLE_MID   = '#BEA3D8';
const PURPLE_LIGHT = '#BEA3D8';
const PURPLE_PALE  = '#F5F0FF';
const WHITE        = '#FFFFFF';
const DARK         = '#1E1B2E';
const MUTED        = '#64748B';

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#F8F5FF',
        paddingTop: 0,
    },
    flex: { flex: 1 },

    // ── Header ──────────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#9E7FC4',
        gap: 12,
        // Gradient-like shadow
        shadowColor: '#9E7FC4',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
    },
    backBtn: {
        width: 36, height: 36,
        alignItems: 'center', justifyContent: 'center',
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    backArrow: { fontSize: 20, color: WHITE, fontWeight: '600' },
    headerCenter: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    botHeaderAvatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(190,163,216,0.25)',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative',
    },
    botHeaderAvatarText: {
        fontSize: 18, fontWeight: '800', color: WHITE,
    },
    onlineDot: {
        position: 'absolute', bottom: 1, right: 1,
        width: 11, height: 11, borderRadius: 6,
        backgroundColor: '#22C55E',
        borderWidth: 2, borderColor: '#9E7FC4',
    },
    headerTitle: {
        fontSize: 16, fontWeight: '700', color: WHITE, letterSpacing: -0.3,
    },
    headerSub: {
        fontSize: 11, fontWeight: '400', color: 'rgba(255,255,255,0.7)',
        marginTop: 1,
    },
    menuBtn: {
        width: 36, height: 36,
        alignItems: 'center', justifyContent: 'center',
    },
    menuIcon: { fontSize: 22, color: WHITE, fontWeight: '700' },

    // ── Message List ─────────────────────────────────────────────────────────
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 20,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 6,
        alignItems: 'flex-end',
        gap: 8,
    },
    rowUser: { justifyContent: 'flex-end' },
    rowBot:  { justifyContent: 'flex-start' },

    botAvatar: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: PURPLE_MID,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 2,
    },
    botAvatarText: { fontSize: 14, fontWeight: '800', color: DARK },

    bubbleWrapper: { maxWidth: SCREEN_W * 0.72, gap: 3 },
    bubbleWrapperUser: { alignItems: 'flex-end' },
    bubbleWrapperBot:  { alignItems: 'flex-start' },

    bubble: {
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 10,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    bubbleUser: {
        backgroundColor: PURPLE_MID,
        borderBottomRightRadius: 4,
        shadowColor: PURPLE_MID,
        shadowOpacity: 0.25,
    },
    bubbleBot: {
        backgroundColor: WHITE,
        borderBottomLeftRadius: 4,
        shadowColor: PURPLE_DARK,
        shadowOpacity: 0.08,
    },
    bubbleText: { fontSize: 14.5, lineHeight: 21 },
    bubbleTextUser: { color: DARK, fontWeight: '500' },
    bubbleTextBot:  { color: DARK,  fontWeight: '400' },

    timestamp: {
        fontSize: 10, color: MUTED, letterSpacing: 0.2,
    },
    timestampRight: { textAlign: 'right' },
    timestampLeft:  { textAlign: 'left' },

    // Typing bubble
    typingBubble: { paddingVertical: 14, paddingHorizontal: 18 },
    typingDots: { flexDirection: 'row', gap: 5, alignItems: 'center', height: 14 },
    dot: {
        width: 7, height: 7, borderRadius: 3.5,
        backgroundColor: PURPLE_LIGHT,
    },

    // ── Quick Chips ──────────────────────────────────────────────────────────
    chipsWrapper: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(190,163,216,0.2)',
        paddingVertical: 10,
        backgroundColor: PURPLE_PALE,
    },
    chipsList: { paddingHorizontal: 16, gap: 8 },
    chip: {
        backgroundColor: WHITE,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderWidth: 1.5,
        borderColor: 'rgba(190, 163, 216, 0.4)',
        shadowColor: PURPLE_MID,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    chipText: {
        fontSize: 13, fontWeight: '600',
        color: DARK, letterSpacing: -0.2,
    },

    // ── Input Bar ────────────────────────────────────────────────────────────
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
        backgroundColor: WHITE,
        borderTopWidth: 1,
        borderTopColor: 'rgba(190,163,216,0.18)',
        shadowColor: PURPLE_DARK,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 8,
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: PURPLE_PALE,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: 'rgba(190, 163, 216, 0.4)',
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 10 : 6,
        maxHeight: 120,
    },
    input: {
        fontSize: 15,
        color: DARK,
        fontWeight: '400',
        lineHeight: 21,
    },
    sendBtn: {
        width: 44, height: 44,
        borderRadius: 22,
        backgroundColor: PURPLE_MID,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: PURPLE_MID,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
    },
    sendBtnDisabled: {
        backgroundColor: 'rgba(190,163,216,0.45)',
        shadowOpacity: 0,
        elevation: 0,
    },
    sendIcon: { fontSize: 20, color: WHITE, fontWeight: '800', marginTop: -2 },
});
