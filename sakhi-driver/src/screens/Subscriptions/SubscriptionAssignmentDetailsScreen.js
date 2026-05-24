import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Linking, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import client from '../../api/client';
import { getRiderPhone } from '../../api/endpoints';

import {
  MoreVertical, Phone, Calendar, Sun, Moon, MapPin,
} from 'lucide-react-native';
import ScreenHeader, { HEADER_HEIGHT } from '../../components/ScreenHeader';
import { useTranslation } from 'react-i18next';

// ─── Brand tokens (shorthand) ─────────────────────────────────────────────────
const PURPLE = '#BEA3D8';
const DEEP = '#BEA3D8';
const DARK = '#1E1B2E';
const MUTED = '#6B7280';
const BG = '#F5F0FF';
const WHITE = '#FFFFFF';
const GREEN = '#10B981';
const AMBER = '#F59E0B';
const CARD_SH = { shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4 };

// ─── Seed / fallback data ─────────────────────────────────────────────────────
const FALLBACK = {
  rider_name: 'Priya S.',
  rider_photo: null,           // use initials avatar
  rider_rating: 4.7,
  rider_phone: null,
  pickup_address: 'Greenwood Heights, Block C, 402',
  dropoff_address: 'Tech Park South Wing, Gate 2',
  plan_label: '30 Rides',
  frequency: 'Mon–Fri',
  morning_time: '8:30 AM',
  evening_time: '6:00 PM',
  start_date: '1 Mar 2026',
  end_date: '30 Mar 2026',
  completed_rides: 18,
  total_rides: 30,
  upcoming_dates: [
    { month: 'MAR', day: '12', day_name: 'Tomorrow', times: '8:30 AM & 6:00 PM', status: 'upcoming' },
    { month: 'MAR', day: '13', day_name: 'Friday', times: '8:30 AM & 6:00 PM', status: 'upcoming' },
    { month: 'MAR', day: '16', day_name: 'Monday', times: '8:30 AM & 6:00 PM', status: 'upcoming' },
  ],
};

// ─── Initials avatar ──────────────────────────────────────────────────────────
function InitialsAvatar({ name, size = 52 }) {
  const initials = (name ?? 'R')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View style={[av.bg, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[av.text, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}
const av = StyleSheet.create({
  bg: { backgroundColor: '#BEA3D8', alignItems: 'center', justifyContent: 'center' },
  text: { color: WHITE, fontWeight: '700' },
});

// ─── Map preview (decorative) ─────────────────────────────────────────────────
function MapPreview() {
  return (
    <View style={map.border}>
      {/* grey road grid */}
      <View style={map.bg}>
        {/* horizontal roads */}
        {[0.22, 0.42, 0.65, 0.82].map((t, i) => (
          <View key={`h${i}`} style={[map.road, { top: `${t * 100}%`, left: 0, right: 0, height: 2 }]} />
        ))}
        {/* vertical roads */}
        {[0.18, 0.38, 0.60, 0.80].map((l, i) => (
          <View key={`v${i}`} style={[map.road, { left: `${l * 100}%`, top: 0, bottom: 0, width: 2 }]} />
        ))}
        {/* Route dashed arc (simplified as a horizontal dashed line) */}
        <View style={map.routeTrack}>
          {Array.from({ length: 12 }).map((_, i) => (
            <View key={i} style={[map.dash, { opacity: i % 3 === 0 ? 0 : 1 }]} />
          ))}
        </View>
        {/* Start dot */}
        <View style={[map.dot, map.startDot]} />
        {/* End dot */}
        <View style={[map.dot, map.endDot]} />
        {/* Tint overlay */}
        <View style={map.tint} />
      </View>
    </View>
  );
}
const map = StyleSheet.create({
  border: { borderWidth: 1, borderColor: '#E5E0EF', borderRadius: 12, overflow: 'hidden', height: 178 },
  bg: { flex: 1, backgroundColor: '#F5F0FF', position: 'relative' },
  road: { position: 'absolute', backgroundColor: '#E5E0EF' },
  routeTrack: { position: 'absolute', left: '11%', right: '11%', top: '46%', flexDirection: 'row', gap: 3 },
  dash: { flex: 1, height: 3, backgroundColor: PURPLE, borderRadius: 2 },
  dot: { position: 'absolute', width: 12, height: 12, borderRadius: 6 },
  startDot: { backgroundColor: GREEN, left: '11%', top: '40%', borderWidth: 2, borderColor: WHITE },
  endDot: { backgroundColor: PURPLE, right: '11%', top: '40%', borderWidth: 2, borderColor: WHITE },
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(190, 163, 216, 0.08)' },
});

// ─── Info row (label + value pair) ───────────────────────────────────────────
function InfoCell({ label, value, primary = false, alignEnd = false }) {
  return (
    <View style={{ flex: 1, alignItems: alignEnd ? 'flex-end' : 'flex-start' }}>
      <Text style={inf.label}>{label}</Text>
      <Text style={[inf.value, primary && inf.valuePrimary]}>{value}</Text>
    </View>
  );
}
const inf = StyleSheet.create({
  label: { fontSize: 10, fontWeight: '600', color: DARK, letterSpacing: 1, textTransform: 'uppercase', lineHeight: 15 },
  value: { fontSize: 16, fontWeight: '700', color: DARK, lineHeight: 24, marginTop: 4 },
  valuePrimary: { fontSize: 20, fontWeight: '800', color: PURPLE, lineHeight: 28 },
});

// ─── Upcoming ride card ───────────────────────────────────────────────────────
function RideCard({ item, isFirst, statusLabel }) {
  const badgeBg = isFirst ? BG : '#F1F5F9';
  const badgeText = isFirst ? PURPLE : DARK;
  const boxBg = isFirst ? 'rgba(190,163,216,0.1)' : '#F1F5F9';
  const monthClr = isFirst ? PURPLE : DARK;
  const dayClr = isFirst ? PURPLE : DARK;

  return (
    <View style={[rc.card, !isFirst && rc.cardFaded]}>
      {/* Date box */}
      <View style={[rc.dateBox, { backgroundColor: boxBg }]}>
        <Text style={[rc.month, { color: monthClr }]}>{item.month}</Text>
        <Text style={[rc.day, { color: dayClr }]}>{item.day}</Text>
      </View>

      {/* Info */}
      <View style={rc.info}>
        <Text style={rc.dayName}>{item.day_name}</Text>
        <Text style={rc.times}>{item.times}</Text>
      </View>

      {/* Badge */}
      <View style={[rc.badge, { backgroundColor: badgeBg }]}>
        <Text style={[rc.badgeText, { color: badgeText }]}>
          {statusLabel}
        </Text>
      </View>
    </View>
  );
}
const rc = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: WHITE, borderRadius: 12, gap: 16, ...CARD_SH },
  cardFaded: { opacity: 0.8 },
  dateBox: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  month: { fontSize: 10, fontWeight: '700', lineHeight: 15, textTransform: 'uppercase' },
  day: { fontSize: 18, fontWeight: '800', lineHeight: 28 },
  info: { flex: 1 },
  dayName: { fontSize: 16, fontWeight: '700', color: DARK, lineHeight: 24 },
  times: { fontSize: 12, fontWeight: '500', color: DARK, lineHeight: 16, marginTop: 2 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', lineHeight: 15 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SubscriptionAssignmentDetailsScreen({ navigation, route }) {
  const { t } = useTranslation();
  const sub = { ...FALLBACK, ...(route?.params?.subscription ?? {}) };
  const [initiating, setInitiating] = useState(false);
  const [calling, setCalling] = useState(false);

  const completedRides = sub.completed_rides ?? 18;
  const totalRides = sub.total_rides ?? 30;
  const remaining = totalRides - completedRides;
  const progressPct = totalRides > 0 ? completedRides / totalRides : 0;

  // ── Contact / Initiate ────────────────────────────────────────────────────
  const handleCall = async () => {
    const rideId = sub?.ride_id ?? sub?.id;
    setCalling(true);
    try {
      if (rideId) {
        // Fetch rider's real phone number and open direct call
        const res = await getRiderPhone(rideId);
        const phone = res?.data?.phone ?? sub.rider_phone;
        if (phone) {
          Linking.openURL(`tel:${phone}`);
        } else {
          Alert.alert(t('subscription.callFailedTitle'), t('subscription.callNotAvailableMessage'));
        }
      } else if (sub.rider_phone) {
        // No ride ID yet — use phone from subscription data directly
        Linking.openURL(`tel:${sub.rider_phone}`);
      } else {
        Alert.alert(t('subscription.callNotAvailableTitle'), t('subscription.callNotAvailableMessage'));
      }
    } catch (err) {
      // Fallback to rider phone from subscription params
      if (sub.rider_phone) {
        Linking.openURL(`tel:${sub.rider_phone}`);
      } else {
        Alert.alert(t('subscription.callFailedTitle'), t('subscription.callFailedMessage'));
      }
    } finally {
      setCalling(false);
    }
  };

  const handleInitiatePickup = () => {
    Alert.alert(t('subscription.startPickupTitle'), t('subscription.startPickupMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.start'),
        onPress: async () => {
          try {
            setInitiating(true);
            await client.post(`/rides/subscription/${sub?.id}/initiate`);
            navigation.navigate('EnRouteToPickup', { ride: { ride_id: sub?.id, ...sub } });
          } catch (err) {
            Alert.alert(t('common.error'), err.response?.data?.message ?? t('ride.couldNotAccept'));
            setInitiating(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={s.root}>

      <ScreenHeader
        title={t('subscription.detailsTitle')}
        onBack={() => navigation?.goBack()}
        rightSlot={
          <TouchableOpacity style={s.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MoreVertical size={16} color={MUTED} strokeWidth={2} />
          </TouchableOpacity>
        }
      />

      {/* ── Scrollable content ── */}
      <ScrollView
        contentContainerStyle={[s.scroll, {}]}
        showsVerticalScrollIndicator={false}
      >

        {/* ════════════════════════════════════════
            1. Rider Card
        ════════════════════════════════════════ */}
        <View style={s.card}>
          <View style={s.riderRow}>
            {/* Avatar */}
            <View style={s.avatarRing}>
              {sub.rider_photo
                ? <Image source={{ uri: sub.rider_photo }} style={s.avatar} />
                : <InitialsAvatar name={sub.rider_name} size={52} />
              }
            </View>
            {/* Name + meta */}
            <View style={s.riderInfo}>
              <Text style={s.riderName}>{sub.rider_name}</Text>
              <View style={s.riderMeta}>
                {/* Rating */}
                <View style={s.ratingRow}>
                  <Text style={s.ratingText}>{Number(sub.rider_rating ?? 4.7).toFixed(1)}</Text>
                  <View style={s.starDot} />
                </View>
                {/* Badge */}
                <View style={s.regularBadge}>
                  <Text style={s.regularBadgeText}>{t('subscription.regularRider')}</Text>
                </View>
              </View>
            </View>
          </View>
          {/* Chat / message button */}
          <TouchableOpacity style={s.msgBtn} activeOpacity={0.8}>
            <View style={s.msgIcon} />
          </TouchableOpacity>
        </View>

        {/* ════════════════════════════════════════
            2. Route Card
        ════════════════════════════════════════ */}
        <View style={[s.card, s.routeCard]}>
          {/* Pickup + Drop with dashed connector */}
          <View style={s.routeSection}>
            {/* Dashed vertical line */}
            <View style={s.routeLine} />

            {/* Pickup row */}
            <View style={s.routeStop}>
              {/* Green dot marker */}
              <View style={s.dotWrapGreen}>
                <View style={s.dotInner} />
              </View>
              <View style={s.routeStopText}>
                <Text style={s.stopLabel}>{t('ride.pickup')}</Text>
                <Text style={s.stopAddress}>{sub.pickup_address}</Text>
              </View>
            </View>

            {/* Drop row */}
            <View style={s.routeStop}>
              {/* Pin marker */}
              <View style={s.dotWrapPin}>
                <MapPin size={12} color={WHITE} strokeWidth={2.5} fill={WHITE} />
              </View>
              <View style={s.routeStopText}>
                <Text style={s.stopLabel}>{t('ride.drop')}</Text>
                <Text style={s.stopAddress}>{sub.dropoff_address}</Text>
              </View>
            </View>
          </View>

          {/* Map Preview */}
          <MapPreview />
        </View>

        {/* ════════════════════════════════════════
            3. Subscription Info Card
        ════════════════════════════════════════ */}
        <View style={s.card}>
          {/* Row 1: Plan + Frequency */}
          <View style={s.infoGrid}>
            <InfoCell label={t('subscription.planLabel')} value={sub.plan_label ?? `${totalRides} ${t('earnings.ridesLabel')}`} primary />
            <InfoCell label={t('subscription.frequency')} value={sub.frequency ?? 'Mon–Fri'} alignEnd />
          </View>

          {/* Divider */}
          <View style={s.hLine} />

          {/* Row 2: Morning + Return */}
          <View style={s.infoGrid}>
            <View style={{ flex: 1 }}>
              <Text style={inf.label}>{t('subscription.morningPickup')}</Text>
              <View style={s.timeRow}>
                <Sun size={16} color={PURPLE} strokeWidth={1.8} />
                <Text style={inf.value}>{sub.morning_time}</Text>
              </View>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={inf.label}>{t('subscription.returnPickup')}</Text>
              <View style={s.timeRow}>
                <Moon size={16} color={PURPLE} strokeWidth={1.8} />
                <Text style={inf.value}>{sub.evening_time}</Text>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={s.hLine} />

          {/* Row 3: Start + End Dates */}
          <View style={s.infoGrid}>
            <View style={{ flex: 1 }}>
              <Text style={inf.label}>{t('subscription.startDate')}</Text>
              <Text style={[inf.value, { fontWeight: '600' }]}>{sub.start_date}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={inf.label}>{t('subscription.endDate')}</Text>
              <Text style={[inf.value, { fontWeight: '600' }]}>{sub.end_date}</Text>
            </View>
          </View>
        </View>

        {/* ════════════════════════════════════════
            4. Progress Card
        ════════════════════════════════════════ */}
        <View style={s.card}>
          {/* Header row */}
          <View style={s.progressHeader}>
            <Text style={s.progressTitle}>{t('subscription.ridesCompleted')}</Text>
            <Text style={s.progressCount}>{completedRides} / {totalRides}</Text>
          </View>

          {/* Track + gradient fill */}
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${Math.round(progressPct * 100)}%` }]} />
          </View>

          {/* Sub-label */}
          <Text style={s.progressSub}>{t('subscription.ridesRemaining', { count: remaining })}</Text>
        </View>

        {/* ════════════════════════════════════════
            5. Upcoming Rides
        ════════════════════════════════════════ */}
        <View style={s.upcomingSection}>
          {/* Heading row */}
          <View style={s.upcomingHeading}>
            <Calendar size={18} color={PURPLE} strokeWidth={2} />
            <Text style={s.upcomingTitle}>{t('subscription.upcomingRides')}</Text>
          </View>

          {/* Cards */}
          <View style={s.upcomingList}>
            {(sub.upcoming_dates ?? []).map((item, i) => (
              <RideCard
                key={`${item.month}${item.day}`}
                item={item}
                isFirst={i === 0}
                statusLabel={t('subscription.statusUpcoming')}
              />
            ))}
          </View>
        </View>

        {/* Spacer for footer */}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ════════════════════════════════════════
          Bottom Action Area
      ════════════════════════════════════════ */}
      <View style={s.footer}>
        {/* Contact Rider */}
        <TouchableOpacity style={[s.callBtn, calling && { opacity: 0.6 }]} onPress={handleCall} disabled={calling} activeOpacity={0.8}>
          {calling
            ? <ActivityIndicator color={DEEP} />
            : <Phone size={18} color={DEEP} strokeWidth={2.5} />
          }
          <Text style={s.callBtnText}>{calling ? 'Connecting…' : 'Contact Rider'}</Text>
        </TouchableOpacity>
        {/* Privacy note */}
        <Text style={s.callNote}>TAP TO CALL RIDER DIRECTLY</Text>
      </View>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  headerBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 155, gap: 24 },

  // ── Shared Card ───────────────────────────────────────────────────────────
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 24,
    gap: 16,
    ...CARD_SH,
  },

  // ── Rider Card ────────────────────────────────────────────────────────────
  riderRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 16 },
  avatarRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(190,163,216,0.2)', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  riderInfo: { flex: 1, gap: 1.5 },
  riderName: { fontSize: 18, fontWeight: '700', color: DARK, lineHeight: 28 },
  riderMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 14, fontWeight: '500', color: AMBER, lineHeight: 20 },
  starDot: { width: 11, height: 11, borderRadius: 5.5, backgroundColor: AMBER },
  regularBadge: { backgroundColor: BG, borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2 },
  regularBadgeText: { fontSize: 10, fontWeight: '700', color: PURPLE, letterSpacing: 0.5, textTransform: 'uppercase', lineHeight: 15 },
  msgBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(171,143,254,0.1)', alignItems: 'center', justifyContent: 'center' },
  msgIcon: { width: 20, height: 20, backgroundColor: PURPLE, borderRadius: 3 },

  // ── Route Card ────────────────────────────────────────────────────────────
  routeCard: { paddingTop: 48, gap: 16 },

  routeSection: {
    paddingLeft: 32,
    gap: 24,
    position: 'relative',
  },

  // Vertical dashed connector
  routeLine: {
    position: 'absolute',
    left: 12,
    top: 12,
    bottom: 12,
    width: 2,
    // Dashed effect via alternating segments
    backgroundColor: PURPLE,
    opacity: 0.5,
  },

  routeStop: { flexDirection: 'row', alignItems: 'flex-start', gap: 0, position: 'relative' },
  routeStopText: { flex: 1, paddingLeft: 0 },
  stopLabel: { fontSize: 10, fontWeight: '600', color: DARK, letterSpacing: 1, textTransform: 'uppercase', lineHeight: 15 },
  stopAddress: { fontSize: 16, fontWeight: '700', color: DARK, lineHeight: 20, marginTop: 4 },

  // Green pickup dot
  dotWrapGreen: {
    position: 'absolute',
    left: -28,
    top: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: WHITE },

  // Purple pin for drop
  dotWrapPin: {
    position: 'absolute',
    left: -28,
    top: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Info Card ─────────────────────────────────────────────────────────────
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hLine: { height: 1, backgroundColor: 'rgba(229,224,239,0.3)', marginHorizontal: -24 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },

  // ── Progress Card ─────────────────────────────────────────────────────────
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  progressTitle: { fontSize: 16, fontWeight: '700', color: DARK, lineHeight: 24 },
  progressCount: { fontSize: 18, fontWeight: '800', color: PURPLE, lineHeight: 28 },
  progressTrack: { height: 12, backgroundColor: '#F1F5F9', borderRadius: 9999, overflow: 'hidden' },
  progressFill: {
    height: '100%',
    borderRadius: 9999,
    // Gradient approximated as a solid — using LinearGradient would need expo-linear-gradient
    backgroundColor: PURPLE,
    // Fallback; ideally replaced with expo-linear-gradient from #9267CC to #BEA3D8
  },
  progressSub: { fontSize: 11, fontWeight: '500', color: DARK, lineHeight: 16, textAlign: 'center' },

  // ── Upcoming Section ──────────────────────────────────────────────────────
  upcomingSection: { gap: 16 },
  upcomingHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  upcomingTitle: { fontSize: 16, fontWeight: '700', color: DARK, lineHeight: 24 },
  upcomingList: { gap: 12 },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40,
    gap: 12,
    elevation: 12,
  },

  callBtn: {
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: DEEP,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callBtnText: { fontSize: 16, fontWeight: '700', color: DEEP, lineHeight: 24 },
  callNote: { fontSize: 10, fontWeight: '500', color: DARK, textAlign: 'center', letterSpacing: 1, textTransform: 'uppercase', lineHeight: 15 },
});
