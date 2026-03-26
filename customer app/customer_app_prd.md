# SAKHI Customer App — Product Requirements Document (PRD)

## 1. Product Overview
**Sakhi** is a specialized ride-hailing platform designed exclusively for women, offering safe, reliable, and comfortable transportation. The Sakhi Customer App provides riders with the ability to book on-demand rides, schedule long-term subscriptions, and access premium safety features like SOS alerts, live tracking, and trusted emergency contacts.

The frontend is expected to be built using **React Native (Expo)** to support both iOS and Android, interfacing with a Node.js/Express backend, Supabase PostgreSQL database, and Socket.IO for real-time tracking.

## 2. Key Personas
- **The Customer (Rider)**: A female passenger looking for safe daily commutes or occasional rides. They value stringent security, reliable routing, and the convenience of subscription-based travel for regular office/college routes.

## 3. Core Features & User Journeys

### 3.1 Onboarding & Authentication
* **Phone Login**: Users sign in using their phone number and a 6-digit OTP.
* **Profile Setup**: Name, emergency contacts, accessibility notes.
* **Gender Verification (Crucial)**: 
  - To ensure the platform remains women-only, riders must complete gender verification.
  - Option 1: Aadhaar Card upload (front/back).
  - Option 2: Live selfie (Facial recognition matching Aadhaar).
  - Users remain in a `pending` state until approved via the backend's automated or manual KYC review.

### 3.2 Home Screen & Ride Booking Flow
* **Saved Places**: Quick access to Home, Work, and Custom saved addresses.
* **Fare Estimation**: Enter pickup and drop-off locations to view route paths, estimated distance/time, and upfront fare calculations based on vehicle type (Auto, Cab).
* **Promo Codes**: Ability to apply promotional discounts before booking.
* **Ride Searching**: Emits a socket event to the matching engine. UI shows a "Searching for driver" radar/pulse animation.

### 3.3 Active Ride & Tracking
* **Driver Assigned**: Displays driver details (name, photo, vehicle model, plate number, rating).
* **Live Tracking**: Real-time map view showing the driver's approaching vehicle (via Socket.IO `driver_location` events).
* **Trip Status**: UI transitions dynamically (`driver_en_route`, `arrived`, `in_progress`).
* **Waiting Timer**: If the driver starts waiting at the pickup, a live timer shows the free wait time countdown and subsequent per-minute waiting charges.
* **In-App Chat & Masked Calling**: Riders can chat with the driver (with auto-translation between English and local languages, e.g., Kannada) or place a masked call via Exotel.

### 3.4 Safety & SOS
* **Live Trip Sharing**: Generate a secure web link to share live trip progress with family/friends.
* **Emergency Contacts**: Manage up to 3 trusted contacts.
* **SOS Button**: A dedicated, highly visible SOS button. When triggered:
  - Connects to the Sakhi admin/support team immediately.
  - Sends automated SMS alerts with live location to emergency contacts.
  - Triggers internal backend anomaly alerts.
* **Low Battery Alert**: App monitors device battery. If it drops below 5% during an active ride, it auto-alerts emergency contacts with the last known location.

### 3.5 Subscription Rides
* **Route Setup**: Enter home and office locations, select days of the week, choose one-way or two-way, and set pickup times.
* **Plan Selection**: Choose from 7, 14, 21, or 30-day ride packages.
* **Upfront Payment**: Integrated with Razorpay for package prepayments.
* **Dashboard**: View a calendar of upcoming scheduled rides, check assigned drivers, and pause/resume or cancel the subscription.

### 3.6 Post-Ride & Profile
* **Fare Summary**: Displays base fare, distance charge, waiting fees, and applied promos.
* **Payment Collection**: Cash (default) or online UPI integration (future scope). Driver marks the ride as paid.
* **Ratings & Feedback**: Rate the driver (1-5 stars) and leave comments to ensure strict quality control.
* **Earnings & Referrals**: Riders can refer friends and view their wallet balance/credits.
* **Support**: Raise tickets for lost items, driver behavior, or payment disputes.

## 4. Screen Mapping (Based on Stitch UI Designs)

### Onboarding & Auth
- `splash_screen` / `luminous_ether` / `violet_ether` -> Splash variants
- `login_screen` -> Phone entry
- `otp_verification` -> 6-digit OTP
- `profile_setup` -> Name & basic details
- `gender_verification` / `aadhaar_upload` / `face_verification` -> KYC flow
- `verification_success` -> Approval state

### Main Booking
- `sakhi_home_screen_1/_2/_3` -> Map view with "Where to?" and Saved Places
- `ride_selection_fare_estimation` -> Vehicle options, price, ETAs
- `searching_for_driver_1/_2` -> Radar animation

### Active Ride
- `driver_assigned_en_route_1/_2` -> Driver profiles, incoming ETA
- `driver_arrived_waiting_1/_2/_3` -> Driver waiting timer
- `trip_in_progress_1/_2` / `premium_live_trip_tracking_updated` -> In-ride map, ETA to destination

### Safety
- `sos_emergency_alert` / `sos_confirmation_buffer` / `sos_alert_sent` -> Critical safety flow

### Subscriptions
- `book_a_subscription_ride` / `choose_your_plan` / `choose_payment_plan` -> Cart/Checkout for subs
- `my_subscription_dashboard_1/_2` -> Managing active plans
- `weekly_calendar_view` / `subscription_assignment_details` -> Route tracking

### Post-Ride & Settings
- `trip_completed_fare_summary` / `complete_payment`
- `ride_history` / `ride_details_1/_2`
- `my_profile` / `edit_profile` / `my_complaints`

## 5. Non-Functional Requirements
- **Performance**: Map rendering and Socket.IO connections must be optimized to prevent battery drain.
- **Offline / Edge Cases**: Handle poor network gracefully during ride tracking (optimistic UI updates, clear "Reconnecting..." indicators).
- **Theming**: Consistent use of Sakhi's signature Lavender/Violet palettes (`violet-500` primary) for a safe, modern, and premium feel.
- **Security**: Secure storage of JWT tokens (e.g., `SecureStore` in Expo). Never expose raw API keys in the client bundle.
