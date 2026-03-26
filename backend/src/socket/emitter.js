'use strict';

/**
 * Server-side Socket emitter utility.
 * Import `io` lazily via param — never hold a stale reference.
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

function emitToSos(io, sosId, event, data) {
  io.of('/sos').to(`sos:${sosId}`).emit(event, data);
}

module.exports = { emitToRide, emitToDriver, emitToRider, emitToAdminRoom, emitToSos };
