const MAPPLS_KEY = process.env.EXPO_PUBLIC_MAPPLS_API_KEY ?? '';
const MAPPLS_CLIENT_ID = process.env.EXPO_PUBLIC_MAPPLS_CLIENT_ID ?? '';
const MAPPLS_CLIENT_SECRET = process.env.EXPO_PUBLIC_MAPPLS_CLIENT_SECRET ?? '';

let _mapplsToken = null;
let _tokenExpiry = 0;

export async function getMapplsToken() {
    if (_mapplsToken && Date.now() < _tokenExpiry) return _mapplsToken;
    const res = await fetch(
        `https://outpost.mappls.com/api/security/oauth/token?grant_type=client_credentials` +
        `&client_id=${MAPPLS_CLIENT_ID}` +
        `&client_secret=${encodeURIComponent(MAPPLS_CLIENT_SECRET)}`,
        { method: 'POST' }
    );
    const json = await res.json();
    _mapplsToken = json.access_token;
    _tokenExpiry = Date.now() + (json.expires_in - 60) * 1000;
    return _mapplsToken;
}

export async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 5000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);
    return response;
}

/**
 * Searches Mappls for location suggestions
 * @param {string} query Search string
 * @param {object} biasLocation { latitude, longitude } for proximity bias
 */
export async function searchPlaces(query, biasLocation = null) {
    if (!query || query.trim().length < 3) return [];
    
    const token = await getMapplsToken();
    const biasParam = (biasLocation?.latitude && biasLocation?.longitude) 
        ? `&location=${biasLocation.latitude},${biasLocation.longitude}` 
        : '';
        
    let searchQuery = query;
    if (!/bengaluru|bangalore/i.test(searchQuery)) {
        searchQuery = `${searchQuery} Bengaluru`;
    }
        
    const response = await fetch(
        `https://atlas.mappls.com/api/places/search/json?query=${encodeURIComponent(searchQuery)}&access_token=${token}&region=IND${biasParam}`
    );
    const data = await response.json();
    const raw = data?.suggestedLocations || [];
    
    return raw.map(p => ({
        place_id: p.eLoc,
        structured_formatting: {
            main_text:      p.placeName  || p.keywords || query,
            secondary_text: p.placeAddress || p.addressTokens?.city || '',
        },
        _lat: p.latitude,
        _lng: p.longitude,
    }));
}

/**
 * Resolves precise coordinates for a selected place.
 * Uses fallbacks because Mappls Basic Tier masks coordinates.
 * @param {object} place Place object from searchPlaces
 */
export async function resolveCoordinates(place) {
    let coords = null;

    if (place._lat && place._lng) {
        coords = { latitude: parseFloat(place._lat), longitude: parseFloat(place._lng) };
    } else if (place.lat && place.lng) {
        // e.g. Recent destinations
        coords = { latitude: parseFloat(place.lat), longitude: parseFloat(place.lng) };
    }

    const newAddress = place.structured_formatting?.main_text || place.description || place.main || 'Selected Location';
    const secondary = place.structured_formatting?.secondary_text || place.secondary || '';
    const fullAddress = secondary ? `${newAddress}, ${secondary}` : newAddress;

    // Fallback 1: OSM Nominatim (Full Address)
    if (!coords || !coords.latitude) {
        try {
            const osmRes = await fetchWithTimeout(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddress)}&format=json&limit=1&countrycodes=in`, {
                headers: { 'User-Agent': 'SakhiCustomerApp/1.0' }, timeout: 4000
            });
            const osmData = await osmRes.json();
            if (osmData && osmData.length > 0) {
                coords = { latitude: parseFloat(osmData[0].lat), longitude: parseFloat(osmData[0].lon) };
            }
        } catch(e) {}
    }

    // Fallback 2: OSM Nominatim (Short Name Only - Much higher success rate)
    if (!coords || !coords.latitude) {
        try {
            const osmRes2 = await fetchWithTimeout(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(newAddress)}&format=json&limit=1&countrycodes=in`, {
                headers: { 'User-Agent': 'SakhiCustomerApp/1.0' }, timeout: 4000
            });
            const osmData2 = await osmRes2.json();
            if (osmData2 && osmData2.length > 0) {
                coords = { latitude: parseFloat(osmData2[0].lat), longitude: parseFloat(osmData2[0].lon) };
            }
        } catch(e) {}
    }

    // Fallback 3: Photon Komoot API (Short Name)
    if (!coords || !coords.latitude) {
        try {
            const photonRes2 = await fetchWithTimeout(`https://photon.komoot.io/api/?q=${encodeURIComponent(newAddress)}&limit=1`, { timeout: 4000 });
            const photonData2 = await photonRes2.json();
            if (photonData2?.features?.length > 0) {
                const [lon, lat] = photonData2.features[0].geometry.coordinates;
                coords = { latitude: parseFloat(lat), longitude: parseFloat(lon) };
            }
        } catch (e) {}
    }

    return {
        coords,
        address: newAddress,
        fullAddress
    };
}

export async function fetchDirectionsPolyline(origin, destination, waypoint) {
    if (!origin || !destination) return { points: [], distance: null, duration: null };
    const start = `${origin.longitude},${origin.latitude}`;
    const dest  = `${destination.longitude},${destination.latitude}`;
    const via   = waypoint ? `;${waypoint.longitude},${waypoint.latitude}` : '';
    
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${start}${via};${dest}?geometries=geojson&overview=full`;
        const res = await fetch(url, { headers: { 'User-Agent': 'SakhiApp/1.0' } });
        const data = await res.json();
        const route = data?.routes?.[0];
        
        if (route) {
            const points = route.geometry.coordinates.map(c => ({
                latitude: c[1],
                longitude: c[0]
            }));
            const distM = route.distance || 0;
            const durS = route.duration || 0;
            const distance = `${(distM / 1000).toFixed(1)} km`;
            const duration = `${Math.round(durS / 60)} mins`;
            return { points, distance, duration };
        }
    } catch (e) {
        console.error('OSRM Polyline error:', e);
    }
    return { points: [], distance: null, duration: null };
}
