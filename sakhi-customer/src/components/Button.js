import React from 'react';
import {
    TouchableOpacity, Text, ActivityIndicator, StyleSheet, View,
} from 'react-native';
import { Colors, BorderRadius, Shadows } from '../utils/theme';

/**
 * Primary CTA button. Props:
 *  - title (string)
 *  - onPress (fn)
 *  - loading (bool)
 *  - disabled (bool)
 *  - variant: 'primary' | 'outline' | 'ghost' | 'danger'
 *  - size: 'sm' | 'md' | 'lg'
 *  - icon (string emoji, rendered before title)
 *  - style (override)
 */
export default function Button({
    title,
    onPress,
    loading = false,
    disabled = false,
    variant = 'primary',
    size = 'md',
    icon,
    style,
    textStyle,
}) {
    const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md;
    const variantStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
    const variantTextStyle = VARIANT_TEXT[variant] || VARIANT_TEXT.primary;

    return (
        <TouchableOpacity
            style={[
                styles.base,
                sizeStyle.wrapper,
                variantStyle,
                (disabled || loading) && styles.disabled,
                style,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.85}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === 'outline' || variant === 'ghost' ? Colors.primaryContainer : Colors.onPrimary}
                    size="small"
                />
            ) : (
                <View style={styles.inner}>
                    {icon && <Text style={[sizeStyle.icon]}>{icon}</Text>}
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
        wrapper: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: BorderRadius.sm },
        text: { fontSize: 13 },
        icon: { fontSize: 14 },
    },
    md: {
        wrapper: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: BorderRadius.md },
        text: { fontSize: 15 },
        icon: { fontSize: 16 },
    },
    lg: {
        wrapper: { paddingVertical: 17, paddingHorizontal: 24, borderRadius: BorderRadius.md },
        text: { fontSize: 17 },
        icon: { fontSize: 18 },
    },
};

const VARIANT_STYLES = {
    primary: { backgroundColor: Colors.primaryContainer, ...Shadows.editorial },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: Colors.primaryContainer,
    },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: '#dc2626', ...Shadows.card },
};

const VARIANT_TEXT = {
    primary: { color: Colors.onPrimary },
    outline: { color: Colors.primaryContainer },
    ghost: { color: Colors.primaryContainer },
    danger: { color: '#fff' },
};

const styles = StyleSheet.create({
    base: { alignItems: 'center', justifyContent: 'center' },
    inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    text: { fontWeight: '700', letterSpacing: -0.2 },
    disabled: { opacity: 0.55 },
});
