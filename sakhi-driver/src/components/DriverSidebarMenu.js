import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, TouchableWithoutFeedback, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import MonogramAvatar from './MonogramAvatar';

const { width: SCREEN_W } = Dimensions.get('window');
const SIDEBAR_W = 293;

const MENU_ITEMS = [
  { id: 'DriverHome',              label: 'Home',               iconName: 'home',                  iconType: 'feather' },
  { id: 'DailyCommissionPayment',  label: 'Pay Commission',     iconName: 'cash-multiple',         iconType: 'materialCommunity' },
  { id: 'RideHistory',             label: 'Ride History',       iconName: 'history',               iconType: 'materialCommunity' },
  { id: 'SubscriptionRides',       label: 'Subscription Rides', iconName: 'rickshaw',              iconType: 'materialCommunity' },
  { id: 'MyEarnings',              label: 'Earnings',           iconName: 'wallet-outline',        iconType: 'materialCommunity' },
  { id: 'MyDocuments',             label: 'My Documents',       iconName: 'file-document-outline', iconType: 'materialCommunity' },
  { id: 'Notifications',           label: 'Notifications',      iconName: 'bell-outline',          iconType: 'materialCommunity', badge: '3' },
  { id: 'MyProfile',               label: 'My Profile',         iconName: 'account-outline',       iconType: 'materialCommunity' },
  { id: 'DriverReferrals',         label: 'Referrals & Rewards',iconName: 'gift-outline',          iconType: 'materialCommunity' },
];

const SECONDARY_MENU_ITEMS = [
  { id: 'HelpSupport',          label: 'Help & Support',   iconName: 'help-circle-outline',   iconType: 'materialCommunity' },
  { id: 'TermsAndPrivacy',      label: 'Terms & Privacy',  iconName: 'shield-check-outline',  iconType: 'materialCommunity' },
  { id: 'AboutSakhi',          label: 'About Sakhi',      iconName: 'information-outline',   iconType: 'materialCommunity' },
];

export default function DriverSidebarMenu({ navigation, onClose, activeRoute = 'Home' }) {
  const { driver } = useAuth();
  const insets = useSafeAreaInsets();
  
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
    if (screen === activeRoute) {
      handleClose();
      return;
    }
    handleClose();
    setTimeout(() => {
      navigation.navigate(screen);
    }, 250);
  };

  const renderIcon = (name, type, color, size = 20) => {
    if (type === 'feather') return <Feather name={name} size={size} color={color} />;
    if (type === 'materialCommunity') return <MaterialCommunityIcons name={name} size={size} color={color} />;
    return <MaterialIcons name={name} size={size} color={color} />;
  };

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
      {/* Overlay Background */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]} />
      </TouchableWithoutFeedback>

      {/* Sidebar Drawer */}
      <Animated.View style={[
        styles.sidebar, 
        { transform: [{ translateX: slideAnim }] }
      ]}>
        
        {/* Header / Profile */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) }]}>
          <View style={styles.avatarMainBox}>
            <MonogramAvatar
              uri={driver?.profile_photo || driver?.photo_url}
              name={driver?.name || driver?.first_name}
              size={72}
              radius={18}
            />
            <View style={styles.onlineBadge}>
              <Feather name="check" size={10} color="#fff" />
            </View>
          </View>
          
          <View style={styles.driverInfoBlock}>
            <Text style={styles.driverName}>
              {driver?.name ?? [driver?.first_name, driver?.last_name].filter(Boolean).join(' ') ?? 'Driver'}
            </Text>
            
            <View style={styles.verifiedRow}>
              <Text style={styles.verifiedText}>Verified Driver</Text>
              <View style={styles.bulletDot} />
              <View style={styles.ratingBox}>
                <MaterialCommunityIcons name="star-outline" size={12} color="#BEA3D8" />
                <Text style={styles.ratingText}>{Number(driver?.average_rating || 4.8).toFixed(1)}</Text>
              </View>
            </View>

            <Text style={styles.vehicleText}>
              Vehicle: {driver?.vehicle_number ?? 'KA-01-EF-1234'}
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        <Animated.ScrollView 
          style={styles.menuScroll} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 16 }}
        >
          {MENU_ITEMS.map((item) => {
            const isActive = activeRoute === item.id;
            const fgColor = isActive ? '#590DA2' : '#475569';
            const iconBg = isActive ? '#FFFFFF' : '#F5F3FF';
            const iconColor = isActive ? '#590DA2' : '#BEA3D8';

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
                onPress={() => handleNav(item.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, isActive && styles.iconWrapActive, { backgroundColor: iconBg }]}>
                  {renderIcon(item.iconName, item.iconType, iconColor, isActive ? 18 : 20)}
                </View>
                <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                  {item.label}
                </Text>
                
                {item.badge && (
                  <View style={styles.badgeWrap}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
                
                <Feather 
                  name="chevron-right" 
                  size={16} 
                  color={fgColor} 
                  style={{ opacity: isActive ? 0.5 : 0.3, marginLeft: item.badge ? 8 : 'auto' }} 
                />
              </TouchableOpacity>
            )
          })}

          <View style={styles.divider} />

          {SECONDARY_MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => handleNav(item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: '#F5F3FF' }]}>
                {renderIcon(item.iconName, item.iconType, '#BEA3D8', 20)}
              </View>
              <Text style={styles.menuLabel}>
                {item.label}
              </Text>
              <Feather 
                name="chevron-right" 
                size={16} 
                color="#475569" 
                style={{ opacity: 0.3, marginLeft: 'auto' }} 
              />
            </TouchableOpacity>
          ))}
        </Animated.ScrollView>

        {/* Footer / Logout */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <TouchableOpacity 
            style={styles.logoutBtn}
            onPress={() => handleNav('LogoutConfirmation')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="logout" size={20} color="#BA1A1A" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
          <View style={styles.footerBorder} />
        </View>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 26, 37, 0.4)',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_W,
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 16, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 8,
    overflow: 'hidden',
  },

  // -- HEADER --
  header: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  avatarMainBox: {
    position: 'relative',
    width: 64,
    height: 64,
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#E5E0EF',
  },
  onlineBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInfoBlock: {
    gap: 4,
  },
  driverName: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 20,
    color: '#1E1B4B',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifiedText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 12,
    color: '#64748B',
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    color: '#BEA3D8',
  },
  vehicleText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // -- MENU LIST --
  menuScroll: {
    flex: 1,
    paddingHorizontal: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  menuItemActive: {
    backgroundColor: '#EDE9FE',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconWrapActive: {
    width: 38,
    height: 38,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuLabel: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  menuLabelActive: {
    fontWeight: '600',
    color: '#590DA2',
  },
  badgeWrap: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  badgeText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    color: '#BEA3D8',
  },
  divider: {
    height: 1,
    backgroundColor: '#EDE9FE',
    marginHorizontal: 16,
    marginVertical: 12,
  },

  // -- FOOTER --
  footer: {
    backgroundColor: '#F8FAFC',
    paddingTop: 16,
    paddingHorizontal: 24,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  logoutText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    color: '#BA1A1A',
  },
  footerBorder: {
    height: 1,
    backgroundColor: '#E2E8F0',
    width: '100%',
  },
});
