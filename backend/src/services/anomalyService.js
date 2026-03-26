'use strict';

/**
 * AnomalyService — Stub placeholder.
 * Full implementation in Prompt 9.
 */
const logger = require('../utils/logger');

function startMonitoring(rideId) {
  logger.info('anomalyService.startMonitoring (stub)', { rideId });
  // TODO (Prompt 9): start global anomaly monitor for this ride
}

function stopMonitoring(rideId) {
  logger.info('anomalyService.stopMonitoring (stub)', { rideId });
  // TODO (Prompt 9): stop anomaly monitoring for this ride
}

function startGlobalAnomalyMonitor(io) {
  logger.info('anomalyService.startGlobalAnomalyMonitor (stub)');
  // TODO (Prompt 9): start polling monitor for all in_progress rides
}

module.exports = { startMonitoring, stopMonitoring, startGlobalAnomalyMonitor };
