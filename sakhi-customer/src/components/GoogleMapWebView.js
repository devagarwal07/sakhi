/**
 * GoogleMapWebView
 *
 * Renders Google Maps via the Maps JavaScript API inside a WebView.
 * Works in Expo Go on Android without native compilation.
 *
 * Requires: Maps JavaScript API enabled in Google Cloud Console.
 * Key restrictions: set to "None" (WebView loads from null origin).
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

const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

// ── Build Google Maps JS API HTML ─────────────────────────────────────────────
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

    /* Custom marker wrapper */
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
    /* ── Custom OverlayView class ────────────────────────────────────────── */
    function CustomMarker(opts) {
      this.lat      = opts.lat;
      this.lng      = opts.lng;
      this.color    = opts.color || '#BEA3D8';
      this.label    = opts.label || '';
      this.pulse    = opts.pulse || false;
      this.div      = null;
    }

    function initOverlays(map) {
      CustomMarker.prototype = new google.maps.OverlayView();

      CustomMarker.prototype.onAdd = function() {
        var wrap = document.createElement('div');
        wrap.className = 'cm-wrap';

        if (this.pulse) {
          var ring = document.createElement('div');
          ring.className = 'cm-pulse';
          ring.style.background = this.color;
          wrap.appendChild(ring);
        }

        var dot = document.createElement('div');
        dot.className = 'cm-dot';
        dot.style.background = this.color;
        wrap.appendChild(dot);

        if (this.label) {
          var lbl = document.createElement('div');
          lbl.className = 'cm-label';
          lbl.innerText = this.label;
          wrap.appendChild(lbl);
        }

        this.div = wrap;
        this.getPanes().overlayMouseTarget.appendChild(wrap);
      };

      CustomMarker.prototype.draw = function() {
        if (!this.div) return;
        var proj = this.getProjection();
        var pos  = proj.fromLatLngToDivPixel(new google.maps.LatLng(this.lat, this.lng));
        this.div.style.left = pos.x + 'px';
        this.div.style.top  = pos.y + 'px';
        this.div.style.position = 'absolute';
      };

      CustomMarker.prototype.onRemove = function() {
        if (this.div && this.div.parentNode) this.div.parentNode.removeChild(this.div);
        this.div = null;
      };
    }

    /* ── Map initialisation ─────────────────────────────────────────────── */
    function initMap() {
      var MAP_STYLE = [
        { featureType: 'all',     stylers: [{ saturation: -65 }] },
        { featureType: 'road',    stylers: [{ color: '#e8e1f5' }] },
        { featureType: 'water',   stylers: [{ color: '#c8bef0' }] },
        { featureType: 'poi',     stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] }
      ];

      var map = new google.maps.Map(document.getElementById('map'), {
        center:           { lat: ${lat}, lng: ${lng} },
        zoom:             ${zoom ?? 15},
        disableDefaultUI: true,
        gestureHandling:  '${scrollEnabled === false ? 'none' : 'greedy'}',
        ${zoomEnabled === false ? 'zoomControl: false,' : ''}
        styles: MAP_STYLE
      });

      initOverlays(map);

      /* ── Markers ───────────────────────────────────────────────────── */
      var markers = ${markersJson};
      markers.forEach(function(m) {
        var cm = new CustomMarker(m);
        cm.setMap(map);
      });

      /* ── Polylines ─────────────────────────────────────────────────── */
      var polylines = ${polylinesJson};
      polylines.forEach(function(p) {
        if (!p.coords || !p.coords.length) return;
        new google.maps.Polyline({
          path:          p.coords,
          geodesic:      true,
          strokeColor:   p.color,
          strokeOpacity: p.dashed ? 0 : 1,
          strokeWeight:  p.width,
          icons: p.dashed ? [{
            icon: {
              path:          'M 0,-1 0,1',
              strokeOpacity: 1,
              scale:         3,
              strokeColor:   p.color
            },
            offset: '0', repeat: '14px'
          }] : []
        }).setMap(map);
      });
    }

    window.initMap = initMap;
  </script>

  <script
    src="https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&callback=initMap"
    async defer>
  </script>
</body>
</html>`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GoogleMapWebView({
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
