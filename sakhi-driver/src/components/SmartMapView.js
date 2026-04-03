/**
 * SmartMapView — Auto-switches map renderer based on runtime environment.
 *
 * ┌─────────────────────────────────┬──────────────────────────────────────────┐
 * │ Environment                     │ Renderer                                 │
 * ├─────────────────────────────────┼──────────────────────────────────────────┤
 * │ Expo Go (storeClient)           │ GoogleMapWebView (WebView JS API)        │
 * │ Native build / EAS / bare RN    │ react-native-maps PROVIDER_GOOGLE        │
 * └─────────────────────────────────┴──────────────────────────────────────────┘
 *
 * Unified prop API (works with both renderers):
 *   style            - container style
 *   center           - { latitude, longitude }
 *   zoom             - number (default 15)
 *   markers          - [{ id, latitude, longitude, color, label, pulse }]
 *   polylines        - [{ coords: [{latitude, longitude}], color, width, dashed }]
 *   scrollEnabled    - bool (default true)
 *   zoomEnabled      - bool (default true)
 *   pointerEvents    - passed to container View
 *
 * Native-only extras (ignored in WebView mode):
 *   mapRef           - ref forwarded to MapView for animateToRegion() etc.
 *   showsTraffic     - bool
 *   children         - arbitrary MapView children (Marker, Polyline, etc.)
 */

import React, { forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Constants from 'expo-constants';

// Detect Expo Go at module load time — this never changes during a session
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

// ── Lazy-import the correct renderer ────────────────────────────────────────
// We use inline requires so bundlers don't choke on native-only modules
// when running in Expo Go.

let GoogleMapWebView = null;
let RNMapView       = null;
let Marker          = null;
let Polyline        = null;
let PROVIDER_GOOGLE = null;

if (IS_EXPO_GO) {
  GoogleMapWebView = require('./GoogleMapWebView').default;
} else {
  const maps = require('react-native-maps');
  RNMapView       = maps.default;
  Marker          = maps.Marker;
  Polyline        = maps.Polyline;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
}

// ── Custom map style (desaturated lavender theme) ───────────────────────────
const MAP_STYLE = [
  { featureType: 'all',      stylers: [{ saturation: -70 }] },
  { featureType: 'road',     stylers: [{ color: '#e8e1f5' }] },
  { featureType: 'water',    stylers: [{ color: '#c8bef0' }] },
  { featureType: 'poi',      stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',  stylers: [{ visibility: 'off' }] },
];

// ── Zoom level → lat/lng delta conversion (for native MapView region) ────────
function zoomToLatDelta(zoom = 15) {
  // Approximate: latDelta doubles for every zoom level decrease
  return 0.005 * Math.pow(2, 15 - zoom);
}

// ── SmartMapView ─────────────────────────────────────────────────────────────
const SmartMapView = forwardRef(function SmartMapView(
  {
    style,
    center,
    zoom = 15,
    markers      = [],
    polylines    = [],
    scrollEnabled = true,
    zoomEnabled   = true,
    pointerEvents,
    showsTraffic  = false,
    children,
  },
  ref           // forwarded ref → connected to native MapView only
) {
  // ── Expo Go path: render WebView-based Google Maps ─────────────────────
  if (IS_EXPO_GO) {
    return (
      <GoogleMapWebView
        style={style}
        center={center}
        zoom={zoom}
        markers={markers}
        polylines={polylines}
        scrollEnabled={scrollEnabled}
        zoomEnabled={zoomEnabled}
        pointerEvents={pointerEvents}
      />
    );
  }

  // ── Native build path: render react-native-maps with PROVIDER_GOOGLE ───
  const latDelta = zoomToLatDelta(zoom);
  const region   = center
    ? { latitude: center.latitude, longitude: center.longitude, latitudeDelta: latDelta, longitudeDelta: latDelta }
    : undefined;

  return (
    <RNMapView
      ref={ref}
      style={style}
      provider={PROVIDER_GOOGLE}
      customMapStyle={MAP_STYLE}
      region={region}
      scrollEnabled={scrollEnabled}
      zoomEnabled={zoomEnabled}
      showsUserLocation={false}
      showsMyLocationButton={false}
      showsCompass={false}
      showsTraffic={showsTraffic}
      pointerEvents={pointerEvents}
    >
      {/* Render normalised markers */}
      {markers.map((m) => (
        <Marker
          key={m.id}
          coordinate={{ latitude: m.latitude, longitude: m.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={[
            nativeStyles.markerDot,
            { backgroundColor: m.color || '#BEA3D8' },
            m.pulse && nativeStyles.markerPulse,
          ]} />
        </Marker>
      ))}

      {/* Render normalised polylines */}
      {polylines.map((p, i) => (
        <Polyline
          key={i}
          coordinates={p.coords}
          strokeColor={p.color || '#BEA3D8'}
          strokeWidth={p.width || 5}
          lineDashPattern={p.dashed ? [10, 8] : undefined}
        />
      ))}

      {/* Pass-through children (custom Marker/Polyline JSX from screen) */}
      {children}
    </RNMapView>
  );
});

export default SmartMapView;

// ── Expose IS_EXPO_GO so screens can conditionally render non-map UI ─────────
export { IS_EXPO_GO };

const nativeStyles = StyleSheet.create({
  markerDot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2.5, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  markerPulse: {
    // In native builds, pulse is a simple visual hint via border color
    borderColor: 'rgba(255,255,255,0.6)',
    opacity: 0.9,
  },
});
