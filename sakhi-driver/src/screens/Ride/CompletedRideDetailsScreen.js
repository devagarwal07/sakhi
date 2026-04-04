import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, Platform, Linking, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, Radius } from '../../utils/theme';
import {
  ArrowLeft, Calendar, MapPin, Route, Clock, Car,
  Phone, CheckCircle2,
} from 'lucide-react-native';
import BottomNavBar, { NAV_HEIGHT } from '../../components/BottomNavBar';
import ScreenHeader, { HEADER_HEIGHT } from '../../components/ScreenHeader';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PURPLE = '#BEA3D8';
const DEEP   = '#BEA3D8';
const DARK   = '#1E1B2E';
const MUTED  = '#64748B';
const SLATE  = '#475569';
const FAINT  = '#94A3B8';
const GREEN  = '#10B981';
const AMBER  = '#FBBF24';
const WHITE  = '#FFFFFF';
const BG     = '#F5F0FF';

// ─── Fallback ride for design preview ─────────────────────────────────────────
const FALLBACK = {
  ride_id:          'demo-001',
  date_label:       'Saturday, 15 Mar 2026 · 8:34 AM',
  pickup_address:   'Green Park Metro Stn, Gate 2',
  dropoff_address:  'Cyber Hub, Entrance A, Gurgaon',
  distance_km:      3.2,
  duration_min:     14,
  vehicle_type:     'Auto',
  rider_name:       'Priya S.',
  rider_photo:      null,
  rider_rating:     4.7,
  ride_type:        'ON-DEMAND RIDE',
  base_fare:        30,
  distance_fare:    55,
  waiting_fare:     2,
  total_fare:       87,
  payment_method:   'cash',   // 'cash' | 'online' | 'upi'
  distance_label:   '3.2 km',
  waiting_label:    '1 min',
};

// ─── Decorative map preview ───────────────────────────────────────────────────
function MapPreview() {
  return (
    <View style={mp.container}>
      {/* gradient background */}
      <View style={mp.bgGradient} />
      {/* road grid */}
      {[0.28, 0.52, 0.74].map((t, i) => (
        <View key={`h${i}`} style={[mp.road, { top: `${t * 100}%`, left: 0, right: 0, height: 1.5 }]} />
      ))}
      {[0.22, 0.45, 0.68, 0.86].map((l, i) => (
        <View key={`v${i}`} style={[mp.road, { left: `${l * 100}%`, top: 0, bottom: 0, width: 1.5 }]} />
      ))}
      {/* dashed route curve (simplified as dashed segments) */}
      <View style={mp.routeRow}>
        {Array.from({ length: 14 }).map((_, i) => (
          <View
            key={i}
            style={[
              mp.dash,
              { opacity: i % 3 === 2 ? 0 : 1 },
              // slight vertical offset to simulate arc
              { marginTop: i < 7 ? (7 - i) * 2 : (i - 7) * 2 },
            ]}
          />
        ))}
      </View>
      {/* Pickup pin (green) */}
      <View style={[mp.pin, mp.pinPickup]}>
        <View style={mp.pinHead}>
          <View style={mp.pinDot} />
        </View>
        <View style={mp.pinTip} />
      </View>
      {/* Drop pin (purple) */}
      <View style={[mp.pin, mp.pinDrop]}>
        <View style={[mp.pinHead, { backgroundColor: PURPLE }]}>
          <View style={[mp.pinDot, { backgroundColor: WHITE }]} />
        </View>
        <View style={[mp.pinTip, { borderTopColor: PURPLE }]} />
      </View>
      {/* tint overlay */}
      <View style={mp.tint} />
    </View>
  );
}
const mp = StyleSheet.create({
  container:  { height: 248, borderRadius: 24, overflow: 'hidden', position: 'relative', ...Shadows.card },
  bgGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: '#F5F0FF' },
  road:       { position: 'absolute', backgroundColor: '#E5E0EF' },
  routeRow:   { position: 'absolute', left: '16%', right: '16%', top: '46%', flexDirection: 'row', alignItems: 'center', gap: 1 },
  dash:       { flex: 1, height: 3.5, backgroundColor: PURPLE, borderRadius: 2 },
  pin:        { position: 'absolute', alignItems: 'center' },
  pinPickup:  { left: 40, bottom: 55 },
  pinDrop:    { right: 40, top: 40 },
  pinHead:    { width: 20, height: 20, borderRadius: 10, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  pinDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: WHITE },
  pinTip:     { width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: GREEN, marginTop: -1 },
  tint:       { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(190,163,216,0.06)' },
});

// ─── Initials avatar ──────────────────────────────────────────────────────────
function InitialsAvatar({ name, size = 48 }) {
  const parts    = (name ?? 'R').trim().split(' ');
  const initials = parts.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  return (
    <View style={[av.bg, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[av.text, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}
const av = StyleSheet.create({
  bg:   { backgroundColor: '#BEA3D8', alignItems: 'center', justifyContent: 'center' },
  text: { color: WHITE, fontWeight: '700' },
});

// ─── Stat chip ────────────────────────────────────────────────────────────────
function StatChip({ icon, label }) {
  return (
    <View style={chip.wrap}>
      {icon}
      <Text style={chip.label}>{label}</Text>
    </View>
  );
}
const chip = StyleSheet.create({
  wrap:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: WHITE, borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 12, minHeight: 62 },
  label: { fontSize: 14, fontWeight: '600', color: SLATE, lineHeight: 20, flexShrink: 1 },
});

// ─── Fare row ─────────────────────────────────────────────────────────────────
function FareRow({ label, value, bold = false, purple = false }) {
  return (
    <View style={fr.row}>
      <Text style={[fr.label, bold && fr.labelBold]}>{label}</Text>
      <Text style={[fr.value, bold && fr.valueBold, purple && fr.valuePurple]}>{value}</Text>
    </View>
  );
}
const fr = StyleSheet.create({
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:       { fontSize: 14, fontWeight: '400', color: MUTED, lineHeight: 20 },
  value:       { fontSize: 16, fontWeight: '500', color: DARK, lineHeight: 24 },
  labelBold:   { fontSize: 16, fontWeight: '700', color: DARK },
  valueBold:   { fontSize: 20, fontWeight: '800' },
  valuePurple: { color: PURPLE },
});



// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CompletedRideDetailsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const ride   = { ...FALLBACK, ...(route?.params?.ride ?? {}) };

  const isCash     = ride.payment_method === 'cash';
  const isOnline   = !isCash;
  const distLabel  = ride.distance_label ?? `${ride.distance_km} km`;
  const waitLabel  = ride.waiting_label  ?? '—';

  const handleCall = () => {
    // Masked calling is only available during active rides (backend enforces activeStatuses check)
    // For completed rides, show a clear message instead of doing a direct dial
    Alert.alert(
      'Call Not Available',
      'Masked calling is only available during an active ride. To contact support about this ride, use Help & Support.',
      [{ text: 'OK' }]
    );
  };

  const BOTTOM_H = 77 + Math.max(insets.bottom, 16);

  return (
    <View style={s.root}>
      <ScreenHeader title="Ride Details" onBack={() => navigation?.goBack()} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Map Preview ── */}
        <MapPreview />

        {/* ── Details Card ── */}
        <View style={s.detailsCard}>

          {/* Date-Time row */}
          <View style={s.dateRow}>
            <View style={s.dateIcon}>
              <Calendar size={18} color={PURPLE} strokeWidth={2} />
            </View>
            <Text style={s.dateText}>{ride.date_label}</Text>
          </View>

          {/* Route */}
          <View style={s.routeSection}>
            {/* Dashed vertical connector */}
            <View style={s.dashedLine} />

            {/* Pickup */}
            <View style={s.routeRow}>
              <View style={s.dotPickup}>
                <View style={s.dotPickupGlow} />
              </View>
              <View style={s.routeInfo}>
                <Text style={s.routeLabel}>PICKUP</Text>
                <Text style={s.routeAddr}>{ride.pickup_address}</Text>
              </View>
            </View>

            {/* Drop */}
            <View style={s.routeRow}>
              <View style={s.dotDropWrap}>
                <MapPin size={14} color={PURPLE} strokeWidth={2.5} style={{ marginLeft: -1 }} />
              </View>
              <View style={s.routeInfo}>
                <Text style={s.routeLabel}>DROPOFF</Text>
                <Text style={s.routeAddr}>{ride.dropoff_address}</Text>
              </View>
            </View>
          </View>

          {/* Trip stats */}
          <View style={s.statsRow}>
            <StatChip
              icon={<Route size={13.5} color={FAINT} strokeWidth={2} />}
              label={distLabel}
            />
            <StatChip
              icon={<Clock size={15} color={FAINT} strokeWidth={2} />}
              label={`${ride.duration_min}\nmins`}
            />
            <StatChip
              icon={<Car size={13.5} color={FAINT} strokeWidth={2} />}
              label={ride.vehicle_type}
            />
          </View>

          {/* Rider info */}
          <View style={s.riderRow}>
            <View style={s.riderLeft}>
              {/* Avatar */}
              <View style={s.avatarBg}>
                {ride.rider_photo
                  ? <Image source={{ uri: ride.rider_photo }} style={s.avatarImg} />
                  : <InitialsAvatar name={ride.rider_name} size={48} />
                }
              </View>
              {/* Name + rating */}
              <View style={s.riderInfo}>
                <Text style={s.riderName}>{ride.rider_name}</Text>
                <View style={s.riderMeta}>
                  <Text style={s.riderRating}>{Number(ride.rider_rating ?? 4.7).toFixed(1)}</Text>
                  <View style={s.starIcon} />
                  <Text style={s.rideTypeText}>{ride.ride_type}</Text>
                </View>
              </View>
            </View>
            {/* Call button */}
            <TouchableOpacity style={s.callBtn} onPress={handleCall} activeOpacity={0.8}>
              <Phone size={18} color={PURPLE} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Fare breakdown */}
          <View style={s.fareBox}>
            <FareRow label="Base Fare"                    value={`₹${ride.base_fare}`} />
            <FareRow label={`Distance (${distLabel})`}   value={`₹${ride.distance_fare}`} />
            <FareRow label={`Waiting (${waitLabel})`}    value={`₹${ride.waiting_fare}`} />
            <View style={s.fareDiv} />
            <FareRow label="Total Fare" value={`₹${ride.total_fare}`} bold purple />
          </View>

          {/* Payment status strip */}
          <View style={[
            s.paymentStrip,
            isCash ? s.paymentStripCash : s.paymentStripOnline,
          ]}>
            <CheckCircle2
              size={22}
              color={isCash ? '#059669' : DEEP}
              strokeWidth={2}
            />
            <Text style={[s.paymentText, isCash ? s.paymentTextCash : s.paymentTextOnline]}>
              {isCash ? 'Cash Collected ✓' : 'Payment Received ✓'}
            </Text>
          </View>

        </View>
      </ScrollView>

      <BottomNavBar navigation={navigation} activeTab="wallet" />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24,
    paddingBottom: 14, gap: 16,
    backgroundColor: 'rgba(245, 240, 255, 0.88)',
    ...Platform.select({
      ios: { shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32 },
      android: { elevation: 6 },
    }),
  },
  backBtn:     { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: DARK, letterSpacing: -0.45, lineHeight: 28 },

  // Scroll
  scroll: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },

  // Details card
  detailsCard: {
    backgroundColor: WHITE,
    borderRadius: 24,
    padding: 24,
    gap: 32,
    ...Shadows.lavender,
  },

  // Date row
  dateRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateIcon: { width: 34, height: 36, backgroundColor: '#F5F0FF', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dateText: { fontSize: 16, fontWeight: '700', color: DARK, lineHeight: 24 },

  // Route section
  routeSection: { paddingLeft: 8, gap: 24, position: 'relative' },
  dashedLine: {
    position: 'absolute',
    left: 12,
    top: 24,
    bottom: 24,
    width: 0,
    borderLeftWidth: 2,
    borderLeftColor: '#A78BFA',
    borderStyle: 'dashed',
  },
  routeRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 20, position: 'relative' },
  routeInfo: { flex: 1, gap: 2 },
  routeLabel:{ fontSize: 12, fontWeight: '500', color: MUTED, letterSpacing: 0.6, textTransform: 'uppercase', lineHeight: 16 },
  routeAddr: { fontSize: 16, fontWeight: '700', color: DARK, lineHeight: 20 },

  // Dots
  dotPickup: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: GREEN, marginTop: 6,
    position: 'relative',
  },
  dotPickupGlow: {
    position: 'absolute', inset: -4,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.002)',
    borderWidth: 4, borderColor: '#ECFDF5',
    top: -4, left: -4,
    zIndex: -1,
  },
  dotDropWrap: { width: 16, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: -4 },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 8 },

  // Rider row
  riderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F8FAFC',
    marginTop: -16, // collapse the outer gap partially
  },
  riderLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarBg:  { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  riderInfo: { gap: 4 },
  riderName: { fontSize: 18, fontWeight: '700', color: DARK, lineHeight: 18 },
  riderMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  riderRating: { fontSize: 14, fontWeight: '500', color: MUTED, lineHeight: 20 },
  starIcon:  { width: 11.67, height: 11, borderRadius: 5.5, backgroundColor: AMBER, marginRight: 4 },
  rideTypeText: { fontSize: 10, fontWeight: '400', color: FAINT, letterSpacing: -0.5, textTransform: 'uppercase', lineHeight: 15 },
  callBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F0FF', alignItems: 'center', justifyContent: 'center' },

  // Fare box
  fareBox: {
    backgroundColor: '#F5F0FF',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    marginTop: -16,
  },
  fareDiv: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginVertical: 4,
  },

  // Payment strip
  paymentStrip: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 16, gap: 12, borderRadius: 16, borderWidth: 1,
    marginTop: -16,
  },
  paymentStripCash:   { backgroundColor: '#ECFDF5', borderColor: '#ECFDF5' },
  paymentStripOnline: { backgroundColor: '#EDE9FE', borderColor: '#DDD6FE' },
  paymentText:        { fontSize: 16, fontWeight: '700', lineHeight: 24 },
  paymentTextCash:    { color: '#059669' },
  paymentTextOnline:  { color: DEEP },

  // Bottom Nav
});
