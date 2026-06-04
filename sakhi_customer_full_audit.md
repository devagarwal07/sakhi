# Sakhi Customer Full Code Audit Report


## App Layout & Screens (`app/`)


### `app/(tabs)/safety.js`
- **Issues Found:**
  - **Silent failures**: The `catch` block in the `getEmergencyContacts` call on mount is completely empty (`.catch(() => {})`). If the API fails, it silently swallows the error, leaving the `contactCount` as `null` without notifying the user.

### `app/_layout.js`
- **Issues Found:**
  - **Silent failures**: `SplashScreen.hideAsync().catch(() => {});` silently ignores Promise rejections if hiding fails.

### `app/active-ride.js`
- **Issues Found:**
  - **Silent failures:** `sendBatteryAlert` explicitly ignores exceptions. `shareTrip` catch block ignores backend errors.
  - **Unsafe UI logic:** Contact phone replacement logic assumes string input.
  - **Performance bottlenecks:** Multiple nested contexts can lead to heavy re-renders.


### `app/complaint.js`
- **Issues Found:**
  - **Hardcoded data:** Emergency contact number `+91 63619 33364` and email `support@sakhiwomen.com` are hardcoded. The `helpCategories` mapping is hardcoded.
  - **Silent failures:** `getRideHistory(1).catch(() => {})` fails silently if the API call errors out. No error UI is presented.
  - **Performance bottlenecks:** `QuickHelpCard` and `RecentTripCard` are defined inside the component, meaning they are re-created on every render. `helpCategories` object is re-created on every render.

### `app/driver-arrived.js`
- **Issues Found:**
  - **Hardcoded data**: Mocked fallback avatar used for the driver photo.
  - **Performance bottlenecks**: The countdown timer state (`secondsLeft`) updates every 1 second via an interval. Since the timer is part of the main component, this triggers a full re-render of the entire screen (including the complex `SmartMapView`) every second.



### `app/emergency-contacts.js`
- **Issues Found:**
  - **Performance bottlenecks**: The `AVATAR_COLORS` array is defined inside the `EmergencyContactsScreen` component body, causing it to be recreated on every render.
  - **Silent failures**: In the `handleDelete` catch block, the error is not logged and the actual error object is ignored. In `toggleAutoShare`, if the update fails, the optimistic UI is reverted but the error itself is not logged for debugging.

### `app/help-support.js`
- **Issues Found:**
  - **Hardcoded data:** `FAQ_CATEGORIES` list and Phone number `+916361933364` are hardcoded.
  - **Silent failures:** `Linking.openURL` fails silently if the dialer cannot be opened.
  - **Performance bottlenecks:** `filteredFaqs` and `displayFaqs` arrays are recalculated on every render.

### `app/location-search.js`
- **Issues Found:**
  - **Hardcoded data:** `place_id` is mocked using `Math.random()`. Recent destinations fallback to `recent_${i}`.
  - **Silent failures:** `getRideHistory` and `getAddresses` both catch errors silently. Multiple `try-catch` blocks inside search functions have empty catch blocks.

### `app/notifications.js`
- **Issues Found:**
  - **Hardcoded data**: `defaultPrefs` containing all the notification states is hardcoded.
  - **Silent failures**: Errors with `AsyncStorage` catch blocks log to `console.error` but fail silently to the user.
  - **Performance bottlenecks**: `ToggleRow` is declared inside the `NotificationsScreen` render function causing the component to be recreated completely on every re-render.
  - **Disconnected APIs**: User notification preferences are totally disconnected from the API backend.

### `app/payment-success.js`
- **Issues Found:**
  - **Hardcoded data:** Fallback price is hardcoded: `sub.price || 364`. Transaction ID is mocked using `Math.random()`. Payment method text "Paid via UPI" is hardcoded.
  - **Performance bottlenecks:** Date/time formatting and `Math.random()` for the TXN ID run during every render. If the component re-renders, the transaction ID will change.

### `app/payment.js`
- **Issues Found:**
  - **Silent failures:** `AsyncStorage.getItem` and `saveUpiToStorage` both have empty catch blocks.

### `app/ride-details.js`
- **Issues Found:**
  - **Hardcoded data:** Vehicle type fallback is hardcoded to `'Auto'`. Sharing text mocks a trip ID.
  - **Silent failures:** `getRideById` catches errors silently and shows generic text. `fetchDirectionsPolyline` catches errors silently.
  - **Performance bottlenecks:** The `ride` object (with heavy date formatting) is derived unconditionally on every render.

### `app/ride-estimate.js`
- **Issues Found:**
  - **Hardcoded data:** Fallback pricing parameters used if API response omits breakdown fields.
  - **Silent failures:** `fetchDirectionsPolyline` and `estimateFare` catch errors and return empty fallback objects/null silently.
  - **Unsafe UI logic:** `routeDistance` is passed to `parseKmText` which can fail if null. `promos.map` relies on API returning specific structure.
  - **Disconnected APIs:** `MAPPLS_KEY` is loaded from env but never used.

### `app/ride-finding.js`
- **Functionality:** Handles the ride search state, map display with animated pulsing pins, socket connections for real-time ride updates, and cancellation.
- **Strengths:** Excellent use of Animated for the rippling search pin. Proper use of useRef (mountedRef) to prevent state updates on unmounted components after asynchronous operations. Graceful handling of specific backend errors (e.g., ACTIVE_RIDE_EXISTS, CANCELLATION_FINE_PENDING).
- **Issues Found:** 
  - **Performance bottlenecks / Architecture:** The component is quite large (874 lines) and handles UI, map logic, socket event listeners, and API calls. Extracting the socket event logic or the animated map pin into separate custom hooks/components is necessary to improve readability and avoid heavy re-renders.

### `app/ride-history.js`
- **Issues Found:**
  - **Hardcoded data**: `FILTERS` array is hardcoded. Fares equal to `0` are artificially mapped and mocked to display a "SUB" badge UI.
  - **Silent failures**: `fetchRides` catches exceptions via `catch (_) { }`, completely swallowing the error.
  - **Performance bottlenecks**: `applyFilter` evaluates all ISO dates iteratively on every render cycle without `useMemo`.

### `app/ride-summary.js`
- **Issues Found:**
  - **Hardcoded data:** Driver first name fallback: `'your driver'`.
  - **Silent failures:** `submitRating` is wrapped in a try-catch with an empty catch block.

### `app/saved-places.js`
- **Issues Found:**
  - **Silent failures**: In the `handleSearchInput` function, the `catch (e)` block simply executes `setSuggestions([])` and silently swallows any errors from `searchPlaces(text)`.

### `app/sidebar.js`
- **Issues Found:**
  - **Performance bottlenecks**: The `MenuItem` sub-component is defined *inside* the `SidebarScreen` component body. This means a new instance of `MenuItem` is recreated from scratch on every single render of the sidebar, which is an anti-pattern that can cause unnecessary memory allocations and heavy re-renders.

### `app/sos-active.js`
- **Issues Found:**
  - **Hardcoded data:** Hardcoded `AVATAR_COLORS` array. Support contact numbers and WhatsApp URLs are fully hardcoded.
  - **Silent failures:** `getEmergencyContacts().catch(() => {})` swallows errors. `cancelSOS()` empty catch block.
  - **Unsafe UI logic:** `(c.name || 'U')[0].toUpperCase()` will crash if `c.name` is empty string.

### `app/sos-settings.js`
- **Issues Found:**
  - **Hardcoded data**: Keys like `LIVE_SHARING_KEY` and `SOS_PREFS_KEY` are used to persist logic locally rather than via an API.
  - **Silent failures**: Promises for storage and APIs all end in `.catch(() => {})`, silently ignoring errors.
  - **Unsafe UI logic**: `const list = data.contacts || data || []; setContactCount(list.length);` blindly extracts length, assuming it is an array without validation.
  - **Disconnected APIs**: SOS preferences and live sharing statuses are disconnected from the backend and are stored exclusively on the local device storage.

### `app/sos-warning.js`
- **Issues Found:**
  - **Silent failures:** `triggerSOS` is wrapped in empty catch block. Location functions silently fail defaulting to 0,0.
  - **Unsafe UI logic:** `router.replace('/(tabs)/')` trailing slash can cause issues.

### `app/subscription-details.js`
- **Issues Found:**
  - **Hardcoded data:** `DAYS` array is hardcoded.
  - **Unsafe UI logic:** `sub.amount_paid?.toFixed(2)` crashes if amount is string.
  - **Performance bottlenecks:** Date interval calculations run synchronously on every render.
  - **Disconnected APIs:** Cancelling subscription uses raw `apiClient.patch(...)` instead of endpoint function.

### `app/subscription-payment.js`
- **Issues Found:**
  - **Hardcoded data:** `PHONEPE_CLIENT_ID` is hardcoded. Fallback text values for plan details are hardcoded in UI.
  - **Silent failures:** `PhonePePaymentSdk.init` method catches errors and silently falls back.
  - **Unsafe UI logic:** `address?.split(',')[0]` will crash if not string. Array length assumptions on `sub.days`.
  - **Performance bottlenecks:** Formatting functions redefined on every execution of `createIntent`.

### `app/subscription-plans.js`
- **Issues Found:**
  - **Hardcoded data**: `BASE_RIDE_PRICE` (₹70) and subscription plan bundles (7, 14, 30 days) are hardcoded.
  - **Performance bottlenecks**: Deep discount computations run locally inside the component body during every render loop instead of being wrapped in `useMemo`.
  - **Disconnected APIs**: Proceeding to payment pushes the local state to `/subscription-payment` directly without creating a pending subscription record in the backend first.

### `app/subscription-ride.js`
- **Issues Found:**
  - **Hardcoded data**: Time and date options are mocked/generated client-side.
  - **Performance bottlenecks**: `dateOptions` and `timeOptions` are calculated from scratch inside the component body on every render without `useMemo`.

### `app/support-chat.js`
- **Functionality:** A chat interface for contacting support, featuring quick suggestion chips, message bubbles, and a typing indicator.
- **Strengths:** Clean UI implementation with Animated message bubbles. Optimistic UI updates when the user sends a message.
- **Issues Found:** No critical issues found. The keyboard handling utilizes KeyboardAvoidingView with calculated offsets and auto-scrolling to the bottom works via timeout.

### `app/wallet.js`
- **Issues Found:**
  - **Hardcoded data:** Referral code fallback `'SAKHI100'` and amount `₹50` are hardcoded. Fallback mocked state is used if API fails.
  - **Silent failures:** `getWalletDetails().catch(...)` handles errors by silently loading the mocked fallback state.
  - **Performance bottlenecks:** `filteredHistory` is computed inside the render body via `.filter()`.

## Auth Screens (`src/screens/`)

### `src/screens/Auth/OtpScreen.js`
- **Issues Found:**
  - **Hardcoded data:** `resendTimer` is hardcoded to restart at 30 seconds.
  - **Unsafe UI logic:** `displayPhone` uses `phone.slice(0, 3)` directly without validating length. This could result in weird display formatting if `phone` is somehow shorter than 10 characters.
  - **Silent failures:** `handleResend` catches errors but displays a generic message (`'Failed to resend OTP. Please try again.'`) rather than parsing and showing the specific backend error message, unlike the `handleVerify` function.

### `src/screens/Home/HomeScreen.js`
- **Issues Found:**
  - **Silent failures**: `getActiveRide()` `.catch(err => ...)` and multiple Location API try/catches swallow the errors or only log `console.warn`.
  - **Performance bottlenecks**: The map markers array is generated inline, causing `MapplsMapWebView` to re-render on each cycle.
  - **Disconnected APIs**: The `reverseGeocode` function makes direct unproxied fetch calls to external APIs.

## Components (`src/components/`)

### `src/components/ChatModal.js`
- **Issues Found:**
  - **Hardcoded data**: The `getChatQuickReplies` endpoint has a `.catch` block that hardcodes a fallback array of quick replies.
  - **Silent failures**: The promise rejections for `joinRideRoom(rideId)` and `getChatHistory(rideId)` are caught but silently ignored.
  - **Unsafe UI logic**: The fallback optimistic message ID generation could clash. The mapping logic could fall back to `null` states.
  - **Performance bottlenecks**: Several helper functions and the `renderMessage` component are re-created on every render.

### `src/components/LogoutBottomSheet.js`
- **Issues Found:**
  - **Silent failures**: In the `handleLogout` function, if `await onLogout()` throws an error, the `catch` block swallows the error silently.

### `src/components/MapplsMapWebView.js`
- **Issues Found:**
  - **Hardcoded data:** `DEFAULT_LAT` (12.9716) and `DEFAULT_LNG` (77.5946) are hardcoded. Marker styling (colors like `#8031CC`, SVG paths, pulse behavior) is hardcoded inside the injected HTML.
  - **Silent failures:** `onError={() => {}}` in the `WebView` component completely silences WebView load errors. Inside the injected JS, both `handleMsg` and the polyline update functions contain `catch(e) {}` blocks that silently swallow exceptions if markers/polylines fail to render.
  - **Performance bottlenecks:** `JSON.stringify()` is used inside the dependency array of a `useEffect` hook for `markers`, `polylines`, and `nearbyAutos`. This can cause unnecessary CPU cycles on every render, especially if these lists grow large. Passing large marker/polyline JSON payloads via `postMessage` can create a bottleneck across the React Native bridge.

### `src/components/SmartMapView.js`
- **Issues Found:**
  - **Hardcoded data:** `IS_EXPO_GO` is hardcoded to `false`.

## Contexts (`src/context/`)

### `src/context/RideContext.js`
- **Issues Found:**
  - **Performance bottlenecks**: The context value object is defined inline causing child components to unnecessarily re-render.

### `src/context/SocketContext.js`
- **Issues Found:**
  - **Silent failures**: Inside `connectSocket`, `SecureStore.getItemAsync` is called without a `try/catch` block.
  - **Unsafe UI logic**: Inside `connectSocket`, `socket.on('connect', ...)` re-registers all listeners from `listenersRef.current`, causing duplicate listener execution.
  - **Disconnected APIs**: The `joinRideRoom` function relies on a fallback 5000ms timeout if the backend doesn't explicitly respond.

## API & Services (`src/api/` & `src/services/`)

### `src/api/client.js`
- **Issues Found:**
  - **Unsafe UI logic**: Calling `CustomAlert.alert()` inside the Axios response interceptor for global errors could cause issues if multiple requests fail simultaneously.
  - **Silent failures**: In the request interceptor, `SecureStore.getItemAsync` errors are caught and logged, but the request proceeds anyway without a token.

### `src/api/endpoints.js`
- **Issues Found:**
  - **Unsafe UI logic**: The `triggerSOS` and `sendBatteryAlert` functions explicitly default `lat` and `lng` to `0` if the values are missing, sending coordinates to "Null Island".

### `src/services/notificationService.js`
- **Issues Found:**
  - **Silent failures**: Writing the FCM token to `SecureStore` catches errors and silently ignores them.
  - **Performance bottlenecks**: In `handleNotification`, `await AsyncStorage.getItem` is called directly in the foreground handler, potentially delaying the notification display.
