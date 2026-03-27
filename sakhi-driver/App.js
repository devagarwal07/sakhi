import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { Colors } from './src/utils/theme';

// ── Screens ──────────────────────────────────────────────────────────────────
import DriverSplashScreen from './src/screens/Auth/DriverSplashScreen';

// Auth screens
import DriverLoginScreen            from './src/screens/Auth/DriverLoginScreen';
import DriverOtpVerificationScreen  from './src/screens/Auth/DriverOtpVerificationScreen';
import ChangePhoneNumberInputScreen from './src/screens/Auth/ChangePhoneNumberInputScreen';
import ChangePhoneNumberOtpVerificationScreen from './src/screens/Auth/ChangePhoneNumberOtpVerificationScreen';

// Onboarding screens (Prompt 4 will fill these in)
const GenderVerificationScreen  = () => null;
const DriverKycUploadScreen     = () => null;
const VehicleDetailsEntryScreen = () => null;
const VerificationLoadingScreen = () => null;
const DocumentUnderReviewScreen = () => null;
const DocumentReUploadScreen    = () => null;
const AccountApprovedScreen     = () => null;

// Main Tab / Home (Prompt 5 will fill this in)
const DriverHomeScreen = () => null;

// ── Navigators ────────────────────────────────────────────────────────────────
const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverLogin"       component={DriverLoginScreen}  />
      <Stack.Screen name="DriverOtp"         component={DriverOtpVerificationScreen} />
      <Stack.Screen name="ChangePhoneInput"  component={ChangePhoneNumberInputScreen} />
      <Stack.Screen name="ChangePhoneOtp"    component={ChangePhoneNumberOtpVerificationScreen} />
    </Stack.Navigator>
  );
}

function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GenderVerification"   component={GenderVerificationScreen}  />
      <Stack.Screen name="DriverKycUpload"      component={DriverKycUploadScreen}      />
      <Stack.Screen name="VehicleDetailsEntry"  component={VehicleDetailsEntryScreen}  />
      <Stack.Screen name="VerificationLoading"  component={VerificationLoadingScreen}  />
      <Stack.Screen name="DocumentUnderReview"  component={DocumentUnderReviewScreen}  />
      <Stack.Screen name="DocumentReUpload"     component={DocumentReUploadScreen}     />
      <Stack.Screen name="AccountApproved"      component={AccountApprovedScreen}      />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
    </Stack.Navigator>
  );
}

// ── Root navigator — picks stack based on auth state ─────────────────────────
function RootNavigator() {
  const { isLoading, isAuthenticated, driver } = useAuth();

  // Show full-screen loader while checkAuth() is running
  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primaryContainer} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthStack />;
  }

  // Authenticated but onboarding not complete → Onboarding flow
  const onboardingComplete = driver?.onboarding_status === 'approved';
  if (!onboardingComplete) {
    return <OnboardingStack />;
  }

  // Fully approved driver → Main app
  return <MainStack />;
}

// ── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          {/* Splash screen sits outside the RootNavigator so it always
              shows first before checkAuth completes */}
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Splash"    component={DriverSplashScreen} />
            <Stack.Screen name="RootShell" component={RootNavigator}       />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
