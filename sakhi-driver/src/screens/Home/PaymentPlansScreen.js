import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';
import BottomNavBar, { NAV_HEIGHT } from '../../components/BottomNavBar';
import ScreenHeader from '../../components/ScreenHeader';

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

export default function PaymentPlansScreen({ navigation }) {
  const insets = useSafeAreaInsets();
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
      <ScreenHeader title="Payment Plans" onBack={() => navigation.goBack()} />

      {/* ── SCROLLABLE CONTENT ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── EDITORIAL HEADER ── */}
        <View style={s.editorialHeader}>
          <Text style={s.heading}>
            <Text style={s.headingBlack}>Choose a{'\n'}</Text>
            <Text style={s.headingPurple}>Payment Plan</Text>
          </Text>
          <Text style={s.subtitle}>
            Select how you'd like to pay your platform fees to stay online.
          </Text>
        </View>

        {/* ── PLANS CONTAINER ── */}
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
                {plan.popular && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>MOST POPULAR</Text>
                  </View>
                )}

                <View style={s.planRow}>
                  <View style={s.radioWrap}>
                    <View style={[s.radio, isSelected && s.radioSelected]}>
                      {isSelected && <View style={s.radioDot} />}
                    </View>
                  </View>

                  <View style={s.planContent}>
                    <View style={s.planTitleGroup}>
                      <Text style={s.planTitle}>{plan.title}</Text>
                      <Text style={s.planPrice}>{plan.price}</Text>
                    </View>
                    <View style={s.featureList}>
                      {plan.features.map((f, i) => (
                        <View key={i} style={s.featureItem}>
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

          {/* ── INFO BOX ── */}
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

      {/* ── CTA BUTTON — sits flush above the BottomNavBar, no gap ── */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
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
      </View>

      <BottomNavBar navigation={navigation} activeTab="wallet" />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F0FF' },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, gap: 32 },

  // ── Editorial Header
  editorialHeader: { gap: 8 },
  heading: { fontSize: 40, fontWeight: '800', lineHeight: 44, letterSpacing: -1 },
  headingBlack:  { color: '#1C1A25' },
  headingPurple: { color: '#BEA3D8' },
  subtitle: {
    fontSize: 18, fontWeight: '500', color: '#4A4455',
    lineHeight: 29, opacity: 0.8,
  },

  // ── Plans container
  plansContainer: { gap: 24 },

  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 16,
    elevation: 4,
  },
  planCardSelected: {
    borderColor: 'rgba(190,163,216,0.30)',
  },

  badge: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: '#BEA3D8',
    borderBottomLeftRadius: 12,
    paddingHorizontal: 16, paddingVertical: 4,
    zIndex: 2,
  },
  badgeText: {
    fontSize: 10, fontWeight: '700', color: '#FFFFFF',
    textTransform: 'uppercase', letterSpacing: 1, lineHeight: 15,
  },

  planRow: { flexDirection: 'row', gap: 16 },
  radioWrap: { paddingTop: 4 },
  radio: {
    width: 24, height: 24, borderRadius: 9999,
    borderWidth: 2, borderColor: '#CCC3D8',
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { backgroundColor: '#BEA3D8', borderColor: '#BEA3D8' },
  radioDot: { width: 10, height: 10, borderRadius: 9999, backgroundColor: '#FFFFFF' },

  planContent: { flex: 1, gap: 16 },
  planTitleGroup: { gap: 4 },
  planTitle: { fontSize: 20, fontWeight: '700', color: '#1C1A25', lineHeight: 28 },
  planPrice: { fontSize: 18, fontWeight: '800', color: '#BEA3D8', letterSpacing: -0.45, lineHeight: 28 },

  featureList: { gap: 11.5 },
  featureItem:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkCircle: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#BEA3D8',
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { fontSize: 9, color: '#FFFFFF', fontWeight: '800' },
  featureText: { fontSize: 14, fontWeight: '500', color: '#4A4455', lineHeight: 20, flex: 1 },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#F6F1FF',
    borderRadius: 16, padding: 20, gap: 12,
  },
  infoIconWrap: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  infoIcon: { fontSize: 14, color: '#BEA3D8', fontWeight: '800' },
  infoText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#4A4455', lineHeight: 23 },

  // ── CTA footer — in-flow, no absolute, snaps directly above BottomNavBar
  footer: {
    backgroundColor: 'rgba(245,240,255,0.98)',
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(190,163,216,0.15)',
  },
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
  ctaText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', lineHeight: 24 },
});
