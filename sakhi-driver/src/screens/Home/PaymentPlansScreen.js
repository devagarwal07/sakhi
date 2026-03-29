import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '../../context/AuthContext';

const PLANS = [
  {
    id: 'daily',
    title: 'Daily Plan',
    price: '₹50 / day',
    features: ['Pay only for the days you drive', 'Ideal for part-time drivers'],
    popular: false,
  },
  {
    id: 'weekly',
    title: 'Weekly Plan',
    price: '₹350 / week',
    features: ['Consistent access all week', 'No daily payment hassle'],
    popular: true,
  },
];

// ── Bottom Tab Item ────────────────────────────────────────────────────────────
function TabItem({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity style={tab.item} onPress={onPress} activeOpacity={0.7}>
      <View style={[tab.iconWrap, active && tab.iconWrapActive]}>
        <Image
          source={icon}
          style={[tab.icon, active && tab.iconActive]}
          resizeMode="contain"
        />
      </View>
      <Text style={[tab.label, active && tab.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
const tab = StyleSheet.create({
  item:         { flex: 1, alignItems: 'center', gap: 4 },
  iconWrap:     { paddingHorizontal: 16, paddingVertical: 4, borderRadius: 12 },
  iconWrapActive: { backgroundColor: '#F5F0FF' },
  icon:         { width: 20, height: 20, tintColor: '#6B7280' },
  iconActive:   { tintColor: '#BEA3D8' },
  label:        { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#6B7280' },
  labelActive:  { color: '#BEA3D8' },
});

export default function PaymentPlansScreen({ navigation }) {
  const { updateDriver } = useAuth();
  const [selected, setSelected]   = useState('weekly');
  const [loading, setLoading]     = useState(false);

  const handleConfirm = () => {
    if (selected === 'weekly') {
      navigation.navigate('WeeklyCommissionPayment');
    } else {
      navigation.navigate('DailyCommissionPayment');
    }
  };

  return (
    <View style={s.root}>
      <StatusBar style="dark" />

      {/* ── TOP APP BAR: height 64, bg rgba(245,240,255,0.8), blur ── */}
      <View style={s.topBar}>
        <View style={s.topBarInner}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={s.topBarTitle}>Payment Plans</Text>
        </View>
      </View>

      {/* ── SCROLLABLE CONTENT (padding: 96 24 0) ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── EDITORIAL HEADER (gap: 8) ── */}
        <View style={s.editorialHeader}>
          {/* "Choose a Payment Plan" — 40px 800w #1C1A25 */}
          <Text style={s.heading}>
            <Text style={s.headingBlack}>Choose a{'\n'}</Text>
            <Text style={s.headingPurple}>Payment Plan</Text>
          </Text>
          {/* Subtitle: 18px 500w #4A4455, opacity 0.8 */}
          <Text style={s.subtitle}>
            Select how you'd like to pay your platform fees to stay online.
          </Text>
        </View>

        {/* ── PLANS CONTAINER (gap: 24) ── */}
        <View style={s.plansContainer}>
          {PLANS.map((plan) => {
            const isSelected = selected === plan.id;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[s.planCard, isSelected && s.planCardSelected]}
                onPress={() => setSelected(plan.id)}
                activeOpacity={0.9}
              >
                {/* MOST POPULAR badge — top-right, only on weekly */}
                {plan.popular && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>MOST POPULAR</Text>
                  </View>
                )}

                {/* Radio + content row */}
                <View style={s.planRow}>
                  {/* Radio button: 24×24, border 2px */}
                  <View style={s.radioWrap}>
                    <View style={[s.radio, isSelected && s.radioSelected]}>
                      {isSelected && <View style={s.radioDot} />}
                    </View>
                  </View>

                  {/* Content: title, price, features */}
                  <View style={s.planContent}>
                    {/* Title + price */}
                    <View style={s.planTitleGroup}>
                      <Text style={s.planTitle}>{plan.title}</Text>
                      <Text style={s.planPrice}>{plan.price}</Text>
                    </View>
                    {/* Feature list */}
                    <View style={s.featureList}>
                      {plan.features.map((f, i) => (
                        <View key={i} style={s.featureItem}>
                          {/* Check icon: 11.67×11.67 #BEA3D8 circle */}
                          <View style={s.checkCircle}>
                            <Text style={s.checkMark}>✓</Text>
                          </View>
                          <Text style={s.featureText}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* ── INFO BOX: bg #F6F1FF, radius 16 ── */}
          <View style={s.infoBox}>
            <View style={s.infoIconWrap}>
              <Text style={s.infoIcon}>ℹ</Text>
            </View>
            <Text style={s.infoText}>
              Your plan will auto-renew. You can change or cancel before the next billing cycle.
            </Text>
          </View>
        </View>

      </ScrollView>

      {/* ── FIXED FOOTER: bg rgba(245,240,255,0.8), blur, padding 24/40 ── */}
      <View style={s.footer}>
        {/* CTA Button: gradient-like bg #BEA3D8, radius 12, height 56 */}
        <TouchableOpacity
          style={[s.ctaBtn, loading && s.ctaBtnDisabled]}
          onPress={handleConfirm}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={s.ctaText}>
            {loading ? 'Going Online…' : 'Confirm & Proceed'}
          </Text>
        </TouchableOpacity>

        {/* Bottom nav placeholder */}
        <View style={s.bottomNav}>
          <TabItem
            icon={require('../../../assets/home.png')}
            label="HOME"
            active={false}
            onPress={() => navigation.navigate('DriverHome')}
          />
          <TabItem
            icon={require('../../../assets/earning.png')}
            label="EARNINGS"
            active={false}
            onPress={() => navigation.navigate('MyEarnings')}
          />
          <TabItem
            icon={require('../../../assets/subscription.png')}
            label="PLANS"
            active={true}
            onPress={() => {}}
          />
          <TabItem
            icon={require('../../../assets/profile.png')}
            label="PROFILE"
            active={false}
            onPress={() => navigation.navigate('MyProfile')}
          />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // Root: #F5F0FF
  root: { flex: 1, backgroundColor: '#F5F0FF' },

  // ── Top app bar: height 64, bg rgba(245,240,255,0.8)
  topBar: {
    height: 64,
    backgroundColor: 'rgba(245,240,255,0.8)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 16,
    elevation: 4,
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2,
  },
  topBarInner: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, height: 64, gap: 16,
  },
  backBtn: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 20, color: '#BEA3D8', fontWeight: '600' },
  // Title: 20px 600w #1E1B2E, letter-spacing -0.5
  topBarTitle: {
    fontSize: 20, fontWeight: '600', color: '#1E1B2E', letterSpacing: -0.5, lineHeight: 28,
  },

  // ── Scroll: padding 96/24/0 at top
  scroll:        { flex: 1, marginTop: 64, marginBottom: 192 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32, gap: 32 },

  // ── Editorial Header (gap: 8)
  editorialHeader: { gap: 8 },
  // 40px 800w, letter-spacing -1
  heading: { fontSize: 40, fontWeight: '800', lineHeight: 44, letterSpacing: -1 },
  headingBlack:  { color: '#1C1A25' },
  headingPurple: { color: '#BEA3D8' },
  // 18px 500w #4A4455, opacity 0.8, line-height 29
  subtitle: {
    fontSize: 18, fontWeight: '500', color: '#4A4455',
    lineHeight: 29, opacity: 0.8,
  },

  // ── Plans container (gap: 24)
  plansContainer: { gap: 24 },

  // Plan card: bg #FFF, radius 16, padding 24, shadow
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',          // always present — avoids layout shift
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 16,
    elevation: 4,
  },
  // Selected: border 2px rgba(190,163,216,0.3)
  planCardSelected: {
    borderColor: 'rgba(190,163,216,0.30)',
  },

  // MOST POPULAR badge: top-right, bg #BEA3D8, radius 0/0/0/12, padding 4/16
  badge: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: '#BEA3D8',
    borderBottomLeftRadius: 12,
    paddingHorizontal: 16, paddingVertical: 4,
    zIndex: 2,
  },
  // Badge text: 10px 700w #FFF, uppercase, letter-spacing 1
  badgeText: {
    fontSize: 10, fontWeight: '700', color: '#FFFFFF',
    textTransform: 'uppercase', letterSpacing: 1, lineHeight: 15,
  },

  // Plan row: radio + content
  planRow: { flexDirection: 'row', gap: 16 },
  // Radio wrap: add 4px top padding
  radioWrap: { paddingTop: 4 },
  // Radio: 24×24, border 2px #CCC3D8, radius 9999
  radio: {
    width: 24, height: 24, borderRadius: 9999,
    borderWidth: 2, borderColor: '#CCC3D8',
    alignItems: 'center', justifyContent: 'center',
  },
  // Selected radio: bg #BEA3D8, border #BEA3D8
  radioSelected: { backgroundColor: '#BEA3D8', borderColor: '#BEA3D8' },
  // Inner dot: 10×10, white, radius 9999
  radioDot: { width: 10, height: 10, borderRadius: 9999, backgroundColor: '#FFFFFF' },

  // Plan content
  planContent: { flex: 1, gap: 16 },
  planTitleGroup: { gap: 4 },
  // Plan title: 20px 700w #1C1A25
  planTitle: { fontSize: 20, fontWeight: '700', color: '#1C1A25', lineHeight: 28 },
  // Plan price: 18px 800w #BEA3D8, letter-spacing -0.45
  planPrice: { fontSize: 18, fontWeight: '800', color: '#BEA3D8', letterSpacing: -0.45, lineHeight: 28 },

  // Feature list (gap: 11.5)
  featureList: { gap: 11.5 },
  featureItem:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // Check circle: 11.67×11.67 #BEA3D8
  checkCircle: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#BEA3D8',
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { fontSize: 9, color: '#FFFFFF', fontWeight: '800' },
  // Feature text: 14px 500w #4A4455
  featureText: { fontSize: 14, fontWeight: '500', color: '#4A4455', lineHeight: 20, flex: 1 },

  // ── Info box: bg #F6F1FF, radius 16
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#F6F1FF',
    borderRadius: 16, padding: 20, gap: 12,
  },
  infoIconWrap: {
    width: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  // Info icon: 20×20, #BEA3D8
  infoIcon: { fontSize: 14, color: '#BEA3D8', fontWeight: '800' },
  // Info text: 14px 500w #4A4455, line-height 23
  infoText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#4A4455', lineHeight: 23 },

  // ── Footer: fixed bottom, bg rgba(245,240,255,0.8), padding 24/40
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(245,240,255,0.8)',
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40,
    gap: 24,
  },
  // CTA button: bg #BEA3D8, radius 12, height 56, shadow
  ctaBtn: {
    height: 56, borderRadius: 12,
    backgroundColor: '#BEA3D8',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16,
    elevation: 6,
  },
  ctaBtnDisabled: { opacity: 0.6 },
  // CTA text: 16px 700w #FFF
  ctaText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', lineHeight: 24 },

  // Bottom nav placeholder row
  bottomNav: { flexDirection: 'row', alignItems: 'center' },
});
