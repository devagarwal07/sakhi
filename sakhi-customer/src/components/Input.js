import React from 'react';
import {
    View, TextInput, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { Colors, BorderRadius, Shadows } from '../utils/theme';

/**
 * Reusable Input component. Props:
 *  - label (string)
 *  - value, onChangeText
 *  - placeholder
 *  - icon (emoji string displayed on the left)
 *  - rightIcon (emoji string displayed on the right — e.g., for clear/reveal buttons)
 *  - onRightIconPress
 *  - error (string — shows error message below)
 *  - editable (bool)
 *  - secureTextEntry
 *  - keyboardType
 *  - multiline + numberOfLines
 *  - style (container override)
 */
export default function Input({
    label,
    value,
    onChangeText,
    placeholder,
    icon,
    rightIcon,
    onRightIconPress,
    error,
    editable = true,
    secureTextEntry = false,
    keyboardType = 'default',
    multiline = false,
    numberOfLines = 1,
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
                error && styles.inputRowError,
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
                    placeholderTextColor={Colors.outline}
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
        color: Colors.onSurfaceVariant,
        textTransform: 'uppercase', letterSpacing: 0.8, paddingLeft: 2,
    },
    inputRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: Colors.surfaceContainerLowest,
        borderRadius: BorderRadius.md,
        paddingHorizontal: 14, paddingVertical: 13,
        borderWidth: 1.5, borderColor: Colors.outlineVariant,
        ...Shadows.card,
    },
    inputRowDisabled: {
        backgroundColor: Colors.surfaceContainerLow, opacity: 0.65,
    },
    inputRowError: { borderColor: Colors.error },
    leftIcon: { fontSize: 18 },
    input: {
        flex: 1, fontSize: 15, color: Colors.onSurface, fontWeight: '500',
    },
    inputMultiline: { minHeight: 80, paddingTop: 4 },
    rightIconBtn: { padding: 4 },
    rightIcon: { fontSize: 18, color: Colors.onSurfaceVariant },
    errorText: {
        fontSize: 12, color: Colors.error, paddingLeft: 2, marginTop: -2,
    },
});
