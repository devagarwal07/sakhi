# SAKHI Driver App — Complete Cursor AI Prompt Sequence
**React Native (Expo) · Tailwind CSS (NativeWind) · Socket.IO Client · Supabase (Auth/Storage) · React Navigation**

> **How to use this:** Feed each prompt to Cursor one at a time. Do not skip steps. This assumes you already have the Node.js backend running locally or deployed.

---

## PHASE 1: SCAFFOLDING & NAVIGATION

### PROMPT 1 — Expo INIT & Core Dependencies
```text
Create a new Expo project for the Sakhi Driver App. Initialize a clean React Native architecture.

Folder structure to implement:
src/
  api/          # Axios interceptors and REST calls
  components/   # Reusable UI components (Buttons, Toggles, StatCards)
  context/      # React Context (Auth, Ride, Socket, Location, Theme)
  hooks/        # Custom hooks (useDriverLocation, useSocket, useRideState)
  navigation/   # React Navigation stack and tabs
  screens/      # Screen components grouped by flow (Auth, Onboarding, Home, Earnings, Profile)
  services/     # External integrations (Socket.IO client, Supabase client, BackgroundTasks)
  utils/        # Helpers, constants, styling tokens

Install these exact dependencies:
- @react-navigation/native, @react-navigation/native-stack, @react-navigation/bottom-tabs
- react-native-safe-area-context, react-native-screens
- axios, socket.io-client
- @supabase/supabase-js (for direct storage uploads for documents)
- expo-secure-store (for saving JWTs)
- expo-location, expo-task-manager (for background GPS tracking)
- react-native-maps, react-native-maps-directions (for map rendering and polylines)
- nativewind, tailwindcss (for styling)
- expo-image-picker, expo-document-picker (for Driving License, RC, selfies)
- lucide-react-native (for icons)
- date-fns (for formatting)

Set up NativeWind in `tailwind.config.js` and `babel.config.js`. Create a central `src/utils/theme.js` defining the Sakhi Driver primary palette (focusing on `violet-500` and `violet-600` as brand colors, and `emerald-500` for success/online states).

Create `App.js` at the root that wraps the app in safe area providers, navigation containers, and an empty AuthProvider. Implement `DriverSplashScreen` as the initial load screen.
```

### PROMPT 2 — Authentication Context & Axios Interceptors
```text
Implement `src/context/AuthContext.js` and `src/api/client.js`.

AXIOS CLIENT (`src/api/client.js`):
1. Create an Axios instance with base URL pointing to the backend (`process.env.EXPO_PUBLIC_API_URL`).
2. Add a request interceptor that fetches the `accessToken` from `expo-secure-store` and attaches it.
3. Add a response interceptor that handles 401 Unauthorized errors (refresh token logic identical to the customer app).
   - Attempt `/auth/refresh-token`, update tokens, and retry.
   - If fail, clear store and logout.

AUTH CONTEXT (`src/context/AuthContext.js`):
Manage state: `driver` (object), `isLoading` (boolean), `isAuthenticated` (boolean).
Methods:
- `login(phone, otp)`: Calls `POST /auth/verify-otp` (ensure it requests driver role). Stores tokens.
- `logout()`: Clears tokens, calls `POST /auth/logout`.
- `checkAuth()`: Checks token on load, calls `GET /drivers/profile` to get driver status (e.g., `onboarding_status`, `is_approved`, `is_online`).

Update `App.js` to conditionally show `AuthStack`, `OnboardingStack`, or `MainStack` based on authentication and `onboarding_status`.
```

---

## PHASE 2: AUTHENTICATION & DRIVER ONBOARDING

### PROMPT 3 — Login, OTP & Number Change Screens
```text
Build the Auth layout and screens in `src/screens/Auth/`.

1. `DriverLoginScreen.js`:
   - Professional lavender-themed UI with Sakhi Driver branding.
   - Phone Number input (+91).
   - "Get OTP" solid violet button. Call API to send OTP.

2. `DriverOtpVerificationScreen.js`:
   - 6-box OTP input.
   - "Verify & Login" button.
   - On success, checks `driver.onboarding_status`. If `pending`, navigate to Onboarding. If `approved`, navigate to Main.

3. Implement `ChangePhoneNumberInputScreen.js` and `ChangePhoneNumberOtpVerificationScreen.js` to allow drivers to update their registered mobile number if needed during login issues.
```

### PROMPT 4 — Driver KYC & Vehicle Details (Onboarding)
```text
If `onboarding_status !== 'approved'`, the app routes to `src/screens/Onboarding/`. Construct a step-by-step wizard:

1. `DriverGenderVerificationScreen.js`: Confirm female identity (Face/Selfie Verification via camera). Submit to `POST /drivers/verify-identity`.
2. `DriverKycUploadScreen.js`: 
   - UI to upload Driving License (Front/Back) and Aadhaar Card.
   - Use `expo-image-picker`. Show preview thumbnails. Submit via multipart/form-data.
3. `VehicleDetailsEntryScreen.js`:
   - Select Vehicle Type (Auto, E-Rickshaw, Mini Van).
   - Input Registration Number.
   - Select Vehicle Colour (options like Yellow, White, Black, Silver).
   - Input Model Name.
   - Save and Continue.
4. `DriverVerificationLoadingScreen.js` -> `DocumentUnderReviewScreen.js`: 
   - A pending state screen saying "Your profile is under verification. We will notify you once approved." 
   - Include a "Refresh Status" button.
5. `DocumentReUploadScreen.js`: If backend rejects a document, show this screen specifying which document failed and allow re-upload.
6. `AccountApprovedScreen.js`: Success state before entering the Home screen.
```

---

## PHASE 3: CORE DRIVING & RIDE REQUESTS

### PROMPT 5 — Driver Home Screen, Sidebar & Status Toggle
```text
Implement `src/screens/Home/DriverHomeScreen.js`.

1. Map View:
   - `<MapView>` centered on driver's location. Custom map styling (lavender tint).
   - Custom marker for the driver's vehicle.
2. Header & Overlays:
   - Hamburger menu icon opening the `DriverSidebarMenu` (containing Profile, Earnings, My Documents, Complaints, Settings, Help/Support).
   - Quick "Today's Earnings" pill at the top right.
3. Bottom Sheet Control Panel:
   - **Online/Offline Toggle**: A prominent switch. 
     - When switched ON: Ask for location permissions (foreground & background). Call `POST /drivers/status` with `{ is_online: true }`. Map starts pulsing.
     - When OFF: Call API to set offline.
   - Display Today's trips summary and Rating.
   - Include a locked "Subscription Banner" indicating if a scheduled ride is approaching.
4. Background Location:
   - When Online, use `expo-location` and `expo-task-manager` to send location updates to the backend (via Socket or REST periodically).
```

### PROMPT 6 — Socket Setup & Incoming Ride Requests
```text
Implement real-time features.

Create `src/context/SocketContext.js`:
- Initialize `io(API_URL)` with auth token.
- Connect when Driver goes ONLINE. Disconnect on OFFLINE.

Create `IncomingRideRequestScreen.js` (rendered as an absolute overlay when a ride request comes in):
1. Listen for `ride:new_request` socket event.
2. UI displays:
   - Pulsing bell icon header.
   - Depleting Timer Bar (e.g., 15 seconds to accept).
   - Rider Photo, Name & Rating.
   - Estimated Fare (large text).
   - Pickup & Drop-off text with distance/ETA to pickup.
3. Actions:
   - "Accept Ride" button -> Emits `ride:accept` to socket with ride ID.
   - "Decline" button -> Emits `ride:reject`.
4. If accepted successfully, navigate to the Active Trip flow.
```

---

## PHASE 4: THE ACTIVE RIDE

### PROMPT 7 — En Route & Arrived Waiting States
```text
Implement `src/screens/Ride/ActiveTripFlow.js` handling pre-pickup phases.

1. `EnRouteToPickupScreen.js`:
   - Map UI draws polyline from Driver Location to Pickup Point.
   - Bottom Panel: Rider details, "Call" and "Message" buttons. Navigate API button.
   - "Arrived at Pickup" prominent button. (On press -> Emits `ride:arrived`, navigates to next screen).
2. `ArrivedWaitingScreen.js`:
   - Displays a Waiting Timer counting up.
   - Input for OTP: Driver must enter the 4-digit OTP provided by the customer.
   - "Start Trip" button -> Validates OTP (`POST /rides/:id/start`). On success, change state to `TripInProgress`.
```

### PROMPT 8 — Trip In Progress & Completion
```text
Extend Active Trip logic for the active ride phase.

1. `TripInProgressScreen.js`:
   - Map UI redraws polyline from Current Location to Drop-off Point.
   - Bottom Panel: Show ETA to drop-off.
   - SOS emergency button for the driver.
   - "Complete Trip" slider or button (calls `POST /rides/:id/complete` with final GPS coordinates).
2. `PaymentDetailsScreen.js`:
   - Fetch final `GET /rides/:id/fare-summary`.
   - Display Net Fare to collect (Cash or Online).
   - If online, poll for `payment:success` socket event. If cash, provide "Confirm Cash Collected" button.
   - Upon payment confirmation, show rider rating modal, then return to DriverHomeScreen.
```

---

## PHASE 5: EARNINGS, SUBSCRIPTIONS & SUPPORT

### PROMPT 9 — Earnings & Commission Dashboards
```text
Implement earnings screens accessible via Bottom Tabs.

1. `MyEarningsDashboardScreen.js` & `MyEarningsScreen.js`:
   - Header with Period Selector Tabs (Today, This Week, This Month, All Time).
   - Hero Card: Total Net Earnings for the selected period.
   - Bar Chart mapping daily earnings for the week.
   - Breakdown: On-Demand Rides vs Subscription Rides vs Waiting charges.
   - Fetch data via `GET /drivers/earnings?period=weekly`.
2. Commission Payments (`DailyCommissionPaymentScreen.js` & `WeeklyCommissionPaymentScreen.js`):
   - Display pending commission amount owed to Sakhi for cash rides.
   - "Pay Commission" button -> Integrates standard checkout to settle platform dues.
   - `CommissionPaidConfirmationScreen.js`: Success receipt screen.
```

### PROMPT 10 — Subscription Rides Management
```text
Implement Subscription flow.

1. `SubscriptionRidesOverviewScreen.js` & `SubscriptionRidesViewScreen.js`:
   - List view of assigned Subscription packages (fetch `GET /drivers/subscriptions`).
   - Show `WeeklyCalendarViewScreen.js` for scheduled rides upcoming in the week.
2. `SubscriptionAssignmentDetailsScreen.js`:
   - Detailed view of a specific subscription package assigned to the driver.
   - Button to initiate a scheduled pickup when the time approaches.
```

### PROMPT 11 — Profile, Complaints & Support
```text
Finalize the Sidebar/Account flows.

1. `MyProfileScreen.js` / `MyDocumentsScreen.js`: View/Edit basic details and view verified credentials.
2. Complaints Flow (`MyComplaintsScreen.js` & `RaiseAComplaintScreen.js`):
   - List of open/resolved tickets (e.g., Commission disputes, ride issues).
   - Form to submit a new complaint with issue type dropdown and optional screenshot upload.
3. Settings & Extra: `NotificationSettingsScreen.js`, `NotificationsScreen.js`, `TransactionHistoryScreen.js`, and `SakhiLogoutConfirmationSheet`.
```
