'use strict';

/**
 * MatchingEngine — Stub placeholder.
 * Full implementation in Prompt 6.
 * This stub allows the ride creation endpoint to call startMatching(rideId)
 * without crashing. The real engine will replace this file.
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');

class MatchingEngine extends EventEmitter {
  constructor() {
    super();
    this.activeSearches = new Map();
  }

  /**
   * Start searching for a driver for the given ride.
   * Stub: logs and emits — real logic implemented in Prompt 6.
   */
  startMatching(rideId) {
    logger.info('MatchingEngine.startMatching (stub) — rideId', { rideId });
    // TODO (Prompt 6): load ride, query nearby drivers, run full matching loop
  }

  cancelSearch(rideId) {
    logger.info('MatchingEngine.cancelSearch (stub)', { rideId });
    if (this.activeSearches.has(rideId)) {
      this.activeSearches.delete(rideId);
    }
  }
}

// Singleton
module.exports = new MatchingEngine();
