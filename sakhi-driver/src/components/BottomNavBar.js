import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, TrendingUp, Wallet, User } from 'lucide-react-native';

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
  const insets = useSafeAreaInsets();
  const pb = Math.max(insets.bottom, 8);

  const tabs = [
    {
      key:    'home',
      label:  'Home',
      Icon:   Home,
      onPress: () => navigation?.navigate('DriverOnlineDashboard'),
    },
    {
      key:    'earnings',
      label:  'Earnings',
      Icon:   TrendingUp,
      onPress: () => navigation?.navigate('MyEarnings'),
    },
    {
      key:    'wallet',
      label:  'Wallet',
      Icon:   Wallet,
      onPress: () => navigation?.navigate('TransactionHistory'),
    },
    {
      key:    'account',
      label:  'Profile',
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
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
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
