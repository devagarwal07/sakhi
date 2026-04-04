import client from './client';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const sendOtp    = (phone) => client.post('/auth/send-otp', { phone, role: 'driver' });
export const verifyOtp  = (phone, otp) => client.post('/auth/verify-otp', { phone, otp, role: 'driver' });
export const refreshToken = (token) => client.post('/auth/refresh-token', { refreshToken: token });
export const logout     = () => client.post('/auth/logout');

// ── Phone change (authenticated; same handlers for send / resend) ─────────────
export const sendChangePhoneOtp = (newPhone) =>
  client.post('/drivers/profile/phone/send-otp', { new_phone: newPhone });
export const resendChangePhoneOtp = (newPhone) =>
  client.post('/drivers/profile/phone/resend-otp', { new_phone: newPhone });
export const verifyChangePhoneOtp = (newPhone, otp) =>
  client.post('/drivers/profile/phone/verify-otp', { new_phone: newPhone, otp });

// ── Driver Profile ────────────────────────────────────────────────────────────
export const getDriverProfile  = () => client.get('/drivers/profile');
export const updateDriverProfile = (formData) =>
  client.patch('/drivers/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getDriverDocuments = () => client.get('/drivers/documents');
export const uploadDocument    = (formData) =>
  client.post('/drivers/kyc/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// ── Rides ─────────────────────────────────────────────────────────────────────
export const getRideHistory = (params = {}) => {
  if (typeof params === 'number') return client.get('/drivers/rides', { params: { page: params } });
  return client.get('/drivers/rides', { params });
};
export const getRideDetails    = (rideId)  => client.get(`/rides/${rideId}`);
/** Itemized Sakhi fare breakdown — use this on PaymentDetailsScreen */
export const getFareSummary    = (rideId)  => client.get(`/rides/${rideId}/fare-summary`);
/** Advance trip state — use PATCH /rides/:id/status with { status } */
export const patchRideStatus   = (rideId, status, extra = {}) =>
  client.patch(`/rides/${rideId}/status`, { status, ...extra });
export const cancelRide        = (rideId, reason) =>
  client.patch(`/rides/${rideId}/cancel`, { reason });
export const getChatHistory    = (rideId) => client.get(`/rides/${rideId}/chat`);

// ── Earnings ──────────────────────────────────────────────────────────────────
export const getEarningsToday   = () => client.get('/drivers/earnings/today');
export const getEarningsWeekly  = () => client.get('/drivers/earnings/weekly');
export const getEarningsLedger  = () => client.get('/drivers/earnings/ledger');
export const getTransactionHistory = (params = {}) => client.get('/drivers/transactions', { params });

// ── Commission / Subscriptions ────────────────────────────────────────────────
export const getSubscriptionDetails = () => client.get('/drivers/subscription');
export const getCommissionStatus     = () => client.get('/drivers/commission/status');
export const createCommissionOrder  = (data) => client.post('/payments/commission/order', data);
export const verifyCommissionPayment = (data) => client.post('/payments/commission/verify', data);

// ── Safety / SOS ─────────────────────────────────────────────────────────────
/** Backend expects { lat, lng, ride_id? } — pass { latitude, longitude, ride_id } from GPS */
export const triggerSOS = (location = {}) => {
  const lat = Number(location?.latitude ?? location?.lat) || 0;
  const lng = Number(location?.longitude ?? location?.lng) || 0;
  return client.post('/safety/sos', {
    lat,
    lng,
    ride_id: location?.ride_id,
  });
};
export const cancelSOS = () => client.post('/safety/sos/cancel');

/** Masked call via Exotel — direction is always driver_to_rider for driver app */
export const callRider = (rideId) =>
  client.post(`/safety/call/${rideId}`, { direction: 'driver_to_rider' });

export const getEmergencyContacts  = () => client.get('/safety/emergency-contacts');
export const addEmergencyContact   = (data) => client.post('/safety/emergency-contacts', data);
export const deleteEmergencyContact = (id) => client.delete(`/safety/emergency-contacts/${id}`);

// ── Location ──────────────────────────────────────────────────────────────────
export const updateDriverLocation  = (latitude, longitude, rideId) =>
  client.post('/drivers/location', { latitude, longitude, ride_id: rideId });

// ── Notifications (global /notifications mount) ─────────────────────────────
export const getNotifications      = () => client.get('/notifications');
export const markNotificationRead  = (id) => client.post(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => client.post('/notifications/read-all');
export const updateNotificationPrefs = (prefs) => client.patch('/drivers/notification-settings', prefs);
export const updateDriverFcmToken = (fcm_token) =>
  client.patch('/notifications/drivers/fcm-token', { fcm_token });

// ── Complaints ────────────────────────────────────────────────────────────────
export const getComplaints     = (params) => client.get('/drivers/complaints', { params });
export const submitComplaint   = (formData) =>
  client.post('/drivers/complaints', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
