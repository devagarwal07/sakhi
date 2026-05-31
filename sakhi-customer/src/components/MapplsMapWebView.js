import React, { useRef, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const API_KEY = process.env.EXPO_PUBLIC_MAPPLS_API_KEY ?? '';
const DEFAULT_LAT = 12.9716;
const DEFAULT_LNG = 77.5946;

function buildMapHtml({ zoom, scrollEnabled, zoomEnabled, dragMode }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=${scrollEnabled !== false ? 'yes' : 'no'}">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; background:#e8e4f0; }

    /* ── Nearby Auto markers ──────────────────────────── */
    .auto-wrap {
      position: relative; width: 44px; height: 44px;
      display: flex; align-items: center; justify-content: center;
      transform: translate(-50%, -50%);
    }
    .auto-svg { width: 36px; height: 36px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25)); }
    .auto-shadow {
      position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%);
      width: 20px; height: 6px; background: rgba(0,0,0,0.15); border-radius: 50%;
    }
    .auto-nearby { animation: autoFloat 3s ease-in-out infinite; }
    .auto-nearby:nth-child(1) { animation-delay: 0s; }
    .auto-nearby:nth-child(2) { animation-delay: 0.6s; }
    .auto-nearby:nth-child(3) { animation-delay: 1.2s; }
    .auto-nearby:nth-child(4) { animation-delay: 1.8s; }
    .auto-nearby:nth-child(5) { animation-delay: 2.4s; }
    @keyframes autoFloat {
      0%,100% { transform: translate(-50%,-50%) translateY(0px); }
      50%      { transform: translate(-50%,-50%) translateY(-5px); }
    }

    /* ── Pickup / Dropoff pins ────────────────────────── */
    .pin-wrap {
      position: relative; width: 36px; height: 48px;
      transform: translate(-50%, -100%);
      animation: pinDrop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    .pin-wrap.dropoff { animation-delay: 0.1s; opacity: 0; animation-fill-mode: forwards; }
    @keyframes pinDrop {
      0%   { transform: translate(-50%,-130%); opacity: 0; }
      100% { transform: translate(-50%,-100%); opacity: 1; }
    }
    .pin-shadow {
      position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%);
      width: 14px; height: 5px; background: rgba(0,0,0,0.2); border-radius: 50%;
      animation: pinShadow 0.5s ease forwards;
    }
    @keyframes pinShadow {
      0%   { width: 4px; opacity: 0.1; }
      100% { width: 14px; opacity: 0.2; }
    }

    /* ── Driver marker (active ride) ─────────────────── */
    .driver-wrap {
      position: relative; width: 48px; height: 48px;
      display: flex; align-items: center; justify-content: center;
      transform: translate(-50%, -50%);
      transition: transform 0.05s linear;
    }
    .driver-pulse {
      position: absolute; width: 56px; height: 56px; border-radius: 50%;
      border: 2px solid rgba(142, 68, 220, 0.5);
      animation: driverPulse 2s ease-out infinite;
    }
    @keyframes driverPulse {
      0%   { transform: scale(0.8); opacity: 0.8; }
      100% { transform: scale(1.8); opacity: 0; }
    }

    /* ── Polyline animated dash ──────────────────────── */
    .animated-line { stroke-dasharray: 12 8; animation: dashMove 0.8s linear infinite; }
    @keyframes dashMove { to { stroke-dashoffset: -20; } }

    /* Hide Mappls watermarks */
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
    var nearbyAutoMarkers = [];
    var smoothRAF = {};
    var polylineSourceId = 'polylines-source';
    var polylineLayerId  = 'polylines-layer';
    var animPolylineSourceId = 'anim-polylines-source';
    var animPolylineLayerId  = 'anim-polylines-layer';

    /* ── Auto-rickshaw SVG ───────────────────────────────────────────── */
    function autoSVG(color, bearing) {
      bearing = bearing || 0;
      return '<svg class="auto-svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style="transform: rotate('+bearing+'deg); transition: transform 0.3s ease;">'
        + '<g transform="translate(0,2)">'
        + '<ellipse cx="32" cy="54" rx="22" ry="6" fill="rgba(0,0,0,0.15)"/>'
        + '<path d="M22 6 L42 6 C49 6, 54 14, 54 24 L54 48 C54 56, 48 60, 42 60 L22 60 C16 60, 10 56, 10 48 L10 24 C10 14, 15 6, 22 6 Z" fill="'+(color || '#BFA2DB')+'"/>'
        + '<path d="M24 6 L40 6 C44 6, 46 10, 46 14 L18 14 C18 10, 20 6, 24 6 Z" fill="#DCC6F2"/>'
        + '<circle cx="32" cy="10" r="3" fill="#FFFFFF" stroke="#E9DDF7" stroke-width="1"/>'
        + '<path d="M18 17 Q32 12 46 17 L44 26 Q32 22 20 26 Z" fill="#2D3748"/>'
        + '<path d="M20 18 Q32 15 44 18 L42 23 Q32 20 22 23 Z" fill="#94A3B8" opacity="0.65"/>'
        + '<path d="M14 30 L50 30 C52 30, 52 48, 50 48 L14 48 C12 48, 12 30, 14 30 Z" fill="#9F7AEA"/>'
        + '<path d="M16 32 L48 32 C49 32, 49 46, 48 46 L16 46 C15 46, 15 32, 16 32 Z" fill="#D6BCFA"/>'
        + '<rect x="16" y="50" width="32" height="3" rx="2" fill="#F3E8FF" opacity="0.85"/>'
        + '<rect x="8" y="17" width="4" height="7" rx="2" fill="#4A5568" transform="rotate(-18 10 20)"/>'
        + '<rect x="52" y="17" width="4" height="7" rx="2" fill="#4A5568" transform="rotate(18 54 20)"/>'
        + '<rect x="29" y="1" width="6" height="8" rx="3" fill="#111827"/>'
        + '<rect x="5" y="44" width="6" height="12" rx="3" fill="#111827"/>'
        + '<rect x="53" y="44" width="6" height="12" rx="3" fill="#111827"/>'
        + '<path d="M22 8 Q32 4 42 8" stroke="#F5EEFF" stroke-width="2" stroke-linecap="round" opacity="0.7" fill="none"/>'
        + '</g>'
        + '</svg>';
    }

    /* ── Pickup pin SVG ──────────────────────────────────────────────── */
    function pickupPinSVG(color) {
      return '<svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">'
        + '<path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30S36 31.5 36 18C36 8.06 27.94 0 18 0z" fill="'+color+'"/>'
        + '<circle cx="18" cy="18" r="8" fill="white" opacity="0.9"/>'
        + '</svg>';
    }

    /* ── Dropoff flag SVG ────────────────────────────────────────────── */
    function dropoffPinSVG(color) {
      return '<svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">'
        + '<path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30S36 31.5 36 18C36 8.06 27.94 0 18 0z" fill="'+color+'"/>'
        + '<rect x="14" y="10" width="2.5" height="16" fill="white" opacity="0.9"/>'
        + '<polygon points="16.5,10 16.5,20 26,15" fill="white" opacity="0.9"/>'
        + '</svg>';
    }

    /* ── Create marker element ───────────────────────────────────────── */
    function createMarkerEl(opts) {
      var wrap = document.createElement('div');
      if (opts.type === 'auto') {
        wrap.className = 'auto-wrap' + (opts.nearby ? ' auto-nearby' : '');
        wrap.innerHTML = autoSVG(opts.color || '#8031CC', opts.bearing || 0);
        if (opts.nearby) {
          var shadow = document.createElement('div');
          shadow.className = 'auto-shadow';
          wrap.appendChild(shadow);
        }
        if (opts.pulse && !opts.nearby) {
          var ring = document.createElement('div');
          ring.className = 'driver-pulse';
          wrap.insertBefore(ring, wrap.firstChild);
          wrap.classList.add('driver-wrap');
        }
      } else if (opts.type === 'pickup') {
        wrap.className = 'pin-wrap';
        wrap.innerHTML = pickupPinSVG(opts.color || '#8031CC');
        var s = document.createElement('div'); s.className = 'pin-shadow'; wrap.appendChild(s);
      } else if (opts.type === 'dropoff') {
        wrap.className = 'pin-wrap dropoff';
        wrap.innerHTML = dropoffPinSVG(opts.color || '#1E1B2E');
        var s2 = document.createElement('div'); s2.className = 'pin-shadow'; wrap.appendChild(s2);
      } else {
        // legacy dot
        wrap.style.cssText = 'position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%)';
        var dot = document.createElement('div');
        dot.style.cssText = 'width:14px;height:14px;border-radius:50%;background:'+( opts.color||'#BEA3D8')+';border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);position:relative;z-index:2';
        wrap.appendChild(dot);
        if (opts.pulse) {
          var ring2 = document.createElement('div');
          ring2.style.cssText = 'position:absolute;width:32px;height:32px;border-radius:50%;background:'+(opts.color||'#BEA3D8')+';opacity:0;animation:pulseRing 1.8s ease-out infinite;z-index:1';
          wrap.insertBefore(ring2, dot);
        }
        if (opts.label) {
          var lbl = document.createElement('div');
          lbl.style.cssText = 'position:absolute;top:-20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.65);color:#fff;font-size:9px;font-weight:700;font-family:sans-serif;padding:1px 4px;border-radius:3px;white-space:nowrap;z-index:3';
          lbl.innerText = opts.label;
          wrap.appendChild(lbl);
        }
      }
      return wrap;
    }

    /* ── Nearby autos around pickup ──────────────────────────────────── */
    function setNearbyAutos(center, autos) {
      nearbyAutoMarkers.forEach(function(m){ m.remove(); });
      nearbyAutoMarkers = [];
      if (!map || !center || autos === false) return;
      var offsets = [
        [-0.0025, -0.0018], [0.0020, -0.0022], [-0.0015, 0.0025],
        [0.0028, 0.0020],   [0.0005, -0.0030], [-0.0030, 0.0005]
      ];
      (autos || offsets).forEach(function(a, i) {
        var isRaw = Array.isArray(a);
        var dLat = isRaw ? a[0] : (a.lat - center.lat);
        var dLng = isRaw ? a[1] : (a.lng - center.lng);
        var lat = center.lat + dLat;
        var lng = center.lng + dLng;
        var bearing = Math.floor(Math.random() * 360);
        var el = createMarkerEl({ type: 'auto', color: '#8031CC', nearby: true, bearing: bearing });
        el.style.animationDelay = (i * 0.5) + 's';
        var m = new mappls.Marker({ map: map, position: { lat: lat, lng: lng }, element: el });
        nearbyAutoMarkers.push(m);
      });
    }

    /* ── Update main markers ─────────────────────────────────────────── */
    function updateMarkers(markers) {
      if (!map) return;
      Object.values(markerObjects).forEach(function(m){ m.remove(); });
      markerObjects = {};
      markers.forEach(function(m) {
        var el = createMarkerEl(m);
        markerObjects[m.id || m.label || Math.random()] = new mappls.Marker({
          map: map,
          position: { lat: m.lat, lng: m.lng },
          element: el,
        });
      });
    }

    /* ── Smooth move a marker (driver tracking) ──────────────────────── */
    function smoothMoveMarker(id, toLat, toLng, durationMs) {
      var marker = markerObjects[id];
      if (!marker) return;
      var from = marker.getLngLat ? marker.getLngLat() : null;
      if (!from) { marker.setLngLat([toLng, toLat]); return; }
      var fromLat = from.lat, fromLng = from.lng;
      var startTime = null;
      if (smoothRAF[id]) cancelAnimationFrame(smoothRAF[id]);
      function step(ts) {
        if (!startTime) startTime = ts;
        var t = Math.min((ts - startTime) / (durationMs || 1000), 1);
        var ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
        var lat = fromLat + (toLat - fromLat) * ease;
        var lng = fromLng + (toLng - fromLng) * ease;
        if (marker.setLngLat) marker.setLngLat([lng, lat]);
        if (t < 1) smoothRAF[id] = requestAnimationFrame(step);
      }
      smoothRAF[id] = requestAnimationFrame(step);
    }

    /* ── Smooth bearing rotation for a marker ────────────────────────── */
    var markerBearings = {}; // track current bearing per marker id
    function smoothRotateMarker(id, toBearing, durationMs) {
      var marker = markerObjects[id];
      if (!marker) return;
      var el = marker.getElement ? marker.getElement() : null;
      if (!el) return;
      var svgEl = el.querySelector('svg');
      if (!svgEl) return;

      var fromBearing = markerBearings[id] || 0;
      // Shortest rotation path
      var delta = ((toBearing - fromBearing + 540) % 360) - 180;
      var startTime = null;
      var rafKey = 'bearing_' + id;
      if (smoothRAF[rafKey]) cancelAnimationFrame(smoothRAF[rafKey]);

      function step(ts) {
        if (!startTime) startTime = ts;
        var t = Math.min((ts - startTime) / (durationMs || 400), 1);
        var ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
        var current = fromBearing + delta * ease;
        svgEl.style.transform = 'rotate(' + current + 'deg)';
        if (t < 1) {
          smoothRAF[rafKey] = requestAnimationFrame(step);
        } else {
          markerBearings[id] = toBearing;
        }
      }
      smoothRAF[rafKey] = requestAnimationFrame(step);
    }

    /* ── Polylines (animated + static) ─────────────────────────────── */
    function ensureLayers() {
      if (!map || !map.addSource) return;
      if (!map.getSource(polylineSourceId)) {
        map.addSource(polylineSourceId, { type:'geojson', data:{ type:'FeatureCollection', features:[] } });
        map.addLayer({ id: polylineLayerId, type:'line', source: polylineSourceId,
          layout:{ 'line-join':'round','line-cap':'round' },
          paint:{ 'line-color':['get','color'],'line-width':['get','width'],'line-opacity':['get','opacity'] }
        });
      }
      if (!map.getSource(animPolylineSourceId)) {
        map.addSource(animPolylineSourceId, { type:'geojson', data:{ type:'FeatureCollection', features:[] } });
        map.addLayer({ id: animPolylineLayerId, type:'line', source: animPolylineSourceId,
          layout:{ 'line-join':'round','line-cap':'round' },
          paint:{
            'line-color':['get','color'], 'line-width':['get','width'],
            'line-opacity': 0.85,
            'line-dasharray': [2, 2]
          }
        });
      }
    }

    var dashOffset = 0;
    function animateDash() {
      if (!map || !map.getLayer) { requestAnimationFrame(animateDash); return; }
      try {
        dashOffset = (dashOffset - 0.5) % 20;
        if (map.getLayer(animPolylineLayerId)) {
          map.setPaintProperty(animPolylineLayerId, 'line-dasharray', [2, 2]);
        }
      } catch(e) {}
      requestAnimationFrame(animateDash);
    }

    function updatePolylines(polylines) {
      if (!map) return;
      ensureLayers();
      var staticFeats = [], animFeats = [];
      (polylines || []).forEach(function(p) {
        if (!p.coords || !p.coords.length) return;
        var feat = {
          type: 'Feature',
          properties: { color: p.color||'#BEA3D8', width: p.width||5, opacity: 1 },
          geometry: { type:'LineString', coordinates: p.coords.map(function(c){ return [c.lng, c.lat]; }) }
        };
        if (p.animated) animFeats.push(feat);
        else staticFeats.push(feat);
      });
      try {
        var s1 = map.getSource(polylineSourceId);
        if (s1 && s1.setData) s1.setData({ type:'FeatureCollection', features: staticFeats });
        var s2 = map.getSource(animPolylineSourceId);
        if (s2 && s2.setData) s2.setData({ type:'FeatureCollection', features: animFeats });
      } catch(e) {
        polylineObjects.forEach(function(p){ try{p.remove();}catch(e){} });
        polylineObjects = [];
        polylines.forEach(function(p) {
          if (!p.coords || !p.coords.length) return;
          polylineObjects.push(new mappls.Polyline({ map:map, path: p.coords.map(function(c){ return { lat:c.lat, lng:c.lng }; }),
            strokeColor: p.color, strokeWidth: p.width, strokeOpacity: p.dashed ? 0.6 : 1,
            strokeDashstyle: p.dashed ? 'dot' : 'solid'
          }));
        });
      }
    }

    /* ── Message handler ─────────────────────────────────────────────── */
    document.addEventListener('message', function(e){ handleMsg(e.data); });
    window.addEventListener('message', function(e){ handleMsg(e.data); });

    function handleMsg(raw) {
      try {
        var msg = JSON.parse(raw);
        if (!map) return;
        if (msg.type === 'SET_CENTER') {
          map.setCenter({lat: msg.lat, lng: msg.lng});
          if (msg.zoom) map.setZoom(msg.zoom);
          if (msg.markers)    updateMarkers(msg.markers);
          if (msg.polylines)  updatePolylines(msg.polylines);
          if (msg.nearbyAutos !== undefined) setNearbyAutos({ lat: msg.lat, lng: msg.lng }, msg.nearbyAutos);
        }
        if (msg.type === 'FIT_BOUNDS') {
          // Update markers and polylines first
          if (msg.markers)   updateMarkers(msg.markers);
          if (msg.polylines) updatePolylines(msg.polylines);
          if (msg.nearbyAutos !== undefined) setNearbyAutos(msg.markers && msg.markers[0] ? { lat: msg.markers[0].lat, lng: msg.markers[0].lng } : null, msg.nearbyAutos);

          // Collect all coordinate points (polyline coords + marker positions)
          var pts = [];
          if (msg.polylines) {
            msg.polylines.forEach(function(p) {
              (p.coords || []).forEach(function(c) { 
                var clng = Number(c.lng);
                var clat = Number(c.lat);
                if (!isNaN(clng) && !isNaN(clat)) pts.push({lng: clng, lat: clat}); 
              });
            });
          }
          if (msg.markers) {
            msg.markers.forEach(function(m) { 
              var mlng = Number(m.lng);
              var mlat = Number(m.lat);
              if (!isNaN(mlng) && !isNaN(mlat)) pts.push({lng: mlng, lat: mlat}); 
            });
          }

          if (pts.length >= 2) {
            // Compute bounding box
            var minLat = pts[0].lat, maxLat = pts[0].lat;
            var minLng = pts[0].lng, maxLng = pts[0].lng;
            pts.forEach(function(p) {
              if (p.lat < minLat) minLat = p.lat;
              if (p.lat > maxLat) maxLat = p.lat;
              if (p.lng < minLng) minLng = p.lng;
              if (p.lng > maxLng) maxLng = p.lng;
            });

            // Delegate to the native map engine for perfect fitting
            if (map.fitBounds) {
              map.fitBounds([[minLng, minLat], [maxLng, maxLat]], {
                padding: msg.padding || 80,
                animate: true
              });
            } else {
              var midLat2 = (minLat + maxLat) / 2;
              var midLng2 = (minLng + maxLng) / 2;
              var dLat = maxLat - minLat;
              var dLng = maxLng - minLng;
              var span = Math.max(dLat, dLng);
              var z = span > 2.0 ? 7 : span > 1.0 ? 8 : span > 0.5 ? 9 : span > 0.3 ? 10 : span > 0.15 ? 11 : span > 0.08 ? 12 : span > 0.04 ? 13 : span > 0.02 ? 14 : 15;
              map.setCenter({lat: midLat2, lng: midLng2});
              map.setZoom(z);
            }
          } else if (pts.length === 1) {
            map.setCenter({lat: pts[0].lat, lng: pts[0].lng});
            map.setZoom(14);
          }
        }
        if (msg.type === 'SMOOTH_MOVE') {
          smoothMoveMarker(msg.id, msg.lat, msg.lng, msg.duration || 1000);
          if (msg.bearing !== undefined) {
            smoothRotateMarker(msg.id, msg.bearing, msg.bearingDuration || 400);
          }
          // Pan camera smoothly to new driver position
          if (msg.panCamera && map) {
            map.easeTo({ center: [msg.lng, msg.lat], duration: msg.duration || 1000 });
          }
        }
        if (msg.type === 'SET_NEARBY_AUTOS') {
          setNearbyAutos({ lat: msg.lat, lng: msg.lng }, msg.autos);
        }
      } catch(e) {}
    }

    /* ── Drag-mode: fire MAP_DRAG_END when map center changes ─────────── */
    var dragModeEnabled = ${dragMode ? 'true' : 'false'};
    function attachDragListener() {
      if (!map || !dragModeEnabled) return;
      map.on('moveend', function() {
        if (!dragModeEnabled) return;
        var center = map.getCenter();
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'MAP_DRAG_END',
            lat: center.lat,
            lng: center.lng,
          }));
        }
      });
    }

    /* ── Init ─────────────────────────────────────────────────────────── */
    function initMap() {
      map = new mappls.Map('map', {
        center:      {lat: ${DEFAULT_LAT}, lng: ${DEFAULT_LNG}},
        zoom:        ${zoom ?? 15},
        search:      false,
        zoomControl: ${zoomEnabled !== false},
        scrollZoom:  ${scrollEnabled !== false},
        dragPan:     ${scrollEnabled !== false},
      });
      map.on('load', function () {
        ensureLayers();
        requestAnimationFrame(animateDash);
        attachDragListener();
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
        }
      });
    }
    window.initMap = initMap;
  </script>

  <style>
    @keyframes pulseRing {
      0%   { transform: scale(0.5); opacity: 0.7; }
      100% { transform: scale(2.2); opacity: 0; }
    }
  </style>

  <script src="https://apis.mappls.com/advancedmaps/api/${API_KEY}/map_sdk?v=3.0&layer=vector&callback=initMap" async defer></script>
</body>
</html>`;
}

const MapplsMapWebView = forwardRef(function MapplsMapWebView({
    style,
    center,
    zoom = 15,
    markers = [],
    polylines = [],
    nearbyAutos,        // null | [] | true  — truthy = show scattered autos around center
    scrollEnabled = true,
    zoomEnabled = true,
    dragMode = 'auto',  // 'auto' | 'manual'
    onDragEnd,          // callback(lat, lng) when user drags the map
    pointerEvents,
    fitBounds: autoFitBounds = false,  // auto-fit bounds to show full route (Ola/Uber style)
  }, ref) {
    const webViewRef = useRef(null);
    const mapReady = useRef(false);
    const pendingMsg = useRef(null);

    // Expose imperative methods — merged into a single useImperativeHandle
    useImperativeHandle(ref, () => ({
      // Smoothly move + rotate the driver marker without re-rendering
      smoothMoveDriver: (lat, lng, bearing, panCamera = true) => {
        if (!webViewRef.current || !mapReady.current) return;
        webViewRef.current.postMessage(JSON.stringify({
          type: 'SMOOTH_MOVE',
          id: 'driver',
          lat,
          lng,
          bearing: bearing ?? 0,
          duration: 1000,
          bearingDuration: 400,
          panCamera,
        }));
      },
      // Fit map bounds to show full route
      fitBounds: (padding) => sendFitBounds(markers, polylines, nearbyAutos, padding),
    }), [markers, polylines, nearbyAutos]);

    const html = useMemo(
      () => buildMapHtml({ zoom, scrollEnabled, zoomEnabled, dragMode }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    const serializeMarkers = (mkrs) => mkrs.map(m => ({
      id: m.id,
      lat: m.latitude,
      lng: m.longitude,
      color: m.color || '#8031CC',
      label: m.label || '',
      pulse: !!m.pulse,
      type: m.markerType || (m.id === 'pickup' ? 'pickup' : m.id === 'dropoff' ? 'dropoff' : m.pulse ? 'auto' : 'dot'),
      bearing: m.bearing || 0,
      nearby: !!m.nearby,
    }));

    const serializePolylines = (plns) => plns.map(p => ({
      coords: (p.coords || []).map(c => ({ lat: c.latitude, lng: c.longitude })),
      color: p.color ?? '#8031CC',
      width: p.width ?? 5,
      dashed: !!p.dashed,
      animated: !!p.animated,
    }));


    const sendUpdate = (lat, lng, mkrs, plns, nbAutos) => {
      if (!webViewRef.current) return;
      const msg = JSON.stringify({
        type: 'SET_CENTER',
        lat, lng, zoom,
        markers: serializeMarkers(mkrs),
        polylines: serializePolylines(plns),
        nearbyAutos: nbAutos === true ? [] : (nbAutos || false),
      });
      webViewRef.current.postMessage(msg);
    };

    const sendFitBounds = (mkrs, plns, nbAutos, padding) => {
      if (!webViewRef.current) return;
      const msg = JSON.stringify({
        type: 'FIT_BOUNDS',
        padding: padding ?? 80,
        markers: serializeMarkers(mkrs),
        polylines: serializePolylines(plns),
        nearbyAutos: nbAutos === true ? [] : (nbAutos || false),
      });
      webViewRef.current.postMessage(msg);
    };



    useEffect(() => {
      const lat = center?.latitude ?? DEFAULT_LAT;
      const lng = center?.longitude ?? DEFAULT_LNG;
      if (mapReady.current) {
        if (autoFitBounds && (polylines.length > 0 || markers.length > 1)) {
          // Use FIT_BOUNDS whenever there is a route to show
          sendFitBounds(markers, polylines, nearbyAutos);
        } else {
          sendUpdate(lat, lng, markers, polylines, nearbyAutos);
        }
      } else {
        pendingMsg.current = { lat, lng, markers, polylines, nearbyAutos, fitBounds: autoFitBounds };
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [center?.latitude, center?.longitude, zoom, JSON.stringify(markers), JSON.stringify(polylines), nearbyAutos]);

    const onMessage = (event) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'MAP_READY') {
          mapReady.current = true;
          const lat = center?.latitude ?? DEFAULT_LAT;
          const lng = center?.longitude ?? DEFAULT_LNG;
          const p = pendingMsg.current ?? {};
          const shouldFit = p.fitBounds || autoFitBounds;
          if (shouldFit && ((p.polylines ?? polylines).length > 0 || (p.markers ?? markers).length > 1)) {
            sendFitBounds(p.markers ?? markers, p.polylines ?? polylines, p.nearbyAutos ?? nearbyAutos);
          } else {
            sendUpdate(p.lat ?? lat, p.lng ?? lng, p.markers ?? markers, p.polylines ?? polylines, p.nearbyAutos ?? nearbyAutos);
          }
          pendingMsg.current = null;
        } else if (msg.type === 'MAP_DRAG_END') {
          onDragEnd?.(msg.lat, msg.lng);
        }
      } catch (_) { }
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
          onError={() => { }}
        />
      </View>
    );
});

export default MapplsMapWebView;

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: '#e8e4f0' },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDE9FE' },
});
