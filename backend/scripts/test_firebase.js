'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fcmService = require('../src/services/fcmService');

async function test() {
  console.log('Testing Firebase Admin SDK initialization...');
  const ready = fcmService.isMessagingReady();
  console.log(`FCM Messaging Ready: ${ready}`);

  if (!ready) {
    const raw = process.env.FIREBASE_SA_KEY;
    console.log(`FIREBASE_SA_KEY exists in env: ${!!raw}`);
    if (raw) {
      console.log(`Raw key starts with: "${raw.trim().slice(0, 30)}..."`);
      try {
        JSON.parse(raw);
        console.log('Raw key is valid JSON.');
      } catch (err) {
        console.error('Raw key JSON parse error:', err.message);
      }
    }
  } else {
    console.log('Firebase initialized successfully!');
  }
}

test().catch(console.error);
