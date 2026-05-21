'use strict';

/**
 * NavAppChooserModal.js
 *
 * Bottom-sheet modal that lets the driver pick a navigation app.
 * Matches the Sakhi Design System: purple/violet palette, Inter font, glass cards.
 *
 * Props:
 *   visible          {bool}
 *   onClose          {Function}
 *   onChoose         {Function(appId: string)}
 *   availableApps    {Array<{ id, label, available }>}  — from useExternalNavigation
 *   coords           {{ lat, lng }}
 *   destinationLabel {string}
 */

import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, Dimensions, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import navigationService from '../services/navigationService';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = 340;

const APP_META = {
  google_maps: {
    icon:  'google-maps',
    color: '#4285F4',
    bg:    '#EBF2FF',
  },
  waze: {
    icon:  'waze',
    color: '#26CAAD',
    bg:    '#E6F9F5',
  },
  browser: {
    icon:  'web',
    color: '#6D28D9',
    bg:    '#EDE9FE',
  },
};

export default function NavAppChooserModal({
  visible,
  onClose,
  onChoose,
  availableApps = [],
  coords,
  destinationLabel,
}) {
  const insets    = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SHEET_H)).current;
  const bgAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
        Animated.timing(bgAnim,   { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SHEET_H, duration: 220, useNativeDriver: true }),
        Animated.timing(bgAnim,    { toValue: 0,       duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleShare = async () => {
    const { lat, lng } = coords ?? {};
    if (!navigationService.isValidCoords(lat, lng)) return;
    const url = navigationService.buildShareableRouteURL({ toLat: lat, toLng: lng, label: destinationLabel });
    try {
      await Share.share({
        message: `Navigate to ${destinationLabel || 'destination'}: ${url}`,
        url,
        title: 'Share Route',
      });
    } catch {
      // User cancelled share — ignore
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      {/* Overlay */}
      <Animated.View
        style={[s.overlay, { opacity: bgAnim }]}
        onTouchEnd={onClose}
      />

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          s.sheet,
          { paddingBottom: Math.max(insets.bottom, 24) },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle */}
        <View style={s.handleWrap}>
          <View style={s.handle} />
        </View>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Navigate To</Text>
            {destinationLabel ? (
              <Text style={s.subtitle} numberOfLines={1}>{destinationLabel}</Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Feather name="x" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* App List */}
        <View style={s.appList}>
          {availableApps.map((app) => {
            const meta = APP_META[app.id] ?? APP_META.browser;
            return (
              <TouchableOpacity
                key={app.id}
                style={[s.appRow, !app.available && s.appRowDisabled]}
                onPress={() => app.available && onChoose(app.id)}
                activeOpacity={0.7}
                disabled={!app.available}
              >
                <View style={[s.appIconWrap, { backgroundColor: meta.bg }]}>
                  <MaterialCommunityIcons name={meta.icon} size={24} color={meta.color} />
                </View>
                <View style={s.appTextWrap}>
                  <Text style={[s.appLabel, !app.available && s.appLabelDisabled]}>
                    {app.label}
                  </Text>
                  {!app.available && (
                    <Text style={s.appSubtext}>Not installed</Text>
                  )}
                </View>
                <Feather
                  name="chevron-right"
                  size={18}
                  color={app.available ? '#BEA3D8' : '#CBD5E1'}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Share Route */}
        <TouchableOpacity style={s.shareBtn} onPress={handleShare} activeOpacity={0.8}>
          <Feather name="share-2" size={16} color="#590DA2" />
          <Text style={s.shareBtnText}>Share Route Link</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 26, 37, 0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: SHEET_H,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 0,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 20,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E0EF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 18,
    color: '#1E1B2E',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    maxWidth: 250,
  },
  closeBtn: {
    padding: 4,
  },

  // App rows
  appList: {
    gap: 8,
    marginBottom: 20,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F8F6FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    gap: 14,
  },
  appRowDisabled: {
    opacity: 0.45,
  },
  appIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appTextWrap: {
    flex: 1,
  },
  appLabel: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 15,
    color: '#1E1B2E',
  },
  appLabelDisabled: {
    color: '#94A3B8',
  },
  appSubtext: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },

  // Share button
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BEA3D8',
    backgroundColor: '#F5F0FF',
  },
  shareBtnText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#590DA2',
  },
});
