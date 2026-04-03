import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// ── Design tokens ─────────────────────────────────────────────────────────────
const PURPLE = '#BEA3D8';
const DARK   = '#1C1A25';
const MUTED  = '#7B7487';
const WHITE  = '#FFFFFF';
const BG     = '#F5F0FF';

/**
 * SakhiCard — elevated container component with optional sub-components.
 *
 * Props:
 *  children
 *  onPress   (fn)     — makes the card tappable
 *  style     (ViewStyle)
 *  variant   'default' | 'outlined' | 'filled' | 'lavender'
 *  padding   'sm' | 'md' | 'lg'
 *
 * Static sub-components:
 *  SakhiCard.Row      — horizontal flex row
 *  SakhiCard.Title    — bold title text
 *  SakhiCard.Subtitle — muted subtitle text
 *  SakhiCard.Divider  — thin horizontal line
 *  SakhiCard.Badge    — small pill label
 */
export default function SakhiCard({
  children,
  onPress,
  style,
  variant = 'default',
  padding = 'md',
}) {
  const Container  = onPress ? TouchableOpacity : View;
  const extraProps = onPress ? { activeOpacity: 0.88, onPress } : {};

  return (
    <Container
      style={[
        styles.base,
        VARIANT_STYLES[variant],
        PADDING_STYLES[padding],
        style,
      ]}
      {...extraProps}
    >
      {children}
    </Container>
  );
}

SakhiCard.Row = function CardRow({ children, style }) {
  return <View style={[styles.row, style]}>{children}</View>;
};

SakhiCard.Title = function CardTitle({ children, style }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
};

SakhiCard.Subtitle = function CardSubtitle({ children, style }) {
  return <Text style={[styles.subtitle, style]}>{children}</Text>;
};

SakhiCard.Divider = function CardDivider() {
  return <View style={styles.divider} />;
};

SakhiCard.Badge = function CardBadge({ label, color }) {
  return (
    <View style={[styles.badge, color && { backgroundColor: color + '22', borderColor: color + '44' }]}>
      <Text style={[styles.badgeText, color && { color }]}>{label}</Text>
    </View>
  );
};

// ── Variant & Padding maps ────────────────────────────────────────────────────
const VARIANT_STYLES = {
  default: {
    backgroundColor: WHITE,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  outlined: {
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: 'rgba(190,163,216,0.30)',
  },
  filled: {
    backgroundColor: BG,
  },
  lavender: {
    backgroundColor: '#F0ECFA',
    borderWidth: 1,
    borderColor: 'rgba(190,163,216,0.25)',
  },
};

const PADDING_STYLES = {
  sm: { padding: 10 },
  md: { padding: 16 },
  lg: { padding: 20 },
};

const styles = StyleSheet.create({
  base:     { borderRadius: 16 },
  row:      { flexDirection: 'row', alignItems: 'center' },
  title:    { fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 4 },
  subtitle: { fontSize: 13, color: MUTED },
  divider: {
    height: 1,
    backgroundColor: 'rgba(190,163,216,0.20)',
    marginVertical: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 9999,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: 'rgba(190,163,216,0.30)',
  },
  badgeText: {
    fontSize: 10, fontWeight: '700',
    color: PURPLE,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
});
