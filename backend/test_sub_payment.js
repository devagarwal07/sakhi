require('dotenv').config({ path: '/Users/shubhupadhyay/Desktop/sakhi/backend/.env' });
const jwt = require('jsonwebtoken');

async function testPayment() {
    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        
        const { data: riders } = await supabase.from('users').select('id').eq('is_active', true).eq('verification_status', 'approved').limit(1);
        const riderId = riders[0].id;
        const token = jwt.sign({ userId: riderId, role: 'rider' }, process.env.JWT_SECRET);
        
        console.log(`Testing with Rider ID: ${riderId}`);
        
        const payload = {
            pickup_lat: 12.971598,
            pickup_lng: 77.594562,
            pickup_address: "Cubbon Park, Bengaluru",
            drop_lat: 12.935116,
            drop_lng: 77.624480,
            drop_address: "Koramangala, Bengaluru",
            pickup_time: "09:00",
            start_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            plan_rides: 7,
            days_of_week: [1,2,3,4,5],
            is_two_way: false
        };
        
        const res = await fetch('https://sakhi-backend-pwej.onrender.com/subscriptions/intent', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (res.ok) {
            console.log('\n--- SUCCESS: INTENT CREATED ---');
            console.log('Subscription ID:', data.subscription_id);
            console.log('Total Cost:', data.total_cost);
            
            // 3. Create the payment order via PhonePe
            const orderPayload = {
                amount: data.total_cost,
                subscription_id_temp: data.subscription_id,
                paymentMode: "UPI_INTENT"
            };
            
            const orderRes = await fetch('https://sakhi-backend-pwej.onrender.com/payments/order', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(orderPayload)
            });
            
            const orderData = await orderRes.json();
            
            if (orderRes.ok) {
                console.log('\n--- SUCCESS: ORDER CREATED ---');
                console.log('Transaction ID:', orderData.transaction_id);
                console.log('Order ID:', orderData.order_id);
                console.log('Base64 Payload exists?', !!orderData.base64_payload);
                console.log('SDK Payload exists?', !!orderData.sdk_payload);
                
                if (orderData.sdk_payload) {
                    const parsed = JSON.parse(orderData.sdk_payload);
                    console.log('\nParsed SDK Payload:');
                    console.log('merchantId:', parsed.merchantId);
                    console.log('orderId:', parsed.merchantTransactionId);
                    console.log('paymentInstrument:', parsed.paymentInstrument);
                }
            } else {
                console.error('\n--- ORDER API ERROR ---');
                console.error(JSON.stringify(orderData, null, 2));
            }

        } else {
            console.error('\n--- INTENT API ERROR ---');
            console.error(JSON.stringify(data, null, 2));
        }

    } catch (err) {
        console.error('\n--- SCRIPT ERROR ---');
        console.error(err);
    }
}

testPayment();
