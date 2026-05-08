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

// Face Liveness (Rekognition)
export const createFaceLivenessSession = () => apiClient.post('/auth/verify/face-liveness/session');
export const getFaceLivenessResult = (session_id) =>
    apiClient.post('/auth/verify/face-liveness/result', { session_id });

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
export const estimateFare = (pickup, dropoff, stop = null) =>
    apiClient.get('/rides/estimate', {
        params: {
            pickup_lat: pickup.latitude,
            pickup_lng: pickup.longitude,
            drop_lat: dropoff.latitude,
            drop_lng: dropoff.longitude,
            ...(stop ? { stop_lat: stop.latitude, stop_lng: stop.longitude } : {}),
        },
    });
export const bookRide = (data) => apiClient.post('/rides', data);
export const cancelRide = (rideId, reason) => apiClient.patch(`/rides/${rideId}/cancel`, { reason });
export const getRideDetails = (rideId) => apiClient.get(`/rides/${rideId}`);
export const getRideById = getRideDetails; // Alias expected by UI
export const rateDriver = (rideId, rating, comment) =>
    apiClient.post(`/rides/${rideId}/rating`, { rating, comment });
export const submitRating = rateDriver; // Alias expected by UI
export const getChatHistory = (rideId) => apiClient.get(`/rides/${rideId}/chat`);
export const shareTrip = (rideId) => apiClient.post(`/safety/share-trip/${rideId}`);

// ── Ride Payments ──────────────────────────────────────────────────────────
export const createRidePaymentOrder = (rideId) => apiClient.post(`/rides/${rideId}/payment/order`);
export const verifyRidePayment = (rideId, data) => apiClient.post(`/rides/${rideId}/payment/verify`, data);

// ── Safety ─────────────────────────────────────────────────────────────────────────────
// Backend sosSchema: { ride_id?, lat (number), lng (number) } — flat, NOT nested
export const triggerSOS = ({ lat, lng, ride_id } = {}) => {
    const body = { lat: lat ?? 0, lng: lng ?? 0 };
    if (ride_id) body.ride_id = ride_id;
    return apiClient.post('/safety/sos', body);
};
export const cancelSOS = () => apiClient.post('/safety/sos/cancel');

// Masked call — direction is required by backend callSchema
export const callDriver = (rideId) =>
    apiClient.post('/safety/call', { rideId, direction: 'rider_to_driver' });

export const getEmergencyContacts = () => apiClient.get('/safety/emergency-contacts');
export const addEmergencyContact = (data) => apiClient.post('/safety/emergency-contacts', data);
export const deleteEmergencyContact = (id) => apiClient.delete(`/safety/emergency-contacts/${id}`);

// Backend batterySchema: { level (int 0-100), lat, lng } — NOT { location, batteryLevel }
export const sendBatteryAlert = ({ lat, lng } = {}, batteryLevel = 0) =>
    apiClient.post('/safety/battery-alert', {
        level: Math.round(batteryLevel),
        lat: lat ?? 0,
        lng: lng ?? 0,
    });


// ── Wallet & Referrals ────────────────────────────────────────────────────
export const getWalletDetails = () => apiClient.get('/users/wallet');


// ── Subscriptions ─────────────────────────────────────────────────────────
export const getSubscriptions = () => apiClient.get('/subscriptions');
export const getSubscriptionDetails = (id) => apiClient.get(`/subscriptions/${id}`);
export const cancelSubscription = (id) => apiClient.patch(`/subscriptions/${id}/cancel`);
export const toggleSubscriptionPause = (id, isPaused) => apiClient.patch(`/subscriptions/${id}/pause`, { isPaused });
export const createSubscriptionOrder = (data) => apiClient.post('/payments/order', data);
export const verifyPayment = (data) => apiClient.post('/payments/verify', data);

// ── Change Phone ───────────────────────────────────────────────────────────
export const sendChangePhoneOtp = (newPhone) =>
    apiClient.post('/auth/change-phone/send-otp', { new_phone: newPhone });
export const verifyChangePhoneOtp = (newPhone, otp) =>
    apiClient.post('/auth/change-phone/verify-otp', { new_phone: newPhone, otp });

// ── Support Chat ───────────────────────────────────────────────────────────
/** Send a message + get instant bot reply. Pass session_id to continue a conversation. */
export const sendSupportMessage = (message, session_id) =>
    apiClient.post('/support/chat', { message, ...(session_id && { session_id }) });
/** Fetch full message history for a session. */
export const getSupportHistory = (session_id) =>
    apiClient.get(`/support/chat/${session_id}`);
/** List all past support sessions for the user. */
export const getSupportSessions = () =>
    apiClient.get('/support/sessions');
/** Close a resolved support session. */
export const closeSupportSession = (session_id) =>
    apiClient.post(`/support/sessions/${session_id}/close`);

// ── Notifications / FCM ───────────────────────────────────────────────────────
/** Register or update the customer's FCM push token with the backend. */
export const updateCustomerFcmToken = (fcm_token) =>
    apiClient.patch('/notifications/users/fcm-token', { fcm_token });

