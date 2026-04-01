import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useRef } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, Animated, 
    Dimensions, PanResponder, ScrollView, Platform, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75; // Drawer takes exactly 75% width per Figma CSS right:25%

export default function SidebarScreen() {
    const router = useRouter();
    const { user, logout } = useAuth();
    
    // Animation refs for dynamic slide-in and fade overlay
    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Trigger open animations as soon as transparentModal mounts
    useEffect(() => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    const handleClose = (callback) => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -DRAWER_WIDTH,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            })
        ]).start(() => {
            if (callback) {
                callback();
            } else if (router.canGoBack()) {
                if (router.canGoBack()) router.back(); else router.replace("/");
            }
        });
    };

    // PanResponder for swiping left to dismiss
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
                // Ensure the user actually initiated a swift horizontal swipe left
                return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && gestureState.dx < -15;
            },
            onPanResponderRelease: (evt, gestureState) => {
                // If they completed a solid leftward drag, close it
                if (gestureState.dx < -40) {
                    handleClose();
                }
            },
        })
    ).current;

    const MenuItem = ({ iconSource, label, onPress, active = false, customTintColor }) => {
        const tint = active ? '#BEA3D8' : (customTintColor || '#64748B');
        return (
            <View>
                <TouchableOpacity 
                    style={[styles.menuRow, active && styles.menuRowActive]} 
                    onPress={() => {
                        handleClose(() => onPress && onPress());
                    }}
                    activeOpacity={0.7}
                >
                    <View style={[styles.iconBox, active && styles.iconBoxActive]}>
                        <Image source={iconSource} style={{ width: 24, height: 24, tintColor: tint, resizeMode: 'contain' }} />
                    </View>
                    <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>{label}</Text>
                    <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
                {!active && <View style={styles.divider} />}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Dimmed Tappable Overlay */}
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => handleClose()} />
            </Animated.View>

            {/* Main Animated Navigation Drawer */}
            <Animated.View 
                {...panResponder.panHandlers}
                style={[
                    styles.drawerShell, 
                    { transform: [{ translateX: slideAnim }] }
                ]}
            >
                <SafeAreaView style={styles.header}>
                    <View style={styles.headerContent}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatarImg}>
                                <Text style={styles.avatarInitial}>
                                    {user?.name ? user.name[0].toUpperCase() : 'P'}
                                </Text>
                            </View>
                            <View style={styles.verifiedBadge}>
                                <Text style={styles.verifiedCheck}>✓</Text>
                            </View>
                        </View>

                        <View style={styles.infoContainer}>
                            <View style={styles.nameRow}>
                                <Text style={styles.nameText}>{user?.name || 'Priya Sharma'}</Text>
                                <View style={styles.verifiedPill}>
                                    <Text style={styles.verifiedPillText}>VERIFIED</Text>
                                </View>
                            </View>
                            <Text style={styles.phoneText}>{user?.phone || '+91 98765 43210'}</Text>
                        </View>
                    </View>
                </SafeAreaView>

                <ScrollView contentContainerStyle={styles.menuContainer} showsVerticalScrollIndicator={false}>
                    <MenuItem iconSource={require("../assets/Home-filled.png")} label="Home" active={true} onPress={() => router.replace("/(tabs)/")} />
                    <MenuItem iconSource={require("../assets/Auto-icon.png")} label="My Rides" onPress={() => router.replace("/(tabs)/ride-history")} />
                    <MenuItem iconSource={require("../assets/Subscriptions-Icon.png")} label="My Subscriptions" onPress={() => router.replace("/(tabs)/subscriptions?showBack=true")} />
                    <MenuItem iconSource={require("../assets/PaymentMethods-Icon.png")} label="Payment Methods" onPress={() => router.replace("/payment")} />
                    <MenuItem iconSource={require("../assets/SavedPlaces-Icon.png")} label="Saved Places" onPress={() => router.replace("/saved-places")} />
                    <MenuItem iconSource={require("../assets/EmergencyContacts-Slider-Icon.png")} label="Emergency Contacts" onPress={() => router.replace("/emergency-contacts")} />
                    <MenuItem iconSource={require("../assets/Notifications-Icon.png")} label="Notifications" onPress={() => router.replace("/notifications")} />
                    <MenuItem iconSource={require("../assets/Help&Support-Icon.png")} label="Help & Support" onPress={() => router.replace("/complaint")} />
                </ScrollView>

                {/* Footer Section */}
                <View style={styles.bottomSection}>
                    <TouchableOpacity 
                        style={styles.logoutBtn} 
                        onPress={() => {
                            handleClose(async () => {
                                await logout();
                                router.replace('/(auth)/login');
                            });
                        }} 
                        activeOpacity={0.7}
                    >
                        <View style={styles.logoutIconBox}>
                            <Image source={require('../assets/LogOut-Icon.png')} style={{ width: 24, height: 24, tintColor: '#EF4444', resizeMode: 'contain' }} />
                        </View>
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(30, 27, 46, 0.4)', // Exactly matches mock
        zIndex: 0,
    },

    drawerShell: {
        position: 'absolute', top: 0, bottom: 0, left: 0, width: DRAWER_WIDTH,
        backgroundColor: '#FFFFFF',
        shadowColor: "rgba(124, 58, 237, 1)", shadowOffset: { width: 16, height: 0 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 20,
        borderTopRightRadius: 24, borderBottomRightRadius: 24,
        zIndex: 1, overflow: 'hidden',
    },

    header: { backgroundColor: '#F5F3FF' },
    headerContent: { paddingTop: Platform.OS === 'android' ? 48 : 24, paddingHorizontal: 24, paddingBottom: 24 },
    
    avatarContainer: { width: 64, height: 64, marginBottom: 16, position: 'relative' },
    avatarImg: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#BEA3D8', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
    avatarInitial: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
    verifiedBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#22C55E', width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center' },
    verifiedCheck: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },

    infoContainer: { gap: 4 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    nameText: { fontSize: 20, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.5 },
    verifiedPill: { backgroundColor: '#DCFCE7', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 12 },
    verifiedPillText: { fontSize: 10, fontWeight: '700', color: '#15803D', letterSpacing: 0.5 },
    phoneText: { fontSize: 14, fontWeight: '500', color: '#64748B' },

    menuContainer: { paddingBottom: 24, paddingTop: 11 },
    menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24, gap: 16 },
    menuRowActive: { backgroundColor: '#F5F3FF' },
    iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
    iconBoxActive: { backgroundColor: '#EDE9FE' },
    iconText: { fontSize: 18 },
    iconTextActive: { },
    menuLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1E1B2E', letterSpacing: -0.35 },
    menuLabelActive: { color: '#BEA3D8' },
    chevron: { fontSize: 20, color: '#CBD5E1', paddingBottom: 2 },
    divider: { height: 1, backgroundColor: '#F8FAFC', marginHorizontal: 24, marginLeft: 80 },

    bottomSection: { borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#FFFFFF', paddingVertical: 16, paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#FFFFFF', borderRadius: 8, padding: 8 },
    logoutIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
    logoutIcon: { fontSize: 18 },
    logoutText: { fontSize: 16, fontWeight: '700', color: '#1E1B2E' }
});
