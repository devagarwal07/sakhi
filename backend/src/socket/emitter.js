'use strict';

/**
 * Socket emitter utility — used by services to emit events to specific rooms.
 * Requires `io` to be passed (set on app via app.set('io', io)).
 * This module is imported by services that need real-time side effects.
 */

function emitToRide(io, rideId, event, data) {
  io.of('/rides').to(`ride:${rideId}`).emit(event, data);
}

function emitToDriver(io, driverId, event, data) {
  io.of('/rides').to(`driver:${driverId}`).emit(event, data);
}

function emitToRider(io, riderId, event, data) {
  io.of('/rides').to(`rider:${riderId}`).emit(event, data);
}

function emitToAdminRoom(io, event, data) {
  io.of('/rides').to('admin:monitoring').emit(event, data);
}

module.exports = { emitToRide, emitToDriver, emitToRider, emitToAdminRoom };
