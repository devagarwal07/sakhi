import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Pressable,
} from 'react-native';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

// ── Design Tokens ─────────────────────────────────────────────────────────────
const PURPLE  = '#BEA3D8';
const DEEP    = '#7C3AED';
const DARK    = '#1C1A25';
const MUTED   = '#7B7487';
const WHITE   = '#FFFFFF';
const BG      = '#F5F0FF';

// Quick-reply chips for the driver (different from customer's chips)
const DRIVER_QUICK_REPLIES = [
  'Arriving now 🚗',
  '5 minutes away ⏳',
  'Please wait 🙏',
  'I am at the pickup ✅',
  'On my way 🏃',
  'Please come outside 📍',
];

/**
 * ChatModal — In-ride chat for the driver side.
 *
 * Props:
 *   rideId  (string) — current ride ID
 *   onClose (fn)     — callback to dismiss the modal
 */
export default function ChatModal({ rideId, onClose }) {
  const { driver }      = useAuth();
  const { on, off, emit } = useSocket();

  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState('');
  const [loading,  setLoading]  = useState(true);
  const listRef = useRef(null);

  // ── Load chat history on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (!rideId) { setLoading(false); return; }
    client.get(`/rides/${rideId}/chat`)
      .then(({ data }) => setMessages(data.messages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [rideId]);

  // ── Listen for incoming messages from customer ──────────────────────────────
  useEffect(() => {
    const handleIncoming = (msg) => setMessages((prev) => [...prev, msg]);
    on('chat:message', handleIncoming);
    return () => off('chat:message', handleIncoming);
  }, [on, off]);

  // ── Auto-scroll on new messages ─────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = (overrideText) => {
    const trimmed = (overrideText ?? text).trim();
    if (!trimmed || !rideId) return;

    // Optimistic append
    const msg = {
      id:        `local_${Date.now()}`,
      sender:    'driver',
      sender_id: driver?.id,
      text:      trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
    setText('');

    // Emit via socket
    emit('chat:send', { rideId, message: trimmed });
  };

  const formatTime = (ts) => {
    try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  // ── Render bubble ───────────────────────────────────────────────────────────
  const renderMessage = ({ item }) => {
    const isOwn = item.sender === 'driver';
    return (
      <View style={[c.msgRow, isOwn && c.msgRowOwn]}>
        {!isOwn && (
          <View style={c.customerAvatar}>
            <Text style={{ fontSize: 14 }}>👩</Text>
          </View>
        )}
        <View style={[c.bubble, isOwn ? c.ownBubble : c.customerBubble]}>
          <Text style={[c.msgText, isOwn && c.ownMsgText]}>{item.text}</Text>
          <Text style={[c.timestamp, isOwn && c.ownTimestamp]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={c.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* ── Header ── */}
      <View style={c.header}>
        <View style={c.headerInfo}>
          <Text style={c.headerTitle}>Message Customer</Text>
          <Text style={c.headerSubtitle}>Messages are end-to-end encrypted 🔒</Text>
        </View>
        <Pressable onPress={onClose} style={c.closeBtn}>
          <Text style={c.closeBtnText}>✕</Text>
        </Pressable>
      </View>

      {/* ── Messages list ── */}
      {loading ? (
        <View style={c.loadingContainer}>
          <ActivityIndicator color={PURPLE} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id || String(item.timestamp)}
          renderItem={renderMessage}
          contentContainerStyle={c.messageList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={c.emptyState}>
              <Text style={c.emptyEmoji}>💬</Text>
              <Text style={c.emptyText}>No messages yet. Say hello!</Text>
            </View>
          }
        />
      )}

      {/* ── Quick replies ── */}
      <View style={c.quickRepliesWrap}>
        <FlatList
          data={DRIVER_QUICK_REPLIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={c.quickReplies}
          renderItem={({ item: qr }) => (
            <TouchableOpacity
              style={c.quickReply}
              onPress={() => sendMessage(qr)}
            >
              <Text style={c.quickReplyText}>{qr}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* ── Input bar ── */}
      <View style={c.inputBar}>
        <TextInput
          style={c.textInput}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor={MUTED}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage()}
          multiline
        />
        <TouchableOpacity
          style={[c.sendBtn, !text.trim() && c.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!text.trim()}
        >
          <Text style={c.sendBtnIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const c = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: BG,
  },
  headerInfo:    { flex: 1 },
  headerTitle:   { fontSize: 16, fontWeight: '700', color: DARK },
  headerSubtitle:{ fontSize: 11, color: MUTED, marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: BG,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, color: MUTED, fontWeight: '600' },

  // Messages
  loadingContainer:{ flex: 1, alignItems: 'center', justifyContent: 'center' },
  messageList:     { padding: 16, gap: 12, flexGrow: 1 },
  emptyState:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40, gap: 8 },
  emptyEmoji:      { fontSize: 36 },
  emptyText:       { fontSize: 13, color: MUTED },

  // Bubbles
  msgRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '80%' },
  msgRowOwn: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  customerAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: BG,
    alignItems: 'center', justifyContent: 'center',
  },
  bubble: {
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '100%',
  },
  customerBubble: { backgroundColor: BG, borderBottomLeftRadius: 4 },
  ownBubble:      { backgroundColor: PURPLE, borderBottomRightRadius: 4 },
  msgText:        { fontSize: 14, color: DARK, lineHeight: 20 },
  ownMsgText:     { color: WHITE },
  timestamp:      { fontSize: 10, color: MUTED, marginTop: 4 },
  ownTimestamp:   { color: 'rgba(255,255,255,0.65)', textAlign: 'right' },

  // Quick replies
  quickRepliesWrap: {
    borderTopWidth: 1, borderTopColor: BG,
  },
  quickReplies: {
    paddingHorizontal: 12, paddingVertical: 8, gap: 6,
  },
  quickReply: {
    backgroundColor: BG,
    borderRadius: 9999,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(190,163,216,0.30)',
  },
  quickReplyText: { fontSize: 12, color: PURPLE, fontWeight: '600' },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1, borderTopColor: BG,
    backgroundColor: WHITE,
  },
  textInput: {
    flex: 1,
    backgroundColor: BG,
    borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: DARK,
    maxHeight: 100,
    borderWidth: 1, borderColor: 'rgba(190,163,216,0.30)',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: DEEP,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20, shadowRadius: 8,
    elevation: 4,
  },
  sendBtnDisabled: { backgroundColor: 'rgba(190,163,216,0.40)', elevation: 0 },
  sendBtnIcon:     { fontSize: 16, color: WHITE, marginLeft: 2 },
});
