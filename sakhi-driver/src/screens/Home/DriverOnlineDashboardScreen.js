import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, ScrollView, Dimensions, Platform, Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';

import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import BottomNavBar, { NAV_HEIGHT } from '../../components/BottomNavBar';
import DriverSidebarMenu from '../../components/DriverSidebarMenu';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Design Tokens (matched to Figma) ─────────────────────────────────────────
const PURPLE = '#BEA3D8';
const PURPLE_DEEP = '#7F19E6';
const PURPLE_10 = 'rgba(127, 25, 230, 0.1)';
const PURPLE_05 = 'rgba(127, 25, 230, 0.05)';
const PURPLE_20 = 'rgba(127, 25, 230, 0.2)';
const PURPLE_70 = 'rgba(127, 25, 230, 0.7)';
const BG = '#F7F6F8';
const DARK = '#0F172A';
const TEXT_DARK = '#1E293B';
const TEXT_MUTED = '#64748B';
const TEXT_SUBTLE = '#94A3B8';
const CARD_LABEL = '#334155';
const WHITE = '#FFFFFF';
const DIVIDER = '#F1F5F9';

const TIER_COLORS = {
  bronze: '#CD7F32',
  silver: '#64748B',
  gold: '#F59E0B',
  platinum: '#BEA3D8',
};

// ─── Custom Car SVG Icon (from Figma) ──────────────────────────────────────
function CarIcon({ size = 18, color = PURPLE }) {
  const scale = size / 18;
  return (
    <Svg width={18 * scale} height={16 * scale} viewBox="0 0 18 16" fill="none">
      <Path
        d="M3 14V15C3 15.2833 2.90417 15.5208 2.7125 15.7125C2.52083 15.9042 2.28333 16 2 16H1C0.716667 16 0.479167 15.9042 0.2875 15.7125C0.0958333 15.5208 0 15.2833 0 15V7L2.1 1C2.2 0.7 2.37917 0.458333 2.6375 0.275C2.89583 0.0916667 3.18333 0 3.5 0H14.5C14.8167 0 15.1042 0.0916667 15.3625 0.275C15.6208 0.458333 15.8 0.7 15.9 1L18 7V15C18 15.2833 17.9042 15.5208 17.7125 15.7125C17.5208 15.9042 17.2833 16 17 16H16C15.7167 16 15.4792 15.9042 15.2875 15.7125C15.0958 15.5208 15 15.2833 15 15V14H3ZM2.8 5H15.2L14.15 2H3.85L2.8 5ZM2 7V12V7ZM4.5 11C4.91667 11 5.27083 10.8542 5.5625 10.5625C5.85417 10.2708 6 9.91667 6 9.5C6 9.08333 5.85417 8.72917 5.5625 8.4375C5.27083 8.14583 4.91667 8 4.5 8C4.08333 8 3.72917 8.14583 3.4375 8.4375C3.14583 8.72917 3 9.08333 3 9.5C3 9.91667 3.14583 10.2708 3.4375 10.5625C3.72917 10.8542 4.08333 11 4.5 11ZM13.5 11C13.9167 11 14.2708 10.8542 14.5625 10.5625C14.8542 10.2708 15 9.91667 15 9.5C15 9.08333 14.8542 8.72917 14.5625 8.4375C14.2708 8.14583 13.9167 8 13.5 8C13.0833 8 12.7292 8.14583 12.4375 8.4375C12.1458 8.72917 12 9.08333 12 9.5C12 9.91667 12.1458 10.2708 12.4375 10.5625C12.7292 10.8542 13.0833 11 13.5 11ZM2 12H16V7H2V12Z"
        fill={color}
      />
    </Svg>
  );
}

// ─── Custom Earnings SVG Icon (from Figma) ─────────────────────────────────
function EarningsIcon({ size = 22, color = PURPLE }) {
  const scale = size / 22;
  return (
    <Svg width={22 * scale} height={16 * scale} viewBox="0 0 22 16" fill="none">
      <Path
        d="M13 9C12.1667 9 11.4583 8.70833 10.875 8.125C10.2917 7.54167 10 6.83333 10 6C10 5.16667 10.2917 4.45833 10.875 3.875C11.4583 3.29167 12.1667 3 13 3C13.8333 3 14.5417 3.29167 15.125 3.875C15.7083 4.45833 16 5.16667 16 6C16 6.83333 15.7083 7.54167 15.125 8.125C14.5417 8.70833 13.8333 9 13 9ZM6 12C5.45 12 4.97917 11.8042 4.5875 11.4125C4.19583 11.0208 4 10.55 4 10V2C4 1.45 4.19583 0.979167 4.5875 0.5875C4.97917 0.195833 5.45 0 6 0H20C20.55 0 21.0208 0.195833 21.4125 0.5875C21.8042 0.979167 22 1.45 22 2V10C22 10.55 21.8042 11.0208 21.4125 11.4125C21.0208 11.8042 20.55 12 20 12H6ZM8 10H18C18 9.45 18.1958 8.97917 18.5875 8.5875C18.9792 8.19583 19.45 8 20 8V4C19.45 4 18.9792 3.80417 18.5875 3.4125C18.1958 3.02083 18 2.55 18 2H8C8 2.55 7.80417 3.02083 7.4125 3.4125C7.02083 3.80417 6.55 4 6 4V8C6.55 8 7.02083 8.19583 7.4125 8.5875C7.80417 8.97917 8 9.45 8 10ZM19 16H2C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14V3H2V14H19V16ZM6 10V2V10Z"
        fill={color}
      />
    </Svg>
  );
}

// ─── Custom Subscription SVG Icon (from Figma) ─────────────────────────────
function SubscriptionIcon({ size = 20, color = PURPLE }) {
  const scale = size / 20;
  return (
    <Svg width={20 * scale} height={20 * scale} viewBox="0 0 20 20" fill="none">
      <Path
        d="M11 15.5L14.5 12C14.6833 11.8167 14.8292 11.6 14.9375 11.35C15.0458 11.1 15.1 10.8333 15.1 10.55C15.1 9.98333 14.9 9.5 14.5 9.1C14.1 8.7 13.6167 8.5 13.05 8.5C12.7333 8.5 12.4208 8.59167 12.1125 8.775C11.8042 8.95833 11.4333 9.26667 11 9.7C10.5 9.23333 10.1083 8.91667 9.825 8.75C9.54167 8.58333 9.25 8.5 8.95 8.5C8.38333 8.5 7.9 8.7 7.5 9.1C7.1 9.5 6.9 9.98333 6.9 10.55C6.9 10.8333 6.95417 11.1 7.0625 11.35C7.17083 11.6 7.31667 11.8167 7.5 12L11 15.5ZM19.4 12.25L12.25 19.4C12.05 19.6 11.825 19.75 11.575 19.85C11.325 19.95 11.075 20 10.825 20C10.575 20 10.325 19.95 10.075 19.85C9.825 19.75 9.6 19.6 9.4 19.4L0.575 10.575C0.391667 10.3917 0.25 10.1792 0.15 9.9375C0.05 9.69583 0 9.44167 0 9.175V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H9.175C9.44167 0 9.7 0.0541667 9.95 0.1625C10.2 0.270833 10.4167 0.416667 10.6 0.6L19.4 9.425C19.6 9.625 19.7458 9.85 19.8375 10.1C19.9292 10.35 19.975 10.6 19.975 10.85C19.975 11.1 19.9292 11.3458 19.8375 11.5875C19.7458 11.8292 19.6 12.05 19.4 12.25ZM10.825 18L17.975 10.85L9.15 2H2V9.15L10.825 18ZM4.5 6C4.91667 6 5.27083 5.85417 5.5625 5.5625C5.85417 5.27083 6 4.91667 6 4.5C6 4.08333 5.85417 3.72917 5.5625 3.4375C5.27083 3.14583 4.91667 3 4.5 3C4.08333 3 3.72917 3.14583 3.4375 3.4375C3.14583 3.72917 3 4.08333 3 4.5C3 4.91667 3.14583 5.27083 3.4375 5.5625C3.72917 5.85417 4.08333 6 4.5 6Z"
        fill={color}
      />
    </Svg>
  );
}

function getTierColor(tier) {
  return TIER_COLORS[(tier || 'gold').toLowerCase()] ?? '#F59E0B';
}

// ─── Sparkline SVG (exact Figma path) ─────────────────────────────────────────
function MiniSparkline() {
  return (
    <View style={{ width: 96, height: 48, justifyContent: 'flex-end' }}>
      <Svg width={96} height={40} viewBox="0 0 96 40" fill="none">
        <Path
          d="M0 38.4005C6.4 35.2005 12.8 34.2405 19.2 35.5205C25.6 36.8005 32 32.9605 38.4 24.0005C44.8 15.0405 51.2 16.6405 57.6 28.8005C64 40.9605 70.4 34.5605 76.8 9.60054C83.2 -15.3595 89.6 -12.1595 96 19.2005"
          stroke={PURPLE}
          strokeWidth={1.92}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

export default function DriverOnlineDashboardScreen({ navigation }) {
  const { driver } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [earnings, setEarnings] = useState({ today: null, trips: 0, onlineMinutes: 0 });

  // ── Glow animation for the Go Online button ────────────────────────────────
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      client.get('/drivers/earnings/today').then(r => {
        setEarnings({
          today: r.data?.today_earnings ?? null,
          trips: r.data?.today_trips ?? 0,
          onlineMinutes: r.data?.online_minutes ?? 0,
        });
      }).catch(() => { });
    }, [driver])
  );

  const handleGoOnline = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    navigation.navigate('PaymentPlans');
  };

  const driverName = driver?.name
    ?? [driver?.first_name, driver?.last_name].filter(Boolean).join(' ')
    ?? 'Priya';

  const firstName = driverName.split(' ')[0];

  return (
    <View style={s.root}>
      <StatusBar style="dark" />

      {/* ─── HEADER ─── */}
      <View style={[s.header, { paddingTop: Math.max(insets.top, 24) }]}>
        <View style={s.headerLeft}>
          <TouchableOpacity
            style={s.avatarBorder}
            onPress={() => setSidebarOpen(true)}
            activeOpacity={0.8}
          >
            <View style={s.avatarFallback}>
              {driver?.photo_url ? (
                <Image source={{ uri: driver.photo_url }} style={s.avatar} />
              ) : (
                <View style={s.avatarPlaceholder}>
                  <Feather name="user" size={22} color={PURPLE} />
                </View>
              )}
            </View>
          </TouchableOpacity>
          <View style={s.headerTextCol}>
            <Text style={s.greeting}>Hi, Sakhi 👋</Text>
            <Text style={s.tier}>
              {(driver?.tier || 'GOLD').toUpperCase()} {t('home.tierDriver')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={s.bellBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Feather name="bell" size={20} color={PURPLE} />
        </TouchableOpacity>
      </View>

      {/* ─── MAIN CONTENT ─── */}
      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingBottom: NAV_HEIGHT + 12 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Earnings Summary Card ── */}
        <View style={s.earningsCard}>
          {/* Shadow layer (visual only) */}
          <View style={s.earningsCardShadow} />

          <View style={s.earningsTop}>
            <View style={s.earningsTextCol}>
              <Text style={s.earningsLabel}>{t('home.todaysEarningsShort')}</Text>
              {earnings.today === null ? (
                <View style={s.earningsSkeleton} />
              ) : (
                <Text style={s.earningsAmount}>
                  ₹{(earnings.today || 1250).toLocaleString('en-IN')}
                </Text>
              )}
            </View>
            <View style={s.graphWrap}>
              <MiniSparkline />
            </View>
          </View>

          <View style={s.earningsDivider} />

          <View style={s.earningsStatsRow}>
            <View style={s.statBox}>
              <Text style={s.statLabel}>{t('home.completed')}</Text>
              <Text style={s.statValue}>{earnings.trips || 8} {t('home.ridesCount')}</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statLabel}>{t('home.onlineTime')}</Text>
              <Text style={s.statValue}>
                {earnings.onlineMinutes > 0
                  ? `${Math.floor(earnings.onlineMinutes / 60)}h ${earnings.onlineMinutes % 60}m`
                  : '5h 20m'}
              </Text>
            </View>
            <TouchableOpacity
              style={s.detailsBtn}
              onPress={() => navigation.navigate('MyEarnings')}
              activeOpacity={0.8}
            >
              <Text style={s.detailsText}>{t('home.details')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Go Online Section ── */}
        <View style={s.goOnlineSection}>
          {/* Outer glow ring */}
          <Animated.View style={[s.goOnlineGlow, { opacity: glowAnim }]} />

          {/* Main button */}
          <TouchableOpacity
            style={s.goOnlineBtn}
            onPress={handleGoOnline}
            activeOpacity={0.85}
          >
            {/* Button shadow */}
            <View style={s.goOnlineBtnShadow} />
            <Feather name="power" size={40} color={WHITE} />
            <Text style={s.goOnlineText}>GO ONLINE</Text>
          </TouchableOpacity>

          {/* Offline text */}
          <View style={s.offlineTextCol}>
            <Text style={s.offlineTitle}>{t('home.currentlyOffline')}</Text>
            <Text style={s.offlineSub}>{t('home.goOnlineToReceive')}</Text>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={s.quickActionsWrap}>
          <View style={s.quickActionsRow}>
            <TouchableOpacity
              style={s.qaCard}
              onPress={() => navigation.navigate('RideHistory')}
              activeOpacity={0.8}
            >
              <View style={s.qaIconWrap}>
                <CarIcon size={18} color={PURPLE} />
              </View>
              <Text style={s.qaLabel}>{t('home.myRides')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.qaCard}
              onPress={() => navigation.navigate('MyEarnings')}
              activeOpacity={0.8}
            >
              <View style={s.qaIconWrap}>
                <EarningsIcon size={22} color={PURPLE} />
              </View>
              <Text style={s.qaLabel}>{t('home.earnings')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.qaCard}
              onPress={() => navigation.navigate('PaymentPlans')}
              activeOpacity={0.8}
            >
              <View style={s.qaIconWrap}>
                <SubscriptionIcon size={20} color={PURPLE} />
              </View>
              <Text style={s.qaLabel}>{t('home.subscription')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Map Hint (Partial View) ── */}
        <TouchableOpacity
          style={s.mapHintCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('DriverHome')}
        >
          {/* Faded map background with road-like pattern */}
          <View style={s.mapBgPlaceholder}>
            {/* Vertical road strips matching Figma */}
            <View style={s.mapStripV1} />
            <View style={s.mapStripV2} />
            <View style={s.mapStripV3} />
            {/* Horizontal roads */}
            <View style={s.mapRoadH1} />
            <View style={s.mapRoadH2} />
            <View style={s.mapRoadH3} />
            {/* Diagonal roads */}
            <View style={s.mapRoadD1} />
            <View style={s.mapRoadD2} />
            <View style={s.mapRoadD3} />
            {/* Block patterns */}
            <View style={s.mapBlock1} />
            <View style={s.mapBlock2} />
          </View>

          {/* Tap to explore pill */}
          <View style={s.mapPillWrap}>
            <View style={s.mapPill}>
              <Text style={s.mapPillText}>Tap to explore demand zones</Text>
            </View>
          </View>
        </TouchableOpacity>

      </ScrollView>

      {/* ── Bottom Nav ── */}
      <BottomNavBar navigation={navigation} activeTab="home" />

      {/* ── Sidebar ── */}
      {sidebarOpen && (
        <DriverSidebarMenu
          navigation={navigation}
          onClose={() => setSidebarOpen(false)}
          activeRoute="DriverOnlineDashboard"
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    height: 96,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBorder: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: PURPLE_20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    overflow: 'hidden',
    backgroundColor: '#E8E0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PURPLE_10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  headerTextCol: {
    gap: 2,
  },
  greeting: {
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 22,
    color: DARK,
  },
  tier: {
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
    color: PURPLE,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    backgroundColor: PURPLE_10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Scroll content ─────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 0,
  },

  // ── Earnings Summary Card ──────────────────────────────────────────────────
  earningsCard: {
    backgroundColor: WHITE,
    borderRadius: 48,
    padding: 20,
    borderWidth: 1,
    borderColor: PURPLE_05,
    position: 'relative',
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  earningsCardShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.002)',
  },
  earningsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  earningsTextCol: {
    gap: 4,
  },
  earningsLabel: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: PURPLE_70,
  },
  earningsAmount: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
    color: DARK,
    letterSpacing: -0.5,
  },
  earningsSkeleton: {
    width: 120,
    height: 36,
    backgroundColor: DIVIDER,
    borderRadius: 8,
    marginTop: 4,
  },
  graphWrap: {
    width: 96,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },

  earningsDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginTop: 16,
    marginBottom: 16,
  },

  earningsStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statBox: {
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: TEXT_MUTED,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    color: TEXT_DARK,
  },
  detailsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: PURPLE_10,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    color: PURPLE,
    textAlign: 'center',
  },

  // ── Go Online Section ──────────────────────────────────────────────────────
  goOnlineSection: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 24,
    position: 'relative',
  },
  goOnlineGlow: {
    position: 'absolute',
    top: 48,
    alignSelf: 'center',
    width: 160,
    height: 160,
    borderRadius: 9999,
    backgroundColor: PURPLE_20,
  },
  goOnlineBtn: {
    width: 160,
    height: 160,
    borderRadius: 9999,
    backgroundColor: PURPLE,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 10,
    zIndex: 1,
  },
  goOnlineBtnShadow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.002)',
  },
  goOnlineText: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 28,
    color: WHITE,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginTop: 0,
  },
  offlineTextCol: {
    alignItems: 'center',
    gap: 4,
  },
  offlineTitle: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    color: TEXT_MUTED,
    textAlign: 'center',
  },
  offlineSub: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: TEXT_SUBTLE,
    textAlign: 'center',
  },

  // ── Quick Actions ──────────────────────────────────────────────────────────
  quickActionsWrap: {
    marginBottom: 0,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 16,
  },
  qaCard: {
    flex: 1,
    height: 98,
    backgroundColor: WHITE,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: PURPLE_05,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  qaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: PURPLE_10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qaLabel: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    color: CARD_LABEL,
    textAlign: 'center',
  },

  // ── Map Hint Card ──────────────────────────────────────────────────────────
  mapHintCard: {
    marginTop: 16,
    width: '100%',
    height: 128,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: 'rgba(127, 25, 230, 0.1)',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#C8C5CC',
    // Inset shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mapBgPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#C8C5CC',
  },
  // Vertical road strips (wider, like Figma)
  mapStripV1: {
    position: 'absolute',
    left: '30%',
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  mapStripV2: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 28,
    marginLeft: -14,
    backgroundColor: 'rgba(210, 208, 214, 0.6)',
  },
  mapStripV3: {
    position: 'absolute',
    left: '70%',
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  // Horizontal roads
  mapRoadH1: {
    position: 'absolute',
    top: '25%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  mapRoadH2: {
    position: 'absolute',
    top: '55%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  mapRoadH3: {
    position: 'absolute',
    top: '80%',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  // Diagonal roads
  mapRoadD1: {
    position: 'absolute',
    top: '10%',
    left: '15%',
    width: '45%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    transform: [{ rotate: '-25deg' }],
  },
  mapRoadD2: {
    position: 'absolute',
    top: '45%',
    left: '40%',
    width: '50%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: [{ rotate: '15deg' }],
  },
  mapRoadD3: {
    position: 'absolute',
    top: '70%',
    left: '10%',
    width: '35%',
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    transform: [{ rotate: '-10deg' }],
  },
  // Block patterns
  mapBlock1: {
    position: 'absolute',
    top: '20%',
    left: '55%',
    width: 20,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 2,
  },
  mapBlock2: {
    position: 'absolute',
    top: '60%',
    left: '22%',
    width: 16,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
  },
  mapPillWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: PURPLE_20,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
  },
  mapPillText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    color: PURPLE,
  },
});
