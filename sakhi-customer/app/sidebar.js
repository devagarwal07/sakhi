import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useEffect, useRef, useState } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, Animated, 
    Dimensions, PanResponder, ScrollView, Platform, Image
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import LogoutBottomSheet from '../src/components/LogoutBottomSheet';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75; // Drawer takes exactly 75% width per Figma CSS right:25%

export default function SidebarScreen() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const { top: topInset, bottom: bottomInset } = useSafeAreaInsets();
    const [showLogoutSheet, setShowLogoutSheet] = useState(false);

    const bottomSectionPaddingBottom = Math.max(bottomInset, 24);
    
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

    const MenuItem = ({ iconSource, iconSvg, label, onPress, active = false, customTintColor }) => {
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
                        {iconSvg ? iconSvg(tint) : <Image source={iconSource} style={{ width: 24, height: 24, tintColor: tint, resizeMode: 'contain' }} />}
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
                {/* Remove SafeAreaView from here — we handle insets manually */}
                <View style={[styles.headerContent, { paddingTop: topInset + 16 }]}>
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

                <ScrollView contentContainerStyle={styles.menuContainer} showsVerticalScrollIndicator={false}>
                    <MenuItem 
                        iconSvg={(tint) => (
                            <Svg width="20" height="22" viewBox="0 0 16 18" fill="none">
                                <Path d="M2 16H5V10H11V16H14V7L8 2.5L2 7V16ZM0 18V6L8 0L16 6V18H9V12H7V18H0Z" fill={tint} />
                            </Svg>
                        )} 
                        label="Home" active={true} onPress={() => router.replace("/(tabs)/")} 
                    />
                    <MenuItem 
                        iconSvg={(tint) => (
                            <Svg width="22" height="20" viewBox="0 0 18 16" fill="none">
                                <Path d="M3 14V15C3 15.2833 2.90417 15.5208 2.7125 15.7125C2.52083 15.9042 2.28333 16 2 16H1C0.716667 16 0.479167 15.9042 0.2875 15.7125C0.0958333 15.5208 0 15.2833 0 15V7L2.1 1C2.2 0.7 2.37917 0.458333 2.6375 0.275C2.89583 0.0916667 3.18333 0 3.5 0H14.5C14.8167 0 15.1042 0.0916667 15.3625 0.275C15.6208 0.458333 15.8 0.7 15.9 1L18 7V15C18 15.2833 17.9042 15.5208 17.7125 15.7125C17.5208 15.9042 17.2833 16 17 16H16C15.7167 16 15.4792 15.9042 15.2875 15.7125C15.0958 15.5208 15 15.2833 15 15V14H3ZM2.8 5H15.2L14.15 2H3.85L2.8 5ZM2 7V12V7ZM4.5 11C4.91667 11 5.27083 10.8542 5.5625 10.5625C5.85417 10.2708 6 9.91667 6 9.5C6 9.08333 5.85417 8.72917 5.5625 8.4375C5.27083 8.14583 4.91667 8 4.5 8C4.08333 8 3.72917 8.14583 3.4375 8.4375C3.14583 8.72917 3 9.08333 3 9.5C3 9.91667 3.14583 10.2708 3.4375 10.5625C3.72917 10.8542 4.08333 11 4.5 11ZM13.5 11C13.9167 11 14.2708 10.8542 14.5625 10.5625C14.8542 10.2708 15 9.91667 15 9.5C15 9.08333 14.8542 8.72917 14.5625 8.4375C14.2708 8.14583 13.9167 8 13.5 8C13.0833 8 12.7292 8.14583 12.4375 8.4375C12.1458 8.72917 12 9.08333 12 9.5C12 9.91667 12.1458 10.2708 12.4375 10.5625C12.7292 10.8542 13.0833 11 13.5 11ZM2 12H16V7H2V12Z" fill={tint} />
                            </Svg>
                        )} 
                        label="My Rides" onPress={() => router.replace({ pathname: "/ride-history", params: { fromSidebar: 'true' } })} 
                    />
                    <MenuItem 
                        iconSvg={(tint) => (
                            <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <Path d="M2 11V13H18V11H2ZM2 0H18C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2V13C20 13.55 19.8042 14.0208 19.4125 14.4125C19.0208 14.8042 18.55 15 18 15H14V20L10 18L6 20V15H2C1.45 15 0.979167 14.8042 0.5875 14.4125C0.195833 14.0208 0 13.55 0 13V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0ZM2 8H18V2H2V8ZM2 13V2V13Z" fill={tint}/>
                            </Svg>
                        )} 
                        label="My Subscriptions" onPress={() => router.replace("/(tabs)/subscriptions?showBack=true")} 
                    />
                    <MenuItem 
                        iconSvg={(tint) => (
                            <Svg width="22" height="16" viewBox="0 0 22 16" fill="none">
                                <Path d="M13 9C12.1667 9 11.4583 8.70833 10.875 8.125C10.2917 7.54167 10 6.83333 10 6C10 5.16667 10.2917 4.45833 10.875 3.875C11.4583 3.29167 12.1667 3 13 3C13.8333 3 14.5417 3.29167 15.125 3.875C15.7083 4.45833 16 5.16667 16 6C16 6.83333 15.7083 7.54167 15.125 8.125C14.5417 8.70833 13.8333 9 13 9ZM6 12C5.45 12 4.97917 11.8042 4.5875 11.4125C4.19583 11.0208 4 10.55 4 10V2C4 1.45 4.19583 0.979167 4.5875 0.5875C4.97917 0.195833 5.45 0 6 0H20C20.55 0 21.0208 0.195833 21.4125 0.5875C21.8042 0.979167 22 1.45 22 2V10C22 10.55 21.8042 11.0208 21.4125 11.4125C21.0208 11.8042 20.55 12 20 12H6ZM8 10H18C18 9.45 18.1958 8.97917 18.5875 8.5875C18.9792 8.19583 19.45 8 20 8V4C19.45 4 18.9792 3.80417 18.5875 3.4125C18.1958 3.02083 18 2.55 18 2H8C8 2.55 7.80417 3.02083 7.4125 3.4125C7.02083 3.80417 6.55 4 6 4V8C6.55 8 7.02083 8.19583 7.4125 8.5875C7.80417 8.97917 8 9.45 8 10ZM19 16H2C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14V3H2V14H19V16ZM6 10V2V10Z" fill={tint} />
                            </Svg>
                        )}
                        label="Payment Methods" onPress={() => router.replace("/payment")} 
                    />
                    <MenuItem 
                        iconSvg={(tint) => (
                            <Svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                                <Path d="M8 10C8.55 10 9.02083 9.80417 9.4125 9.4125C9.80417 9.02083 10 8.55 10 8C10 7.45 9.80417 6.97917 9.4125 6.5875C9.02083 6.19583 8.55 6 8 6C7.45 6 6.97917 6.19583 6.5875 6.5875C6.19583 6.97917 6 7.45 6 8C6 8.55 6.19583 9.02083 6.5875 9.4125C6.97917 9.80417 7.45 10 8 10ZM8 17.35C10.0333 15.4833 11.5417 13.7875 12.525 12.2625C13.5083 10.7375 14 9.38333 14 8.2C14 6.38333 13.4208 4.89583 12.2625 3.7375C11.1042 2.57917 9.68333 2 8 2C6.31667 2 4.89583 2.57917 3.7375 3.7375C2.57917 4.89583 2 6.38333 2 8.2C2 9.38333 2.49167 10.7375 3.475 12.2625C4.45833 13.7875 5.96667 15.4833 8 17.35ZM8 20C5.31667 17.7167 3.3125 15.5958 1.9875 13.6375C0.6625 11.6792 0 9.86667 0 8.2C0 5.7 0.804167 3.70833 2.4125 2.225C4.02083 0.741667 5.88333 0 8 0C10.1167 0 11.9792 0.741667 13.5875 2.225C15.1958 3.70833 16 5.7 16 8.2C16 9.86667 15.3375 11.6792 14.0125 13.6375C12.6875 15.5958 10.6833 17.7167 8 20Z" fill={tint} />
                            </Svg>
                        )}
                        label="Saved Places" onPress={() => router.replace("/saved-places")} 
                    />
                    <MenuItem 
                        iconSvg={(tint) => (
                            <Svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <Path d="M6.9 18V12.05L1.75 15.025L0 12L5.15 9L0 6.025L1.75 3L6.9 5.975V0H10.4V5.975L15.55 3L17.3 6.025L12.15 9L17.3 12L15.55 15.025L10.4 12.05V18H6.9Z" fill={tint} />
                            </Svg>
                        )}
                        label="Emergency Contacts" onPress={() => router.replace("/emergency-contacts")} 
                    />
                    <MenuItem 
                        iconSvg={(tint) => (
                            <Svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                                <Path d="M0 17V15H2V8C2 6.61667 2.41667 5.3875 3.25 4.3125C4.08333 3.2375 5.16667 2.53333 6.5 2.2V1.5C6.5 1.08333 6.64583 0.729167 6.9375 0.4375C7.22917 0.145833 7.58333 0 8 0C8.41667 0 8.77083 0.145833 9.0625 0.4375C9.35417 0.729167 9.5 1.08333 9.5 1.5V2.2C10.8333 2.53333 11.9167 3.2375 12.75 4.3125C13.5833 5.3875 14 6.61667 14 8V15H16V17H0ZM8 20C7.45 20 6.97917 19.8042 6.5875 19.4125C6.19583 19.0208 6 18.55 6 18H10C10 18.55 9.80417 19.0208 9.4125 19.4125C9.02083 19.8042 8.55 20 8 20ZM4 15H12V8C12 6.9 11.6083 5.95833 10.825 5.175C10.0417 4.39167 9.1 4 8 4C6.9 4 5.95833 4.39167 5.175 5.175C4.39167 5.95833 4 6.9 4 8V15Z" fill={tint} />
                            </Svg>
                        )}
                        label="Notifications" onPress={() => router.replace("/notifications")} 
                    />
                    <MenuItem 
                        iconSvg={(tint) => (
                            <Svg width="20" height="18" viewBox="0 0 20 18" fill="none">
                                <Path d="M2 13.5V2H18V13.5H10.85L7 17.4V13.5H2ZM4 11.5H15V4H4V11.5Z" fill={tint} />
                            </Svg>
                        )}
                        label="Referrals & Rewards" onPress={() => handleClose(() => router.push('/referrals'))} 
                    />
                    <MenuItem 
                        iconSvg={(tint) => (
                            <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <Path d="M9.95 16C10.3 16 10.5958 15.8792 10.8375 15.6375C11.0792 15.3958 11.2 15.1 11.2 14.75C11.2 14.4 11.0792 14.1042 10.8375 13.8625C10.5958 13.6208 10.3 13.5 9.95 13.5C9.6 13.5 9.30417 13.6208 9.0625 13.8625C8.82083 14.1042 8.7 14.4 8.7 14.75C8.7 15.1 8.82083 15.3958 9.0625 15.6375C9.30417 15.8792 9.6 16 9.95 16ZM9.05 12.15H10.9C10.9 11.6 10.9625 11.1667 11.0875 10.85C11.2125 10.5333 11.5667 10.1 12.15 9.55C12.5833 9.11667 12.925 8.70417 13.175 8.3125C13.425 7.92083 13.55 7.45 13.55 6.9C13.55 5.96667 13.2083 5.25 12.525 4.75C11.8417 4.25 11.0333 4 10.1 4C9.15 4 8.37917 4.25 7.7875 4.75C7.19583 5.25 6.78333 5.85 6.55 6.55L8.2 7.2C8.28333 6.9 8.47083 6.575 8.7625 6.225C9.05417 5.875 9.5 5.7 10.1 5.7C10.6333 5.7 11.0333 5.84583 11.3 6.1375C11.5667 6.42917 11.7 6.75 11.7 7.1C11.7 7.43333 11.6 7.74583 11.4 8.0375C11.2 8.32917 10.95 8.6 10.65 8.85C9.91667 9.5 9.46667 9.99167 9.3 10.325C9.13333 10.6583 9.05 11.2667 9.05 12.15ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20ZM10 18C12.2333 18 14.125 17.225 15.675 15.675C17.225 14.125 18 12.2333 18 10C18 7.76667 17.225 5.875 15.675 4.325C14.125 2.775 12.2333 2 10 2C7.76667 2 5.875 2.775 4.325 4.325C2.775 5.875 2 7.76667 2 10C2 12.2333 2.775 14.125 4.325 15.675C5.875 17.225 7.76667 18 10 18Z" fill={tint} />
                            </Svg>
                        )}
                        label="Help & Support" onPress={() => handleClose(() => router.push('/help-support'))} 
                    />
                </ScrollView>

                {/* Footer Section */}
                <View style={[styles.bottomSection, { paddingBottom: bottomSectionPaddingBottom }]}>
                    <TouchableOpacity 
                        style={styles.logoutBtn} 
                        onPress={() => setShowLogoutSheet(true)} 
                        activeOpacity={0.7}
                    >
                        <View style={styles.logoutIconBox}>
                            <Svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <Path d="M2 18C1.45 18 0.979167 17.8042 0.5875 17.4125C0.195833 17.0208 0 16.55 0 16V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H9V2H2V16H9V18H2ZM13 14L11.625 12.55L14.175 10H6V8H14.175L11.625 5.45L13 4L18 9L13 14Z" fill="#BA1A1A"/>
                            </Svg>
                        </View>
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Render Bottom Sheet Modal locally but visually it stands out */}
            <LogoutBottomSheet 
                visible={showLogoutSheet} 
                onClose={() => setShowLogoutSheet(false)} 
                onLogout={async () => {
                   setShowLogoutSheet(false);
                   handleClose(async () => {
                       await logout();
                       router.replace('/(auth)/login');
                   });
                }} 
            />
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
    headerContent: { paddingHorizontal: 24, paddingBottom: 24 },
    
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

    bottomSection: { borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#FFFFFF', paddingVertical: 16, paddingHorizontal: 24, paddingBottom: 24 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#FFFFFF', borderRadius: 8, padding: 8 },
    logoutIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
    logoutIcon: { fontSize: 18 },
    logoutText: { fontSize: 16, fontWeight: '700', color: '#1E1B2E' }
});
