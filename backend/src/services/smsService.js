'use strict';

const axios = require('axios');
const logger = require('../utils/logger');

// ──────────────────────────────────────────────────────────────────────────────
// Exotel SMS helper — builds the authenticated endpoint URL
// Endpoint: POST https://<api_key>:<api_token>@api.in.exotel.com/v1/Accounts/<sid>/Sms/send
// ──────────────────────────────────────────────────────────────────────────────
function getExotelSmsUrl() {
  const sid   = process.env.EXOTEL_SID;
  const key   = process.env.EXOTEL_API_KEY;
  const token = process.env.EXOTEL_API_TOKEN;
  return `https://${key}:${token}@api.in.exotel.com/v1/Accounts/${sid}/Sms/send`;
}

// ──────────────────────────────────────────────────────────────────────────────
// FUNCTION: sendSMS
// Send a single SMS via Exotel SMS API
// ──────────────────────────────────────────────────────────────────────────────
async function sendSMS(phone, message) {
  try {
    if (!process.env.EXOTEL_SID || !process.env.EXOTEL_API_KEY || !process.env.EXOTEL_API_TOKEN) {
      logger.warn('smsService.sendSMS — Exotel credentials not configured');
      return { sent: false, reason: 'not_configured' };
    }

    // Normalise: Exotel expects E.164 format (e.g. +919876543210)
    const mobile = phone.startsWith('+') ? phone : `+91${phone.replace(/^0/, '')}`;

    const params = new URLSearchParams({
      From:           process.env.EXOTEL_SENDER_ID || 'SAKHI',
      To:             mobile,
      Body:           message,
      DltTemplateId:  process.env.EXOTEL_DLT_TEMPLATE_ID || '',
    });

    const { data } = await axios.post(getExotelSmsUrl(), params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 8000,
    });

    logger.info('smsService.sendSMS — sent', { mobile, response: data });
    return { sent: true, response: data };
  } catch (err) {
    logger.error('smsService.sendSMS — error', { phone, error: err.message });
    return { sent: false, reason: err.message };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// FUNCTION: sendBulkSMS
// Send the same message to multiple phone numbers.
// Exotel does not have a native bulk endpoint — fire individual requests in parallel.
// ──────────────────────────────────────────────────────────────────────────────
async function sendBulkSMS(phones, message) {
  try {
    if (!process.env.EXOTEL_SID || !process.env.EXOTEL_API_KEY || !process.env.EXOTEL_API_TOKEN) {
      logger.warn('smsService.sendBulkSMS — Exotel credentials not configured');
      return { sent: false, reason: 'not_configured' };
    }

    if (!phones?.length) return { sent: false, reason: 'no_recipients' };

    const results = await Promise.allSettled(phones.map((p) => sendSMS(p, message)));

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value?.sent).length;
    logger.info('smsService.sendBulkSMS — sent', { total: phones.length, success: successCount });
    return { sent: true, count: successCount, total: phones.length };
  } catch (err) {
    logger.error('smsService.sendBulkSMS — error', { count: phones?.length, error: err.message });
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendSMS, sendBulkSMS };
