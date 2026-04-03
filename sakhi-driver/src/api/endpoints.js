import client from './client';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const sendOtp    = (phone) => client.post('/auth/send-otp', { phone, role: 'driver' });
export const verifyOtp  = (phone, otp) => client.post('/auth/verify-otp', { phone, otp, role: 'driver' });
export const refreshToken = (token) => client.post('/auth/refresh-token', { refreshToken: token });
export const logout     = () => client.post('/auth/logout');

// ── Phone Change (Profile flow) ───────────────────────────────────────────────
export const sendChangePhoneOtp    = (newPhone) =>
  client.post('/drivers/profile/phone/send-otp', { new_phone: newPhone });
export const resendChangePhoneOtp  = (sessionToken) =>
  client.post('/drivers/profile/phone/resend-otp', { session_token: sessionToken });
export const verifyChangePhoneOtp  = (newPhone, otp, sessionToken) =>
  client.post('/drivers/profile/phone/verify-otp', { new_phone: newPhone, otp, session_token: sessionToken });

// ── Driver Profile ────────────────────────────────────────────────────────────
export const getDriverProfile  = () => client.get('/drivers/profile');
export const updateDriverProfile = (formData) =>
  client.put('/drivers/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getDriverDocuments = () => client.get('/drivers/documents');
export const uploadDocument    = (formData) =>
  client.post('/drivers/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// ── Rides ─────────────────────────────────────────────────────────────────────
export const getRideHistory    = (page = 1) => client.get(`/drivers/rides?page=${page}`);
export const getRideDetails    = (rideId)  => client.get(`/rides/${rideId}`);
export const startRide         = (rideId, otp) => client.post(`/rides/${rideId}/start`, { otp });
export const arrivedAtPickup   = (rideId) => client.post(`/rides/${rideId}/arrived`);
export const completeRide      = (rideId, coords) =>
  client.post(`/rides/${rideId}/complete`, {
    final_latitude: coords.latitude,
    final_longitude: coords.longitude,
  });
export const cancelRide        = (rideId, reason) =>
  client.patch(`/rides/${rideId}/cancel`, { reason });
export const getChatHistory    = (rideId) => client.get(`/rides/${rideId}/chat`);
export const sendChatMessage   = (rideId, message) =>
  client.post(`/rides/${rideId}/chat`, { message });

// ── Earnings ──────────────────────────────────────────────────────────────────
export const getEarningsSummary = (period = 'week') =>
  client.get(`/drivers/earnings?period=${period}`);
export const getTransactionHistory = (page = 1) =>
  client.get(`/drivers/transactions?page=${page}`);
export const createCommissionOrder  = (data) => client.post('/payments/commission/order', data);
export const verifyCommissionPayment = (data) => client.post('/payments/commission/verify', data);

// ── Commission / Subscriptions ────────────────────────────────────────────────
export const getSubscriptionDetails = () => client.get('/drivers/subscription');
export const getCommissionStatus     = () => client.get('/drivers/commission/status');

// ── Safety / SOS ─────────────────────────────────────────────────────────────
export const triggerSOS            = (location) =>
  client.post('/safety/sos', { location, role: 'driver' });
export const cancelSOS             = () => client.post('/safety/sos/cancel');
export const getEmergencyContacts  = () => client.get('/safety/emergency-contacts');
export const addEmergencyContact   = (data) => client.post('/safety/emergency-contacts', data);
export const deleteEmergencyContact = (id) => client.delete(`/safety/emergency-contacts/${id}`);

// ── Location ──────────────────────────────────────────────────────────────────
export const updateDriverLocation  = (latitude, longitude, rideId) =>
  client.post('/drivers/location', { latitude, longitude, ride_id: rideId });

// ── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications      = (page = 1) => client.get(`/drivers/notifications?page=${page}`);
export const markNotificationRead  = (id) => client.patch(`/drivers/notifications/${id}/read`);
export const markAllNotificationsRead = () => client.patch('/drivers/notifications/read-all');
export const updateNotificationPrefs = (prefs) => client.put('/drivers/notification-preferences', prefs);

// ── Complaints ────────────────────────────────────────────────────────────────
export const getComplaints     = () => client.get('/drivers/complaints');
export const submitComplaint   = (formData) =>
  client.post('/drivers/complaints', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
