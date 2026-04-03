import apiClient from './client';

// ── Auth ──────────────────────────────────────────────────────────────────
export const sendOtp = (phone) => apiClient.post('/auth/send-otp', { phone });
export const verifyOtp = (phone, otp) => apiClient.post('/auth/verify-otp', { phone, otp, role: 'rider' });
export const refreshToken = (token) => apiClient.post('/auth/refresh-token', { refreshToken: token });
export const logout = () => apiClient.post('/auth/logout');

// ── KYC ───────────────────────────────────────────────────────────────────
export const uploadAadhaar = (formData) =>
    apiClient.post('/auth/verify/aadhaar-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
export const uploadFaceSelfie = (formData) =>
    apiClient.post('/auth/verify/facial', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

// ── Users ─────────────────────────────────────────────────────────────────
export const getProfile = () => apiClient.get('/users/profile');
export const updateProfile = (data) =>
    apiClient.put('/users/profile', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
export const getAddresses = () => apiClient.get('/users/addresses');
export const saveAddress = (data) => apiClient.post('/users/addresses', data);
export const deleteAddress = (id) => apiClient.delete(`/users/addresses/${id}`);
export const getRideHistory = (page = 1) => apiClient.get(`/users/rides?page=${page}`);
export const getTransactionHistory = (page = 1) => apiClient.get(`/users/transactions?page=${page}`);

// ── Rides ─────────────────────────────────────────────────────────────────
export const estimateFare = (pickup, dropoff) =>
    apiClient.get('/rides/estimate', {
        params: {
            pickup_lat: pickup.latitude,
            pickup_lng: pickup.longitude,
            dropoff_lat: dropoff.latitude,
            dropoff_lng: dropoff.longitude,
        },
    });
export const bookRide = (data) => apiClient.post('/rides', data);
export const cancelRide = (rideId) => apiClient.patch(`/rides/${rideId}/cancel`);
export const getRideDetails = (rideId) => apiClient.get(`/rides/${rideId}`);
export const getRideById = getRideDetails; // Alias expected by UI
export const rateDriver = (rideId, rating, comment) =>
    apiClient.post(`/rides/${rideId}/rating`, { rating, comment });
export const submitRating = rateDriver; // Alias expected by UI
export const getChatHistory = (rideId) => apiClient.get(`/rides/${rideId}/chat`);

// ── Safety ────────────────────────────────────────────────────────────────
export const triggerSOS = (location) => apiClient.post('/safety/sos', { location });
export const callDriver = (rideId) => apiClient.post('/safety/call', { rideId });
export const getEmergencyContacts = () => apiClient.get('/safety/emergency-contacts');
export const addEmergencyContact = (data) => apiClient.post('/safety/emergency-contacts', data);
export const deleteEmergencyContact = (id) => apiClient.delete(`/safety/emergency-contacts/${id}`);
export const sendBatteryAlert = (location, batteryLevel) =>
    apiClient.post('/safety/battery-alert', { location, batteryLevel });

// ── Wallet & Referrals ────────────────────────────────────────────────────
export const getWalletDetails = () => apiClient.get('/users/wallet');


// ── Subscriptions ─────────────────────────────────────────────────────────
export const getSubscriptions = () => apiClient.get('/subscriptions');
export const getSubscriptionDetails = (id) => apiClient.get(`/subscriptions/${id}`);
export const cancelSubscription = (id) => apiClient.patch(`/subscriptions/${id}/cancel`);
export const createSubscriptionOrder = (data) => apiClient.post('/payments/order', data);
export const verifyPayment = (data) => apiClient.post('/payments/verify', data);

// ── Change Phone ───────────────────────────────────────────────────────────
export const sendChangePhoneOtp = (newPhone) =>
    apiClient.post('/auth/change-phone/send-otp', { new_phone: newPhone });
export const verifyChangePhoneOtp = (newPhone, otp) =>
    apiClient.post('/auth/change-phone/verify-otp', { new_phone: newPhone, otp });

