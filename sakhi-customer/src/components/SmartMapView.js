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
    children,
  },
  _ref
) {
  return (
    <MapplsMapWebView
      style={style}
      center={center}
      zoom={zoom}
      markers={markers}
      polylines={polylines}
      nearbyAutos={nearbyAutos}
      scrollEnabled={scrollEnabled}
      zoomEnabled={zoomEnabled}
      pointerEvents={pointerEvents}
    />
  );
});

export default SmartMapView;
export { IS_EXPO_GO };
