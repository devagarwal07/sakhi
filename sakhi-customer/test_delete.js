const axios = require('axios');
const API_URL = 'https://sakhi-backend-pwej.onrender.com';

async function test() {
    try {
        console.log('Sending OTP...');
        await axios.post(`${API_URL}/auth/send-otp`, { phone: '8888888888', role: 'rider' });
        
        console.log('Verifying OTP...');
        const res = await axios.post(`${API_URL}/auth/verify-otp`, { phone: '8888888888', otp: '123456', role: 'rider' });
        const token = res.data.accessToken;
        
        console.log('Token:', token);
        
        console.log('Deleting account...');
        const delRes = await axios.delete(`${API_URL}/users/account`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Success:', delRes.data);
    } catch (err) {
        console.error('Error Details:', JSON.stringify(err.response?.data || err.message, null, 2));
    }
}
test();
