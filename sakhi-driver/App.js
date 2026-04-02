import React, { useState, useRef, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { Colors } from './src/utils/theme';
import PageLoader from './src/components/PageLoader';

// ── Screens ──────────────────────────────────────────────────────────────────
import DriverSplashScreen from './src/screens/Auth/DriverSplashScreen';

// Auth screens
import DriverLoginScreen            from './src/screens/Auth/DriverLoginScreen';
import DriverOtpVerificationScreen  from './src/screens/Auth/DriverOtpVerificationScreen';
import ChangePhoneNumberInputScreen from './src/screens/Auth/ChangePhoneNumberInputScreen';
import ChangePhoneNumberOtpVerificationScreen from './src/screens/Auth/ChangePhoneNumberOtpVerificationScreen';

// Onboarding screens
import DriverGenderVerificationScreen  from './src/screens/Onboarding/DriverGenderVerificationScreen';
import DriverKycUploadScreen           from './src/screens/Onboarding/DriverKycUploadScreen';
import VehicleDetailsEntryScreen       from './src/screens/Onboarding/VehicleDetailsEntryScreen';
import DriverVerificationLoadingScreen from './src/screens/Onboarding/DriverVerificationLoadingScreen';
import DocumentUnderReviewScreen       from './src/screens/Onboarding/DocumentUnderReviewScreen';
import DocumentReUploadScreen          from './src/screens/Onboarding/DocumentReUploadScreen';
import AccountApprovedScreen           from './src/screens/Onboarding/AccountApprovedScreen';

// Main screens
import DriverHomeScreen              from './src/screens/Home/DriverHomeScreen';
import DriverOnlineDashboardScreen   from './src/screens/Home/DriverOnlineDashboardScreen';
import IncomingRideRequestScreen     from './src/screens/Home/IncomingRideRequestScreen';
import PaymentPlansScreen            from './src/screens/Home/PaymentPlansScreen';

// Ride flow screens
import EnRouteToPickupScreen from './src/screens/Ride/EnRouteToPickupScreen';
import ArrivedWaitingScreen  from './src/screens/Ride/ArrivedWaitingScreen';
import TripInProgressScreen  from './src/screens/Ride/TripInProgressScreen';
import PaymentDetailsScreen          from './src/screens/Ride/PaymentDetailsScreen';
import CompletedRideDetailsScreen    from './src/screens/Ride/CompletedRideDetailsScreen';
import RideHistoryScreen             from './src/screens/Ride/RideHistoryScreen';

// Earnings screens
import MyEarningsDashboardScreen      from './src/screens/Earnings/MyEarningsDashboardScreen';
import DailyCommissionPaymentScreen   from './src/screens/Earnings/DailyCommissionPaymentScreen';
import WeeklyCommissionPaymentScreen  from './src/screens/Earnings/WeeklyCommissionPaymentScreen';
import CommissionPaidConfirmationScreen from './src/screens/Earnings/CommissionPaidConfirmationScreen';

// Subscription screens
import SubscriptionRidesOverviewScreen   from './src/screens/Subscriptions/SubscriptionRidesOverviewScreen';
import WeeklyCalendarViewScreen          from './src/screens/Subscriptions/WeeklyCalendarViewScreen';
import SubscriptionAssignmentDetailsScreen from './src/screens/Subscriptions/SubscriptionAssignmentDetailsScreen';

// Profile / Settings screens
import MyProfileScreen                 from './src/screens/Profile/MyProfileScreen';
import MyDocumentsScreen               from './src/screens/Profile/MyDocumentsScreen';
import MyComplaintsScreen              from './src/screens/Profile/MyComplaintsScreen';
import RaiseAComplaintScreen           from './src/screens/Profile/RaiseAComplaintScreen';
import NotificationSettingsScreen      from './src/screens/Profile/NotificationSettingsScreen';
import NotificationsScreen             from './src/screens/Profile/NotificationsScreen';
import TransactionHistoryScreen        from './src/screens/Profile/TransactionHistoryScreen';
import ProfilePaymentDetailsScreen     from './src/screens/Profile/PaymentDetailsScreen';
import SakhiLogoutConfirmationSheet    from './src/screens/Profile/SakhiLogoutConfirmationSheet';
import ChangePhoneOtpScreen            from './src/screens/Profile/ChangePhoneOtpScreen';
import HelpSupportScreen               from './src/screens/Profile/HelpSupportScreen';
import AboutSakhiScreen               from './src/screens/Profile/AboutSakhiScreen';
import EditProfileScreen              from './src/screens/Profile/EditProfileScreen';
import TermsPrivacyScreen             from './src/screens/Profile/TermsPrivacyScreen';

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
      <Stack.Screen name="GenderVerification"   component={DriverGenderVerificationScreen}  />
      <Stack.Screen name="DriverKycUpload"      component={DriverKycUploadScreen}           />
      <Stack.Screen name="VehicleDetailsEntry"  component={VehicleDetailsEntryScreen}       />
      <Stack.Screen name="VerificationLoading"  component={DriverVerificationLoadingScreen} />
      <Stack.Screen name="DocumentUnderReview"  component={DocumentUnderReviewScreen}       />
      <Stack.Screen name="DocumentReUpload"     component={DocumentReUploadScreen}          />
      <Stack.Screen name="AccountApproved"      component={AccountApprovedScreen}           />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <SocketProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="DriverHome"              component={DriverHomeScreen}            />
        <Stack.Screen name="DriverOnlineDashboard"   component={DriverOnlineDashboardScreen} />
        <Stack.Screen name="PaymentPlans"            component={PaymentPlansScreen}          />
        <Stack.Screen name="ActiveTrip"      component={EnRouteToPickupScreen} />
        <Stack.Screen name="EnRouteToPickup" component={EnRouteToPickupScreen} />
        <Stack.Screen name="ArrivedWaiting"  component={ArrivedWaitingScreen}  />
        <Stack.Screen name="TripInProgress"  component={TripInProgressScreen}  />
        <Stack.Screen name="PaymentDetails"         component={PaymentDetailsScreen}       />
        <Stack.Screen name="CompletedRideDetails"   component={CompletedRideDetailsScreen}  />
        <Stack.Screen name="RideHistory"            component={RideHistoryScreen}           />
        {/* Earnings */}
        <Stack.Screen name="MyEarnings"                component={MyEarningsDashboardScreen}      />
        <Stack.Screen name="DailyCommissionPayment"    component={DailyCommissionPaymentScreen}   />
        <Stack.Screen name="WeeklyCommissionPayment"   component={WeeklyCommissionPaymentScreen}  />
        <Stack.Screen name="CommissionPaidConfirmation" component={CommissionPaidConfirmationScreen} />
        {/* Subscriptions */}
        <Stack.Screen name="SubscriptionRides"              component={SubscriptionRidesOverviewScreen}      />
        <Stack.Screen name="WeeklyCalendarView"             component={WeeklyCalendarViewScreen}             />
        <Stack.Screen name="SubscriptionAssignmentDetails"  component={SubscriptionAssignmentDetailsScreen}  />
        {/* Profile & Settings */}
        <Stack.Screen name="MyProfile"              component={MyProfileScreen}             />
        <Stack.Screen name="MyDocuments"            component={MyDocumentsScreen}           />
        <Stack.Screen name="MyComplaints"           component={MyComplaintsScreen}          />
        <Stack.Screen name="RaiseAComplaint"        component={RaiseAComplaintScreen}       />
        <Stack.Screen name="NotificationSettings"   component={NotificationSettingsScreen}  />
        <Stack.Screen name="Notifications"          component={NotificationsScreen}         />
        <Stack.Screen name="TransactionHistory"     component={TransactionHistoryScreen}    />
        <Stack.Screen name="ProfilePaymentDetails"   component={ProfilePaymentDetailsScreen}  />
        <Stack.Screen name="ChangePhoneOtp"         component={ChangePhoneOtpScreen}        />
        <Stack.Screen name="HelpSupport"            component={HelpSupportScreen}           />
        <Stack.Screen name="AboutSakhi"             component={AboutSakhiScreen}            />
        <Stack.Screen name="EditProfile"            component={EditProfileScreen}           />
        <Stack.Screen name="TermsPrivacy"           component={TermsPrivacyScreen}          />
        <Stack.Screen name="LogoutConfirmation"     component={SakhiLogoutConfirmationSheet} options={{ presentation: 'transparentModal', animation: 'fade' }} />
      </Stack.Navigator>
      {/* Incoming ride overlay — rendered on top of whatever screen is active */}
      <IncomingRideRequestScreen />
    </SocketProvider>
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
  const [pageLoading, setPageLoading] = useState(false);
  const loaderTimer = useRef(null);

  const handleNavStateChange = () => {
    // Show loader immediately on any navigation event
    setPageLoading(true);
    // Auto-hide after 400ms — enough for most screens to paint
    if (loaderTimer.current) clearTimeout(loaderTimer.current);
    loaderTimer.current = setTimeout(() => setPageLoading(false), 400);
  };

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer onStateChange={handleNavStateChange}>
          <StatusBar style="dark" />
          {/* Splash screen sits outside the RootNavigator so it always
              shows first before checkAuth completes */}
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Splash"    component={DriverSplashScreen} />
            <Stack.Screen name="RootShell" component={RootNavigator}       />
          </Stack.Navigator>
          {/* Global page transition loader */}
          {pageLoading && <PageLoader />}
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
