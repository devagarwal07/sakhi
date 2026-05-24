'use strict';

const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * resolveCallNumber — fetches the phone number of the other party on a ride.
 * direction: 'rider_to_driver' | 'driver_to_rider'
 * Returns { phone } so the client can open a direct tel: link.
 */
async function resolveCallNumber(rideId, callerId, callerRole, direction) {
  // Fetch ride
  const { data: rides } = await supabase
    .from('rides')
    .select('rider_id, driver_id, status')
    .eq('id', rideId)
    .limit(1);

  const ride = rides?.[0];
  if (!ride) throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');

  // Verify caller belongs to this ride
  if (callerRole === 'rider' && ride.rider_id !== callerId) throw new AppError('Forbidden.', 403, 'FORBIDDEN');
  if (callerRole === 'driver' && ride.driver_id !== callerId) throw new AppError('Forbidden.', 403, 'FORBIDDEN');

  // Only allow on active rides
  const activeStatuses = ['assigned', 'driver_en_route', 'arrived', 'in_progress'];
  if (!activeStatuses.includes(ride.status)) {
    throw new AppError('Calls are only available during active rides.', 409, 'RIDE_NOT_ACTIVE');
  }

  // Fetch the target party's phone number
  let phone;
  if (direction === 'rider_to_driver') {
    const { data: drivers } = await supabase.from('drivers').select('phone').eq('id', ride.driver_id).limit(1);
    phone = drivers?.[0]?.phone;
  } else {
    const { data: riders } = await supabase.from('users').select('phone').eq('id', ride.rider_id).limit(1);
    phone = riders?.[0]?.phone;
  }

  if (!phone) throw new AppError('Phone number not available.', 409, 'PHONE_UNAVAILABLE');

  logger.info('callingService.resolveCallNumber', { rideId, callerRole, direction });
  return { phone };
}

module.exports = { resolveCallNumber };
