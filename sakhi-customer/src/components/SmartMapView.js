/**
 * SmartMapView (sakhi-customer)
 *
 * Auto-switches map renderer:
 *   - Expo Go  → GoogleMapWebView (Maps JS API via WebView)
 *   - Native   → react-native-maps PROVIDER_GOOGLE
 *
 * Unified prop API:
 *   style, center, zoom, markers, polylines,
 *   scrollEnabled, zoomEnabled, pointerEvents,
 *   showsTraffic, children (native-only)
 */

import React, { forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Constants from 'expo-constants';

const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

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

const MAP_STYLE = [
    { featureType: 'all',     stylers: [{ saturation: -70 }] },
    { featureType: 'road',    stylers: [{ color: '#e8e1f5' }] },
    { featureType: 'water',   stylers: [{ color: '#c8bef0' }] },
    { featureType: 'poi',     stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

function zoomToLatDelta(zoom = 15) {
    return 0.005 * Math.pow(2, 15 - zoom);
}

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
    ref
) {
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
            {polylines.map((p, i) => (
                <Polyline
                    key={i}
                    coordinates={p.coords}
                    strokeColor={p.color || '#BEA3D8'}
                    strokeWidth={p.width || 5}
                    lineDashPattern={p.dashed ? [10, 8] : undefined}
                />
            ))}
            {children}
        </RNMapView>
    );
});

export default SmartMapView;
export { IS_EXPO_GO };

const nativeStyles = StyleSheet.create({
    markerDot: {
        width: 16, height: 16, borderRadius: 8,
        borderWidth: 2.5, borderColor: '#FFFFFF',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
    },
    markerPulse: {
        borderColor: 'rgba(255,255,255,0.6)',
        opacity: 0.9,
    },
});
