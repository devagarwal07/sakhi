'use strict';

// Load .env.local first (dev), fall back to .env (production)
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabase = require('../src/config/supabase');

async function verifyUser(phone) {
  if (!phone) {
    console.error('Please provide a phone number. Example: node verifyUser.js +919876543210');
    process.exit(1);
  }

  // Ensure it has + prefix
  if (!phone.startsWith('+')) {
    phone = '+' + phone;
  }

  console.log(`Setting up fully verified customer profile for: ${phone}`);

  // 1. Upsert user if they don't exist
  let { data: users } = await supabase.from('users').select('*').eq('phone', phone);
  
  if (!users || users.length === 0) {
    console.log('User not found, creating new one...');
    const { data: inserted, error } = await supabase
      .from('users')
      .insert({ 
        phone, 
        referral_code: 'TEST' + Math.floor(1000 + Math.random() * 9000) 
      })
      .select('*')
      .single();
      
    if (error) {
      console.error('Error creating user:', error);
      process.exit(1);
    }
    users = [inserted];
  }

  const user = users[0];

  // 2. Mark as verified
  const updates = {
    name: user.name || 'Verified Test Customer',
    email: user.email || 'testcustomer@sakhi.com',
    gender: 'female',
    gender_verified: true,
    verification_status: 'approved'
  };

  const { error: updateError } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id);

  if (updateError) {
    console.error('Error verifying user:', updateError);
    process.exit(1);
  }

  console.log('✅ Customer profile successfully verified!');
  console.log('You can now log into the built app using this phone number.');
  process.exit(0);
}

verifyUser(process.argv[2]);
