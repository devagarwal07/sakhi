import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, TouchableWithoutFeedback, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import MonogramAvatar from './MonogramAvatar';
import LanguageSwitcher from './LanguageSwitcher';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SIDEBAR_W = 293;

const MENU_ITEMS_CONFIG = [
  { id: 'DriverHome',              labelKey: 'sidebar.home',              iconName: 'home',                  iconType: 'feather' },
  { id: 'DailyCommissionPayment',  labelKey: 'sidebar.payCommission',     iconName: 'cash-multiple',         iconType: 'materialCommunity' },
  { id: 'RideHistory',             labelKey: 'sidebar.rideHistory',       iconName: 'history',               iconType: 'materialCommunity' },
  { id: 'SubscriptionRides',       labelKey: 'sidebar.subscriptionRides', iconName: 'rickshaw',              iconType: 'materialCommunity' },
  { id: 'MyEarnings',              labelKey: 'sidebar.myEarnings',        iconName: 'wallet-outline',        iconType: 'materialCommunity' },
  { id: 'MyDocuments',             labelKey: 'sidebar.myDocuments',       iconName: 'file-document-outline', iconType: 'materialCommunity' },
  { id: 'Notifications',           labelKey: 'sidebar.notifications',     iconName: 'bell-outline',          iconType: 'materialCommunity' },
  { id: 'MyProfile',               labelKey: 'sidebar.myProfile',         iconName: 'account-outline',       iconType: 'materialCommunity' },
  { id: 'DriverReferrals',         labelKey: 'sidebar.referralsRewards',  iconName: 'gift-outline',          iconType: 'materialCommunity' },
];

const SECONDARY_MENU_CONFIG = [
  { id: 'HelpSupport',          labelKey: 'sidebar.helpSupport',    iconName: 'help-circle-outline',   iconType: 'materialCommunity' },
  { id: 'TermsAndPrivacy',      labelKey: 'sidebar.termsPrivacy',   iconName: 'shield-check-outline',  iconType: 'materialCommunity' },
  { id: 'AboutSakhi',           labelKey: 'sidebar.aboutSakhi',     iconName: 'information-outline',   iconType: 'materialCommunity' },
];

export default function DriverSidebarMenu({ navigation, onClose, activeRoute = 'Home' }) {
  const { driver } = useAuth();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [showLang, setShowLang] = useState(false);

  const currentLangLabel = i18n.language === 'kn' ? 'ಕನ್ನಡ' : 'EN';
  
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
    setTimeout(async () => {
      // Gate both home screens behind commission check.
      // DriverOnlineDashboard is the real entry point; DriverHome is the offline home.
      const isHomeDestination = screen === 'DriverHome' || screen === 'DriverOnlineDashboard';
      if (isHomeDestination) {
        try {
          const { data } = await client.get('/drivers/commission/status');
          if (data.total_due > 0) {
            navigation.navigate('DailyCommissionPayment', { amount: data.total_due });
            return;
          }
        } catch {
          // API failure — allow navigation so driver is not locked out
        }
      }
      navigation.navigate(screen);
    }, 250);
  };

  const renderIcon = (name, type, color, size = 20) => {
    if (type === 'feather') return <Feather name={name} size={size} color={color} />;
    if (type === 'materialCommunity') return <MaterialCommunityIcons name={name} size={size} color={color} />;
    return <MaterialIcons name={name} size={size} color={color} />;
  };

  // No hardcoded heights needed — sidebar uses flex layout

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100, flexDirection: 'row' }]}>

      {/* ── Sidebar Drawer ──────────────────────────────────────────── */}
      <Animated.View style={[
        styles.sidebar,
        { transform: [{ translateX: slideAnim }] }
      ]}>

        {/* Header / Profile — fixed, does NOT scroll */}
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
              <Text style={styles.verifiedText}>{t('sidebar.verifiedDriver')}</Text>
              <View style={styles.bulletDot} />
              <View style={styles.ratingBox}>
                <MaterialCommunityIcons name="star-outline" size={12} color="#BEA3D8" />
                <Text style={styles.ratingText}>{Number(driver?.average_rating || 4.8).toFixed(1)}</Text>
              </View>
            </View>

            <Text style={styles.vehicleText}>
              {t('sidebar.vehicle')}: {driver?.vehicle_number ?? ''}
            </Text>
          </View>
        </View>

        {/* Scrollable Menu — flex:1 fills space between fixed header and footer */}
        <ScrollView
          style={styles.menuScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.menuContent}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          {MENU_ITEMS_CONFIG.map((item) => {
            const isActive = activeRoute === item.id;
            const fgColor  = isActive ? '#BEA3D8' : '#475569';
            const iconBg   = isActive ? '#FFFFFF'  : '#F5F3FF';
            const iconColor = isActive ? '#BEA3D8' : '#BEA3D8';
            const label    = t(item.labelKey);

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
                  {label}
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
            );
          })}

          <View style={styles.divider} />

          {SECONDARY_MENU_CONFIG.map((item) => (
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
                {t(item.labelKey)}
              </Text>
              <Feather
                name="chevron-right"
                size={16}
                color="#475569"
                style={{ opacity: 0.3, marginLeft: 'auto' }}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Footer — fixed at bottom, does NOT scroll */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          {/* Language selector */}
          <TouchableOpacity
            style={styles.langBtn}
            onPress={() => setShowLang(true)}
            activeOpacity={0.75}
          >
            <View style={styles.langIconWrap}>
              <Feather name="globe" size={20} color="#BEA3D8" />
            </View>
            <Text style={styles.langBtnText}>{t('sidebar.language')}</Text>
            <View style={styles.langPill}>
              <Text style={styles.langPillText}>{currentLangLabel}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.footerDivider} />

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => handleNav('LogoutConfirmation')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="logout" size={20} color="#BA1A1A" />
            <Text style={styles.logoutText}>{t('sidebar.logOut')}</Text>
          </TouchableOpacity>
          <View style={styles.footerBorder} />
        </View>

      </Animated.View>

      {/* ── Tap-to-close overlay — only covers the area RIGHT of the sidebar ── */}
      <Animated.View
        style={[styles.overlayRight, { opacity: opacityAnim }]}
        pointerEvents="box-only"
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Language Switcher Modal — outside sidebar so it isn't clipped */}
      <LanguageSwitcher visible={showLang} onClose={() => setShowLang(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 26, 37, 0.4)',
  },
  // Right-side overlay — only covers area outside the sidebar
  overlayRight: {
    flex: 1,
    backgroundColor: 'rgba(28, 26, 37, 0.4)',
  },
  sidebar: {
    width: SIDEBAR_W,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#BEA3D8',
    shadowOffset: { width: 16, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 8,
    flexDirection: 'column',
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
  menuContent: {
    paddingVertical: 16,
    flexGrow: 1,
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
    color: '#BEA3D8',
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
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 4,
  },
  langIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langIcon: { fontSize: 20 },
  langBtnText: {
    flex: 1,
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 14,
    color: '#475569',
  },
  langPill: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(190,163,216,0.4)',
  },
  langPillText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 11,
    color: '#BEA3D8',
  },
  footerDivider: {
    height: 1,
    backgroundColor: '#EDE9FE',
    marginVertical: 8,
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
