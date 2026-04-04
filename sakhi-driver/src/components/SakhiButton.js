import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator, StyleSheet, View,
} from 'react-native';

// ── Design Tokens ─────────────────────────────────────────────────────────────
const PURPLE = '#BEA3D8';
const DEEP   = '#BEA3D8';
const WHITE  = '#FFFFFF';
const BG     = '#F5F0FF';
const DANGER = '#DC2626';

/**
 * SakhiButton — themed CTA button.
 *
 * Props:
 *  title     (string)    — button label
 *  onPress   (fn)
 *  loading   (bool)      — shows spinner, disables press
 *  disabled  (bool)
 *  variant   'primary' | 'outline' | 'ghost' | 'danger'
 *  size      'sm' | 'md' | 'lg'
 *  icon      (string)    — emoji rendered before the title
 *  style     (ViewStyle) — outer container override
 *  textStyle (TextStyle) — label override
 */
export default function SakhiButton({
  title,
  onPress,
  loading  = false,
  disabled = false,
  variant  = 'primary',
  size     = 'md',
  icon,
  style,
  textStyle,
}) {
  const sizeStyle        = SIZE_STYLES[size]  || SIZE_STYLES.md;
  const variantStyle     = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const variantTextStyle = VARIANT_TEXT[variant]   || VARIANT_TEXT.primary;

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        sizeStyle.wrapper,
        variantStyle,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? PURPLE : WHITE}
          size="small"
        />
      ) : (
        <View style={styles.inner}>
          {icon && <Text style={sizeStyle.icon}>{icon}</Text>}
          <Text style={[styles.text, sizeStyle.text, variantTextStyle, textStyle]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const SIZE_STYLES = {
  sm: {
    wrapper: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
    text:    { fontSize: 13 },
    icon:    { fontSize: 14 },
  },
  md: {
    wrapper: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12 },
    text:    { fontSize: 15 },
    icon:    { fontSize: 16 },
  },
  lg: {
    wrapper: { paddingVertical: 17, paddingHorizontal: 24, borderRadius: 14 },
    text:    { fontSize: 17 },
    icon:    { fontSize: 18 },
  },
};

const VARIANT_STYLES = {
  primary: {
    backgroundColor: PURPLE,
    shadowColor: DEEP,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: PURPLE,
  },
  ghost:  { backgroundColor: 'transparent' },
  danger: {
    backgroundColor: DANGER,
    shadowColor: DANGER,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 8,
    elevation: 4,
  },
};

const VARIANT_TEXT = {
  primary: { color: WHITE },
  outline: { color: PURPLE },
  ghost:   { color: PURPLE },
  danger:  { color: WHITE },
};

const styles = StyleSheet.create({
  base:     { alignItems: 'center', justifyContent: 'center' },
  inner:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text:     { fontWeight: '700', letterSpacing: -0.2 },
  disabled: { opacity: 0.55 },
});
