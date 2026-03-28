import React from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    SafeAreaView, ImageBackground, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';

export default function SavedPlacesScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                
                {/* Header App Bar */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.7}>
                        <Text style={styles.headerIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Saved Places</Text>
                    <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
                        <Text style={styles.headerDots}>⋮</Text>
                    </TouchableOpacity>
                </View>

                {/* Main Content Area */}
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Primary Address Card Setup */}
                    <View style={styles.primaryCard}>
                        
                        {/* Row: Home */}
                        <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
                            <View style={[styles.iconWrap, { backgroundColor: '#10B981' }]}>
                                <Text style={styles.whiteIcon}>🏠</Text>
                            </View>
                            <View style={styles.rowTextWrap}>
                                <Text style={styles.rowTitle}>Home</Text>
                                <Text style={styles.rowActionText}>Add Home Address</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        {/* Row: Work */}
                        <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
                            <View style={[styles.iconWrap, { backgroundColor: '#3B82F6' }]}>
                                <Text style={styles.whiteIcon}>💼</Text>
                            </View>
                            <View style={styles.rowTextWrap}>
                                <Text style={styles.rowTitle}>Work</Text>
                                <Text style={styles.rowActionText}>Add Work Address</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        {/* Row: Favourites */}
                        <TouchableOpacity style={styles.rowItem} activeOpacity={0.7}>
                            <View style={[styles.iconWrap, { backgroundColor: '#A78BFA' }]}>
                                <Text style={styles.whiteIcon}>🤍</Text>
                            </View>
                            <View style={styles.rowTextWrap}>
                                <Text style={styles.rowTitle}>Favourites</Text>
                                <Text style={styles.rowSubtext}>2 places saved</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Add New Place CTA */}
                    <TouchableOpacity style={styles.addPlaceBtn} activeOpacity={0.7}>
                        <Text style={styles.addTextIcon}>+</Text>
                        <Text style={styles.addText}>Add New Place</Text>
                    </TouchableOpacity>

                    {/* Custom Saved Locations Heading */}
                    <Text style={styles.sectionHeader}>My Saved Locations</Text>

                    {/* Saved Location 1 */}
                    <View style={styles.customPlaceCard}>
                        <View style={styles.customPlaceLeft}>
                            <View style={styles.pinIconWrap}>
                                <Text style={styles.pinIcon}>📍</Text>
                            </View>
                            <View style={styles.customPlaceInfo}>
                                <Text style={styles.customPlaceName}>Cafe Coffee Day</Text>
                                <Text style={styles.customPlaceAddress}>24, MG Road, Bangalore,{'\n'}Karnataka 560001</Text>
                            </View>
                        </View>
                        <View style={styles.actionIconsRow}>
                            <TouchableOpacity style={styles.actionBtn}>
                                <Text style={styles.actionEdit}>✏️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn}>
                                <Text style={styles.actionDelete}>🗑️</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Saved Location 2 */}
                    <View style={styles.customPlaceCard}>
                        <View style={styles.customPlaceLeft}>
                            <View style={styles.pinIconWrap}>
                                <Text style={styles.pinIcon}>📍</Text>
                            </View>
                            <View style={styles.customPlaceInfo}>
                                <Text style={styles.customPlaceName}>Central Library</Text>
                                <Text style={styles.customPlaceAddress}>Cubbon Park, Ambedkar{'\n'}Veedhi, Bengaluru</Text>
                            </View>
                        </View>
                        <View style={styles.actionIconsRow}>
                            <TouchableOpacity style={styles.actionBtn}>
                                <Text style={styles.actionEdit}>✏️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn}>
                                <Text style={styles.actionDelete}>🗑️</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Map Visualizer Graphic */}
                    <View style={styles.mapThumbnail}>
                        <View style={styles.mapOverlayBg}>
                            {/* Abstract representation of map pins since we can't reliably load the user's specific map graphic statically here */}
                            <Text style={[styles.mapGraphicPin, { top: '30%', right: '30%' }]}>📍</Text>
                            <Text style={[styles.mapGraphicPin, { top: '65%', left: '42%' }]}>📍</Text>
                            <Text style={[styles.mapGraphicPin, { top: '75%', left: '55%' }]}>📍</Text>
                        </View>
                    </View>

                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F5F0FF' },
    container: { flex: 1 },
    
    /* Header AppBar */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24, paddingVertical: 16,
        backgroundColor: 'rgba(245, 240, 255, 0.95)',
        zIndex: 10,
    },
    iconBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
    headerIcon: { fontSize: 24, color: '#BEA3D8', fontWeight: 'bold' },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#1E1B2E', letterSpacing: -0.45 },
    headerDots: { fontSize: 24, color: '#BEA3D8', fontWeight: 'bold', paddingTop: -4 },

    /* Scroll Body */
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 16, 
        paddingBottom: 40,
        gap: 24,
    },

    /* Top Default Config Card */
    primaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
    },
    rowItem: {
        flexDirection: 'row', alignItems: 'center',
        padding: 20, gap: 16,
    },
    iconWrap: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center',
    },
    whiteIcon: { fontSize: 18, color: '#FFFFFF' },
    rowTextWrap: { flex: 1 },
    rowTitle: { fontSize: 16, fontWeight: '700', color: '#1E1B2E', lineHeight: 24 },
    rowActionText: { fontSize: 14, fontWeight: '500', color: '#BEA3D8', marginTop: -2 },
    rowSubtext: { fontSize: 14, color: '#1C1A25', marginTop: -2 },
    divider: { height: 1, backgroundColor: '#F0ECFA', marginHorizontal: 20 },

    /* Add Action Button */
    addPlaceBtn: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        width: '100%', height: 60,
        borderWidth: 2, borderColor: '#A78BFA', borderStyle: 'dashed',
        borderRadius: 16, gap: 8,
    },
    addTextIcon: { fontSize: 18, fontWeight: '700', color: '#BEA3D8' },
    addText: { fontSize: 16, fontWeight: '700', color: '#BEA3D8' },

    /* Custom Places Section */
    sectionHeader: {
        fontSize: 20, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.5,
        marginTop: 8, marginBottom: -8, // Tweak spacing explicitly
    },
    customPlaceCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
    },
    customPlaceLeft: {
        flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1,
    },
    pinIconWrap: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#F6F1FF',
        justifyContent: 'center', alignItems: 'center',
    },
    pinIcon: { fontSize: 18, color: '#BEA3D8' },
    customPlaceInfo: { flex: 1, paddingRight: 8 },
    customPlaceName: { fontSize: 16, fontWeight: '700', color: '#1E1B2E', lineHeight: 24 },
    customPlaceAddress: { fontSize: 12, color: '#1C1A25', lineHeight: 20, paddingTop: 2 },
    
    /* Action Icons row */
    actionIconsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    actionBtn: { padding: 4 },
    actionEdit: { fontSize: 16 }, 
    actionDelete: { fontSize: 16 },

    /* Interactive Map Thumbnail Stub */
    mapThumbnail: {
        width: '100%', height: 192,
        backgroundColor: '#C5E2F6', // Safe water/sky base tone
        borderRadius: 24,
        marginTop: 8,
        overflow: 'hidden',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 5,
    },
    mapOverlayBg: {
        flex: 1,
        backgroundColor: 'rgba(190, 163, 216, 0.1)',
        position: 'relative'
    },
    mapGraphicPin: {
        position: 'absolute',
        fontSize: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6,
    }
});
