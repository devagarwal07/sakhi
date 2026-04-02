/**
 * SakhiModal — Reusable in-app alert/confirm modal
 * Ported from sakhi-customer. Matches the Sakhi design system (lavender/purple palette).
 *
 * Usage:
 *   const [modal, setModal] = useState(null);
 *
 *   // Show an info modal:
 *   setModal({
 *     icon: '🔔',
 *     title: 'Title',
 *     message: 'Body text here.',
 *     buttons: [{ text: 'OK', onPress: () => setModal(null) }],
 *   });
 *
 *   // Show confirm/destructive:
 *   setModal({
 *     icon: '⚠️',
 *     title: 'Cancel Ride?',
 *     message: 'You will lose your booking.',
 *     buttons: [
 *       { text: 'Keep Ride', style: 'cancel', onPress: () => setModal(null) },
 *       { text: 'Yes, Cancel', style: 'destructive', onPress: () => { setModal(null); doCancel(); } },
 *     ],
 *   });
 *
 *   <SakhiModal config={modal} onClose={() => setModal(null)} />
 */

import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function SakhiModal({ config, onClose }) {
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const visible = !!config;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 220 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.88);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  if (!config) return null;

  const { icon, title, message, buttons = [] } = config;

  const handlePress = (btn) => {
    if (btn.onPress) btn.onPress();
    else if (onClose) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Card */}
      <View style={styles.centeredView} pointerEvents="box-none">
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>

          {/* Icon badge */}
          {icon ? (
            <View style={styles.iconBadge}>
              <Text style={styles.iconText}>{icon}</Text>
            </View>
          ) : null}

          {/* Title */}
          {title ? <Text style={styles.title}>{title}</Text> : null}

          {/* Message */}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {/* Buttons */}
          <View style={[styles.buttonsRow, buttons.length === 1 && styles.buttonsSingle]}>
            {buttons.map((btn, i) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel      = btn.style === 'cancel';
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.btn,
                    buttons.length === 1 && styles.btnFull,
                    isDestructive && styles.btnDestructive,
                    isCancel      && styles.btnCancel,
                    !isDestructive && !isCancel && styles.btnPrimary,
                  ]}
                  onPress={() => handlePress(btn)}
                  activeOpacity={0.82}
                >
                  <Text style={[
                    styles.btnText,
                    isDestructive && styles.btnTextDestructive,
                    isCancel      && styles.btnTextCancel,
                    !isDestructive && !isCancel && styles.btnTextPrimary,
                  ]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 26, 37, 0.55)',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#BEA3D8',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 20,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F5F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: { fontSize: 26 },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1A25',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '400',
    color: '#4A4455',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  buttonsSingle: { flexDirection: 'column' },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  btnFull: { flex: undefined, width: '100%' },
  btnPrimary:     { backgroundColor: '#BEA3D8' },
  btnCancel:      { backgroundColor: '#F5F0FF' },
  btnDestructive: { backgroundColor: '#FFF0EF', borderWidth: 1.5, borderColor: '#FECACA' },
  btnText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  btnTextPrimary:     { color: '#FFFFFF' },
  btnTextCancel:      { color: '#4A4455' },
  btnTextDestructive: { color: '#DC2626' },
});
