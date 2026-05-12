/**
 * MapplsMapWebView
 *
 * Renders a Mappls (MapmyIndia) map via the Mappls Web SDK inside a WebView.
 * Primary map renderer for both Expo Go and native builds (no Google Maps).
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
import React, { useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const API_KEY       = process.env.EXPO_PUBLIC_MAPPLS_API_KEY       ?? '';
const CLIENT_ID     = process.env.EXPO_PUBLIC_MAPPLS_CLIENT_ID     ?? '';
const CLIENT_SECRET = process.env.EXPO_PUBLIC_MAPPLS_CLIENT_SECRET ?? '';

// ── Build Mappls Web SDK HTML ──────────────────────────────────────────────────
function buildMapHtml({ center, zoom, markers = [], polylines = [], scrollEnabled, zoomEnabled }) {
  const lat = center?.latitude  ?? 28.6139;
  const lng = center?.longitude ?? 77.2090;

  const markersJson   = JSON.stringify(markers.map(m => ({
    lat:   m.latitude,
    lng:   m.longitude,
    color: m.color || '#BEA3D8',
    label: m.label || '',
    pulse: !!m.pulse,
  })));

  const polylinesJson = JSON.stringify(polylines.map(p => ({
    coords: (p.coords || []).map(c => ({ lat: c.latitude, lng: c.longitude })),
    color:  p.color  ?? '#BEA3D8',
    width:  p.width  ?? 5,
    dashed: !!p.dashed,
  })));

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1,
    user-scalable=${scrollEnabled !== false ? 'yes' : 'no'}">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; }

    /* Custom marker */
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
    /* Pulse ring */
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
    /* ── Custom HTML marker helper ───────────────────────────────────────── */
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

    /* ── Map init (called after SDK ready) ──────────────────────────────── */
    function initMap() {
      var map = new mappls.Map('map', {
        center:  [${lng}, ${lat}],
        zoom:    ${zoom ?? 15},
        search:  false,
        zoomControl: ${zoomEnabled !== false},
        scrollZoom:  ${scrollEnabled !== false},
        dragPan:     ${scrollEnabled !== false},
      });

      map.on('load', function () {
        /* ── Markers ─────────────────────────────────────────────────── */
        var markers = ${markersJson};
        markers.forEach(function(m) {
          var el = createMarkerEl(m);
          new mappls.Marker({
            map:      map,
            position: { lat: m.lat, lng: m.lng },
            element:  el,
          });
        });

        /* ── Polylines ───────────────────────────────────────────────── */
        var polylines = ${polylinesJson};
        polylines.forEach(function(p) {
          if (!p.coords || !p.coords.length) return;
          var lnglat = p.coords.map(function(c) { return [c.lng, c.lat]; });
          new mappls.Polyline({
            map:     map,
            path:    lnglat,
            strokeColor:   p.color,
            strokeWidth:   p.width,
            strokeOpacity: p.dashed ? 0.6 : 1,
            strokeDashstyle: p.dashed ? 'dot' : 'solid',
          });
        });
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
  const html = useMemo(
    () => buildMapHtml({ center, zoom, markers, polylines, scrollEnabled, zoomEnabled }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      center?.latitude, center?.longitude, zoom,
      JSON.stringify(markers), JSON.stringify(polylines),
      scrollEnabled, zoomEnabled,
    ]
  );

  return (
    <View style={[styles.container, style]} pointerEvents={pointerEvents}>
      <WebView
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        startInLoadingState
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
  webview:   { flex: 1, backgroundColor: '#DDD8EE' },
  loader:    {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EDE9FE',
  },
});
