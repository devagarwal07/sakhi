/**
 * SakhiLogoutConfirmationSheet
 * Modal bottom-sheet confirming logout. Shown from sidebar or profile menu.
 * Usage: navigation.navigate('LogoutConfirmation')
 */
import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Modal, TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { Colors, Shadows, Radius, Spacing } from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';

export default function SakhiLogoutConfirmationSheet({ navigation }) {
  const { logout } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const bgAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
      Animated.timing(bgAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
      Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => navigation.goBack());
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      // AuthContext will redirect to Login via navigation reset
    } catch {
      setLoading(false);
    }
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={dismiss}>
      {/* Dim overlay */}
      <TouchableWithoutFeedback onPress={dismiss}>
        <Animated.View style={[styles.overlay, { opacity: bgAnim }]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle bar */}
        <View style={styles.handle} />

        {/* Danger icon */}
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>👋</Text>
        </View>

        <Text style={styles.title}>Log Out?</Text>
        <Text style={styles.subtitle}>
          You'll be signed out of your driver account. You'll need to log back in to accept rides.
        </Text>

        {/* Actions */}
        <TouchableOpacity
          style={[styles.logoutBtn, loading && styles.logoutBtnDisabled]}
          onPress={handleLogout}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.logoutBtnText}>Yes, Log Me Out</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={dismiss} activeOpacity={0.7}>
          <Text style={styles.cancelBtnText}>Cancel — Stay Signed In</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg, paddingBottom: 40, paddingTop: 12,
    alignItems: 'center', gap: 12, ...Shadows.lavender,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.outlineVariant, marginBottom: 8,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.surfaceLow,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 36 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.onSurface },
  subtitle: {
    fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22,
  },
  logoutBtn: {
    width: '100%', height: 56, borderRadius: Radius.lg,
    backgroundColor: '#DC2626',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#DC2626', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  logoutBtnDisabled: { backgroundColor: Colors.outlineVariant },
  logoutBtnText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  cancelBtn: {
    width: '100%', height: 50, borderRadius: Radius.lg, borderWidth: 1.5,
    borderColor: Colors.outlineVariant, alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: Colors.onSurfaceVariant },
});
