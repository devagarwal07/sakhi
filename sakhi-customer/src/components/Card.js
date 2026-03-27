import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, BorderRadius, Shadows } from '../utils/theme';

/**
 * Card component — basic elevated container.
 * Props:
 *  - children
 *  - onPress (makes it tappable)
 *  - style
 *  - variant: 'default' | 'outlined' | 'filled'
 *  - padding: 'sm' | 'md' | 'lg'
 */
export default function Card({
    children,
    onPress,
    style,
    variant = 'default',
    padding = 'md',
}) {
    const Container = onPress ? TouchableOpacity : View;
    const props = onPress ? { activeOpacity: 0.85, onPress } : {};

    return (
        <Container
            style={[
                styles.base,
                VARIANT_STYLES[variant],
                PADDING_STYLES[padding],
                style,
            ]}
            {...props}
        >
            {children}
        </Container>
    );
}

Card.Row = function CardRow({ children, style }) {
    return <View style={[styles.row, style]}>{children}</View>;
};

Card.Title = function CardTitle({ children, style }) {
    return <Text style={[styles.title, style]}>{children}</Text>;
};

Card.Subtitle = function CardSubtitle({ children, style }) {
    return <Text style={[styles.subtitle, style]}>{children}</Text>;
};

Card.Divider = function CardDivider() {
    return <View style={styles.divider} />;
};

const VARIANT_STYLES = {
    default: {
        backgroundColor: Colors.surfaceContainerLowest,
        ...Shadows.card,
    },
    outlined: {
        backgroundColor: Colors.surfaceContainerLowest,
        borderWidth: 1.5,
        borderColor: Colors.outlineVariant,
    },
    filled: {
        backgroundColor: Colors.surfaceContainerLow,
    },
};

const PADDING_STYLES = {
    sm: { padding: 10 },
    md: { padding: 16 },
    lg: { padding: 20 },
};

const styles = StyleSheet.create({
    base: { borderRadius: BorderRadius.lg },
    row: { flexDirection: 'row', alignItems: 'center' },
    title: { fontSize: 15, fontWeight: '700', color: Colors.onBackground, marginBottom: 4 },
    subtitle: { fontSize: 13, color: Colors.onSurfaceVariant },
    divider: {
        height: 1,
        backgroundColor: Colors.outlineVariant,
        marginVertical: 10,
    },
});
