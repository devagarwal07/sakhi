import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

/** Fixed content height of the nav bar (icon + gap + label). */
export const NAV_HEIGHT = 60;

const PURPLE = '#BEA3D8';
const MUTED  = '#6B7280';
const WHITE  = '#FFFFFF';
const ACTIVE_BG = 'rgba(190, 163, 216, 0.15)';

// ─── Custom SVG Icons (from Figma) ────────────────────────────────────────────
function HomeIcon({ color = MUTED, size = 20 }) {
  const s = size / 16;
  return (
    <Svg width={16 * s} height={18 * s} viewBox="0 0 16 18" fill="none">
      <Path
        d="M2 16H5V10H11V16H14V7L8 2.5L2 7V16ZM0 18V6L8 0L16 6V18H9V12H7V18H0Z"
        fill={color}
      />
    </Svg>
  );
}

function EarningsNavIcon({ color = MUTED, size = 20 }) {
  const s = size / 22;
  return (
    <Svg width={22 * s} height={16 * s} viewBox="0 0 22 16" fill="none">
      <Path
        d="M13 9C12.1667 9 11.4583 8.70833 10.875 8.125C10.2917 7.54167 10 6.83333 10 6C10 5.16667 10.2917 4.45833 10.875 3.875C11.4583 3.29167 12.1667 3 13 3C13.8333 3 14.5417 3.29167 15.125 3.875C15.7083 4.45833 16 5.16667 16 6C16 6.83333 15.7083 7.54167 15.125 8.125C14.5417 8.70833 13.8333 9 13 9ZM6 12C5.45 12 4.97917 11.8042 4.5875 11.4125C4.19583 11.0208 4 10.55 4 10V2C4 1.45 4.19583 0.979167 4.5875 0.5875C4.97917 0.195833 5.45 0 6 0H20C20.55 0 21.0208 0.195833 21.4125 0.5875C21.8042 0.979167 22 1.45 22 2V10C22 10.55 21.8042 11.0208 21.4125 11.4125C21.0208 11.8042 20.55 12 20 12H6ZM8 10H18C18 9.45 18.1958 8.97917 18.5875 8.5875C18.9792 8.19583 19.45 8 20 8V4C19.45 4 18.9792 3.80417 18.5875 3.4125C18.1958 3.02083 18 2.55 18 2H8C8 2.55 7.80417 3.02083 7.4125 3.4125C7.02083 3.80417 6.55 4 6 4V8C6.55 8 7.02083 8.19583 7.4125 8.5875C7.80417 8.97917 8 9.45 8 10ZM19 16H2C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14V3H2V14H19V16ZM6 10V2V10Z"
        fill={color}
      />
    </Svg>
  );
}

function WalletIcon({ color = MUTED, size = 20 }) {
  const s = size / 19;
  return (
    <Svg width={19 * s} height={18 * s} viewBox="0 0 19 18" fill="none">
      <Path
        d="M2 18C1.45 18 0.979167 17.8042 0.5875 17.4125C0.195833 17.0208 0 16.55 0 16V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H16C16.55 0 17.0208 0.195833 17.4125 0.5875C17.8042 0.979167 18 1.45 18 2H10C8.81667 2 7.85417 2.37083 7.1125 3.1125C6.37083 3.85417 6 4.81667 6 6V12C6 13.1833 6.37083 14.1458 7.1125 14.8875C7.85417 15.6292 8.81667 16 10 16H18C18 16.55 17.8042 17.0208 17.4125 17.4125C17.0208 17.8042 16.55 18 16 18H2ZM10 14C9.45 14 8.97917 13.8042 8.5875 13.4125C8.19583 13.0208 8 12.55 8 12V6C8 5.45 8.19583 4.97917 8.5875 4.5875C8.97917 4.19583 9.45 4 10 4H17C17.55 4 18.0208 4.19583 18.4125 4.5875C18.8042 4.97917 19 5.45 19 6V12C19 12.55 18.8042 13.0208 18.4125 13.4125C18.0208 13.8042 17.55 14 17 14H10ZM13 10.5C13.4333 10.5 13.7917 10.3583 14.075 10.075C14.3583 9.79167 14.5 9.43333 14.5 9C14.5 8.56667 14.3583 8.20833 14.075 7.925C13.7917 7.64167 13.4333 7.5 13 7.5C12.5667 7.5 12.2083 7.64167 11.925 7.925C11.6417 8.20833 11.5 8.56667 11.5 9C11.5 9.43333 11.6417 9.79167 11.925 10.075C12.2083 10.3583 12.5667 10.5 13 10.5Z"
        fill={color}
      />
    </Svg>
  );
}

function AccountIcon({ color = MUTED, size = 20 }) {
  const s = size / 16;
  return (
    <Svg width={16 * s} height={16 * s} viewBox="0 0 16 16" fill="none">
      <Path
        d="M8 8C6.9 8 5.95833 7.60833 5.175 6.825C4.39167 6.04167 4 5.1 4 4C4 2.9 4.39167 1.95833 5.175 1.175C5.95833 0.391667 6.9 0 8 0C9.1 0 10.0417 0.391667 10.825 1.175C11.6083 1.95833 12 2.9 12 4C12 5.1 11.6083 6.04167 10.825 6.825C10.0417 7.60833 9.1 8 8 8ZM0 16V13.2C0 12.6333 0.145833 12.1125 0.4375 11.6375C0.729167 11.1625 1.11667 10.8 1.6 10.55C2.63333 10.0333 3.68333 9.64583 4.75 9.3875C5.81667 9.12917 6.9 9 8 9C9.1 9 10.1833 9.12917 11.25 9.3875C12.3167 9.64583 13.3667 10.0333 14.4 10.55C14.8833 10.8 15.2708 11.1625 15.5625 11.6375C15.8542 12.1125 16 12.6333 16 13.2V16H0ZM2 14H14V13.2C14 13.0167 13.9542 12.85 13.8625 12.7C13.7708 12.55 13.65 12.4333 13.5 12.35C12.6 11.9 11.6917 11.5625 10.775 11.3375C9.85833 11.1125 8.93333 11 8 11C7.06667 11 6.14167 11.1125 5.225 11.3375C4.30833 11.5625 3.4 11.9 2.5 12.35C2.35 12.4333 2.22917 12.55 2.1375 12.7C2.04583 12.85 2 13.0167 2 13.2V14ZM8 6C8.55 6 9.02083 5.80417 9.4125 5.4125C9.80417 5.02083 10 4.55 10 4C10 3.45 9.80417 2.97917 9.4125 2.5875C9.02083 2.19583 8.55 2 8 2C7.45 2 6.97917 2.19583 6.5875 2.5875C6.19583 2.97917 6 3.45 6 4C6 4.55 6.19583 5.02083 6.5875 5.4125C6.97917 5.80417 7.45 6 8 6Z"
        fill={color}
      />
    </Svg>
  );
}

/**
 * In-flow bottom navigation bar.
 * activeTab: 'home' | 'earnings' | 'wallet' | 'account'
 */
export default function BottomNavBar({ navigation, activeTab = 'home' }) {
  const insets = useSafeAreaInsets();
  const pb = Math.max(insets.bottom, 8);

  const tabs = [
    {
      key:     'home',
      label:   'HOME',
      Icon:    HomeIcon,
      onPress: () => navigation?.navigate('DriverOnlineDashboard'),
    },
    {
      key:     'earnings',
      label:   'EARNINGS',
      Icon:    EarningsNavIcon,
      onPress: () => navigation?.navigate('MyEarnings'),
    },
    {
      key:     'wallet',
      label:   'WALLET',
      Icon:    WalletIcon,
      onPress: () => navigation?.navigate('TransactionHistory'),
    },
    {
      key:     'account',
      label:   'ACCOUNT',
      Icon:    AccountIcon,
      onPress: () => navigation?.navigate('MyProfile'),
    },
  ];

  return (
    <View style={[st.bar, { paddingBottom: pb }]}>
      {tabs.map(({ key, label, Icon, onPress }) => {
        const active = activeTab === key;
        const color  = active ? PURPLE : MUTED;
        return (
          <TouchableOpacity
            key={key}
            style={[st.tab, active && st.tabActive]}
            onPress={active ? undefined : onPress}
            activeOpacity={0.7}
          >
            <Icon size={22} color={color} />
            <Text style={[st.label, active && st.labelActive]} numberOfLines={1}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  bar: {
    width: '100%',
    backgroundColor: WHITE,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(190,163,216,0.15)',
    paddingTop: 8,
    paddingHorizontal: 4,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: ACTIVE_BG,
    borderRadius: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: MUTED,
    letterSpacing: 0.8,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  labelActive: {
    color: PURPLE,
    fontWeight: '700',
  },
});
