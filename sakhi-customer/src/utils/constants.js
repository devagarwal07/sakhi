export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const STORAGE_KEYS = {
    ACCESS_TOKEN: 'sakhi_access_token',
    REFRESH_TOKEN: 'sakhi_refresh_token',
    USER_DATA: 'sakhi_user_data',
};

export const RIDE_STATUSES = {
    SEARCHING: 'searching',
    ASSIGNED: 'assigned',
    EN_ROUTE: 'driver_en_route',
    ARRIVED: 'arrived',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

export const VERIFICATION_STATUSES = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    NOT_SUBMITTED: 'not_submitted',
};

export const VEHICLE_TYPES = {
    AUTO: 'auto',
    CAB: 'cab',
};

export const SUBSCRIPTION_PLANS = [7, 14, 21, 30];
