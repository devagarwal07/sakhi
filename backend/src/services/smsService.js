'use strict';

const axios = require('axios');
const logger = require('../utils/logger');

const MSG91_BASE = 'https://api.msg91.com/api/v5';

// ──────────────────────────────────────────────────────────────────────────────
// FUNCTION: sendSMS
// Send a single SMS via MSG91 flow/template API
// ──────────────────────────────────────────────────────────────────────────────
async function sendSMS(phone, message) {
  try {
    if (!process.env.MSG91_AUTH_KEY || !process.env.MSG91_TEMPLATE_ID) {
      logger.warn('smsService.sendSMS — MSG91 credentials not configured');
      return { sent: false, reason: 'not_configured' };
    }

    // Normalise: MSG91 expects plain 10-digit or E.164 without leading +
    const mobile = phone.replace(/^\+/, '');

    const payload = {
      flow_id: process.env.MSG91_TEMPLATE_ID,
      sender:  'SAKHI',
      mobiles: mobile,
      VAR1:    message,
    };

    const { data } = await axios.post(`${MSG91_BASE}/flow/`, payload, {
      headers: {
        authkey:        process.env.MSG91_AUTH_KEY,
        'Content-Type': 'application/json',
        Accept:         'application/json',
      },
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
// MSG91 accepts mobiles as comma-separated string.
// ──────────────────────────────────────────────────────────────────────────────
async function sendBulkSMS(phones, message) {
  try {
    if (!process.env.MSG91_AUTH_KEY || !process.env.MSG91_TEMPLATE_ID) {
      logger.warn('smsService.sendBulkSMS — MSG91 credentials not configured');
      return { sent: false, reason: 'not_configured' };
    }

    if (!phones?.length) return { sent: false, reason: 'no_recipients' };

    // Normalise all numbers
    const mobiles = phones.map((p) => p.replace(/^\+/, '')).join(',');

    const payload = {
      flow_id: process.env.MSG91_TEMPLATE_ID,
      sender:  'SAKHI',
      mobiles,
      VAR1:    message,
    };

    const { data } = await axios.post(`${MSG91_BASE}/flow/`, payload, {
      headers: {
        authkey:        process.env.MSG91_AUTH_KEY,
        'Content-Type': 'application/json',
        Accept:         'application/json',
      },
      timeout: 15000,
    });

    logger.info('smsService.sendBulkSMS — sent', { count: phones.length, response: data });
    return { sent: true, count: phones.length, response: data };
  } catch (err) {
    logger.error('smsService.sendBulkSMS — error', { count: phones?.length, error: err.message });
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendSMS, sendBulkSMS };
