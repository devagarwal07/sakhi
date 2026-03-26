'use strict';

const logger = require('./logger');

// Error codes that should NOT be retried (business logic errors)
const NO_RETRY_PATTERNS = [
  'PGRST116', // row not found
  '23505',    // unique violation
  '23503',    // foreign key violation
  '42703',    // undefined column
];

function isRetryable(err) {
  if (!err) return false;
  const msg  = err.message || '';
  const code = err.code   || '';
  // Don't retry if we have an explicit business logic code
  if (NO_RETRY_PATTERNS.some((p) => code.includes(p) || msg.includes(p))) return false;
  // Retry on connection/network errors
  if (msg.toLowerCase().includes('fetch failed')) return true;
  if (msg.toLowerCase().includes('network')) return true;
  if (msg.toLowerCase().includes('connection')) return true;
  if (msg.toLowerCase().includes('econnreset')) return true;
  if (msg.toLowerCase().includes('timeout')) return true;
  return false;
}

/**
 * Wrap a Supabase call with exponential-backoff retry.
 * @param {() => Promise<any>} fn      - Async function to call
 * @param {object} [opts]
 * @param {number} [opts.maxRetries=3]
 * @param {number} [opts.baseDelayMs=1000]
 * @param {string} [opts.label='dbRetry'] - For logging
 * @returns {Promise<any>}
 */
async function dbRetry(fn, { maxRetries = 3, baseDelayMs = 1000, label = 'dbRetry' } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      // Supabase returns { data, error } — treat Supabase error as thrown
      if (result?.error && isRetryable(result.error)) {
        throw result.error;
      }
      return result;
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === maxRetries) break;
      const delay = baseDelayMs * 2 ** (attempt - 1); // 1s, 2s, 4s
      logger.warn(`${label} — retrying (attempt ${attempt}/${maxRetries})`, { error: err.message, delay });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

module.exports = dbRetry;
