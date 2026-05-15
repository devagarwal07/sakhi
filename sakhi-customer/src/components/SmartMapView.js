/**
 * SmartMapView (sakhi-customer)
 *
 * Always renders Mappls maps via WebView — in ALL environments:
 *   - Expo Go (storeClient)
 *   - EAS preview builds (APK)
 *   - EAS production builds (AAB)
 *
 * Unified prop API:
 *   style, center, zoom, markers, polylines,
 *   scrollEnabled, zoomEnabled, pointerEvents,
 *   showsTraffic (ignored), children (ignored)
 */

import React, { forwardRef } from 'react';
import MapplsMapWebView from './MapplsMapWebView';

// Always false — Mappls is used in all environments now
const IS_EXPO_GO = false;

const SmartMapView = forwardRef(function SmartMapView(
    {
        style,
        center,
        zoom = 15,
        latDelta,
        lngDelta,
        markers      = [],
        polylines    = [],
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
            scrollEnabled={scrollEnabled}
            zoomEnabled={zoomEnabled}
            pointerEvents={pointerEvents}
        />
    );
});

export default SmartMapView;
export { IS_EXPO_GO };
