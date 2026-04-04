import React from 'react';
import {
  View, TextInput, Text, StyleSheet, TouchableOpacity,
} from 'react-native';

// ── Design tokens ─────────────────────────────────────────────────────────────
const PURPLE   = '#BEA3D8';
const DARK     = '#1E1B2E';
const MUTED    = '#94A3B8';
const BG       = '#F5F0FF';
const WHITE    = '#FFFFFF';
const ERROR    = '#BA1A1A';

/**
 * SakhiInput — themed text input with label, icons, and error state.
 *
 * Props:
 *  label            (string)    — uppercase label above input
 *  value            (string)
 *  onChangeText     (fn)
 *  placeholder      (string)
 *  icon             (string)    — left emoji icon
 *  rightIcon        (string)    — right emoji icon (e.g. 👁 for password reveal)
 *  onRightIconPress (fn)
 *  error            (string)    — red error message below
 *  editable         (bool)      — default true
 *  secureTextEntry  (bool)
 *  keyboardType
 *  multiline        (bool)
 *  numberOfLines    (number)
 *  style            (ViewStyle) — container override
 *  inputStyle       (TextStyle)
 *  ...rest          — passed through to TextInput
 */
export default function SakhiInput({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  rightIcon,
  onRightIconPress,
  error,
  editable         = true,
  secureTextEntry  = false,
  keyboardType     = 'default',
  multiline        = false,
  numberOfLines    = 1,
  style,
  inputStyle,
  ...rest
}) {
  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[
        styles.inputRow,
        !editable && styles.inputRowDisabled,
        error     && styles.inputRowError,
      ]}>
        {icon ? <Text style={styles.leftIcon}>{icon}</Text> : null}
        <TextInput
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={MUTED}
          editable={editable}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...rest}
        />
        {rightIcon ? (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIconBtn}>
            <Text style={styles.rightIcon}>{rightIcon}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    fontSize: 11, fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase', letterSpacing: 0.8, paddingLeft: 2,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: WHITE,
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1.5, borderColor: 'rgba(190,163,216,0.3)',
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 2,
  },
  inputRowDisabled: { backgroundColor: BG, opacity: 0.65 },
  inputRowError:    { borderColor: ERROR },
  leftIcon:         { fontSize: 18 },
  input: {
    flex: 1, fontSize: 15, color: DARK, fontWeight: '500',
  },
  inputMultiline: { minHeight: 80, paddingTop: 4 },
  rightIconBtn:   { padding: 4 },
  rightIcon:      { fontSize: 18, color: MUTED },
  errorText: {
    fontSize: 12, color: ERROR, paddingLeft: 2, marginTop: -2,
  },
});
