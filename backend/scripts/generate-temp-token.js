'use strict';

/**
 * generate-temp-token.js
 * ─────────────────────
 * Generates a short-lived admin JWT for sharing with external parties
 * (e.g. MSG91 support) to test the /admin/debug/test-sms endpoint.
 *
 * Usage:
 *   node scripts/generate-temp-token.js
 *   node scripts/generate-temp-token.js --hours 2
 *
 * The token is signed with your JWT_SECRET and carries role=admin,
 * so the /admin/* routes will accept it. It does NOT store a refresh
 * token, so it cannot be rotated — it simply expires and dies.
 */

const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config();

const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// ── Parse --hours flag ────────────────────────────────────────────────────────
const args  = process.argv.slice(2);
const hIdx  = args.indexOf('--hours');
const hours = hIdx !== -1 ? parseInt(args[hIdx + 1], 10) : 1;

if (isNaN(hours) || hours < 1 || hours > 48) {
  console.error('❌  --hours must be a number between 1 and 48');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('❌  JWT_SECRET not found in .env.local — make sure you run this from the backend folder');
  process.exit(1);
}

// ── Generate token ────────────────────────────────────────────────────────────
const payload = {
  userId : 'msg91-support-temp',
  role   : 'admin',
  phone  : '+910000000000',
  jti    : uuidv4(),
  purpose: 'sms-smoke-test',       // informational only
};

const token = jwt.sign(payload, process.env.JWT_SECRET, {
  expiresIn: `${hours}h`,
});

const expiresAt = new Date(Date.now() + hours * 3600 * 1000);

// ── Print the ready-to-use cURL command ───────────────────────────────────────
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  ✅  Temporary Admin Token Generated');
console.log(`  ⏳  Expires at: ${expiresAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
console.log(`  🕐  Valid for: ${hours} hour(s)`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('TOKEN:\n');
console.log(token);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  📋  Ready-to-use cURL commands for MSG91 support:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const BASE = 'https://sakhi-backend-pwej.onrender.com';

console.log('── Test OTP SMS ──────────────────────────────────────────────────');
console.log(`curl -X POST "${BASE}/api/v1/admin/debug/test-sms" \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "Authorization: Bearer ${token}" \\`);
console.log(`  -d '{"phone":"9876543210","type":"otp"}'`);

console.log('\n── Test General SMS ──────────────────────────────────────────────');
console.log(`curl -X POST "${BASE}/api/v1/admin/debug/test-sms" \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "Authorization: Bearer ${token}" \\`);
console.log(`  -d '{"phone":"9876543210","type":"sms","message":"Hello from Sakhi!"}'`);

console.log('\n── Test Bulk SMS ─────────────────────────────────────────────────');
console.log(`curl -X POST "${BASE}/api/v1/admin/debug/test-sms" \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "Authorization: Bearer ${token}" \\`);
console.log(`  -d '{"phone":"9876543210","type":"bulk"}'`);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  ⚠️   Replace 9876543210 with the actual test phone number');
console.log('  ⚠️   Token expires automatically — no need to revoke manually');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
