'use strict';

/**
 * StartNavigationButton.js
 *
 * Floating "Start Navigation" button — Uber/Ola style.
 * Renders a primary CTA that launches Google Maps directly,
 * plus a secondary "⌄" button that opens the nav app chooser.
 *
 * Props:
 *   coords           {{ lat, lng }}              — destination
 *   destinationLabel {string}
 *   rideId           {string}
 *   mode             {'d'|'w'}                  — default 'd'
 *   onNavigationStart  {Function}               — optional callback
 *   onAppResume        {Function}               — optional callback
 *   style            {ViewStyle}                — override container position
 *   disabled         {bool}
 */

import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import useExternalNavigation from '../hooks/useExternalNavigation';
import NavAppChooserModal from './NavAppChooserModal';

export default function StartNavigationButton({
  coords,
  destinationLabel,
  rideId,
  mode = 'd',
  onNavigationStart,
  onAppResume,
  style,
  disabled = false,
}) {
  const {
    availableApps,
    appChooserVisible,
    isNavigating,
    launching,
    launchGoogleMaps,
    showAppChooser,
    hideAppChooser,
    handleAppChoice,
  } = useExternalNavigation({
    rideId,
    coords,
    destinationLabel,
    mode,
    onNavigationStart,
    onAppResume,
  });

  return (
    <>
      <View style={[s.container, style]}>
        {/* ── Primary CTA: "Start Navigation" ──────────────────────────── */}
        <TouchableOpacity
          style={[s.primaryBtn, (disabled || launching) && s.primaryBtnDisabled]}
          onPress={launchGoogleMaps}
          activeOpacity={0.85}
          disabled={disabled || launching}
        >
          {launching ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <MaterialCommunityIcons name="google-maps" size={20} color="#FFFFFF" />
          )}
          <Text style={s.primaryBtnText}>
            {isNavigating ? 'Re-open Navigation' : 'Start Navigation'}
          </Text>
        </TouchableOpacity>

        {/* ── Secondary: chevron opens app chooser ─────────────────────── */}
        <TouchableOpacity
          style={[s.chevronBtn, (disabled || launching) && s.primaryBtnDisabled]}
          onPress={showAppChooser}
          activeOpacity={0.8}
          disabled={disabled || launching}
        >
          <Feather name="chevron-up" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ── App Chooser Modal ────────────────────────────────────────────── */}
      <NavAppChooserModal
        visible={appChooserVisible}
        onClose={hideAppChooser}
        onChoose={handleAppChoice}
        availableApps={availableApps}
        coords={coords}
        destinationLabel={destinationLabel}
      />
    </>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 2,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },

  // Primary button — rounded left
  primaryBtn: {
    flex: 1,
    height: 60,
    backgroundColor: '#4285F4',   // Google Blue — universally understood as "Maps"
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  primaryBtnDisabled: {
    opacity: 0.55,
  },
  primaryBtnText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  // Chevron button — rounded right, slightly darker
  chevronBtn: {
    width: 52,
    height: 60,
    backgroundColor: '#2B6ED4',
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
