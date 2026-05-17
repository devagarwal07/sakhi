'use strict';

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabase = require('../src/config/supabase');

async function verifyDriver(phone) {
  if (!phone) {
    console.error('Please provide a phone number. Example: node verifyDriver.js +919876543210');
    process.exit(1);
  }

  if (!phone.startsWith('+')) phone = '+' + phone;
  console.log(`Setting up fully verified driver profile for: ${phone}`);

  let { data: drivers } = await supabase.from('drivers').select('*').eq('phone', phone);
  
  if (!drivers || drivers.length === 0) {
    console.log('Driver not found, creating new one...');
    const { data: inserted, error } = await supabase
      .from('drivers')
      .insert({ 
        phone, 
        referral_code: 'DRV' + Math.floor(1000 + Math.random() * 9000) 
      })
      .select('*')
      .single();
      
    if (error) {
      console.error('Error creating driver:', error);
      process.exit(1);
    }
    drivers = [inserted];
  }

  const driver = drivers[0];

  const updates = {
    name: driver.name || 'Verified Test Driver',
    email: driver.email || 'testdriver@sakhi.com',
    verification_status: 'approved',
    kyc_status: 'approved',
    driving_licence_status: 'approved',
    vehicle_rc_status: 'approved',
    aadhaar_status: 'approved',
    rc_status: 'approved',
    is_active: true
  };

  const { error: updateError } = await supabase
    .from('drivers')
    .update(updates)
    .eq('id', driver.id);

  if (updateError) {
    console.error('Error verifying driver:', updateError);
    process.exit(1);
  }

  console.log('✅ Driver profile successfully verified!');
  console.log('You can now log into the Driver app using this phone number.');
  process.exit(0);
}

verifyDriver(process.argv[2]);
