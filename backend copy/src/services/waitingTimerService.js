'use strict';

const fareService = require('./fareService');
const logger = require('../utils/logger');

// Map<rideId, Interval>
const activeWaitingTimers = new Map();

/**
 * Start emitting 'waiting_tick' every 30 seconds to the ride room.
 */
async function startWaitingTimer(rideId, waitingStartAt, io) {
  // Avoid duplicates
  if (activeWaitingTimers.has(rideId)) return;

  const emitter = require('../socket/emitter');

  // Fetch fare config once
  let fareConfig;
  try {
    fareConfig = await fareService.getFareConfig('auto');
  } catch {
    fareConfig = { per_min_wait: 1.5, free_wait_secs: 180 };
  }

  const interval = setInterval(() => {
    const { waiting_seconds, waiting_charge } = fareService.calculateWaitingCharge(waitingStartAt, fareConfig);
    const free_wait_remaining = Math.max(0, fareConfig.free_wait_secs - waiting_seconds);

    emitter.emitToRide(io, rideId, 'waiting_tick', {
      ride_id: rideId,
      waiting_seconds,
      waiting_charge,
      free_wait_remaining,
    });
  }, 30_000);

  activeWaitingTimers.set(rideId, interval);
  logger.info('waitingTimerService.startWaitingTimer', { rideId });
}

/**
 * Stop the waiting tick for a ride.
 */
function stopWaitingTimer(rideId) {
  const interval = activeWaitingTimers.get(rideId);
  if (interval) {
    clearInterval(interval);
    activeWaitingTimers.delete(rideId);
    logger.info('waitingTimerService.stopWaitingTimer', { rideId });
  }
}

module.exports = { startWaitingTimer, stopWaitingTimer };
