import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput,
    TouchableOpacity, KeyboardAvoidingView, Platform,
    ActivityIndicator, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, BorderRadius, Shadows } from '../utils/theme';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { getChatHistory } from '../api/endpoints';
import { KEYBOARD_BEHAVIOR } from '../utils/androidUtils';
import { Feather } from '@expo/vector-icons';

/**
 * In-ride chat modal.
 * Props:
 *   - rideId (string) — current ride ID
 *   - onClose (fn)    — callback to dismiss
 */
export default function ChatModal({ rideId, onClose }) {
    const { user } = useAuth();
    const { on, off, emit, joinRideRoom } = useSocket();
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const listRef = useRef(null);
    const keyboardVerticalOffset = Math.max(insets.top + 56, 56);

    const mapToUiMessage = (m) => {
        if (!m) return null;
        // Backend schema: { id, sender_role, message_en, message_kn, sent_at }
        if (m.sender_role) {
            return {
                id: m.id != null ? String(m.id) : undefined,
                sender_role: m.sender_role,
                message_en: m.message_en ?? null,
                message_kn: m.message_kn ?? null,
                sent_at: m.sent_at ?? new Date().toISOString(),
            };
        }
        // Legacy/optimistic shape fallback
        return {
            id: m.id != null ? String(m.id) : undefined,
            sender_role: m.sender === 'customer' ? 'rider' : (m.sender === 'driver' ? 'driver' : null),
            message_en: m.text ?? null,
            message_kn: null,
            sent_at: m.timestamp ?? new Date().toISOString(),
        };
    };

    const getDisplayText = (m) => (m?.message_kn || m?.message_en || '');

    // Ensure we are joined to the ride room (so we receive chat broadcasts)
    useEffect(() => {
        if (!rideId) return;
        joinRideRoom?.(rideId).catch(() => { });
    }, [rideId, joinRideRoom]);

    // Load chat history on mount
    useEffect(() => {
        if (!rideId) { setLoading(false); return; }
        getChatHistory(rideId)
            .then(({ data }) => {
                const list = (data.messages || []).map(mapToUiMessage).filter(Boolean);
                setMessages(list);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [rideId]);

    // Listen for incoming messages
    useEffect(() => {
        const handleIncoming = (msg) => {
            const incoming = mapToUiMessage(msg);
            if (!incoming) return;
            setMessages((prev) => {
                const next = [...prev];
                // If we optimistically added the same message, replace it.
                for (let i = next.length - 1; i >= 0; i--) {
                    const candidate = next[i];
                    if (
                        candidate?.id?.startsWith?.('local_') &&
                        candidate.sender_role === incoming.sender_role &&
                        getDisplayText(candidate) === getDisplayText(incoming)
                    ) {
                        next[i] = { ...incoming, id: candidate.id };
                        return next;
                    }
                    // Stop early once we cross into non-local messages
                    if (!candidate?.id?.startsWith?.('local_')) break;
                }
                next.push(incoming);
                return next;
            });
        };
        on('chat:message', handleIncoming);
        return () => off('chat:message', handleIncoming);
    }, [on, off]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages]);

    const sendMessage = () => {
        const trimmed = text.trim();
        if (!trimmed || !rideId) return;

        // Optimistically append in backend-compatible shape
        const optimistic = {
            id: `local_${Date.now()}`,
            sender_role: 'rider',
            message_en: trimmed,
            message_kn: null,
            sent_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimistic]);
        setText('');

        // Emit via socket
        emit('chat:send', { ride_id: rideId, message: trimmed });
    };

    const formatTime = (ts) => {
        try {
            return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    };

    const renderMessage = ({ item }) => {
        const isOwn = item.sender_role === 'rider';
        return (
            <View style={[styles.msgRow, isOwn && styles.msgRowOwn]}>
                {!isOwn && (
                    <View style={styles.driverAvatar}>
                        <Feather name="user" size={14} color={Colors.primaryContainer} />
                    </View>
                )}
                <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.driverBubble]}>
                    <Text style={[styles.msgText, isOwn && styles.ownMsgText]}>{getDisplayText(item)}</Text>
                    <Text style={[styles.timestamp, isOwn && styles.ownTimestamp]}>
                        {formatTime(item.sent_at)}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={KEYBOARD_BEHAVIOR}
            keyboardVerticalOffset={keyboardVerticalOffset}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>Message Driver</Text>
                    <Text style={styles.headerSubtitle}>Messages are end-to-end encrypted</Text>
                </View>
                <Pressable onPress={onClose} style={styles.closeBtn}>
                    <Feather name="x" size={14} color={Colors.onSurfaceVariant} style={{ fontWeight: 'bold' }} />
                </Pressable>
            </View>

            {/* Messages list */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color={Colors.primaryContainer} />
                </View>
            ) : (
                <FlatList
                    ref={listRef}
                    data={messages}
                    keyExtractor={(item) => item.id || String(item.timestamp)}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messageList}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Feather name="message-circle" size={36} color={Colors.primaryContainer} style={{ marginBottom: 8 }} />
                            <Text style={styles.emptyText}>Send a message to your driver</Text>
                        </View>
                    }
                />
            )}

            {/* Quick replies */}
            <View style={styles.quickReplies}>
                {[
                    'On my way 🏃',
                    '2 minutes ⏳',
                    'Please wait 🙏',
                    'I\'m here ✅',
                ].map((qr) => (
                    <TouchableOpacity
                        key={qr}
                        style={styles.quickReply}
                        onPress={() => {
                            setText((prev) => (prev ? `${prev} ${qr}` : qr));
                        }}
                    >
                        <Text style={styles.quickReplyText}>{qr}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Input bar */}
            <View style={styles.inputBar}>
                <TextInput
                    style={styles.textInput}
                    value={text}
                    onChangeText={setText}
                    placeholder="Type a message…"
                    placeholderTextColor={Colors.outline}
                    returnKeyType="send"
                    onSubmitEditing={sendMessage}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
                    onPress={sendMessage}
                    disabled={!text.trim()}
                >
                    <Feather name="send" size={16} color={Colors.onPrimary} style={{ marginLeft: -2 }} />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surfaceContainerLowest,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: Colors.outlineVariant,
    },
    headerInfo: { flex: 1 },
    headerTitle: { ...Typography.titleSmall, color: Colors.onBackground },
    headerSubtitle: {
        fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 2,
    },
    closeBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: Colors.surfaceContainerLow,
        alignItems: 'center', justifyContent: 'center',
    },
    closeBtnText: { fontSize: 14, color: Colors.onSurfaceVariant, fontWeight: '600' },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    messageList: { padding: 16, gap: 12, flexGrow: 1 },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40, gap: 8 },
    emptyEmoji: { fontSize: 36 },
    emptyText: { fontSize: 13, color: Colors.onSurfaceVariant },
    msgRow: {
        flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '80%',
    },
    msgRowOwn: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
    driverAvatar: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: Colors.primaryFixed,
        alignItems: 'center', justifyContent: 'center',
    },
    bubble: {
        borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
        maxWidth: '100%',
    },
    driverBubble: {
        backgroundColor: Colors.surfaceContainerLow,
        borderBottomLeftRadius: 4,
    },
    ownBubble: {
        backgroundColor: Colors.primaryContainer,
        borderBottomRightRadius: 4,
    },
    msgText: { fontSize: 14, color: Colors.onSurface, lineHeight: 20 },
    ownMsgText: { color: Colors.onPrimary },
    timestamp: { fontSize: 10, color: Colors.outline, marginTop: 4 },
    ownTimestamp: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
    quickReplies: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: Colors.outlineVariant,
        flexWrap: 'nowrap',
    },
    quickReply: {
        backgroundColor: Colors.primaryFixed,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 12, paddingVertical: 6,
    },
    quickReplyText: { fontSize: 12, color: Colors.primaryContainer, fontWeight: '600' },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        borderTopWidth: 1,
        borderTopColor: Colors.outlineVariant,
        backgroundColor: Colors.surfaceContainerLowest,
    },
    textInput: {
        flex: 1,
        backgroundColor: Colors.surfaceContainerLow,
        borderRadius: 20,
        paddingHorizontal: 16, paddingVertical: 10,
        fontSize: 14, color: Colors.onSurface,
        maxHeight: 100,
        borderWidth: 1, borderColor: Colors.outlineVariant,
    },
    sendBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: Colors.primaryContainer,
        alignItems: 'center', justifyContent: 'center',
        ...Shadows.card,
    },
    sendBtnDisabled: { backgroundColor: Colors.outlineVariant },
    sendBtnIcon: { fontSize: 16, color: Colors.onPrimary, marginLeft: 2 },
});
