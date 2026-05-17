/**
 * SmartMapView — Always renders Mappls maps via WebView.
 *
 * Uses the Mappls Web SDK (via react-native-webview) in ALL environments:
 *   - Expo Go (storeClient)
 *   - EAS preview builds (APK)
 *   - EAS production builds (AAB)
 *
 * Unified prop API:
 *   style            - container style
 *   center           - { latitude, longitude }
 *   zoom             - number (default 15)
 *   markers          - [{ id, latitude, longitude, color, label, pulse }]
 *   polylines        - [{ coords: [{latitude, longitude}], color, width, dashed }]
 *   scrollEnabled    - bool (default true)
 *   zoomEnabled      - bool (default true)
 *   pointerEvents    - passed to container View
 *   showsTraffic     - bool (ignored — no Google Maps)
 *   children         - ignored (WebView-based, no native children)
 */

import React, { forwardRef } from 'react';
import MapplsMapWebView from './MapplsMapWebView';

// Always false — we no longer use Expo Go detection for map switching
const IS_EXPO_GO = false;

// ── SmartMapView ─────────────────────────────────────────────────────────────
// forwardRef is kept for API compatibility — the ref is not used in WebView mode
const SmartMapView = forwardRef(function SmartMapView(
  {
    style,
    center,
    zoom = 15,
    markers      = [],
    polylines    = [],
    demandZones  = [],
    scrollEnabled = true,
    zoomEnabled   = true,
    pointerEvents,
    showsTraffic  = false,
    children,
  },
  _ref  // ref ignored in WebView mode — kept for API compatibility
) {
  return (
    <MapplsMapWebView
      style={style}
      center={center}
      zoom={zoom}
      markers={markers}
      polylines={polylines}
      demandZones={demandZones}
      scrollEnabled={scrollEnabled}
      zoomEnabled={zoomEnabled}
      pointerEvents={pointerEvents}
    />
  );
});

export default SmartMapView;

// ── Expose IS_EXPO_GO for any screens that conditionally render based on it ───
export { IS_EXPO_GO };
