/**
 * MapplsMapWebView
 *
 * Renders a Mappls (MapmyIndia) map via the Mappls Web SDK inside a WebView.
 * Primary map renderer when running inside Expo Go.
 *
 * Credentials (set in .env.local):
 *   EXPO_PUBLIC_MAPPLS_API_KEY        — REST API key  (used in SDK url)
 *   EXPO_PUBLIC_MAPPLS_CLIENT_ID      — OAuth client id
 *   EXPO_PUBLIC_MAPPLS_CLIENT_SECRET  — OAuth client secret
 *
 * Props:
 *   style            - container View style
 *   center           - { latitude, longitude }
 *   zoom             - number (default 15)
 *   markers          - [{ id, latitude, longitude, color, label, pulse }]
 *   polylines        - [{ coords: [{latitude, longitude}], color, width, dashed }]
 *   scrollEnabled    - bool (default true)
 *   zoomEnabled      - bool (default true)
 *   pointerEvents    - passed to container View
 */
import React, { useRef, useEffect, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const API_KEY       = process.env.EXPO_PUBLIC_MAPPLS_API_KEY       ?? '';
const CLIENT_ID     = process.env.EXPO_PUBLIC_MAPPLS_CLIENT_ID     ?? '';
const CLIENT_SECRET = process.env.EXPO_PUBLIC_MAPPLS_CLIENT_SECRET ?? '';

// Fallback to Bengaluru city centre if GPS hasn't resolved yet
// This prevents the "blue ocean" at 0,0 problem
const DEFAULT_LAT = 12.9716;
const DEFAULT_LNG = 77.5946;

// ── Build the initial Mappls Web SDK HTML ─────────────────────────────────────
// The map is initialised at a sensible fallback (Bengaluru) on first load.
// After GPS resolves, we push updates via postMessage — no full reload needed.
function buildMapHtml({ zoom, scrollEnabled, zoomEnabled }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1,
    user-scalable=${scrollEnabled !== false ? 'yes' : 'no'}">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; background:#e8e4f0; }

    .cm-wrap {
      position: relative;
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      transform: translate(-50%, -50%);
    }
    .cm-dot {
      width: 14px; height: 14px; border-radius: 50%;
      border: 2.5px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      position: relative; z-index: 2;
    }
    .cm-label {
      position: absolute; top: -20px; left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.65); color: #fff;
      font-size: 9px; font-weight: 700; font-family: sans-serif;
      padding: 1px 4px; border-radius: 3px;
      white-space: nowrap; z-index: 3;
    }
    .cm-pulse {
      position: absolute; width: 32px; height: 32px; border-radius: 50%;
      opacity: 0; z-index: 1;
      animation: pulseRing 1.8s ease-out infinite;
    }
    @keyframes pulseRing {
      0%   { transform: scale(0.5); opacity: 0.7; }
      100% { transform: scale(2.2); opacity: 0; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = null;
    var markerObjects = {};   // id -> mappls.Marker instance
    var polylineObjects = []; // array of mappls.Polyline instances

    /* ── Custom HTML marker helper ─────────────────────────────────────── */
    function createMarkerEl(opts) {
      var wrap = document.createElement('div');
      wrap.className = 'cm-wrap';
      if (opts.pulse) {
        var ring = document.createElement('div');
        ring.className = 'cm-pulse';
        ring.style.background = opts.color;
        wrap.appendChild(ring);
      }
      var dot = document.createElement('div');
      dot.className = 'cm-dot';
      dot.style.background = opts.color;
      wrap.appendChild(dot);
      if (opts.label) {
        var lbl = document.createElement('div');
        lbl.className = 'cm-label';
        lbl.innerText = opts.label;
        wrap.appendChild(lbl);
      }
      return wrap;
    }

    /* ── Update markers (called on postMessage updates) ─────────────────── */
    function updateMarkers(markers) {
      if (!map) return;
      // Remove old markers
      Object.values(markerObjects).forEach(function(m) { m.remove(); });
      markerObjects = {};
      // Add new markers
      markers.forEach(function(m) {
        var el = createMarkerEl(m);
        markerObjects[m.id || m.label] = new mappls.Marker({
          map: map,
          position: { lat: m.lat, lng: m.lng },
          element: el,
        });
      });
    }

    /* ── Update polylines (called on postMessage updates) ───────────────── */
    function updatePolylines(polylines) {
      if (!map) return;
      polylineObjects.forEach(function(p) { try { p.remove(); } catch(e) {} });
      polylineObjects = [];
      polylines.forEach(function(p) {
        if (!p.coords || !p.coords.length) return;
        var lnglat = p.coords.map(function(c) { return [c.lng, c.lat]; });
        polylineObjects.push(new mappls.Polyline({
          map: map,
          path: lnglat,
          strokeColor: p.color,
          strokeWidth: p.width,
          strokeOpacity: p.dashed ? 0.6 : 1,
          strokeDashstyle: p.dashed ? 'dot' : 'solid',
        }));
      });
    }

    /* ── React Native → WebView message handler ─────────────────────────── */
    document.addEventListener('message', function(event) { handleMsg(event.data); });
    window.addEventListener('message', function(event) { handleMsg(event.data); });

    function handleMsg(raw) {
      try {
        var msg = JSON.parse(raw);
        if (!map) return;
        if (msg.type === 'SET_CENTER') {
          map.setCenter([msg.lng, msg.lat]);
          if (msg.zoom) map.setZoom(msg.zoom);
          if (msg.markers) updateMarkers(msg.markers);
          if (msg.polylines) updatePolylines(msg.polylines);
        }
      } catch(e) {}
    }

    /* ── Map init (called by Mappls SDK callback) ───────────────────────── */
    function initMap() {
      map = new mappls.Map('map', {
        center:      [${DEFAULT_LNG}, ${DEFAULT_LAT}],
        zoom:        ${zoom ?? 15},
        search:      false,
        zoomControl: ${zoomEnabled !== false},
        scrollZoom:  ${scrollEnabled !== false},
        dragPan:     ${scrollEnabled !== false},
      });
      map.on('load', function () {
        // Signal React Native that the map is ready to receive postMessage updates
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
        }
      });
    }

    window.initMap = initMap;
  </script>

  <!-- Mappls Web SDK v3 -->
  <script
    src="https://apis.mappls.com/advancedmaps/api/${API_KEY}/map_sdk?v=3.0&layer=vector&callback=initMap"
    async defer>
  </script>
</body>
</html>`;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function MapplsMapWebView({
  style,
  center,
  zoom = 15,
  markers    = [],
  polylines  = [],
  scrollEnabled = true,
  zoomEnabled   = true,
  pointerEvents,
}) {
  const webViewRef  = useRef(null);
  const mapReady    = useRef(false);
  const pendingMsg  = useRef(null);

  // Build HTML only once — no dependency on center/markers
  // so the WebView never reloads on prop changes
  const html = useMemo(
    () => buildMapHtml({ zoom, scrollEnabled, zoomEnabled }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // intentionally empty — static HTML, updates via postMessage
  );

  // Sends the current center + markers to the already-loaded map via postMessage
  const sendUpdate = (lat, lng, mkrs, plns) => {
    if (!webViewRef.current) return;
    const msg = JSON.stringify({
      type:      'SET_CENTER',
      lat,
      lng,
      zoom,
      markers:   mkrs.map(m => ({
        id:    m.id,
        lat:   m.latitude,
        lng:   m.longitude,
        color: m.color || '#BEA3D8',
        label: m.label || '',
        pulse: !!m.pulse,
      })),
      polylines: plns.map(p => ({
        coords: (p.coords || []).map(c => ({ lat: c.latitude, lng: c.longitude })),
        color:  p.color  ?? '#BEA3D8',
        width:  p.width  ?? 5,
        dashed: !!p.dashed,
      })),
    });
    webViewRef.current.postMessage(msg);
  };

  // Push a center update whenever props change — if map isn't ready yet,
  // store it as pending and send it when MAP_READY fires
  useEffect(() => {
    const lat = center?.latitude  ?? DEFAULT_LAT;
    const lng = center?.longitude ?? DEFAULT_LNG;

    if (mapReady.current) {
      sendUpdate(lat, lng, markers, polylines);
    } else {
      pendingMsg.current = { lat, lng, markers, polylines };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.latitude, center?.longitude, JSON.stringify(markers), JSON.stringify(polylines)]);

  // Handle messages from the WebView (e.g. MAP_READY)
  const onMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'MAP_READY') {
        mapReady.current = true;
        const lat = center?.latitude  ?? DEFAULT_LAT;
        const lng = center?.longitude ?? DEFAULT_LNG;
        // Send any pending update that arrived before map was ready
        const { lat: pl, lng: plng, markers: pm, polylines: pp } = pendingMsg.current ?? {};
        sendUpdate(pl ?? lat, plng ?? lng, pm ?? markers, pp ?? polylines);
        pendingMsg.current = null;
      }
    } catch (_) {}
  };

  return (
    <View style={[styles.container, style]} pointerEvents={pointerEvents}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        allowsInlineMediaPlayback
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        startInLoadingState
        onMessage={onMessage}
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color="#BEA3D8" />
          </View>
        )}
        onError={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  webview:   { flex: 1, backgroundColor: '#e8e4f0' },
  loader:    {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EDE9FE',
  },
});
