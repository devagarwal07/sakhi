import React, { useRef, useEffect, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const API_KEY = process.env.EXPO_PUBLIC_MAPPLS_API_KEY ?? '';
const DEFAULT_LAT = 12.9716;
const DEFAULT_LNG = 77.5946;

function buildMapHtml({ zoom, scrollEnabled, zoomEnabled }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=${scrollEnabled !== false ? 'yes' : 'no'}">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; background:#1a1625; }

    .auto-wrap {
      position:relative; width:48px; height:48px;
      display:flex; align-items:center; justify-content:center;
      transform:translate(-50%,-50%);
    }
    .auto-svg { width:40px; height:40px; filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4)); transition:transform 0.6s ease; }
    .driver-pulse {
      position:absolute; width:60px; height:60px; border-radius:50%;
      border:2px solid rgba(142,68,220,0.6);
      animation:driverPulse 2s ease-out infinite;
    }
    @keyframes driverPulse {
      0%   { transform:scale(0.7); opacity:0.9; }
      100% { transform:scale(2); opacity:0; }
    }
    .driver-pulse2 {
      position:absolute; width:60px; height:60px; border-radius:50%;
      border:2px solid rgba(142,68,220,0.3);
      animation:driverPulse 2s ease-out infinite 0.8s;
    }

    .pin-wrap {
      position:relative; width:36px; height:48px;
      transform:translate(-50%,-100%);
      animation:pinDrop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards;
    }
    @keyframes pinDrop {
      0%   { transform:translate(-50%,-130%); opacity:0; }
      100% { transform:translate(-50%,-100%); opacity:1; }
    }
    .pin-shadow {
      position:absolute; bottom:-4px; left:50%; transform:translateX(-50%);
      width:14px; height:5px; background:rgba(0,0,0,0.3); border-radius:50%;
    }

    /* demand zone circles handled in JS */

    .mappls-logo,.mapmyindia-logo,.mapboxgl-ctrl-logo,.mappls-ctrl-logo,
    .mapboxgl-ctrl-attrib,.mappls-ctrl-attrib,.mappls-watermark,.mapmyindia-watermark,
    .mappls-ctrl-bottom-right,.mappls-ctrl-bottom-left {
      display:none!important; opacity:0!important; visibility:hidden!important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = null;
    var markerObjects = {};
    var polylineObjects = [];
    var zoneObjects = [];
    var smoothRAF = {};
    var polylineSourceId = 'polylines-source';
    var polylineLayerId  = 'polylines-layer';
    var animPlSourceId   = 'anim-polylines-source';
    var animPlLayerId    = 'anim-polylines-layer';

    /* ── Auto SVG (driver's vehicle icon) ─────────────────────────────── */
    function autoSVG(color, bearing) {
      bearing = bearing || 0;
      return '<svg class="auto-svg" viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" style="transform:rotate('+bearing+'deg)">'
        + '<rect x="2" y="8" width="36" height="18" rx="4" fill="'+color+'"/>'
        + '<rect x="6" y="4" width="24" height="12" rx="3" fill="'+color+'" opacity="0.8"/>'
        + '<rect x="8" y="6" width="10" height="7" rx="1.5" fill="rgba(255,255,255,0.6)"/>'
        + '<rect x="20" y="6" width="7" height="7" rx="1.5" fill="rgba(255,255,255,0.6)"/>'
        + '<circle cx="10" cy="27" r="4" fill="#111"/>'
        + '<circle cx="10" cy="27" r="2" fill="#555"/>'
        + '<circle cx="30" cy="27" r="4" fill="#111"/>'
        + '<circle cx="30" cy="27" r="2" fill="#555"/>'
        + '<rect x="38" y="12" width="8" height="10" rx="2" fill="'+color+'" opacity="0.6"/>'
        + '</svg>';
    }

    /* ── Pickup pin SVG ─────────────────────────────────────────────────── */
    function pickupPinSVG(color) {
      return '<svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">'
        + '<path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30S36 31.5 36 18C36 8.06 27.94 0 18 0z" fill="'+color+'"/>'
        + '<circle cx="18" cy="18" r="8" fill="white" opacity="0.9"/>'
        + '</svg>';
    }

    /* ── Dropoff flag SVG ──────────────────────────────────────────────── */
    function dropoffPinSVG(color) {
      return '<svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">'
        + '<path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30S36 31.5 36 18C36 8.06 27.94 0 18 0z" fill="'+color+'"/>'
        + '<rect x="14" y="10" width="2.5" height="16" fill="white" opacity="0.9"/>'
        + '<polygon points="16.5,10 16.5,20 26,15" fill="white" opacity="0.9"/>'
        + '</svg>';
    }

    /* ── Create marker element ──────────────────────────────────────────── */
    function createMarkerEl(opts) {
      var wrap = document.createElement('div');
      if (opts.type === 'auto') {
        wrap.className = 'auto-wrap';
        if (opts.pulse) {
          var r1 = document.createElement('div'); r1.className = 'driver-pulse'; wrap.appendChild(r1);
          var r2 = document.createElement('div'); r2.className = 'driver-pulse2'; wrap.appendChild(r2);
        }
        wrap.innerHTML += autoSVG(opts.color || '#8031CC', opts.bearing || 0);
      } else if (opts.type === 'pickup') {
        wrap.className = 'pin-wrap';
        wrap.innerHTML = pickupPinSVG(opts.color || '#10B981');
        var s = document.createElement('div'); s.className = 'pin-shadow'; wrap.appendChild(s);
      } else if (opts.type === 'dropoff') {
        wrap.className = 'pin-wrap';
        wrap.innerHTML = dropoffPinSVG(opts.color || '#1E1B2E');
        var s2 = document.createElement('div'); s2.className = 'pin-shadow'; wrap.appendChild(s2);
      } else {
        wrap.style.cssText = 'position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%)';
        var dot = document.createElement('div');
        dot.style.cssText = 'width:14px;height:14px;border-radius:50%;background:'+(opts.color||'#8031CC')+';border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);z-index:2';
        wrap.appendChild(dot);
        if (opts.pulse) {
          var ring = document.createElement('div');
          ring.style.cssText = 'position:absolute;width:32px;height:32px;border-radius:50%;background:'+(opts.color||'#8031CC')+';opacity:0;animation:driverPulse 2s ease-out infinite';
          wrap.insertBefore(ring, dot);
        }
        if (opts.label) {
          var lbl = document.createElement('div');
          lbl.style.cssText = 'position:absolute;top:-20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.7);color:#fff;font-size:9px;font-weight:700;font-family:sans-serif;padding:1px 4px;border-radius:3px;white-space:nowrap';
          lbl.innerText = opts.label;
          wrap.appendChild(lbl);
        }
      }
      return wrap;
    }

    /* ── Update markers ──────────────────────────────────────────────────── */
    function updateMarkers(markers) {
      if (!map) return;
      Object.values(markerObjects).forEach(function(m){ m.remove(); });
      markerObjects = {};
      markers.forEach(function(m) {
        var el = createMarkerEl(m);
        markerObjects[m.id || Math.random()] = new mappls.Marker({
          map: map, position: { lat: m.lat, lng: m.lng }, element: el,
        });
      });
    }

    /* ── Smooth move (driver GPS updates) ───────────────────────────────── */
    function smoothMoveMarker(id, toLat, toLng, bearing, durationMs) {
      var marker = markerObjects[id];
      if (!marker) return;
      var from = marker.getLngLat ? marker.getLngLat() : null;
      if (!from) { marker.setLngLat([toLng, toLat]); return; }
      var fromLat = from.lat, fromLng = from.lng;
      var startTime = null;
      if (smoothRAF[id]) cancelAnimationFrame(smoothRAF[id]);
      // Also update bearing on the SVG
      if (bearing !== undefined) {
        var el = marker.getElement ? marker.getElement() : null;
        if (el) {
          var svg = el.querySelector('svg');
          if (svg) svg.style.transform = 'rotate(' + bearing + 'deg)';
        }
      }
      function step(ts) {
        if (!startTime) startTime = ts;
        var t = Math.min((ts - startTime) / (durationMs || 1200), 1);
        var ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
        if (marker.setLngLat) marker.setLngLat([fromLng + (toLng-fromLng)*ease, fromLat + (toLat-fromLat)*ease]);
        if (t < 1) smoothRAF[id] = requestAnimationFrame(step);
      }
      smoothRAF[id] = requestAnimationFrame(step);
    }

    /* ── Demand zones ────────────────────────────────────────────────────── */
    function updateDemandZones(zones) {
      if (!map) return;
      zoneObjects.forEach(function(z){ try{z.remove();}catch(e){} });
      zoneObjects = [];
      (zones||[]).forEach(function(z) {
        var intensity = z.intensity || 0.5;
        var color = intensity > 0.7 ? '#EF4444' : intensity > 0.4 ? '#F59E0B' : '#10B981';
        var opacity = 0.18 + intensity * 0.22;
        try {
          zoneObjects.push(new mappls.Circle({
            map: map, center: { lat: z.lat, lng: z.lng }, radius: z.radius || 400,
            strokeColor: color, strokeOpacity: opacity + 0.15, strokeWeight: 1.5,
            fillColor: color, fillOpacity: opacity,
          }));
        } catch(e) {}
      });
    }

    /* ── Polylines ───────────────────────────────────────────────────────── */
    function ensureLayers() {
      if (!map || !map.addSource) return;
      if (!map.getSource(polylineSourceId)) {
        map.addSource(polylineSourceId, { type:'geojson', data:{ type:'FeatureCollection', features:[] } });
        map.addLayer({ id:polylineLayerId, type:'line', source:polylineSourceId,
          layout:{'line-join':'round','line-cap':'round'},
          paint:{'line-color':['get','color'],'line-width':['get','width'],'line-opacity':['get','opacity']}
        });
      }
      if (!map.getSource(animPlSourceId)) {
        map.addSource(animPlSourceId, { type:'geojson', data:{ type:'FeatureCollection', features:[] } });
        map.addLayer({ id:animPlLayerId, type:'line', source:animPlSourceId,
          layout:{'line-join':'round','line-cap':'round'},
          paint:{'line-color':['get','color'],'line-width':['get','width'],'line-opacity':0.9,'line-dasharray':[2,2]}
        });
      }
    }

    function updatePolylines(polylines) {
      if (!map) return;
      ensureLayers();
      var staticFeats = [], animFeats = [];
      (polylines||[]).forEach(function(p) {
        if (!p.coords || !p.coords.length) return;
        var feat = { type:'Feature',
          properties:{ color:p.color||'#8031CC', width:p.width||5, opacity:1 },
          geometry:{ type:'LineString', coordinates:p.coords.map(function(c){ return [c.lng,c.lat]; }) }
        };
        if (p.animated) animFeats.push(feat); else staticFeats.push(feat);
      });
      try {
        var s1 = map.getSource(polylineSourceId); if(s1&&s1.setData) s1.setData({type:'FeatureCollection',features:staticFeats});
        var s2 = map.getSource(animPlSourceId);   if(s2&&s2.setData) s2.setData({type:'FeatureCollection',features:animFeats});
      } catch(e) {
        polylineObjects.forEach(function(p){ try{p.remove();}catch(e){} });
        polylineObjects = [];
        (polylines||[]).forEach(function(p) {
          if (!p.coords||!p.coords.length) return;
          polylineObjects.push(new mappls.Polyline({ map:map, path:p.coords.map(function(c){ return{lat:c.lat,lng:c.lng}; }),
            strokeColor:p.color, strokeWidth:p.width, strokeOpacity:p.dashed?0.6:1, strokeDashstyle:p.dashed?'dot':'solid'
          }));
        });
      }
    }

    /* ── Message handler ─────────────────────────────────────────────────── */
    document.addEventListener('message', function(e){ handleMsg(e.data); });
    window.addEventListener('message', function(e){ handleMsg(e.data); });

    function handleMsg(raw) {
      try {
        var msg = JSON.parse(raw);
        if (!map) return;
        if (msg.type === 'SET_CENTER') {
          map.setCenter([msg.lng, msg.lat]);
          if (msg.zoom) map.setZoom(msg.zoom);
          if (msg.markers)     updateMarkers(msg.markers);
          if (msg.polylines)   updatePolylines(msg.polylines);
          if (msg.demandZones) updateDemandZones(msg.demandZones);
        }
        if (msg.type === 'SMOOTH_MOVE') {
          smoothMoveMarker(msg.id, msg.lat, msg.lng, msg.bearing, msg.duration || 1200);
        }
      } catch(e) {}
    }

    /* ── Init ────────────────────────────────────────────────────────────── */
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
        ensureLayers();
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
        }
      });
    }
    window.initMap = initMap;
  </script>

  <script src="https://apis.mappls.com/advancedmaps/api/${API_KEY}/map_sdk?v=3.0&layer=vector&callback=initMap" async defer></script>
</body>
</html>`;
}

export default function MapplsMapWebView({
  style,
  center,
  zoom = 15,
  markers     = [],
  polylines   = [],
  demandZones = [],
  scrollEnabled = true,
  zoomEnabled   = true,
  pointerEvents,
}) {
  const webViewRef = useRef(null);
  const mapReady   = useRef(false);
  const pendingMsg = useRef(null);

  const html = useMemo(
    () => buildMapHtml({ zoom, scrollEnabled, zoomEnabled }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const sendUpdate = (lat, lng, mkrs, plns, zones) => {
    if (!webViewRef.current) return;
    webViewRef.current.postMessage(JSON.stringify({
      type: 'SET_CENTER',
      lat, lng, zoom,
      markers: mkrs.map(m => ({
        id:      m.id,
        lat:     m.latitude,
        lng:     m.longitude,
        color:   m.color   || '#8031CC',
        label:   m.label   || '',
        pulse:   !!m.pulse,
        type:    m.markerType || (m.pulse ? 'auto' : 'dot'),
        bearing: m.bearing  || 0,
      })),
      polylines: plns.map(p => ({
        coords:   (p.coords || []).map(c => ({ lat: c.latitude, lng: c.longitude })),
        color:    p.color   ?? '#8031CC',
        width:    p.width   ?? 5,
        dashed:   !!p.dashed,
        animated: !!p.animated,
      })),
      demandZones: (zones || []).map(z => ({
        lat: z.latitude, lng: z.longitude,
        radius: z.radius || 400, intensity: z.intensity || 0.5,
      })),
    }));
  };

  useEffect(() => {
    const lat = center?.latitude  ?? DEFAULT_LAT;
    const lng = center?.longitude ?? DEFAULT_LNG;
    if (mapReady.current) {
      sendUpdate(lat, lng, markers, polylines, demandZones);
    } else {
      pendingMsg.current = { lat, lng, markers, polylines, demandZones };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.latitude, center?.longitude, JSON.stringify(markers), JSON.stringify(polylines), JSON.stringify(demandZones)]);

  const onMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'MAP_READY') {
        mapReady.current = true;
        const lat = center?.latitude  ?? DEFAULT_LAT;
        const lng = center?.longitude ?? DEFAULT_LNG;
        const p   = pendingMsg.current ?? {};
        sendUpdate(p.lat ?? lat, p.lng ?? lng, p.markers ?? markers, p.polylines ?? polylines, p.demandZones ?? demandZones);
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
            <ActivityIndicator size="small" color="#8031CC" />
          </View>
        )}
        onError={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  webview:   { flex: 1, backgroundColor: '#1a1625' },
  loader:    { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1625' },
});
