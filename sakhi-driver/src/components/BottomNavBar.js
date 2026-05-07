import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, TrendingUp, Wallet, User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

/** Fixed content height of the nav bar (icon + gap + label). */
export const NAV_HEIGHT = 60;

const PURPLE = '#BEA3D8';
const DEEP   = '#BEA3D8';
const MUTED  = '#9CA3AF';
const WHITE  = '#FFFFFF';

/**
 * In-flow bottom navigation bar.
 * activeTab: 'home' | 'earnings' | 'wallet' | 'account'
 */
export default function BottomNavBar({ navigation, activeTab = 'home' }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pb = Math.max(insets.bottom, 8);

  const tabs = [
    {
      key:    'home',
      label:  t('nav.home'),
      Icon:   Home,
      onPress: () => navigation?.navigate('DriverOnlineDashboard'),
    },
    {
      key:    'earnings',
      label:  t('nav.earnings'),
      Icon:   TrendingUp,
      onPress: () => navigation?.navigate('MyEarnings'),
    },
    {
      key:    'wallet',
      label:  t('nav.rides'),
      Icon:   Wallet,
      onPress: () => navigation?.navigate('TransactionHistory'),
    },
    {
      key:    'account',
      label:  t('nav.profile'),
      Icon:   User,
      onPress: () => navigation?.navigate('MyProfile'),
    },
  ];

  return (
    <View style={[s.bar, { paddingBottom: pb }]}>
      {tabs.map(({ key, label, Icon, onPress }) => {
        const active = activeTab === key;
        const color  = active ? DEEP : MUTED;
        return (
          <TouchableOpacity
            key={key}
            style={s.tab}
            onPress={active ? undefined : onPress}
            activeOpacity={0.7}
          >
            <Icon size={20} color={color} strokeWidth={active ? 2.5 : 2} />
            <Text style={[s.label, active && s.labelActive]} numberOfLines={1}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    // IN-FLOW — not absolute. Content above will never be hidden behind it.
    width: '100%',
    backgroundColor: WHITE,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(190,163,216,0.2)',
    paddingTop: 8,
    paddingHorizontal: 4,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: MUTED,
    letterSpacing: 0.3,
    lineHeight: 14,
  },
  labelActive: {
    color: DEEP,
    fontWeight: '700',
  },
});
