'use strict';

const axios = require('axios');
const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * initiateCall — proxies a call via Exotel between rider and driver.
 * direction: 'rider_to_driver' | 'driver_to_rider'
 */
async function initiateCall(rideId, callerId, callerRole, direction) {
  // Fetch ride to get both phones
  const { data: rides } = await supabase
    .from('rides')
    .select('rider_id, driver_id, status')
    .eq('id', rideId)
    .limit(1);

  const ride = rides?.[0];
  if (!ride) throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');

  // Verify caller is on this ride
  if (callerRole === 'rider' && ride.rider_id !== callerId) throw new AppError('Forbidden.', 403, 'FORBIDDEN');
  if (callerRole === 'driver' && ride.driver_id !== callerId) throw new AppError('Forbidden.', 403, 'FORBIDDEN');

  // Only allow calls on active rides
  const activeStatuses = ['assigned', 'driver_en_route', 'arrived', 'in_progress'];
  if (!activeStatuses.includes(ride.status)) {
    throw new AppError('Calls are only available during active rides.', 409, 'RIDE_NOT_ACTIVE');
  }

  // Fetch phones
  const [{ data: riders }, { data: drivers }] = await Promise.all([
    supabase.from('users').select('phone').eq('id', ride.rider_id).limit(1),
    supabase.from('drivers').select('phone').eq('id', ride.driver_id).limit(1),
  ]);

  const riderPhone  = riders?.[0]?.phone;
  const driverPhone = drivers?.[0]?.phone;

  if (!riderPhone || !driverPhone) throw new AppError('Phone numbers not available.', 409, 'PHONE_UNAVAILABLE');

  const fromPhone = direction === 'rider_to_driver' ? riderPhone  : driverPhone;
  const toPhone   = direction === 'rider_to_driver' ? driverPhone : riderPhone;

  const sid        = process.env.EXOTEL_SID;
  const token      = process.env.EXOTEL_TOKEN;
  const callerId_  = process.env.EXOTEL_CALLER_ID;

  if (!sid || !token || !callerId_) {
    throw new AppError('Calling service is not configured.', 503, 'CALLING_NOT_CONFIGURED');
  }

  try {
    const { data: exotelRes } = await axios.post(
      `https://${sid}:${token}@api.exotel.com/v1/Accounts/${sid}/Calls/connect.json`,
      new URLSearchParams({
        From:           fromPhone,
        To:             toPhone,
        CallerId:       callerId_,
        StatusCallback: `${process.env.BASE_URL}/webhooks/exotel`,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10_000 }
    );

    logger.info('callingService.initiateCall — Exotel call created', { rideId, direction, callSid: exotelRes?.Call?.Sid });

    return {
      virtual_number: callerId_,
      call_sid:       exotelRes?.Call?.Sid,
      message:        'Call connecting...',
    };
  } catch (err) {
    logger.error('callingService.initiateCall — Exotel error', { error: err?.response?.data || err.message });
    throw new AppError(
      'Unable to connect call right now. Please use in-app chat.',
      503,
      'CALL_CONNECT_FAILED'
    );
  }
}

module.exports = { initiateCall };
