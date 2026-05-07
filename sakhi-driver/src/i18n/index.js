import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './translations/en.json';
import kn from './translations/kn.json';

const LANGUAGE_KEY = 'sakhi_driver_language';

// In-memory fallback so language survives navigation without AsyncStorage
let _currentLang = 'en';

async function getStoredLanguage() {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (stored) _currentLang = stored;
    return _currentLang;
  } catch {
    return _currentLang;
  }
}

export async function setLanguage(lang) {
  _currentLang = lang; // Update in-memory first — instant, no I/O
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  } catch (e) {
    console.warn('[i18n] Could not persist language:', e?.message);
  }
}

export async function initI18n() {
  // Guard: if already initialized, just re-apply the persisted language
  if (i18n.isInitialized) {
    const lang = await getStoredLanguage();
    if (i18n.language !== lang) await i18n.changeLanguage(lang);
    return i18n;
  }

  const storedLang = await getStoredLanguage();

  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        kn: { translation: kn },
      },
      lng: storedLang,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v3',
    });

  return i18n;
}

export default i18n;
