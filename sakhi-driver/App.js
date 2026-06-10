import React, { useState, useRef, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, DeviceEventEmitter, LogBox } from 'react-native';

// ⚠️ Register Location Task globally before any UI renders
import './src/services/locationTask';

// Ignore Firebase namespaced API deprecation warnings
LogBox.ignoreLogs([
  'This method is deprecated (as well as all React Native Firebase namespaced API)',
]);
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { I18nextProvider } from 'react-i18next';
import i18n, { initI18n } from './src/i18n';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { Colors } from './src/utils/theme';
import PageLoader from './src/components/PageLoader';
import GlobalErrorModal from './src/components/GlobalErrorModal';
import { useRideRequestBridge } from './src/hooks/useRideRequestBridge';
import {
  setupForegroundHandler,
  setupNotificationTapHandler,
  getInitialNotificationDataAsync,
} from './src/services/notificationService';
import client from './src/api/client';

// ── Screens ──────────────────────────────────────────────────────────────────
import DriverSplashScreen from './src/screens/Auth/DriverSplashScreen';

// Auth screens
import DriverLoginScreen from './src/screens/Auth/DriverLoginScreen';
import DriverOtpVerificationScreen from './src/screens/Auth/DriverOtpVerificationScreen';
import ChangePhoneNumberInputScreen from './src/screens/Auth/ChangePhoneNumberInputScreen';
import ChangePhoneNumberOtpVerificationScreen from './src/screens/Auth/ChangePhoneNumberOtpVerificationScreen';

// Onboarding screens
import DriverGenderVerificationScreen  from './src/screens/Onboarding/DriverGenderVerificationScreen';
import DriverFaceLivenessScreen        from './src/screens/Onboarding/DriverFaceLivenessScreen';
import DriverKycUploadScreen           from './src/screens/Onboarding/DriverKycUploadScreen';
import DocumentUnderReviewScreen       from './src/screens/Onboarding/DocumentUnderReviewScreen';
import DocumentReUploadScreen          from './src/screens/Onboarding/DocumentReUploadScreen';
import AccountApprovedScreen           from './src/screens/Onboarding/AccountApprovedScreen';


// Main screens
import DriverHomeScreen from './src/screens/Home/DriverHomeScreen';
import DriverOnlineDashboardScreen from './src/screens/Home/DriverOnlineDashboardScreen';
import DemandZonesScreen from './src/screens/Home/DemandZonesScreen';
import IncomingRideRequestScreen from './src/screens/Home/IncomingRideRequestScreen';
import PaymentPlansScreen from './src/screens/Home/PaymentPlansScreen';
import SOSWarningScreen from './src/screens/Home/SOSWarningScreen';
import SOSActiveScreen from './src/screens/Home/SOSActiveScreen';

// Ride flow screens
import EnRouteToPickupScreen from './src/screens/Ride/EnRouteToPickupScreen';
import ArrivedWaitingScreen from './src/screens/Ride/ArrivedWaitingScreen';
import TripInProgressScreen from './src/screens/Ride/TripInProgressScreen';
import PaymentDetailsScreen from './src/screens/Ride/PaymentDetailsScreen';
import CompletedRideDetailsScreen from './src/screens/Ride/CompletedRideDetailsScreen';
import RideHistoryScreen from './src/screens/Ride/RideHistoryScreen';

// Earnings screens
import MyEarningsDashboardScreen from './src/screens/Earnings/MyEarningsDashboardScreen';
import DailyCommissionPaymentScreen from './src/screens/Earnings/DailyCommissionPaymentScreen';
import WeeklyCommissionPaymentScreen from './src/screens/Earnings/WeeklyCommissionPaymentScreen';
import CommissionPaidConfirmationScreen from './src/screens/Earnings/CommissionPaidConfirmationScreen';

// Subscription screens
import SubscriptionRidesOverviewScreen from './src/screens/Subscriptions/SubscriptionRidesOverviewScreen';
import WeeklyCalendarViewScreen from './src/screens/Subscriptions/WeeklyCalendarViewScreen';
import SubscriptionAssignmentDetailsScreen from './src/screens/Subscriptions/SubscriptionAssignmentDetailsScreen';

import MyProfileScreen from './src/screens/Profile/MyProfileScreen';
import MyDocumentsScreen from './src/screens/Profile/MyDocumentsScreen';
import MyComplaintsScreen from './src/screens/Profile/MyComplaintsScreen';
import RaiseAComplaintScreen from './src/screens/Profile/RaiseAComplaintScreen';
import NotificationSettingsScreen from './src/screens/Profile/NotificationSettingsScreen';
import NotificationsScreen from './src/screens/Profile/NotificationsScreen';
import TransactionHistoryScreen from './src/screens/Profile/TransactionHistoryScreen';
import ProfilePaymentDetailsScreen from './src/screens/Profile/PaymentDetailsScreen';
import SakhiLogoutConfirmationSheet from './src/screens/Profile/SakhiLogoutConfirmationSheet';
import ChangePhoneInputScreen from './src/screens/Profile/ChangePhoneInputScreen';
import ChangePhoneOtpScreen from './src/screens/Profile/ChangePhoneOtpScreen';
import HelpSupportScreen from './src/screens/Profile/HelpSupportScreen';
import AboutSakhiScreen from './src/screens/Profile/AboutSakhiScreen';
import EditProfileScreen from './src/screens/Profile/EditProfileScreen';
import TermsPrivacyScreen from './src/screens/Profile/TermsPrivacyScreen';
import RefundPolicyScreen from './src/screens/Profile/RefundPolicyScreen';
import DriverReferralsScreen from './src/screens/Profile/DriverReferralsScreen';

// ── Navigators ────────────────────────────────────────────────────────────────
const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverLogin" component={DriverLoginScreen} />
      <Stack.Screen name="DriverOtp" component={DriverOtpVerificationScreen} />
      <Stack.Screen name="ChangePhoneInput" component={ChangePhoneNumberInputScreen} />
      <Stack.Screen name="ChangePhoneOtp" component={ChangePhoneNumberOtpVerificationScreen} />
      <Stack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
    </Stack.Navigator>
  );
}

function OnboardingStack({ initialRoute = 'GenderVerification' }) {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute}
    >
      <Stack.Screen name="GenderVerification"  component={DriverGenderVerificationScreen} />
      <Stack.Screen name="DriverFaceLiveness"  component={DriverFaceLivenessScreen} />
      <Stack.Screen name="DriverKycUpload"     component={DriverKycUploadScreen} />
      <Stack.Screen name="DocumentUnderReview" component={DocumentUnderReviewScreen} />
      <Stack.Screen name="DocumentReUpload"    component={DocumentReUploadScreen} />
      <Stack.Screen name="AccountApproved"     component={AccountApprovedScreen} />
    </Stack.Navigator>
  );
}


function MainStack({ initialRoute = 'DriverOnlineDashboard' }) {
  return (
    <SocketProvider>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={initialRoute}
      >
        <Stack.Screen name="DailyCommissionPayment" component={DailyCommissionPaymentScreen} />
        <Stack.Screen name="WeeklyCommissionPayment" component={WeeklyCommissionPaymentScreen} />
        <Stack.Screen name="CommissionPaidConfirmation" component={CommissionPaidConfirmationScreen} />
        <Stack.Screen name="DriverOnlineDashboard" component={DriverOnlineDashboardScreen} />
        <Stack.Screen name="DemandZones" component={DemandZonesScreen} />
        <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
        <Stack.Screen name="PaymentPlans" component={PaymentPlansScreen} />
        <Stack.Screen name="ActiveTrip" component={EnRouteToPickupScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="EnRouteToPickup" component={EnRouteToPickupScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="ArrivedWaiting" component={ArrivedWaitingScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="TripInProgress" component={TripInProgressScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="PaymentDetails" component={PaymentDetailsScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="CompletedRideDetails" component={CompletedRideDetailsScreen} />
        <Stack.Screen name="RideHistory" component={RideHistoryScreen} />
        {/* SOS Flow */}
        <Stack.Screen name="SOSWarning" component={SOSWarningScreen} />
        <Stack.Screen name="SOSActive" component={SOSActiveScreen} />
        {/* Earnings */}
        <Stack.Screen name="MyEarnings" component={MyEarningsDashboardScreen} />
        {/* Subscriptions */}
        <Stack.Screen name="SubscriptionRides" component={SubscriptionRidesOverviewScreen} />
        <Stack.Screen name="WeeklyCalendarView" component={WeeklyCalendarViewScreen} />
        <Stack.Screen name="SubscriptionAssignmentDetails" component={SubscriptionAssignmentDetailsScreen} />
        {/* Profile & Settings */}
        <Stack.Screen name="MyProfile" component={MyProfileScreen} />
        <Stack.Screen name="MyDocuments" component={MyDocumentsScreen} />
        <Stack.Screen name="MyComplaints" component={MyComplaintsScreen} />
        <Stack.Screen name="RaiseAComplaint" component={RaiseAComplaintScreen} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
        <Stack.Screen name="ProfilePaymentDetails" component={ProfilePaymentDetailsScreen} />
        <Stack.Screen name="ChangePhoneInput" component={ChangePhoneInputScreen} />
        <Stack.Screen name="ChangePhoneOtp" component={ChangePhoneOtpScreen} />
        <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
        <Stack.Screen name="AboutSakhi" component={AboutSakhiScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
        <Stack.Screen name="TermsAndPrivacy" component={TermsPrivacyScreen} />
        <Stack.Screen name="RefundPolicy" component={RefundPolicyScreen} />
        <Stack.Screen name="DriverReferrals" component={DriverReferralsScreen} />
        <Stack.Screen name="LogoutConfirmation" component={SakhiLogoutConfirmationSheet} options={{ presentation: 'transparentModal', animation: 'fade' }} />
      </Stack.Navigator>
      {/* Incoming ride overlay — rendered on top of whatever screen is active */}
      <IncomingRideRequestScreen navigationRef={navigationRef} />
    </SocketProvider>
  );
}

// ── Root navigator — picks stack based on auth state ─────────────────────────
function RootNavigator() {
  const { isLoading, isAuthenticated, driver } = useAuth();
  const [commissionChecked, setCommissionChecked] = useState(false);
  const [commissionInitialRoute, setCommissionInitialRoute] = useState('DriverOnlineDashboard');

  const onboardingComplete = isAuthenticated && driver?.onboarding_status === 'approved';

  // When driver is authenticated + approved, check commission before rendering MainStack.
  // This runs once per app session (commissionChecked acts as the gate).
  useEffect(() => {
    if (!onboardingComplete || commissionChecked) return;

    let cancelled = false;
    client
      .get('/drivers/commission/status')
      .then(({ data }) => {
        if (cancelled) return;
        // total_due > 0  → land on payment screen; otherwise go straight to home
        const route = data?.total_due > 0 ? 'DailyCommissionPayment' : 'DriverOnlineDashboard';
        setCommissionInitialRoute(route);
      })
      .catch(() => {
        // Network failure — let driver into app; commission check in sidebar will catch them
        if (!cancelled) setCommissionInitialRoute('DriverOnlineDashboard');
      })
      .finally(() => {
        if (!cancelled) setCommissionChecked(true);
      });

    return () => { cancelled = true; };
  }, [onboardingComplete]);

  // Show full-screen loader while checkAuth() or commission check is running
  if (isLoading || (onboardingComplete && !commissionChecked)) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primaryContainer} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthStack />;
  }

  // Authenticated + fully approved → Main app (with correct initial route)
  if (onboardingComplete) {
    return <MainStack initialRoute={commissionInitialRoute} />;
  }

  // Submitted KYC — show static under-review screen
  if (driver?.onboarding_status === 'kyc_submitted') {
    return <OnboardingStack initialRoute="DocumentUnderReview" />;
  }

  // Not yet submitted — start onboarding from the beginning
  return <OnboardingStack initialRoute="GenderVerification" />;
}

// ── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [pageLoading, setPageLoading] = useState(false);
  const [i18nReady, setI18nReady] = useState(false);
  const loaderTimer = useRef(null);

  // ── HOOK: Read ride payload from IncomingRideActivity native bridge ───────
  // This fires on every app launch / foreground resume. If IncomingRideActivity
  // stored a RIDE_REQUEST payload, it emits PUSH_RIDE_REQUEST → overlay shows.
  useRideRequestBridge();

  // ── HOOK 1: Initialise i18n ───────────────────────────────────────────────
  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  // ── HOOK 2: Notification handlers ─────────────────────────────────────────
  // Declared unconditionally (Rules of Hooks).
  // Guard inside the effect — only subscribe after i18n is ready.
  useEffect(() => {
    if (!i18nReady) return;

    const handleTap = (data) => {
      const type = data?.type;

      // Handle ride requests even on cold start (navigation may not be ready yet).
      if (type === 'RIDE_REQUEST') {
        DeviceEventEmitter.emit('PUSH_RIDE_REQUEST', data || {});
        return;
      }

      if (!navigationRef.isReady()) return;
      if (type === 'RIDE_ASSIGNED') {
        navigationRef.navigate('EnRouteToPickup');
      } else if (type === 'KYC_APPROVED' || type === 'KYC_REJECTED') {
        DeviceEventEmitter.emit('REFRESH_AUTH');
      }
    };

    const cleanupForeground = setupForegroundHandler();
    const cleanupTap = setupNotificationTapHandler(handleTap);

    let cancelled = false;
    getInitialNotificationDataAsync().then((data) => {
      if (cancelled || !data) return;
      handleTap(data);
    });

    return () => {
      cancelled = true;
      cleanupForeground();
      cleanupTap();
    };
  }, [i18nReady]); // re-runs once when i18nReady flips true

  // ── Early return AFTER all hooks — safe per Rules of Hooks ───────────────
  if (!i18nReady) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#BEA3D8" />
      </View>
    );
  }

  const handleNavStateChange = () => {
    // Show loader immediately on any navigation event
    setPageLoading(true);
    // Auto-hide after 400ms — enough for most screens to paint
    if (loaderTimer.current) clearTimeout(loaderTimer.current);
    loaderTimer.current = setTimeout(() => setPageLoading(false), 400);
  };

  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider>
        <AuthProvider>
          <View style={{ flex: 1 }}>
            <NavigationContainer ref={navigationRef} onStateChange={handleNavStateChange}>
              <StatusBar style="dark" />
              {/* Splash screen sits outside the RootNavigator so it always
                  shows first before checkAuth completes */}
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Splash" component={DriverSplashScreen} />
                <Stack.Screen name="RootShell" component={RootNavigator} />
              </Stack.Navigator>
            </NavigationContainer>
            {/* Global page transition loader placed outside NavigationContainer */}
            {pageLoading && <PageLoader />}
            <GlobalErrorModal />
          </View>
        </AuthProvider>
      </SafeAreaProvider>
    </I18nextProvider>
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
