// ─────────────────────────────────────────────────────────────────────────────
// MapplsMapWebView — Customer App
// Base: direct copy of sakhi-driver/src/components/MapplsMapWebView.js
// Additions over driver version:
//   1. nearbyAutos prop  — floating auto-rickshaw markers around pickup
//   2. dragMode/onDragEnd — map-drag location picker (location-search.js)
//   3. forwardRef + fitBounds — imperative camera control for active ride
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const API_KEY     = process.env.EXPO_PUBLIC_MAPPLS_API_KEY ?? '';
const DEFAULT_LAT = 12.9716;
const DEFAULT_LNG = 77.5946;

// ─── identical to driver ──────────────────────────────────────────────────────
function buildMapHtml({ zoom, scrollEnabled, zoomEnabled, dragMode }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=${scrollEnabled !== false ? 'yes' : 'no'}">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; background:#E8E4F0; }

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

    /* nearby autos — float animation */
    .auto-nearby { animation:autoFloat 3s ease-in-out infinite; }
    @keyframes autoFloat {
      0%,100% { transform:translate(-50%,-50%) translateY(0px); }
      50%      { transform:translate(-50%,-50%) translateY(-5px); }
    }

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
    var nearbyMarkers = [];
    var smoothRAF = {};
    var polylineSourceId = 'polylines-source';
    var polylineLayerId  = 'polylines-layer';
    var animPlSourceId   = 'anim-polylines-source';
    var animPlLayerId    = 'anim-polylines-layer';

    /* ── Auto SVG ─────────────────────────────────────────────────────────── */
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

    /* ── Pickup pin SVG ───────────────────────────────────────────────────── */
    function pickupPinSVG(color) {
      return '<svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">'
        + '<path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30S36 31.5 36 18C36 8.06 27.94 0 18 0z" fill="'+color+'"/>'
        + '<circle cx="18" cy="18" r="8" fill="white" opacity="0.9"/>'
        + '</svg>';
    }

    /* ── Dropoff flag SVG ─────────────────────────────────────────────────── */
    function dropoffPinSVG(color) {
      return '<svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">'
        + '<path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30S36 31.5 36 18C36 8.06 27.94 0 18 0z" fill="'+color+'"/>'
        + '<rect x="14" y="10" width="2.5" height="16" fill="white" opacity="0.9"/>'
        + '<polygon points="16.5,10 16.5,20 26,15" fill="white" opacity="0.9"/>'
        + '</svg>';
    }

    /* ── Create marker element ────────────────────────────────────────────── */
    function createMarkerEl(opts) {
      var wrap = document.createElement('div');
      if (opts.type === 'auto') {
        wrap.className = 'auto-wrap' + (opts.nearby ? ' auto-nearby' : '');
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

    /* ── Update main markers ──────────────────────────────────────────────── */
    function updateMarkers(markers) {
      if (!map) return;
      Object.values(markerObjects).forEach(function(m){ m.remove(); });
      markerObjects = {};
      markers.forEach(function(m) {
        var el = createMarkerEl(m);
        // Mappls SDK uses "element" property for custom DOM elements
        markerObjects[m.id || Math.random()] = new mappls.Marker({
          map: map, position: { lat: m.lat, lng: m.lng }, element: el,
        });
      });
    }

    /* ── Nearby autos — only real driver locations from API ──────────────── */
    function setNearbyAutos(center, autos) {
      nearbyMarkers.forEach(function(m){ try{m.remove();}catch(e){} });
      nearbyMarkers = [];
      // No fallback — only show real online drivers returned by the API
      if (!map || !Array.isArray(autos) || autos.length === 0) return;
      autos.forEach(function(a, i) {
        if (!a || !a.lat || !a.lng) return;
        var bearing = a.bearing !== undefined ? a.bearing : Math.floor(Math.random() * 360);
        var delay = (i * 0.3) + 's';
        var markerHtml = '<div class="auto-wrap auto-nearby" style="animation-delay:' + delay + '">' + autoSVG('#8031CC', bearing) + '</div>';
        nearbyMarkers.push(new mappls.Marker({ map:map, position:{lat:a.lat,lng:a.lng}, html:markerHtml }));
      });
    }


    /* ── Smooth move (driver GPS updates) ────────────────────────────────── */
    function smoothMoveMarker(id, toLat, toLng, bearing, durationMs) {
      var marker = markerObjects[id];
      if (!marker) return;
      var from = marker.getLngLat ? marker.getLngLat() : null;
      if (!from) { marker.setLngLat([toLng, toLat]); return; }
      var fromLat = from.lat, fromLng = from.lng;
      var startTime = null;
      if (smoothRAF[id]) cancelAnimationFrame(smoothRAF[id]);
      if (bearing !== undefined) {
        var el = marker.getElement ? marker.getElement() : null;
        if (el) { var svg = el.querySelector('svg'); if (svg) svg.style.transform = 'rotate('+bearing+'deg)'; }
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

    /* ── Polylines ────────────────────────────────────────────────────────── */
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

    /* ── FitBounds helper (customer-only addition) ────────────────────────── */
    function fitBoundsToPoints(pts, padding) {
      if (!map || pts.length === 0) return;
      if (pts.length === 1) { map.setCenter({lat:pts[0].lat,lng:pts[0].lng}); map.setZoom(14); return; }
      var minLat=pts[0].lat,maxLat=pts[0].lat,minLng=pts[0].lng,maxLng=pts[0].lng;
      pts.forEach(function(p){if(p.lat<minLat)minLat=p.lat;if(p.lat>maxLat)maxLat=p.lat;if(p.lng<minLng)minLng=p.lng;if(p.lng>maxLng)maxLng=p.lng;});
      if (map.fitBounds) {
        map.fitBounds([[minLng,minLat],[maxLng,maxLat]], {padding:padding||80,animate:true});
      } else {
        var span=Math.max(maxLat-minLat,maxLng-minLng);
        var z=span>2?7:span>1?8:span>0.5?9:span>0.3?10:span>0.15?11:span>0.08?12:span>0.04?13:span>0.02?14:15;
        map.setCenter({lat:(minLat+maxLat)/2,lng:(minLng+maxLng)/2}); map.setZoom(z);
      }
    }

    /* ── Message handler ──────────────────────────────────────────────────── */
    document.addEventListener('message', function(e){ handleMsg(e.data); });
    window.addEventListener('message', function(e){ handleMsg(e.data); });

    function handleMsg(raw) {
      try {
        var msg = JSON.parse(raw);
        if (!map) return;
        if (msg.type === 'SET_CENTER') {
          // Bug fix: Mappls setCenter expects {lat,lng} object, not [lng,lat] array
          map.setCenter({lat: msg.lat, lng: msg.lng});
          if (msg.zoom) map.setZoom(msg.zoom);
          if (msg.markers)   updateMarkers(msg.markers);
          if (msg.polylines) updatePolylines(msg.polylines);
          if (msg.nearbyAutos !== undefined) setNearbyAutos({lat:msg.lat,lng:msg.lng}, msg.nearbyAutos);
        }
        if (msg.type === 'FIT_BOUNDS') {
          if (msg.markers)   updateMarkers(msg.markers);
          if (msg.polylines) updatePolylines(msg.polylines);
          // Bug fix: also update nearby autos during fit-bounds (e.g. active ride view)
          if (msg.nearbyAutos !== undefined) setNearbyAutos(null, msg.nearbyAutos);
          var pts = [];
          (msg.polylines||[]).forEach(function(p){(p.coords||[]).forEach(function(c){pts.push({lat:c.lat,lng:c.lng});});});
          (msg.markers||[]).forEach(function(m){pts.push({lat:m.lat,lng:m.lng});});
          fitBoundsToPoints(pts, msg.padding);
        }
        if (msg.type === 'SMOOTH_MOVE') {
          smoothMoveMarker(msg.id, msg.lat, msg.lng, msg.bearing, msg.duration || 1200);
          if (msg.panCamera) map.easeTo({center:{lat:msg.lat,lng:msg.lng},duration:msg.duration||1200});
        }
      } catch(e) {}
    }

    /* ── Drag mode (customer-only addition) ───────────────────────────────── */
    var dragModeEnabled = ${dragMode ? 'true' : 'false'};
    function attachDragListener() {
      if (!map || !dragModeEnabled) return;
      map.on('moveend', function() {
        var c = map.getCenter();
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'MAP_DRAG_END',lat:c.lat,lng:c.lng}));
        }
      });
    }

    /* ── Init ─────────────────────────────────────────────────────────────── */
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
        attachDragListener();
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

// ─── React component (forwardRef for imperative API — customer addition) ──────
const MapplsMapWebView = forwardRef(function MapplsMapWebView({
  style,
  center,
  zoom = 15,
  markers       = [],
  polylines     = [],
  nearbyAutos,            // null | true | Array<{lat,lng}|{latitude,longitude}>
  scrollEnabled = true,
  zoomEnabled   = true,
  dragMode      = false,  // customer: drag-to-pick-location mode
  onDragEnd,              // (lat, lng) => void
  fitBounds:    autoFitBounds = false,
  pointerEvents,
}, ref) {
  const webViewRef = useRef(null);
  const mapReady   = useRef(false);
  const pendingMsg = useRef(null);
  const lastEmittedCenter = useRef(null); // Track center from map to prevent feedback loops

  // Build HTML once — identical to driver
  const html = useMemo(
    () => buildMapHtml({ zoom, scrollEnabled, zoomEnabled, dragMode }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Convert RN marker objects → plain JS for postMessage
  const toMarkers = (mkrs) => mkrs.map(m => ({
    id:      m.id,
    lat:     m.latitude,
    lng:     m.longitude,
    color:   m.color   || '#8031CC',
    label:   m.label   || '',
    pulse:   !!m.pulse,
    // Bug fix: 'me' (user location) should be a pulsing dot, not an auto SVG
    type:    m.markerType || (m.id === 'pickup' ? 'pickup' : m.id === 'dropoff' ? 'dropoff' : m.id === 'driver' ? 'auto' : 'dot'),
    bearing: m.bearing || 0,
    nearby:  !!m.nearby,
  }));

  const toPolylines = (plns) => plns.map(p => ({
    coords:   (p.coords || []).map(c => ({ lat: c.latitude, lng: c.longitude })),
    color:    p.color  ?? '#8031CC',
    width:    p.width  ?? 5,
    dashed:   !!p.dashed,
    animated: !!p.animated,
  }));

  // API returns [{id, lat, lng}] — normalise and pass through directly
  const toNearbyAutos = (nb) => {
    if (!Array.isArray(nb)) return [];  // null/undefined/false → send empty, show nothing
    return nb
      .filter(a => a && (a.lat || a.latitude) && (a.lng || a.longitude))
      .map(a => ({
        lat:     a.lat     ?? a.latitude,
        lng:     a.lng     ?? a.longitude,
        bearing: a.bearing ?? 0,
      }));
  };

  const post = (payload) => {
    if (webViewRef.current) webViewRef.current.postMessage(JSON.stringify(payload));
  };

  // ── Same sendUpdate pattern as driver ──────────────────────────────────────
  const sendUpdate = (lat, lng, mkrs, plns, nb) => {
    post({
      type: 'SET_CENTER',
      lat, lng, zoom,
      markers:     toMarkers(mkrs),
      polylines:   toPolylines(plns),
      nearbyAutos: toNearbyAutos(nb),
    });
  };

  const sendFitBounds = (mkrs, plns, nb, padding) => {
    post({
      type: 'FIT_BOUNDS',
      padding: padding ?? 80,
      markers:   toMarkers(mkrs),
      polylines: toPolylines(plns),
      nearbyAutos: toNearbyAutos(nb),
    });
  };

  // ── Imperative handle (customer addition) ──────────────────────────────────
  useImperativeHandle(ref, () => ({
    smoothMoveDriver: (lat, lng, bearing, panCamera = true) => {
      if (!webViewRef.current || !mapReady.current) return;
      post({ type:'SMOOTH_MOVE', id:'driver', lat, lng, bearing: bearing ?? 0, duration:1000, panCamera });
    },
    fitBounds: (padding) => sendFitBounds(markers, polylines, nearbyAutos, padding),
  }), [markers, polylines, nearbyAutos]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect: sync on prop changes — identical pattern to driver ─────────────
  useEffect(() => {
    const lat = center?.latitude  ?? DEFAULT_LAT;
    const lng = center?.longitude ?? DEFAULT_LNG;
    
    // Ignore updates that are just echoes of what the map just told us
    if (lastEmittedCenter.current && 
        lastEmittedCenter.current.lat === lat && 
        lastEmittedCenter.current.lng === lng) {
        return;
    }
    lastEmittedCenter.current = null; // Clear if it's an external update

    if (mapReady.current) {
      if (autoFitBounds && (polylines.length > 0 || markers.length > 1)) {
        sendFitBounds(markers, polylines, nearbyAutos);
      } else {
        sendUpdate(lat, lng, markers, polylines, nearbyAutos);
      }
    } else {
      pendingMsg.current = { lat, lng, markers, polylines, nearbyAutos, fit: autoFitBounds };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  // Bug fix: compare nearbyAutos by value (JSON) to avoid spurious re-renders on every poll
  }, [center?.latitude, center?.longitude, JSON.stringify(markers), JSON.stringify(polylines), JSON.stringify(nearbyAutos)]);

  // ── onMessage — identical to driver + drag end (customer addition) ─────────
  const onMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'MAP_READY') {
        mapReady.current = true;
        const lat = center?.latitude  ?? DEFAULT_LAT;
        const lng = center?.longitude ?? DEFAULT_LNG;
        const p   = pendingMsg.current ?? {};
        const shouldFit = p.fit || autoFitBounds;
        if (shouldFit && ((p.polylines ?? polylines).length > 0 || (p.markers ?? markers).length > 1)) {
          sendFitBounds(p.markers ?? markers, p.polylines ?? polylines, p.nearbyAutos ?? nearbyAutos);
        } else {
          sendUpdate(p.lat ?? lat, p.lng ?? lng, p.markers ?? markers, p.polylines ?? polylines, p.nearbyAutos ?? nearbyAutos);
        }
        pendingMsg.current = null;
      } else if (msg.type === 'MAP_DRAG_END') {
        lastEmittedCenter.current = { lat: msg.lat, lng: msg.lng };
        onDragEnd?.(msg.lat, msg.lng);
      }
    } catch (_) {}
  };

  // ── Render — identical to driver ───────────────────────────────────────────
  return (
    <View style={[styles.container, style]} pointerEvents={pointerEvents}>
      <WebView
        ref={webViewRef}
        source={{ html, baseUrl: 'https://apis.mappls.com/' }}
        bounces={false}
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
});

export default MapplsMapWebView;

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  webview:   { flex: 1, backgroundColor: '#E8E4F0' },
  loader:    { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8E4F0' },
});
