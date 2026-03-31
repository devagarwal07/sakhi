/**
 * SakhiLogoutConfirmationSheet
 * Transparent-modal bottom sheet confirming logout.
 * Shows an "online" warning if the driver is currently active.
 * Usage: navigation.navigate('LogoutConfirmation')
 */
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Modal, TouchableWithoutFeedback,
  ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TriangleAlert } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

// ─── Tokens ────────────────────────────────────────────────────────────────────
const WHITE   = '#FFFFFF';
const DARK    = '#1E1B2E';
const MUTED   = '#6B7280';
const RED     = '#DC2626';
const PURPLE  = '#BEA3D8';
const BORDER  = 'rgba(190,163,216,0.35)';
const HANDLE  = '#E5E7EB';

// Warning banner colours
const WARN_BG   = '#FFF4EC';   // very light orange
const WARN_TEXT = '#C2410C';   // deep orange
const WARN_ICO  = '#F97316';   // vivid orange

export default function SakhiLogoutConfirmationSheet({ navigation }) {
  const { logout, driver } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);

  const slideAnim = useRef(new Animated.Value(400)).current;
  const bgAnim    = useRef(new Animated.Value(0)).current;

  // Whether driver is currently online (show warning)
  const isOnline = driver?.is_online ?? false;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0, friction: 9, tension: 70, useNativeDriver: true,
      }),
      Animated.timing(bgAnim, {
        toValue: 0.55, duration: 280, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 500, duration: 220, useNativeDriver: true,
      }),
      Animated.timing(bgAnim, {
        toValue: 0, duration: 220, useNativeDriver: true,
      }),
    ]).start(() => navigation.goBack());
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      // AuthContext resets the navigator to Login
    } catch {
      setLoading(false);
    }
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={dismiss}>

      {/* ── Dim overlay ─────────────────────────────────────────────────────── */}
      <TouchableWithoutFeedback onPress={dismiss}>
        <Animated.View style={[s.overlay, { opacity: bgAnim }]} />
      </TouchableWithoutFeedback>

      {/* ── Sheet ───────────────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          s.sheet,
          { paddingBottom: Math.max(insets.bottom, 24) + 8 },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Drag handle */}
        <View style={s.handle} />

        {/* Title */}
        <Text style={s.title}>Log Out?</Text>

        {/* Subtitle */}
        <Text style={s.subtitle}>
          You will need to log back in to accept rides.
        </Text>

        {/* Online warning banner (only when driver is active) */}
        {isOnline && (
          <View style={s.warnBox}>
            <TriangleAlert size={18} color={WARN_ICO} strokeWidth={2} />
            <Text style={s.warnText}>
              You are currently online. Going offline before logging out.
            </Text>
          </View>
        )}

        {/* Log Out button */}
        <TouchableOpacity
          style={[s.logoutBtn, loading && s.logoutBtnDisabled]}
          onPress={handleLogout}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading
            ? <ActivityIndicator color={WHITE} size="small" />
            : <Text style={s.logoutBtnText}>Log Out</Text>
          }
        </TouchableOpacity>

        {/* Cancel button */}
        <TouchableOpacity
          style={s.cancelBtn}
          onPress={dismiss}
          activeOpacity={0.75}
        >
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  // ── overlay ────────────────────────────────────────────────────────────────
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },

  // ── sheet ──────────────────────────────────────────────────────────────────
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
      android: { elevation: 20 },
    }),
  },

  // ── drag handle ────────────────────────────────────────────────────────────
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: HANDLE,
    marginBottom: 8,
  },

  // ── text ───────────────────────────────────────────────────────────────────
  title: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 24,
    lineHeight: 32,
    color: DARK,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 22,
    color: MUTED,
    textAlign: 'center',
  },

  // ── warning banner ─────────────────────────────────────────────────────────
  warnBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: WARN_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  warnText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 20,
    color: WARN_TEXT,
    flex: 1,
  },

  // ── Log Out button ─────────────────────────────────────────────────────────
  logoutBtn: {
    width: '100%',
    height: 56,
    borderRadius: 14,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: RED,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  logoutBtnDisabled: {
    backgroundColor: '#F87171',
    shadowOpacity: 0,
  },
  logoutBtnText: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 17,
    color: WHITE,
    letterSpacing: 0.2,
  },

  // ── Cancel button ──────────────────────────────────────────────────────────
  cancelBtn: {
    width: '100%',
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: PURPLE,
  },
});
