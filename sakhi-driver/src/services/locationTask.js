import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

export const LOCATION_TASK = 'SAKHI_DRIVER_LOCATION';

// Register the background task (must be at top level, outside any component)
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[LocationTask] error:', error.message);
    return;
  }
  if (data) {
    const { locations } = data;
    const loc = locations?.[0];
    if (!loc) return;

    // Lazy-import to avoid circular deps at module load
    const clientModule = await import('../api/client');
    const client = clientModule.default;
    try {
      await client.post('/drivers/location', {
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy:  loc.coords.accuracy,
        heading:   loc.coords.heading,
        speed:     loc.coords.speed,
        timestamp: loc.timestamp,
      });
    } catch {
      // Silently ignore — will retry on next interval
    }
  }
});

/**
 * Request foreground + background location permissions.
 * Returns true if both granted.
 */
export async function requestLocationPermissions() {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') return false;
  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  return bg === 'granted';
}

/**
 * Start background location tracking with a dynamic notification message.
 */
export async function startLocationTracking(title = 'Sakhi Driver', body = 'Sharing location while online') {
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  if (running) {
    // Stop and restart to update the notification text
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 10000,       // every 10 seconds
    distanceInterval: 30,      // or every 30 metres
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: title,
      notificationBody: body,
      notificationColor: '#BEA3D8',
    },
  });
}

/**
 * Stop background location tracking.
 */
export async function stopLocationTracking() {
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  if (running) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}
