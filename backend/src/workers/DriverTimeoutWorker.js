'use strict';

const cron = require('node-cron');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');

function startDriverTimeoutWorker() {
  // Every 5 minutes — clean up zombie drivers
  cron.schedule('*/5 * * * *', async () => {
    try {
      const staleThreshold = new Date(Date.now() - 5 * 60_000).toISOString();

      // Find drivers online but with stale or missing location pings
      const { data: staleLocations } = await supabase
        .from('driver_locations')
        .select('driver_id')
        .lt('updated_at', staleThreshold);

      const staleDriverIds = (staleLocations || []).map((r) => r.driver_id);

      // Also drivers who have NO location row at all
      const { data: onlineDrivers } = await supabase
        .from('drivers')
        .select('id')
        .eq('is_online', true);

      const { data: locatedDrivers } = await supabase
        .from('driver_locations')
        .select('driver_id')
        .gte('updated_at', staleThreshold);

      const locatedSet = new Set((locatedDrivers || []).map((r) => r.driver_id));

      const zombieIds = (onlineDrivers || [])
        .map((d) => d.id)
        .filter((id) => !locatedSet.has(id));

      if (!zombieIds.length) return;

      // Don't mark offline if driver is on an active ride
      const { data: activeRideDrivers } = await supabase
        .from('rides')
        .select('driver_id')
        .in('driver_id', zombieIds)
        .in('status', ['assigned', 'driver_en_route', 'arrived', 'in_progress']);

      const activeSet = new Set((activeRideDrivers || []).map((r) => r.driver_id));
      const toMarkOffline = zombieIds.filter((id) => !activeSet.has(id));

      if (toMarkOffline.length) {
        await supabase.from('drivers').update({ is_online: false }).in('id', toMarkOffline);
        logger.info(`DriverTimeoutWorker — marked ${toMarkOffline.length} zombie drivers offline`, { ids: toMarkOffline });
      }
    } catch (err) {
      logger.error('DriverTimeoutWorker — error', { error: err.message });
    }
  }, { timezone: 'Asia/Kolkata' });

  logger.info('DriverTimeoutWorker — started (every 5 minutes)');
}

module.exports = { startDriverTimeoutWorker };
