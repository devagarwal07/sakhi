import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import ScreenHeader, { HEADER_HEIGHT } from '../../components/ScreenHeader';
import { useTranslation } from 'react-i18next';
import CustomAlert from '../../utils/CustomAlert';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const BG      = '#F5F0FF';
const WHITE   = '#FFFFFF';
const PURPLE  = '#BEA3D8';
const DEEP    = '#BEA3D8';
const DARK    = '#1E1B2E';
const MUTED   = '#6B7280';
const GREEN   = '#3A7D44';

const CARD_SHADOW = {
  shadowColor: 'rgba(124, 58, 237, 1)',
  shadowOffset: { width: 0, height: 16 },
  shadowOpacity: 0.08,
  shadowRadius: 32,
  elevation: 4,
};

// ─── APP LOGO ──────────────────────────────────────────────────────────────────
function AppLogo() {
  return (
    <View style={logo.shell}>
      <View style={logo.bg}>
        <Text style={logo.text}>SAKHI</Text>
      </View>
    </View>
  );
}
const logo = StyleSheet.create({
  shell: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    ...CARD_SHADOW,
  },
  bg: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 11,
    color: WHITE,
    letterSpacing: 1.5,
  },
});

// ─── MISSION CARD ──────────────────────────────────────────────────────────────
function MissionCard() {
  return (
    <View style={mc.card}>
      <View style={mc.heading}>
        <Sparkles size={18} color={PURPLE} strokeWidth={1.8} />
        <Text style={mc.headingText}>Our Mission</Text>
      </View>
      <View style={mc.quoteBox}>
        <Text style={mc.quote}>
          "To make every journey safe, dignified, and empowering for women — for riders and drivers alike."
        </Text>
      </View>
    </View>
  );
}
const mc = StyleSheet.create({
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    ...CARD_SHADOW,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headingText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 17,
    color: DARK,
    lineHeight: 24,
  },
  quoteBox: {
    backgroundColor: '#F5F0FF',
    borderRadius: 12,
    padding: 16,
  },
  quote: {
    fontFamily: 'Inter',
    fontStyle: 'italic',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
    textAlign: 'center',
  },
});

// ─── FEATURE ROW ───────────────────────────────────────────────────────────────
const FEATURES = [
  { iconName: 'shield', label: 'Verified women-only platform'       },
  { iconName: 'dollar-sign', label: 'Transparent commission structure'    },
  { iconName: 'clipboard', label: 'Subscription ride guarantees'        },
  { iconName: 'life-buoy', label: '24/7 safety support'                 },
];

function FeaturesCard() {
  return (
    <View>
      <Text style={feat.sectionLabel}>FOR DRIVERS</Text>
      <View style={feat.card}>
        {FEATURES.map((f, i) => (
          <View key={f.label}>
            <View style={feat.row}>
              <View style={feat.iconBox}>
                <Feather name={f.iconName} size={20} color="#BEA3D8" />
              </View>
              <Text style={feat.label}>{f.label}</Text>
            </View>
            {i < FEATURES.length - 1 && <View style={feat.divider} />}
          </View>
        ))}
      </View>
    </View>
  );
}
const feat = StyleSheet.create({
  sectionLabel: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: PURPLE,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    ...CARD_SHADOW,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
  },
  label: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 15,
    color: DARK,
    flex: 1,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(204, 195, 216, 0.2)',
    marginLeft: 56,
  },
});

// ─── SOCIAL LINKS ──────────────────────────────────────────────────────────────
const SOCIALS = [
  { icon: 'instagram', url: 'https://www.instagram.com/sakhi.women?igsh=emd5MHo2OXJ4bHE2' },
  { icon: 'web',       url: 'https://sakhiwomen.com'   },
  { icon: 'email',     url: 'mailto:support@sakhiwomen.com'  },
];

function SocialRow() {
  const handleSocial = (url) => Linking.openURL(url).catch(() => CustomAlert.alert('Could not open link'));
  return (
    <View style={soc.row}>
      {SOCIALS.map((s) => (
        <TouchableOpacity
          key={s.icon}
          style={soc.btn}
          onPress={() => handleSocial(s.url)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name={s.icon} size={22} color={DEEP} />
        </TouchableOpacity>
      ))}
    </View>
  );
}
const soc = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  btn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: `rgba(190,163,216,0.4)`,
    backgroundColor: 'rgba(190,163,216,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── REGISTERED OFFICE ─────────────────────────────────────────────────────────
function RegisteredOfficeCard() {
  return (
    <View style={ro.card}>
      <Text style={ro.label}>Registered Office</Text>
      <Text style={ro.tradeName}>Sahi Mobility Solutions Private Limited</Text>
      <Text style={ro.address}>
        C/o Jitesh, Utsaav Park, Kkv Circle, Kalawad Road, Rajkot Sau Uni Area, Rajkot, Rajkot, Gujarat, India, 360005
      </Text>
      <View style={ro.contactRow}>
        <Text style={ro.contactLabel}>Email: <Text style={ro.contactValue}>support@sakhiwomen.com</Text></Text>
        <Text style={ro.contactLabel}>Phone: <Text style={ro.contactValue}>+91 63619 33364</Text></Text>
      </View>
    </View>
  );
}
const ro = StyleSheet.create({
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 20,
    gap: 8,
    ...CARD_SHADOW,
  },
  label: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: PURPLE,
  },
  tradeName: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 15,
    color: DARK,
    lineHeight: 22,
  },
  address: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 13,
    color: MUTED,
    lineHeight: 20,
  },
  contactRow: {
    marginTop: 8,
    gap: 4,
  },
  contactLabel: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 13,
    color: DARK,
  },
  contactValue: {
    fontWeight: '400',
    color: MUTED,
  },
});

// ─── LEGAL LINKS ───────────────────────────────────────────────────────────────
const LEGAL = [
  { label: 'Terms of Service',  screen: 'TermsPrivacy', params: { tab: 'terms' } },
  { label: 'Privacy Policy',    screen: 'TermsPrivacy', params: { tab: 'privacy' } },
  { label: 'Driver Agreement',  screen: 'TermsPrivacy', params: { tab: 'terms' } },
];

function LegalCard({ navigation }) {
  const open = (item) => {
    if (item.screen && navigation) {
      navigation.navigate(item.screen, item.params || {});
    }
  };
  return (
    <View style={leg.card}>
      {LEGAL.map((l, i) => (
        <View key={l.label}>
          <TouchableOpacity style={leg.row} onPress={() => open(l)} activeOpacity={0.7}>
            <Text style={leg.label}>{l.label}</Text>
            <ChevronRight size={16} color="#CCC3D8" strokeWidth={2} />
          </TouchableOpacity>
          {i < LEGAL.length - 1 && <View style={leg.divider} />}
        </View>
      ))}
    </View>
  );
}
const leg = StyleSheet.create({
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    ...CARD_SHADOW,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  label: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 15,
    color: DARK,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(204, 195, 216, 0.2)',
  },
});

// ─── MAIN SCREEN ───────────────────────────────────────────────────────────────
export default function AboutSakhiScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const handleRate = () => {
    Linking.openURL('market://details?id=in.sakhi.driver').catch(() =>
      Linking.openURL('https://play.google.com/store/')
    );
  };

  return (
    <View style={s.root}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <ScreenHeader title={t('sidebar.aboutSakhi')} onBack={() => navigation.goBack()} />

      {/* ── Scrollable Content ──────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: 16, paddingBottom: Math.max(insets.bottom, 24) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* App identity */}
        <View style={s.identity}>
          <AppLogo />
          <Text style={s.appName}>Sakhi</Text>
          <Text style={s.appVersion}>Driver App v1.0.2</Text>
        </View>

        {/* Mission */}
        <MissionCard />

        {/* Features */}
        <FeaturesCard />

        {/* Social media */}
        <SocialRow />

        {/* Registered office */}
        <RegisteredOfficeCard />

        {/* Legal links */}
        <LegalCard navigation={navigation} />

        {/* Rate CTA */}
        <TouchableOpacity style={s.rateBtn} onPress={handleRate} activeOpacity={0.8}>
          <Text style={s.rateBtnText}>Rate Sakhi on Play Store ⭐</Text>
        </TouchableOpacity>

        {/* Build info */}
        <Text style={s.buildInfo}>BUILD v1.0.2 (240501) • Sakhi Driver India</Text>

      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  // Scroll
  scroll: {
    paddingHorizontal: 24,
    gap: 24,
  },

  // App identity block
  identity: {
    alignItems: 'center',
    gap: 12,
    paddingBottom: 8,
  },
  appName: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 28,
    lineHeight: 36,
    color: DARK,
    letterSpacing: -0.7,
    marginTop: 4,
  },
  appVersion: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },

  // Rate button
  rateBtn: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: `rgba(190,163,216,0.5)`,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(190,163,216,0.06)',
  },
  rateBtnText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 15,
    color: PURPLE,
    lineHeight: 22,
  },

  // Build info
  buildInfo: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 11,
    color: MUTED,
    textAlign: 'center',
    opacity: 0.7,
    letterSpacing: 0.2,
    paddingBottom: 8,
  },
});
