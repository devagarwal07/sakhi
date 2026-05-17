require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function clearRides() {
  console.log('Clearing rides and updating drivers...');

  const { error: rideError } = await supabase.from('rides').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (rideError) console.error('Error deleting rides:', rideError);
  else console.log('✅ Rides table cleared.');

  const { error: earnError } = await supabase.from('driver_earnings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (earnError) console.error('Error deleting earnings:', earnError);
  else console.log('✅ Driver earnings cleared.');
  
  const { error: driverErr } = await supabase.from('drivers').update({
      total_rides: 0,
      total_earnings: 0,
      total_requests: 0,
      total_accepts: 0,
      is_online: true
  }).neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (driverErr) console.error('Error updating driver metrics:', driverErr);
  else console.log('✅ Driver metrics reset.');

  console.log('Done.');
}
clearRides();
