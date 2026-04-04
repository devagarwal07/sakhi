'use strict';

const { Router } = require('express');
const { z }      = require('zod');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard      = require('../middleware/roleGuard');
const { apiLimiter } = require('../middleware/rateLimiter');
const supabase       = require('../config/supabase');
const logger         = require('../utils/logger');

const router = Router();
router.use(apiLimiter);

// ─── Zod schemas ──────────────────────────────────────────────────────────────
const sendMessageSchema = z.object({
  message: z.string().min(1).max(1000).trim(),
  session_id: z.string().uuid().optional(),   // attach to existing session
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-RESPONDER RULES
// Simple keyword matching for instant bot replies.
// The bot replies instantly; unresolved sessions get escalated to human agents.
// ─────────────────────────────────────────────────────────────────────────────
const BOT_RULES = [
  {
    keywords: ['cancel', 'cancellation', 'cancel ride'],
    reply: `To cancel a ride:\n\n1. Open the active ride screen\n2. Tap the ⋮ menu in the top-right corner\n3. Select "Cancel Ride"\n\nCancellation charges may apply if the driver has already started heading towards you. Need help with something else?`,
    intent: 'cancel_ride',
  },
  {
    keywords: ['refund', 'money back', 'charged twice', 'overcharged', 'wrong charge'],
    reply: `Refund requests are processed within 5-7 business days. Here's how to raise one:\n\n1. Go to Ride History\n2. Select the affected ride\n3. Tap "Report an Issue"\n\nIf you were charged incorrectly, our team will review and credit your wallet within 48 hours. Anything else I can help with?`,
    intent: 'refund',
  },
  {
    keywords: ['driver', 'driver behavior', 'rude', 'harassment', 'uncomfortable', 'inappropriate'],
    reply: `I'm sorry to hear about your experience. Your safety is our top priority.\n\n⚠️ If you feel unsafe right now, please tap the SOS button on your ride screen.\n\nTo report driver behavior:\n1. Go to Ride History\n2. Select the ride\n3. Tap "Report Driver"\n\nWe take all reports seriously and will investigate within 24 hours. Our team may reach out to you.`,
    intent: 'driver_complaint',
  },
  {
    keywords: ['lost item', 'forgot', 'left behind', 'lost my'],
    reply: `Sorry to hear you left something behind! Here's what to do:\n\n1. Go to Ride History\n2. Find the recent ride\n3. Tap "Contact Driver" to reach them via our masked calling system\n\nIf you can't reach them, tap "Report Lost Item" and we'll contact the driver on your behalf. We typically resolve lost item cases within 2 hours.`,
    intent: 'lost_item',
  },
  {
    keywords: ['payment', 'pay', 'upi', 'razorpay', 'failed payment', 'payment failed'],
    reply: `For payment issues:\n\n• **Failed payment**: The amount is automatically reversed within 3-5 business days\n• **Not credited to wallet**: Please allow up to 30 minutes and check your wallet again\n• **Wrong amount deducted**: Tap "Dispute" on the transaction in your wallet history\n\nWould you like me to connect you to a payment specialist?`,
    intent: 'payment',
  },
  {
    keywords: ['subscription', 'subscribe', 'monthly', 'weekly plan', 'plan'],
    reply: `I can help with subscriptions! Here's a quick guide:\n\n• **View plan**: Go to Profile → My Subscriptions\n• **Pause plan**: Open your subscription and tap "Pause"\n• **Cancel plan**: Open your subscription and tap "Cancel"\n• **New subscription**: Go to Home → Subscribe & Save\n\nSubscription rides are dispatched with priority to ensure your driver arrives on time. Need more help?`,
    intent: 'subscription',
  },
  {
    keywords: ['sos', 'emergency', 'danger', 'unsafe', 'help me', 'police'],
    reply: `🚨 **Emergency Alert**\n\nIf you are in immediate danger:\n• Press the **SOS button** on your ride screen immediately\n• Call **112** (Police/Ambulance)\n\nSOS will alert your emergency contacts and Sakhi's safety team automatically.\n\nAre you currently safe?`,
    intent: 'emergency',
    priority: 'urgent',
  },
  {
    keywords: ['ride not showing', 'driver not coming', 'driver cancelled', 'no driver'],
    reply: `Sorry for the trouble! A few things to check:\n\n1. **Check ride status** — refresh the active ride screen\n2. **Driver cancelled?** — We'll automatically find a new driver\n3. **No drivers available** — This can happen during peak hours, please try booking again in a few minutes\n\nIf your ride shows "cancelled" but you were charged, our system will auto-refund within 48 hours. Still having trouble?`,
    intent: 'ride_issue',
  },
  {
    keywords: ['account', 'profile', 'kyc', 'verification', 'phone number', 'update profile'],
    reply: `For account-related help:\n\n• **Update profile**: Go to Profile → Edit Profile\n• **Change phone number**: Go to Profile → Change Phone\n• **KYC verification**: Tap the verification banner on your home screen\n• **Delete account**: Contact support (we'll process within 30 days per data policy)\n\nWhat specifically would you like to update?`,
    intent: 'account',
  },
  {
    keywords: ['hi', 'hello', 'hey', 'namaste', 'hii', 'help'],
    reply: `👋 Hello! Welcome to Sakhi Support.\n\nI'm your virtual assistant. I can help you with:\n\n• 🚗 Ride issues & cancellations\n• 💳 Payments & refunds\n• 📦 Lost items\n• 🔄 Subscription plans\n• 👤 Account & profile\n• 🆘 Safety concerns\n\nWhat can I help you with today?`,
    intent: 'greeting',
  },
];

// ─── Bot resolver ──────────────────────────────────────────────────────────────
function getBotResponse(message) {
  const lower = message.toLowerCase();
  for (const rule of BOT_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule;
    }
  }
  return {
    reply: `Thanks for reaching out! I'm not sure I fully understand your query. Let me connect you to a live support agent who can help.\n\n⏱️ Typical response time: **2-5 minutes** during business hours (9 AM – 8 PM IST).`,
    intent: 'escalate',
    escalate: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /support/chat
// Start or continue a support session; get instant bot reply
// ─────────────────────────────────────────────────────────────────────────────
router.post('/chat', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: parsed.error.flatten() } });
    }

    const { message, session_id } = parsed.data;
    const userId = req.user.userId;

    // 1. Resolve or create session
    let sessionId = session_id;
    let session   = null;

    if (sessionId) {
      const { data } = await supabase
        .from('support_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();
      session = data;
    }

    if (!session) {
      // Create new session
      const { data: newSession, error: sessionErr } = await supabase
        .from('support_sessions')
        .insert({ user_id: userId, status: 'open', channel: 'in_app' })
        .select()
        .single();

      if (sessionErr) throw sessionErr;
      session   = newSession;
      sessionId = newSession.id;
    }

    let userMessage = null;
    let botMessage  = null;

    // 2. Save user message
    const { data: saved, error: msgErr } = await supabase
      .from('support_messages')
      .insert({
        session_id: sessionId,
        sender:     'user',
        message:    message.trim(),
      })
      .select('id, created_at')
      .single();

    if (msgErr) throw msgErr;
    userMessage = { id: saved.id, sender: 'user', message: message.trim(), created_at: saved.created_at };

    // 3. Generate bot reply
    const botRule = getBotResponse(message);

    const { data: botSaved, error: botErr } = await supabase
      .from('support_messages')
      .insert({
        session_id: sessionId,
        sender:     'bot',
        message:    botRule.reply,
        intent:     botRule.intent || null,
      })
      .select('id, created_at')
      .single();

    if (botErr) throw botErr;
    botMessage = { id: botSaved.id, sender: 'bot', message: botRule.reply, intent: botRule.intent, created_at: botSaved.created_at };

    // 4. If escalation needed, mark session as 'escalated'
    if (botRule.escalate || botRule.priority === 'urgent') {
      await supabase
        .from('support_sessions')
        .update({ status: botRule.priority === 'urgent' ? 'urgent' : 'escalated', last_message_at: new Date().toISOString() })
        .eq('id', sessionId);
    } else {
      await supabase
        .from('support_sessions')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', sessionId);
    }

    return res.json({
      session_id: sessionId,
      user_message: userMessage,
      bot_reply:    botMessage,
      escalated:    botRule.escalate || false,
    });
  } catch (err) {
    logger.error('support.chat — error', { error: err.message });
    return next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /support/chat/:session_id
// Fetch message history for a session
// ─────────────────────────────────────────────────────────────────────────────
router.get('/chat/:session_id', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const { session_id } = req.params;
    const userId = req.user.userId;

    // Verify session belongs to user
    const { data: session } = await supabase
      .from('support_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('user_id', userId)
      .single();

    if (!session) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } });
    }

    // Get messages in order
    const { data: messages, error } = await supabase
      .from('support_messages')
      .select('id, sender, message, intent, created_at')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return res.json({ session, messages: messages || [] });
  } catch (err) {
    logger.error('support.chat.history — error', { error: err.message });
    return next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /support/sessions
// Get all support sessions for the user
// ─────────────────────────────────────────────────────────────────────────────
router.get('/sessions', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { data, error } = await supabase
      .from('support_sessions')
      .select('id, status, channel, created_at, last_message_at')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return res.json({ sessions: data || [] });
  } catch (err) {
    logger.error('support.sessions — error', { error: err.message });
    return next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /support/sessions/:session_id/close
// Close support session
// ─────────────────────────────────────────────────────────────────────────────
router.post('/sessions/:session_id/close', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const { session_id } = req.params;
    const userId = req.user.userId;

    await supabase
      .from('support_sessions')
      .update({ status: 'closed', resolved_at: new Date().toISOString() })
      .eq('id', session_id)
      .eq('user_id', userId);

    return res.json({ message: 'Session closed.' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
