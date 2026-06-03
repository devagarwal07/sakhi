'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const supabase = require('../src/config/supabase');

async function check() {
  console.log('--- DETAILED FCM TOKEN DUMP ---');

  const { data: users } = await supabase.from('users').select('id, name, fcm_token');
  console.log('\nRiders (users):');
  users.forEach(u => {
    if (u.fcm_token) {
      console.log(`- ${u.name || 'Unnamed'} (${u.id}): Length=${u.fcm_token.length}, Value="${u.fcm_token.slice(0, 30)}..."`);
    } else {
      console.log(`- ${u.name || 'Unnamed'} (${u.id}): NULL/EMPTY`);
    }
  });

  const { data: drivers } = await supabase.from('drivers').select('id, name, fcm_token');
  console.log('\nDrivers:');
  drivers.forEach(d => {
    if (d.fcm_token) {
      console.log(`- ${d.name || 'Unnamed'} (${d.id}): Length=${d.fcm_token.length}, Value="${d.fcm_token.slice(0, 30)}..."`);
    } else {
      console.log(`- ${d.name || 'Unnamed'} (${d.id}): NULL/EMPTY`);
    }
  });
}

check().catch(console.error);
