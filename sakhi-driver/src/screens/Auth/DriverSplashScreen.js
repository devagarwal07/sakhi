import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

export default function DriverSplashScreen({ navigation }) {
  const { t } = useTranslation();
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentScale   = useRef(new Animated.Value(0.92)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const progressWidth  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Fade + scale the logo cluster in
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1, duration: 600, useNativeDriver: true,
      }),
      Animated.spring(contentScale, {
        toValue: 1, tension: 60, friction: 8, useNativeDriver: true,
      }),
    ]).start();

    // 2. Tagline fades in after 500 ms
    setTimeout(() => {
      Animated.timing(taglineOpacity, {
        toValue: 1, duration: 500, useNativeDriver: true,
      }).start();
    }, 500);

    // 3. Progress bar fills over 2.2 s
    Animated.timing(progressWidth, {
      toValue: 192,      // final pixel width matching progressTrack
      duration: 2200,
      delay: 200,
      useNativeDriver: false,
    }).start();

    // 4. Navigate to shell
    const timer = setTimeout(() => {
      navigation.replace('RootShell');
    }, 2700);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />


      {/* ── Center cluster: logo → FOR DRIVERS → tagline ── */}
      <View style={styles.cluster}>
        <Animated.View
          style={[
            styles.logoWrap,
            { opacity: contentOpacity, transform: [{ scale: contentScale }] },
          ]}
        >
          <Image
            source={require('../../../assets/splash-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.Text
          style={[styles.forDrivers, { opacity: contentOpacity }]}
        >
          FOR DRIVERS
        </Animated.Text>

        <Animated.Text
          style={[styles.tagline, { opacity: taglineOpacity }]}
        >
          Drive. Earn. Empower.
        </Animated.Text>
      </View>

      {/* ── Bottom progress bar ── */}
      <View style={styles.progressTrack} pointerEvents="none">
        <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },


  // All center content in one flexbox column (no absolute positioning)
  cluster: {
    alignItems: 'center',
    gap: 14,
  },

  logoWrap: {
    alignItems: 'center',
    marginBottom: 4,
  },
  logo: {
    width: 210,
    height: 175,
  },

  forDrivers: {
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 2.8,
    textTransform: 'uppercase',
    color: '#A78BFA',
  },

  tagline: {
    fontStyle: 'italic',
    fontWeight: '300',
    fontSize: 18,
    letterSpacing: 0.45,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
    marginTop: 6,
  },

  // Progress bar — anchored 96 px from the bottom
  progressTrack: {
    position: 'absolute',
    bottom: 96,
    left: (width - 192) / 2,
    width: 192,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#A78BFA',
  },
});
