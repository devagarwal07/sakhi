import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

/**
 * Renders a circular avatar with a photo URI, or a lavender
 * monogram initial if no photo is available.
 *
 * Props:
 *   uri       - image URI (optional)
 *   name      - rider/driver name to derive initial from
 *   size      - diameter in px (default 52)
 *   radius    - borderRadius (default size/2 for circle, pass a fixed number for squircle)
 *   style     - optional extra style for the container View
 */
export default function MonogramAvatar({ uri, name, size = 52, radius, style }) {
  const r = radius !== undefined ? radius : size / 2;
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: r,
    backgroundColor: '#EDE9FE',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  };

  const textStyle = {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: size * 0.38,
    color: '#7C3AED',
    lineHeight: size * 0.45,
  };

  return (
    <View style={[containerStyle, style]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <Text style={textStyle}>{initial}</Text>
      )}
    </View>
  );
}
