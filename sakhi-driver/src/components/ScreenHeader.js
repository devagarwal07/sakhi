import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';

const DEEP  = '#7C3AED';
const DARK  = '#1E1B2E';
const BG    = '#F5F0FF';

/** Fixed pixel height of the bar content (below the status bar). */
export const HEADER_HEIGHT = 56;

/**
 * Uniform top header used across every screen.
 * Renders IN-FLOW (not absolute) so content below it is never hidden.
 *
 * Props:
 *  title           – page title string
 *  onBack          – if provided, renders a back arrow button
 *  rightSlot       – optional JSX rendered on the right side
 *  backgroundColor – defaults to BG (#F5F0FF)
 */
export default function ScreenHeader({
  title,
  onBack,
  rightSlot,
  backgroundColor = BG,
}) {
  const insets = useSafeAreaInsets();
  const totalH = HEADER_HEIGHT + Math.max(insets.top, 0);

  return (
    <View
      style={[
        s.bar,
        { backgroundColor, paddingTop: Math.max(insets.top, 0), height: totalH },
      ]}
    >
      {/* Left: back button or empty spacer */}
      <View style={s.side}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={s.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color={DEEP} strokeWidth={2.5} />
          </TouchableOpacity>
        ) : (
          <View style={s.backBtn} />
        )}
      </View>

      {/* Centre: title */}
      <Text style={s.title} numberOfLines={1}>
        {title}
      </Text>

      {/* Right: optional action */}
      <View style={s.side}>
        {rightSlot ?? <View style={s.backBtn} />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    // IN-FLOW — not absolute. Content below will never be hidden.
    width: '100%',
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 10,
    paddingHorizontal: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  side: {
    width: 44,
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: DARK,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
});
