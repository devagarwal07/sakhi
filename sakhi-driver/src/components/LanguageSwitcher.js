import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
];

/**
 * LanguageSwitcher — Modal selector for app language.
 *
 * Usage:
 *   const [showLang, setShowLang] = useState(false);
 *   <LanguageSwitcher visible={showLang} onClose={() => setShowLang(false)} />
 */
export default function LanguageSwitcher({ visible, onClose }) {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language;

  const handleSelect = async (code) => {
    console.log('[i18n] Switching to:', code);
    await setLanguage(code);
    console.log('[i18n] Language is now:', i18n.language);
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={s.backdrop} onPress={onClose}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>{t('language.selectLanguage')}</Text>

          {LANGUAGES.map((lang) => {
            const isActive = currentLang === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[s.row, isActive && s.rowActive]}
                onPress={() => handleSelect(lang.code)}
                activeOpacity={0.75}
              >
                <View style={s.textCol}>
                  <Text style={[s.langName, isActive && s.langNameActive]}>
                    {lang.native}
                  </Text>
                  <Text style={s.langSub}>{lang.label}</Text>
                </View>
                {isActive && (
                  <View style={s.checkCircle}>
                    <Text style={s.checkMark}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    gap: 8,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#C4B5E9', alignSelf: 'center', marginBottom: 16,
  },
  title: {
    fontSize: 16, fontWeight: '700', color: '#1E1B2E',
    marginBottom: 8, letterSpacing: -0.3,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 14, gap: 14,
    borderWidth: 1.5, borderColor: 'transparent',
    backgroundColor: '#F5F0FF',
    marginBottom: 6,
  },
  rowActive: {
    borderColor: '#BEA3D8',
    backgroundColor: '#EDE9FE',
  },
  textCol: { flex: 1, gap: 1 },
  langName: {
    fontSize: 15, fontWeight: '700', color: '#1E1B2E', letterSpacing: -0.2,
  },
  langNameActive: { color: '#BEA3D8' },
  langSub: { fontSize: 12, fontWeight: '400', color: '#94A3B8' },
  checkCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#BEA3D8', alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});
