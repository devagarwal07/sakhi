import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput,
    TouchableOpacity, KeyboardAvoidingView, Platform,
    ActivityIndicator, Pressable,
} from 'react-native';
import { Colors, Typography, BorderRadius, Shadows } from '../utils/theme';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { getChatHistory } from '../api/endpoints';

/**
 * In-ride chat modal.
 * Props:
 *   - rideId (string) — current ride ID
 *   - onClose (fn)    — callback to dismiss
 */
export default function ChatModal({ rideId, onClose }) {
    const { user } = useAuth();
    const { on, off, emit } = useSocket();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const listRef = useRef(null);

    // Load chat history on mount
    useEffect(() => {
        if (!rideId) { setLoading(false); return; }
        getChatHistory(rideId)
            .then(({ data }) => {
                setMessages(data.messages || []);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [rideId]);

    // Listen for incoming messages
    useEffect(() => {
        const handleIncoming = (msg) => {
            setMessages((prev) => [...prev, msg]);
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

        // Optimistically append
        const msg = {
            id: `local_${Date.now()}`,
            sender: 'customer',
            sender_id: user?.id,
            text: trimmed,
            timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, msg]);
        setText('');

        // Emit via socket
        emit('chat:send', { rideId, message: trimmed });
    };

    const formatTime = (ts) => {
        try {
            return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    };

    const renderMessage = ({ item }) => {
        const isOwn = item.sender === 'customer';
        return (
            <View style={[styles.msgRow, isOwn && styles.msgRowOwn]}>
                {!isOwn && (
                    <View style={styles.driverAvatar}>
                        <Text style={{ fontSize: 14 }}>👩</Text>
                    </View>
                )}
                <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.driverBubble]}>
                    <Text style={[styles.msgText, isOwn && styles.ownMsgText]}>{item.text}</Text>
                    <Text style={[styles.timestamp, isOwn && styles.ownTimestamp]}>
                        {formatTime(item.timestamp)}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>Message Driver</Text>
                    <Text style={styles.headerSubtitle}>Messages are end-to-end encrypted</Text>
                </View>
                <Pressable onPress={onClose} style={styles.closeBtn}>
                    <Text style={styles.closeBtnText}>✕</Text>
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
                            <Text style={styles.emptyEmoji}>💬</Text>
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
                    <Text style={styles.sendBtnIcon}>➤</Text>
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
