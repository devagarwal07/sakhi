import React, { forwardRef } from 'react';
import MapplsMapWebView from './MapplsMapWebView';

const IS_EXPO_GO = false;

const SmartMapView = forwardRef(function SmartMapView(
  {
    style,
    center,
    zoom = 15,
    markers      = [],
    polylines    = [],
    nearbyAutos,          // pass-through for animated search autos
    scrollEnabled = true,
    zoomEnabled   = true,
    pointerEvents,
    showsTraffic  = false,
    fitBounds     = false, // auto-zoom to fit all markers + route
    children,
  },
  ref
) {
  return (
    <MapplsMapWebView
      ref={ref}
      style={style}
      center={center}
      zoom={zoom}
      markers={markers}
      polylines={polylines}
      nearbyAutos={nearbyAutos}
      scrollEnabled={scrollEnabled}
      zoomEnabled={zoomEnabled}
      pointerEvents={pointerEvents}
      fitBounds={fitBounds}
    />
  );
});

export default SmartMapView;
export { IS_EXPO_GO };
