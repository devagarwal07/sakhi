import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, TouchableWithoutFeedback, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../utils/theme';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');
const SIDEBAR_W = SCREEN_W * 0.75;

const MENU_ITEMS = [
  { id: 'MyProfile',            label: 'My Profile',         icon: '👤' },
  { id: 'MyDocuments',          label: 'My Documents',       icon: '📄' },
  { id: 'MyEarnings',           label: 'My Earnings',        icon: '💰' },
  { id: 'SubscriptionRides',    label: 'Subscriptions',      icon: '🔄' },
  { id: 'MyComplaints',         label: 'Support & Tickets',  icon: '🎫' },
  { id: 'NotificationSettings', label: 'Settings',           icon: '⚙️' },
];

export default function DriverSidebarMenu({ navigation, onClose }) {
  const { driver } = useAuth();
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_W)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -SIDEBAR_W, duration: 250, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(onClose);
  };

  const handleNav = (screen) => {
    handleClose();
    setTimeout(() => {
      navigation.navigate(screen);
    }, 250);
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]} />
      </TouchableWithoutFeedback>

      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
        <SafeAreaView style={styles.safe}>
          {/* Header / Profile */}
          <View style={styles.header}>
            <View style={styles.avatarWrap}>
              {driver?.profile_photo 
                ? <Image source={{ uri: driver.profile_photo }} style={styles.avatar} />
                : <Text style={{ fontSize: 32 }}>👤</Text>
              }
            </View>
            <Text style={styles.driverName}>{driver?.name ?? 'Sakhi Driver'}</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingText}>{driver?.average_rating?.toFixed(1) ?? '4.9'} ⭐</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>VERIFIED</Text>
              </View>
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.menuList}>
            {MENU_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handleNav(item.id)}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Footer / Logout */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.logoutBtn}
              onPress={() => handleNav('LogoutConfirmation')}
            >
              <Text style={styles.logoutIcon}>🚪</Text>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
            <Text style={styles.version}>v1.0.4 (Alpha)</Text>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebar: {
    position: 'absolute', top: 0, bottom: 0, left: 0,
    width: SIDEBAR_W,
    backgroundColor: Colors.white,
    ...Shadows.lavender,
  },
  safe: { flex: 1 },
  header: {
    padding: Spacing.lg,
    backgroundColor: Colors.surfaceLow,
    borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
    alignItems: 'center',
  },
  avatarWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.white, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, borderWidth: 3, borderColor: Colors.primaryContainer,
  },
  avatar: { width: '100%', height: '100%' },
  driverName: { fontSize: 18, fontWeight: '800', color: Colors.onSurface },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  ratingText: { fontSize: 13, fontWeight: '600', color: Colors.onSurfaceVariant },
  verifiedBadge: {
    backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full,
  },
  verifiedText: { fontSize: 9, fontWeight: '800', color: '#15803D' },

  menuList: { flex: 1, paddingTop: Spacing.md },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: 18,
    gap: 16,
  },
  menuIcon: { fontSize: 20 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: Colors.onSurface },

  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
  },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 10 },
  logoutIcon: { fontSize: 20 },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
  version: { fontSize: 10, color: Colors.outline, marginTop: 12, textAlign: 'center' },
});
