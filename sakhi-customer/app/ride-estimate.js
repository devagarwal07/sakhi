import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Dimensions, Platform, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { useRide } from '../src/context/RideContext';

const { width } = Dimensions.get('window');

// Mock data for vehicles
const VEHICLES = [
    {
        id: 'sakhi_mini',
        name: 'Sakhi Mini',
        desc: 'Quick, easy & reliable',
        price: '₹142',
        time: '3 min away',
        icon: '🚗', 
        capacity: 4,
    },
    {
        id: 'sakhi_prime',
        name: 'Sakhi Prime',
        desc: 'Spacious & premium comfort',
        price: '₹185',
        time: '5 min away',
        icon: '🚘',
        capacity: 4,
    },
    {
        id: 'sakhi_auto',
        name: 'Sakhi Auto',
        desc: 'Eco-friendly and fast',
        price: '₹98',
        time: '2 min away',
        icon: '🛺',
        capacity: 3,
    },
];

export default function RideEstimateScreen() {
    const router = useRouter();
    const { ride } = useRide();
    const [selectedVehicle, setSelectedVehicle] = React.useState('sakhi_mini');

    // Mock route coordinates
    const routeCoordinates = [
        { latitude: 28.5494, longitude: 77.2001 },
        { latitude: 28.5286, longitude: 77.2189 },
    ];

    return (
        <View style={styles.container}>
            {/* Map Preview */}
            <View style={styles.mapContainer}>
                <MapView
                    style={StyleSheet.absoluteFill}
                    provider={PROVIDER_GOOGLE}
                    initialRegion={{
                        latitude: 28.5390,
                        longitude: 77.2095,
                        latitudeDelta: 0.04,
                        longitudeDelta: 0.04,
                    }}
                    customMapStyle={mapStyle}
                >
                    <Marker coordinate={routeCoordinates[0]}>
                        <View style={styles.pickDot} />
                    </Marker>
                    <Marker coordinate={routeCoordinates[1]}>
                        <View style={styles.dropPin}>
                            <Text style={styles.pinSmall}>📍</Text>
                        </View>
                    </Marker>
                    <Polyline
                        coordinates={routeCoordinates}
                        strokeColor="#BEA3D8"
                        strokeWidth={4}
                    />
                </MapView>

                {/* Header Overlay */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>
                    <View style={styles.addressPill}>
                        <Text style={styles.addressText} numberOfLines={1}>
                            Worli Sea Face, Mumbai
                        </Text>
                    </View>
                </View>
            </View>

            {/* Selection Sheet */}
            <View style={styles.bottomSheet}>
                <View style={styles.handlebar} />
                
                <Text style={styles.title}>CHOOSE A RIDE</Text>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {VEHICLES.map((v) => (
                        <TouchableOpacity
                            key={v.id}
                            style={[
                                styles.vehicleCard,
                                selectedVehicle === v.id && styles.vehicleCardActive
                            ]}
                            onPress={() => setSelectedVehicle(v.id)}
                        >
                            <View style={styles.vehicleIconBg}>
                                <Text style={styles.vehicleEmoji}>{v.icon}</Text>
                            </View>
                            <View style={styles.vehicleInfo}>
                                <View style={styles.nameRow}>
                                    <Text style={styles.vehicleName}>{v.name}</Text>
                                    <View style={styles.capacityRow}>
                                        <Text style={styles.capacityIcon}>‍👤</Text>
                                        <Text style={styles.capacityText}>{v.capacity}</Text>
                                    </View>
                                </View>
                                <Text style={styles.vehicleDesc}>{v.desc}</Text>
                                <Text style={styles.vehicleTime}>{v.time}</Text>
                            </View>
                            <Text style={styles.vehiclePrice}>{v.price}</Text>
                        </TouchableOpacity>
                    ))}

                    <TouchableOpacity style={styles.paymentMethod}>
                        <Text style={styles.paymentIcon}>💳</Text>
                        <Text style={styles.paymentText}>Personal • **** 4242</Text>
                        <Text style={styles.paymentArrow}>›</Text>
                    </TouchableOpacity>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={styles.requestButton}
                        onPress={() => router.push('/ride-finding')}
                    >
                        <Text style={styles.requestText}>REQUEST SAKHI</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const mapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#f5f0ff' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#ccc3d8' }] },
];

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F0FF' },
    mapContainer: { height: '45%' },
    header: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 52 : 16,
        left: 16, right: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
    },
    backIcon: { fontSize: 20, color: '#BEA3D8' },
    addressPill: {
        flex: 1, height: 44, backgroundColor: '#FFFFFF',
        borderRadius: 22, paddingHorizontal: 20, justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
    },
    addressText: { fontSize: 14, fontWeight: '600', color: '#1C1A25' },
    pickDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFF' },
    dropPin: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    pinSmall: { fontSize: 24 },

    bottomSheet: {
        flex: 1, backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        marginTop: -32, paddingHorizontal: 24, paddingTop: 12,
    },
    handlebar: {
        width: 40, height: 4, backgroundColor: '#E5E0EF',
        borderRadius: 2, alignSelf: 'center', marginBottom: 24,
    },
    title: {
        fontSize: 11, fontWeight: '900', color: '#7B7487',
        letterSpacing: 1.5, marginBottom: 16,
    },
    vehicleCard: {
        flexDirection: 'row', alignItems: 'center', padding: 16,
        borderRadius: 16, marginBottom: 12, backgroundColor: '#F9F7FF',
        borderWidth: 1, borderColor: 'transparent',
    },
    vehicleCardActive: {
        borderColor: '#BEA3D8', backgroundColor: '#F5F0FF',
    },
    vehicleIconBg: {
        width: 60, height: 60, borderRadius: 12,
        backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    },
    vehicleEmoji: { fontSize: 32 },
    vehicleInfo: { flex: 1, marginLeft: 16 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    vehicleName: { fontSize: 16, fontWeight: '700', color: '#1C1A25' },
    capacityRow: { flexDirection: 'row', alignItems: 'center' },
    capacityIcon: { fontSize: 10 },
    capacityText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
    vehicleDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    vehicleTime: { fontSize: 12, fontWeight: '600', color: '#BEA3D8', marginTop: 4 },
    vehiclePrice: { fontSize: 18, fontWeight: '800', color: '#1C1A25' },

    paymentMethod: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 16,
        borderTopWidth: 1, borderTopColor: '#F0EBF8', marginTop: 8,
    },
    paymentIcon: { fontSize: 18 },
    paymentText: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '600', color: '#4A4455' },
    paymentArrow: { fontSize: 20, color: '#CCC3D8' },

    footer: { paddingBottom: Platform.OS === 'ios' ? 34 : 24, paddingTop: 12 },
    requestButton: {
        height: 56, backgroundColor: '#BEA3D8', borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#BEA3D8', shadowOpacity: 0.3, shadowRadius: 15, elevation: 5,
    },
    requestText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
});
