require('dotenv').config();
const smsService = require('./src/services/smsService');

async function testSMS() {
  const phone = '7078667829';
  console.log(`Sending test OTP SMS to ${phone}...`);
  
  // Generating a random 6 digit OTP for the test
  const testOtp = Math.floor(100000 + Math.random() * 900000);
  
  // The exact text must match the DLT template for the OTP
  const message = `SAKHI MOBILITY: Your OTP is${testOtp} . Please do not share it with anyone.`;
  
  const result = await smsService.sendSMS(phone, message, smsService.FORTIUS_TEMPLATES.SAKHI_OTP);
  
  console.log('Result:', result);
}

testSMS();
