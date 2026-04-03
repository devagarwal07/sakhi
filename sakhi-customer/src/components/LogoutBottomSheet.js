import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Modal, TouchableWithoutFeedback,
  ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const WHITE   = '#FFFFFF';
const DARK    = '#1E1B2E';
const MUTED   = '#6B7280';
const RED     = '#DC2626';
const PURPLE  = '#BEA3D8';
const BORDER  = 'rgba(190,163,216,0.35)';
const HANDLE  = '#E5E7EB';

export default function LogoutBottomSheet({ visible, onClose, onLogout }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const slideAnim = useRef(new Animated.Value(400)).current;
  const bgAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setLoading(false);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0, friction: 9, tension: 70, useNativeDriver: true,
        }),
        Animated.timing(bgAnim, {
          toValue: 0.55, duration: 280, useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset immediately when visibility goes totally false externally
      slideAnim.setValue(400);
      bgAnim.setValue(0);
    }
  }, [visible]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 500, duration: 220, useNativeDriver: true,
      }),
      Animated.timing(bgAnim, {
        toValue: 0, duration: 220, useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await onLogout();
    } catch {
      setLoading(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={dismiss}>
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
          You will need to log back in to use the app.
        </Text>

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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
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
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: HANDLE,
    marginBottom: 8,
  },
  title: {
    fontWeight: '800',
    fontSize: 24,
    lineHeight: 32,
    color: DARK,
    textAlign: 'center',
  },
  subtitle: {
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 22,
    color: MUTED,
    textAlign: 'center',
  },
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
    fontWeight: '800',
    fontSize: 17,
    color: WHITE,
    letterSpacing: 0.2,
  },
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
    fontWeight: '700',
    fontSize: 16,
    color: PURPLE,
  },
});