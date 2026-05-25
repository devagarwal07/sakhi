'use strict';

const axios = require('axios');
const logger = require('../utils/logger');

const FORTIUS_ENDPOINT = 'https://smsfortius.org/V2/';

// ─────────────────────────────────────────────────────────────────────────────
// DLT-Registered Template IDs — Fortius account: sakhimobility
// All 7 templates ACTIVE as of May 2026
// ─────────────────────────────────────────────────────────────────────────────
const FORTIUS_TEMPLATES = {
  SAKHI_OTP:         '1207177867777159329', // ✅ SAKHI MOBILITY: Your OTP is{#var#} . Please do not share it with anyone.
  SAKHI_TRACK_SHORT: '1207177867618699566', // ✅ SAKHI MOBILITY: {#var#} shared live ride tracking. Please track here: {#var#}
  SAKHI_OFFER:       '1207177867977490120', // ✅ SAKHI MOBILITY:{#var#} offer. Use code {#var#} for a special ride discount. Please book now.
  SAKHI_LOW_BATTERY: '1207177867323005303', // ✅ SAKHI MOBILITY:{#var#} is low on battery during ride. Please track here:{#var#}
  SAKHI_SOS_TRACK:   '1207177884674043816', // ✅ SAKHI MOBILITY:{#var#} shared live ride tracking. Current location:{#var#} . Please track here:{#var#}
  SAKHI_EMERGENCY:   '1207177867461201690', // ✅ SAKHI MOBILITY Alert: {#var#} activated SOS during ride. Current location: {#var#} . Please track here: {#var#}
  SAKHI_REFERRAL:    '1207177867105129353', // ✅ SAKHI MOBILITY: Your referral code is{#var#} . Please share it with friends and family.
};

// Exact template formatters — message text MUST match the DLT-registered template exactly.
// Any deviation will cause operator scrubbing.
const TEMPLATE_FORMATTERS = {
  '1207177867777159329': (var1)               => `SAKHI MOBILITY: Your OTP is${var1} . Please do not share it with anyone.`,
  '1207177867618699566': (var1, var2)          => `SAKHI MOBILITY: ${var1} shared live ride tracking. Please track here: ${var2}`,
  '1207177867977490120': (var1, var2)          => `SAKHI MOBILITY:${var1} offer. Use code ${var2} for a special ride discount. Please book now.`,
  '1207177867323005303': (var1, var2)          => `SAKHI MOBILITY:${var1} is low on battery during ride. Please track here:${var2}`,
  '1207177884674043816': (var1, var2, var3)    => `SAKHI MOBILITY:${var1} shared live ride tracking. Current location:${var2} . Please track here:${var3}`,
  '1207177867461201690': (var1, var2, var3)    => `SAKHI MOBILITY Alert: ${var1} activated SOS during ride. Current location: ${var2} . Please track here: ${var3}`,
  '1207177867105129353': (var1)               => `SAKHI MOBILITY: Your referral code is${var1} . Please share it with friends and family.`,
};

/**
 * Normalises phone numbers to plain 10-digit formats required by Fortius API.
 */
function normalizePhone(phone) {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 12 && clean.startsWith('91')) {
    return clean.slice(2);
  }
  if (clean.length === 10) {
    return clean;
  }
  return clean;
}

/**
 * Resolves a template ID and formats the message to match the DLT templates exactly.
 * Helps with backward compatibility when general text is sent.
 */
function resolveTemplateAndMessage(message, templateId) {
  const cleanMsg = (message || '').trim();

  // If a known template ID is passed and message is just comma-separated vars
  if (templateId && TEMPLATE_FORMATTERS[templateId]) {
    if (cleanMsg.startsWith('SAKHI MOBILITY') || cleanMsg.startsWith('SAKHI Alert:')) {
      return { templateId, formattedMessage: cleanMsg };
    }
    const vars = cleanMsg.split(',').map(v => v.trim());
    try {
      const formattedMessage = TEMPLATE_FORMATTERS[templateId](...vars);
      return { templateId, formattedMessage };
    } catch (e) {
      return { templateId, formattedMessage: cleanMsg };
    }
  }

  // --- SMART AUTO-DETECT & REWRITE ---

  // 1. OTP / PIN
  // Message MUST match registered DLT template 1207177867777159329 exactly:
  // "SAKHI MOBILITY: Your OTP is{#var#} . Please do not share it with anyone."
  // NOTE: No space between 'is' and the OTP digits — matches the DLT registration.
  const otpMatch = cleanMsg.match(/\b\d{6}\b/);
  if (otpMatch || cleanMsg.includes('OTP') || cleanMsg.includes('PIN')) {
    const otp = otpMatch ? otpMatch[0] : cleanMsg.replace(/\D/g, '').slice(0, 6);
    return {
      templateId: FORTIUS_TEMPLATES.SAKHI_OTP,
      formattedMessage: `SAKHI MOBILITY: Your OTP is${otp} . Please do not share it with anyone.`
    };
  }

  // 2. SOS / Emergency
  if (cleanMsg.includes('EMERGENCY') || cleanMsg.includes('SOS') || cleanMsg.includes('activated SOS')) {
    let name = 'A Sakhi user';
    let location = 'unknown';
    let mapsUrl = 'https://maps.google.com';

    const mapsMatch = cleanMsg.match(/https:\/\/maps\.google\.com\/\?q=([-\d.]+),([-\d.]+)/);
    if (mapsMatch) {
      location = `${mapsMatch[1]},${mapsMatch[2]}`;
      mapsUrl = mapsMatch[0];
    }
    const nameMatch = cleanMsg.match(/(?:ALERT:|SOS Alert from)\s*([^#]+?)\s*(?:has triggered|activated|triggered)/i);
    if (nameMatch) {
      name = nameMatch[1].trim();
    }

    return {
      templateId: FORTIUS_TEMPLATES.SAKHI_EMERGENCY,
      formattedMessage: `SAKHI MOBILITY Alert: ${name} activated SOS during ride. Current location: ${location} . Please track here: ${mapsUrl}`
    };
  }

  // 3. Battery Low
  if (cleanMsg.includes('battery') || cleanMsg.includes('critically low')) {
    let name = 'User';
    let mapsUrl = 'https://maps.google.com';

    const mapsMatch = cleanMsg.match(/https:\/\/maps\.google\.com\/\?q=[-\d.,]+/);
    if (mapsMatch) {
      mapsUrl = mapsMatch[0];
    }
    const nameMatch = cleanMsg.match(/(?:SAKHI ALERT:|ALERT:)\s*([^#]+?)(?:'s phone battery)/i);
    if (nameMatch) {
      name = nameMatch[1].trim();
    }

    return {
      templateId: FORTIUS_TEMPLATES.SAKHI_LOW_BATTERY,
      formattedMessage: `SAKHI MOBILITY:${name} is low on battery during ride. Please track here:${mapsUrl}`
    };
  }

  // 4. Safe Drop / Live Tracking
  if (cleanMsg.includes('Safe Drop') || cleanMsg.includes('safely reached') || cleanMsg.includes('shared live')) {
    let name = 'Rider';
    let destination = 'destination';

    const nameMatch = cleanMsg.match(/(?:Safe Drop Alert:)\s*([^#]+?)\s*(?:has safely reached)/i);
    if (nameMatch) {
      name = nameMatch[1].trim();
    }
    const destMatch = cleanMsg.match(/safely reached\s+([^#]+?)\s+via/i);
    if (destMatch) {
      destination = destMatch[1].trim();
    }

    return {
      templateId: FORTIUS_TEMPLATES.SAKHI_TRACK_SHORT,
      formattedMessage: `SAKHI MOBILITY: ${name} shared live ride tracking. Please track here: ${destination}`
    };
  }

  // 5. Referral Code
  if (cleanMsg.includes('referral')) {
    const codeMatch = cleanMsg.match(/is\s*([A-Za-z0-9]+)/i);
    const code = codeMatch ? codeMatch[1].trim() : 'SAKHI';
    return {
      templateId: FORTIUS_TEMPLATES.SAKHI_REFERRAL,
      formattedMessage: `SAKHI MOBILITY: Your referral code is${code} . Please share it with friends and family.`
    };
  }

  // 6. Offer / Promotion
  if (cleanMsg.includes('offer') || cleanMsg.includes('discount')) {
    return {
      templateId: FORTIUS_TEMPLATES.SAKHI_OFFER,
      formattedMessage: `SAKHI MOBILITY:ride offer. Use code SAKHI for a special ride discount. Please book now.`
    };
  }

  // Fallback
  return {
    templateId: templateId || FORTIUS_TEMPLATES.SAKHI_TRACK_SHORT,
    formattedMessage: cleanMsg
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// FUNCTION: sendSMS
// Send a single SMS via Fortius V2 GET API
// ──────────────────────────────────────────────────────────────────────────────
async function sendSMS(phone, message, templateId = null) {
  try {
    const apiKey = process.env.FORTIUS_API_KEY;
    const senderId = process.env.FORTIUS_SENDER_ID;

    if (!apiKey || !senderId) {
      logger.warn('smsService.sendSMS — Fortius credentials not configured');
      return { sent: false, reason: 'not_configured' };
    }

    const { templateId: resolvedId, formattedMessage } = resolveTemplateAndMessage(message, templateId);
    const mobile = normalizePhone(phone);

    const params = {
      apikey: apiKey,
      senderid: senderId,
      templateid: resolvedId,
      number: mobile,
      message: formattedMessage,
    };

    const { data } = await axios.get(FORTIUS_ENDPOINT, {
      params,
      timeout: 8000,
    });

    let success = false;
    let desc = 'Unknown response';

    if (data) {
      if (typeof data === 'object') {
        success = data.status === 'Success' || data.code === '011';
        desc = data.description || (success ? 'Message submitted successfully' : 'Request failed');
      } else if (typeof data === 'string') {
        const cleanData = data.trim();
        success = cleanData.toLowerCase().includes('success') || cleanData.includes('011');
        desc = cleanData;
      }
    }

    if (success) {
      logger.info('smsService.sendSMS — success', { mobile, templateId: resolvedId, response: data });
      return { sent: true, response: data };
    } else {
      logger.warn('smsService.sendSMS — API failure response', { mobile, templateId: resolvedId, response: data });
      return { sent: false, reason: desc };
    }
  } catch (err) {
    logger.error('smsService.sendSMS — network/server error', { phone, error: err.message });
    return { sent: false, reason: err.message };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// FUNCTION: sendBulkSMS
// Send the same message to multiple phone numbers.
// ──────────────────────────────────────────────────────────────────────────────
async function sendBulkSMS(phones, message, templateId = null) {
  try {
    const apiKey = process.env.FORTIUS_API_KEY;
    const senderId = process.env.FORTIUS_SENDER_ID;

    if (!apiKey || !senderId) {
      logger.warn('smsService.sendBulkSMS — Fortius credentials not configured');
      return { sent: false, reason: 'not_configured' };
    }

    if (!phones?.length) return { sent: false, reason: 'no_recipients' };

    const { templateId: resolvedId, formattedMessage } = resolveTemplateAndMessage(message, templateId);
    const mobiles = phones.map(normalizePhone).filter(Boolean).join(',');

    if (!mobiles) return { sent: false, reason: 'no_valid_recipients' };

    const params = {
      apikey: apiKey,
      senderid: senderId,
      templateid: resolvedId,
      number: mobiles,
      message: formattedMessage,
    };

    const { data } = await axios.get(FORTIUS_ENDPOINT, {
      params,
      timeout: 15000,
    });

    let success = false;
    let desc = 'Unknown response';

    if (data) {
      if (typeof data === 'object') {
        success = data.status === 'Success' || data.code === '011';
        desc = data.description || (success ? 'Message submitted successfully' : 'Request failed');
      } else if (typeof data === 'string') {
        const cleanData = data.trim();
        success = cleanData.toLowerCase().includes('success') || cleanData.includes('011');
        desc = cleanData;
      }
    }

    if (success) {
      logger.info('smsService.sendBulkSMS — success', { count: phones.length, templateId: resolvedId, response: data });
      return { sent: true, count: phones.length, response: data };
    } else {
      logger.warn('smsService.sendBulkSMS — API failure response', { count: phones.length, templateId: resolvedId, response: data });
      return { sent: false, reason: desc };
    }
  } catch (err) {
    logger.error('smsService.sendBulkSMS — network/server error', { count: phones?.length, error: err.message });
    return { sent: false, reason: err.message };
  }
}

module.exports = {
  sendSMS,
  sendBulkSMS,
  FORTIUS_TEMPLATES,
  normalizePhone
};
