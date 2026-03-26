# SAKHI Customer App — Complete Cursor AI Prompt Sequence
**React Native (Expo) · Tailwind CSS (NativeWind) · Socket.IO Client · Supabase (Auth/Storage) · React Navigation**

> **How to use this:** Feed each prompt to Cursor one at a time. Do not skip steps. This assumes you already have the Node.js backend running locally or deployed.

---

## PHASE 1: SCAFFOLDING & NAVIGATION

### PROMPT 1 — Expo INIT & Core Dependencies
```
Create a new Expo project for the Sakhi Customer App. Initialize a clean React Native architecture.

Folder structure to implement:
src/
  api/          # Axios interceptors and REST calls
  components/   # Reusable UI components (Buttons, Inputs, Cards)
  context/      # React Context (Auth, Ride, Socket, Theme)
  hooks/        # Custom hooks (useLocation, useSocket, useRideState)
  navigation/   # React Navigation stack and tabs
  screens/      # Screen components grouped by flow (Auth, Home, Ride, Profile)
  services/     # External integrations (Socket.IO client, Supabase client, Maps)
  utils/        # Helpers, constants, styling tokens

Install these exact dependencies:
- @react-navigation/native, @react-navigation/native-stack, @react-navigation/bottom-tabs
- react-native-safe-area-context, react-native-screens
- axios, socket.io-client
- @supabase/supabase-js (for direct storage uploads if needed)
- expo-secure-store (for saving JWTs)
- expo-location (for GPS tracking)
- react-native-maps, react-native-maps-directions (for map rendering and polylines)
- nativewind, tailwindcss (for styling)
- expo-image-picker (for Aadhaar/Selfie uploads)
- lucide-react-native (for icons)
- date-fns (for formatting)

Set up NativeWind in `tailwind.config.js` and `babel.config.js`. Create a central `src/utils/theme.js` defining the Sakhi primary palette (focusing on `violet-500` as the brand color, with `violet-50` for backgrounds).

Create `App.js` at the root that wraps the app in safe area providers, navigation containers, and an empty AuthProvider (to be implemented).
```

### PROMPT 2 — Authentication Context & Axios Interceptors
```
Implement `src/context/AuthContext.js` and `src/api/client.js`.

AXIOS CLIENT (`src/api/client.js`):
1. Create an Axios instance with base URL pointing to the backend (e.g., `process.env.EXPO_PUBLIC_API_URL`).
2. Add a request interceptor that fetches the `accessToken` from `expo-secure-store` and attaches it to the `Authorization: Bearer <token>` header.
3. Add a response interceptor that handles 401 Unauthorized errors:
   - If a 401 triggers with code `TOKEN_EXPIRED`, intercept it, read `refreshToken` from SecureStore, call `POST /auth/refresh-token`.
   - If successful, save the new tokens, update the header, and retry the original failed request.
   - If the refresh token fails, log the user out (clear SecureStore).

AUTH CONTEXT (`src/context/AuthContext.js`):
Manage state: `user` (object), `isLoading` (boolean), `isAuthenticated` (boolean).
Methods to implement:
- `login(phone, otp)`: Calls `POST /auth/verify-otp`. Sets tokens in SecureStore. Sets user state.
- `logout()`: Calls `POST /auth/logout`, clears SecureStore, resets state.
- `checkAuth()`: Runs on app load. Checks SecureStore for token, fetches `/users/profile` to get fresh user data including verification_status.

Update `App.js` to render a generic Loading screen while `checkAuth` is running, then conditionally render `AuthStack` or `MainStack` based on `isAuthenticated`.
```

---

## PHASE 2: AUTHENTICATION & KYC SCREENS

### PROMPT 3 — Login & OTP Screens
```
Build the Auth layout and screens in `src/screens/Auth/`.

1. `LoginScreen.js`:
   - Beautiful, lavender-themed UI with the Sakhi logo at the top.
   - Text input for Phone Number (E.164 format, default +91).
   - Solid violet "Send OTP" button.
   - On press, call `POST /auth/send-otp` via the API client. On success, navigate to `OtpScreen`.

2. `OtpScreen.js`:
   - 6-box input for the OTP code.
   - Handles auto-focus and backspace deletion.
   - "Verify" button.
   - On press, call `authContext.login(phone, otp)`.
   - Handle loading states appropriately to prevent double-clicks.

Implement error toasts (or simple React Native `Alert`s) for invalid phone numbers or incorrect OTPs.
```

### PROMPT 4 — Gender Verification (KYC) Flow
```
Once logged in, if `user.verification_status === 'pending'`, the MainStack should force the user into the KYC flow before allowing them to access the dashboard.

Build screens in `src/screens/KYC/`:
1. `VerificationIntroScreen.js`: Explains that Sakhi is a women-only app and requires Aadhaar OR Selfie verification.
2. `AadhaarUploadScreen.js`:
   - Uses `expo-image-picker` to let users snap a photo of the Front and Back of their Aadhaar card.
   - Displays image previews.
   - On submit, wrap the images in `FormData` and `POST /auth/verify/aadhaar-upload` (multipart/form-data).
3. `FaceVerificationScreen.js`:
   - Alternative flow: Use device camera to take a clear selfie.
   - Submit via `POST /auth/verify/facial`.
4. `VerificationPendingScreen.js`: Let the user know their documents are under review. (Render this if `verification_status === 'pending'` and documents are already uploaded).

Update Navigation mapping so verified users bypass this stack.
```

---

## PHASE 3: CORE RIDE BOOKING

### PROMPT 5 — Home Screen & Map Setup
```
Implement `src/screens/Home/HomeScreen.js`.

1. Map View:
   - Use `react-native-maps` (`<MapView>`).
   - Use `expo-location` to request foreground location permissions on mount.
   - Center the map on the user's current GPS coordinates. Ensure an animated marker reflects their position.
2. Floating UI overlays:
   - Top action bar with hamburger menu (to open a Drawer or Profile modal).
   - A floating "Where to?" card at the bottom.
   - Inside the card:
     - "Current Location" input (auto-filled, but editable).
     - "Destination" input.
     - Quick chips for "Home", "Work" (fetches from `GET /users/addresses`).
3. Navigation: Tapping the "Destination" input navigates to a `LocationSearchScreen`.

Create `LocationSearchScreen.js`:
- Uses the Google Places Autocomplete API (or a custom backend proxy if built) to search for places.
- On selecting a place, passes the `lat`/`lng` and `address` back to the `HomeScreen`.
```

### PROMPT 6 — Fare Estimation & Bottom Sheet
```
Implement the Ride Selection & Fare Estimation flow.

Create a robust Bottom Sheet component (use `@gorhom/bottom-sheet` or a custom animated view).

When the user selects a destination on the HomeScreen:
1. Draw a polyline on the MapView between Current Location and Destination using `react-native-maps-directions` (or decoded points from the backend).
2. Call `GET /rides/estimate` on the backend with pickup and drop lat/lng.
3. Slide up `FareEstimationSheet.js`:
   - Displays estimated distance and time.
   - Displays a list of vehicle options (Auto, Cab) with their respective prices (from the API response).
   - "Apply Promo Code" button.
   - Large green/violet "Book Sakhi" button.

When "Book Sakhi" is pressed:
- Call `POST /rides` with pickup/drop data.
- Save the returned `ride_id` in a global RideContext or State logic.
- Transition the UI to the "Searching" state.
```

### PROMPT 7 — Socket Integration & Searching State
```
Implement real-time tracking with Socket.IO.

Create `src/context/SocketContext.js`:
1. Initialize `io(API_URL, { auth: { token: accessToken } })`.
2. Wrap it in a context provider. Connect on mount (if authenticated). Disconnect on logout.

Create `SearchingScreen.js` (or a modal overlay on the map):
1. Displays a radar/pulsing animation.
2. The component should listen for Socket events via a hook (e.g., `useSocketEvent('ride_assigned', handleAssigned)`).
3. Provide a "Cancel Request" button that calls `PATCH /rides/:id/cancel` and clears the state.
4. If `ride_assigned` is received: parse the payload (driver details, vehicle info) and transition the Navigation to `ActiveRideScreen`.
5. If `ride:no_drivers` is received: show an alert and return to HomeScreen.
```

---

## PHASE 4: THE ACTIVE RIDE

### PROMPT 8 — Active Ride Tracking & Status Updates
```
Implement `src/screens/Ride/ActiveRideScreen.js`.

This screen handles all states from `assigned` through `in_progress`.
1. Context/State: Subscribe to socket events: `driver_location`, `ride:status_update`, `waiting_tick`.
2. Map UI:
   - Render the route polyline.
   - Marker 1: Pickup or Dropoff point (depending on status).
   - Marker 2: Driver's car. Continuously update the coordinate of this marker whenever `driver_location` is received. Use React Native Reanimated for smooth coordinate interpolation.
3. Bottom Sheet UI:
   - Header: Current Status text ("Driver En Route", "Arrived", "Trip in Progress").
   - Driver Info Row: Photo, Name, Rating, Vehicle Model, Plate number.
   - Action Row: "Call Driver" (Triggers `POST /safety/call` for masked calling), "Message Driver" (Opens chat modal).
   - Waiting Timer: If `waiting_tick` is received, show a red timer and accrued waiting charges.
   - SOS Button: Prominent red button pinned to the screen limits.

When `ride:status_update` indicates `status: 'completed'`, navigate the user to `FareSummaryScreen`.
```

### PROMPT 9 — In-Ride Chat & SOS (Safety)
```
Add safety components.

1. `ChatModal.js`:
   - Accessed from the ActiveRide screen.
   - A standard chat interface (FlatList of messages).
   - Pulls initial history via `GET /rides/:id/chat`.
   - Listens for `chat:message` via socket.
   - Sends messages via `chat:send` socket emission. Displays English or translated local text based on API response.

2. `SOSTriggerModal.js`:
   - Accessed via the red SOS button.
   - Forces a 3-second long-press or a slide-to-confirm action to prevent accidental triggers (refer to `sos_confirmation_buffer` UI).
   - Calls `POST /safety/sos` with current location.
   - Transforms into an Active SOS state: displays support chat, confirms emergency contacts were notified.
```

---

## PHASE 5: POST-RIDE & UI COMPLETION

### PROMPT 10 — Fare Summary & Payment
```
Implement `src/screens/Ride/FareSummaryScreen.js`.

Called when a trip finishes.
1. Fetch full ride details (`GET /rides/:id`) to ensure final fare and breakdown are accurate.
2. UI displays:
   - Large checkmark / success animation.
   - Breakdown: Distance Fare, Waiting Time Charge, Promo Deductions, Final Fare.
   - Payment mechanism: Wait for driver to mark as paid (socket update) OR allow user to verify cash paid.
3. Once payment is confirmed, show `RatingModal.js`:
   - 5-star interactive component.
   - Optional text feedback.
   - Call `POST /rides/:id/rating`.
   - Clear global ride state and return to Home.
```

### PROMPT 11 — Subscriptions Flow
```
Implement the Subscriptions flow in `src/screens/Subscriptions/`.

1. `SubscriptionSetupScreen.js`:
   - Inputs for Home/Office, days of the week toggles (Mon-Fri, etc.), one-way vs two-way toggle, and pickup times.
   - Connect to `GET /rides/estimate` to get base fare, multiply locally to show package prices.
2. `PlanSelectionScreen.js`:
   - Select 7, 14, 21, or 30 plans.
   - Call `POST /payments/order` backend to create a Razorpay order.
3. `CheckoutScreen.js`:
   - Integrate Razorpay Custom UI or standard checkouts (e.g., `react-native-razorpay`). On success, send signature to `POST /payments/verify`.
4. `SubscriptionDashboard.js`:
   - Accessible from the main drawer.
   - Lists active subscriptions. Shows "Rides Remaining". Lists a calendar of upcoming rides for the week.
```

### PROMPT 12 — Profile, History & Settings
```
Finalize the Drawer/Bottom Tab navigation auxiliary screens.

1. `RideHistoryScreen.js`:
   - Fetch `GET /users/rides`.
   - FlatList with pagination. Card shows Date, Driver, Route, and Cost.
2. `ProfileScreen.js`:
   - Fetch `GET /users/profile`.
   - Editable inputs for Email, Accessibility Notes. Read-only view for Phone.
   - Emergency Contacts management section (CRUD operations to `/safety/emergency-contacts`).
3. `SettingsScreen.js`:
   - Notifications toggles (Local app state).
   - Logout button (Calls `authContext.logout()`).
```
