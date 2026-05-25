'use strict';

/**
 * useExternalNavigation.js
 *
 * React hook that wraps navigationService.
 * Manages:
 *   - available app detection (runs once per mount)
 *   - launching Google Maps / Waze
 *   - showing the nav app chooser modal state
 *   - tracking whether navigation is currently active
 *   - resuming app state when driver returns from Google Maps
 *
 * Usage:
 *   const { launchNavigation, isNavigating, appChooserVisible, ... } = useExternalNavigation({ rideId, coords });
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState} from 'react-native';
import navigationService from '../services/navigationService';
import { startLocationTracking } from '../services/locationTask';
import CustomAlert from '../utils/CustomAlert';

/**
 * @param {object} params
 * @param {string}  params.rideId            - Active ride ID (for background tracking context)
 * @param {{ lat: number; lng: number }} params.coords    - Destination coordinates
 * @param {string}  [params.destinationLabel]             - Human-readable label for destination
 * @param {'d'|'w'} [params.mode='d']                     - Navigation mode (driving / walking)
 * @param {Function} [params.onNavigationStart]            - Callback when nav app opens
 * @param {Function} [params.onAppResume]                  - Callback when driver returns to our app
 */
export default function useExternalNavigation({
  rideId,
  coords,
  destinationLabel,
  mode = 'd',
  onNavigationStart,
  onAppResume,
} = {}) {
  const [availableApps, setAvailableApps]         = useState([]);
  const [appChooserVisible, setAppChooserVisible] = useState(false);
  const [isNavigating, setIsNavigating]           = useState(false);
  const [launching, setLaunching]                 = useState(false);
  const [lastResult, setLastResult]               = useState(null);

  const appStateRef = useRef(AppState.currentState);
  const navStartedRef = useRef(false);

  // ── Detect available apps once on mount ─────────────────────────────────────
  useEffect(() => {
    navigationService.detectAvailableNavApps().then(setAvailableApps);
  }, []);

  // ── AppState listener — detect when driver returns from Google Maps ──────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      // Driver returned to foreground while navigation was active
      if (
        navStartedRef.current &&
        (prev === 'background' || prev === 'inactive') &&
        nextState === 'active'
      ) {
        navStartedRef.current = false;
        setIsNavigating(false);
        onAppResume?.();
      }
    });

    return () => sub.remove();
  }, [onAppResume]);

  // ── Core launcher ────────────────────────────────────────────────────────────

  /**
   * Launch Google Maps directly (primary).
   * Also ensures background tracking is/stays active so the rider
   * continues seeing real-time location while driver is in Google Maps.
   */
  const launchGoogleMaps = useCallback(async () => {
    const { lat, lng } = coords ?? {};
    if (!navigationService.isValidCoords(lat, lng)) {
      CustomAlert.alert('Navigation Error', 'Destination coordinates are not available yet.');
      return;
    }

    setLaunching(true);
    try {
      // Ensure background location tracking stays alive while in Google Maps
      await startLocationTracking(
        'Sakhi — Trip Active',
        'GPS tracking active. Customer can see your location.'
      );

      const result = await navigationService.openGoogleMaps({
        lat, lng, mode, label: destinationLabel,
      });

      setLastResult(result);

      if (result.success) {
        navStartedRef.current = true;
        setIsNavigating(true);
        onNavigationStart?.({ app: 'google_maps', method: result.method });
      } else {
        CustomAlert.alert(
          'Navigation Unavailable',
          'Could not open Google Maps or a browser. Please install Google Maps and try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      CustomAlert.alert('Navigation Error', err?.message ?? 'An unexpected error occurred.');
    } finally {
      setLaunching(false);
    }
  }, [coords, mode, destinationLabel, onNavigationStart]);

  /**
   * Launch Waze.
   */
  const launchWaze = useCallback(async () => {
    const { lat, lng } = coords ?? {};
    if (!navigationService.isValidCoords(lat, lng)) {
      CustomAlert.alert('Navigation Error', 'Destination coordinates are not available yet.');
      return;
    }

    setLaunching(true);
    try {
      await startLocationTracking(
        'Sakhi — Trip Active',
        'GPS tracking active. Customer can see your location.'
      );

      const result = await navigationService.openWaze({ lat, lng });
      setLastResult(result);

      if (result.success) {
        navStartedRef.current = true;
        setIsNavigating(true);
        onNavigationStart?.({ app: 'waze', method: result.method });
      } else {
        CustomAlert.alert(
          'Waze Unavailable',
          'Could not open Waze. Please install it and try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      CustomAlert.alert('Navigation Error', err?.message ?? 'An unexpected error occurred.');
    } finally {
      setLaunching(false);
    }
  }, [coords, onNavigationStart]);

  /**
   * Open the app chooser modal.
   */
  const showAppChooser = useCallback(() => {
    setAppChooserVisible(true);
  }, []);

  /**
   * Handle selection from the chooser modal.
   * @param {'google_maps'|'waze'|'browser'} appId
   */
  const handleAppChoice = useCallback(async (appId) => {
    setAppChooserVisible(false);
    if (appId === 'google_maps') {
      await launchGoogleMaps();
    } else if (appId === 'waze') {
      await launchWaze();
    } else if (appId === 'browser') {
      const { lat, lng } = coords ?? {};
      if (navigationService.isValidCoords(lat, lng)) {
        const url = navigationService.buildGoogleMapsBrowserURL({ lat, lng, mode, label: destinationLabel });
        const { Linking } = await import('react-native');
        Linking.openURL(url);
      }
    }
  }, [launchGoogleMaps, launchWaze, coords, mode, destinationLabel]);

  /**
   * Build a shareable route URL (e.g. to share via WhatsApp).
   */
  const getShareableLink = useCallback(() => {
    const { lat, lng } = coords ?? {};
    if (!navigationService.isValidCoords(lat, lng)) return null;
    return navigationService.buildShareableRouteURL({
      toLat: lat, toLng: lng, label: destinationLabel,
    });
  }, [coords, destinationLabel]);

  return {
    // State
    availableApps,
    appChooserVisible,
    isNavigating,
    launching,
    lastResult,

    // Actions
    launchGoogleMaps,       // Primary — opens Google Maps directly
    launchWaze,             // Secondary — opens Waze
    showAppChooser,         // Opens the nav app chooser modal
    handleAppChoice,        // Called when user picks app from modal
    hideAppChooser: () => setAppChooserVisible(false),
    getShareableLink,
  };
}
