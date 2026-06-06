require('dotenv').config({ path: '/Users/shubhupadhyay/Desktop/sakhi/backend/.env' });
const jwt = require('jsonwebtoken');

async function testActions() {
    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        
        // Find an active subscription
        const { data: subs } = await supabase.from('subscriptions').select('*').eq('status', 'active').limit(1);
        if (!subs || subs.length === 0) {
            console.log("No active subscriptions found to test.");
            return;
        }
        
        const sub = subs[0];
        const token = jwt.sign({ userId: sub.rider_id, role: 'rider' }, process.env.JWT_SECRET);
        
        console.log(`Testing Pause for Subscription ID: ${sub.id}`);
        
        const res = await fetch(`http://localhost:5001/api/subscriptions/${sub.id}/pause`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        console.log('Pause Status:', res.status, data);
        
        const res2 = await fetch(`http://localhost:5001/api/subscriptions/${sub.id}/resume`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data2 = await res2.json();
        console.log('Resume Status:', res2.status, data2);

    } catch (err) {
        console.error(err);
    }
}

testActions();
