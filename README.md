# 🌸 Sakhi — Women-First Ride-Hailing Platform

> A full-stack, production-grade ride-hailing platform built for women's safety and comfort — featuring a **customer app**, a **driver app**, and a **real-time backend** in a single monorepo.

---

## 📁 Monorepo Structure

```
sakhi/
├── backend/          # Node.js + Express REST API + Socket.IO
├── sakhi-customer/   # React Native (Expo Router) — Rider app
└── sakhi-driver/     # React Native (Expo) — Driver app
```

---

## 🧰 Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 20 |
| Framework | Express.js |
| Real-time | Socket.IO (namespaces: `/rides`, `/sos`) |
| Database | Supabase (PostgreSQL) |
| Auth | JWT (access + refresh tokens) |
| File Storage | AWS S3 |
| Face/KYC Verification | AWS Rekognition + Signzy |
| Push Notifications | Firebase Admin (FCM) |
| Payments | Razorpay |
| Masked Calling | Exotel |
| Maps / Routing | Google Maps Platform API |
| Process Logging | Winston |
| Background Jobs | node-cron |
| Validation | Zod |

### Mobile Apps (Customer and Driver)
| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK |
| Routing (Customer) | Expo Router (file-based) |
| Routing (Driver) | React Navigation (stack) |
| Real-time | Socket.IO client |
| Maps | Google Maps WebView (SmartMapView) |
| HTTP Client | Axios |
| Auth Storage | Expo SecureStore |
| Location | Expo Location |
| Images | Expo Image Picker |
| Notifications | Firebase Cloud Messaging |
| Payments | Razorpay React Native SDK |
| Haptics | Expo Haptics |
| Date Utilities | date-fns |

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────┐
│                  Sakhi Backend                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ REST API │  │Socket.IO │  │  Cron Workers │  │
│  │Port 3000 │  │/rides/sos│  │  (IST-based)  │  │
│  └────┬─────┘  └────┬─────┘  └──────┬────────┘  │
│       └─────────────┴───────────────┘            │
│              Supabase (PostgreSQL)                │
│                                                  │
│  AWS S3 · Rekognition · FCM · Razorpay           │
│  Exotel · Google Maps · Signzy                   │
└─────────────────────┬────────────────────────────┘
                      │ HTTP + WebSocket
         ┌────────────┴────────────┐
         │                         │
  ┌──────▼───────┐        ┌────────▼──────┐
  │sakhi-customer│        │ sakhi-driver  │
  │ (Expo Router)│        │(React Nav)    │
  │  Rider App   │        │  Driver App   │
  └──────────────┘        └───────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 20, npm ≥ 9
- Expo CLI: `npm install -g expo-cli`
- Expo Go on iOS or Android

### 1. Clone
```bash
git clone https://github.com/devagarwal07/sakhi.git
cd sakhi
```

### 2. Backend
```bash
cd backend
cp .env.local .env
npm install
npm run dev        # http://localhost:3000
```

### 3. Customer App
```bash
cd sakhi-customer
npm install
npx expo start     # port 8081
```

### 4. Driver App
```bash
cd sakhi-driver
npm install
npx expo start --port 8082
```

---

## ⚙️ Environment Variables

### Backend `.env`

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `JWT_SECRET` | Access token secret |
| `JWT_REFRESH_SECRET` | Refresh token secret |
| `AWS_ACCESS_KEY_ID` | AWS key for S3 + Rekognition |
| `AWS_SECRET_ACCESS_KEY` | AWS secret |
| `AWS_REGION` | e.g. `ap-south-1` |
| `AWS_S3_BUCKET` | S3 bucket name |
| `GOOGLE_MAPS_KEY` | Google Maps API key |
| `EXOTEL_SID` | Exotel account SID |
| `EXOTEL_TOKEN` | Exotel auth token |
| `EXOTEL_APP_ID` | Exotel app ID |
| `RAZORPAY_KEY_ID` | Razorpay key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook HMAC |
| `FIREBASE_SA_KEY` | Firebase Admin service account JSON |
| `SIGNZY_API_KEY` | Signzy KYC API key |
| `PORT` | Server port (default `3000`) |
| `NODE_ENV` | `development` or `production` |

### Apps `.env`

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend URL e.g. `http://192.168.x.x:3000` |
| `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | Google Maps key |
| `EXPO_PUBLIC_RAZORPAY_KEY` | Razorpay publishable key |

---

## 📡 API Reference

Base URL: `http://localhost:3000`
All protected routes require `Authorization: Bearer <token>`

### Auth `/auth`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/send-otp` | Send OTP to phone |
| POST | `/auth/verify-otp` | Verify OTP, get JWT tokens |
| POST | `/auth/refresh-token` | Rotate access token |
| POST | `/auth/logout` | Invalidate session |

### Rides `/rides`
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/rides/estimate` | rider/driver | Fare estimate |
| POST | `/rides` | rider | Book new ride |
| GET | `/rides/:id` | any | Ride details |
| PATCH | `/rides/:id/status` | driver | Update status |
| PATCH | `/rides/:id/cancel` | rider/driver | Cancel ride |
| POST | `/rides/:id/accept` | driver | Accept ride |
| POST | `/rides/:id/reject` | driver | Reject ride |
| POST | `/rides/:id/payment/order` | rider/driver | Create Razorpay order |
| POST | `/rides/:id/payment/verify` | rider/driver | Verify payment |
| GET | `/rides/:id/fare-summary` | rider/driver | Final fare breakdown |
| POST | `/rides/:id/cash-collected` | driver | Mark cash collected |
| POST | `/rides/:id/rate-rider` | driver | Rate the rider |
| GET | `/rides/:id/chat` | rider/driver | Chat history |

### Drivers `/drivers`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/drivers/profile` | Driver profile + stats |
| PATCH | `/drivers/profile` | Update name / photo |
| PATCH | `/drivers/status` | Toggle online / offline |
| POST | `/drivers/vehicle` | Submit vehicle info |
| POST | `/drivers/kyc/upload` | Upload KYC documents |
| POST | `/drivers/kyc/re-upload` | Re-upload rejected docs |
| POST | `/drivers/verify-identity` | Selfie face-match (Rekognition) |
| GET | `/drivers/earnings/today` | Today's earnings |
| GET | `/drivers/earnings/weekly` | Weekly earnings |
| GET | `/drivers/earnings/ledger` | Paginated ledger |
| GET | `/drivers/rides` | Ride history |
| GET | `/drivers/commission/status` | Unpaid commission |
| GET | `/drivers/subscription` | Subscription status |
| GET | `/drivers/complaints` | List complaints |
| POST | `/drivers/complaints` | Raise complaint |
| PATCH | `/drivers/payment-details` | Update UPI/bank |
| PATCH | `/drivers/notification-settings` | Notification prefs |
| POST | `/drivers/profile/phone/send-otp` | Phone change — step 1 |
| POST | `/drivers/profile/phone/verify-otp` | Phone change — step 2 |

### Subscriptions `/subscriptions`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/subscriptions` | List plans |
| GET | `/subscriptions/:id` | Plan detail |
| GET | `/subscriptions/:id/status` | Active status |
| PATCH | `/subscriptions/:id/pause` | Pause |
| PATCH | `/subscriptions/:id/resume` | Resume |
| PATCH | `/subscriptions/:id/cancel` | Cancel |
| GET | `/subscriptions/pending-payment` | Pending payment check |

### Safety `/safety`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/safety/sos` | Trigger SOS |
| POST | `/safety/sos/cancel` | Cancel SOS |
| GET | `/safety/emergency-contacts` | List contacts |
| POST | `/safety/emergency-contacts` | Add contact |
| DELETE | `/safety/emergency-contacts/:id` | Remove contact |
| POST | `/safety/share-trip/:ride_id` | Share live trip |
| POST | `/safety/call/:ride_id` | Masked call via Exotel |
| POST | `/safety/battery-low` | Battery low alert |

### Payments `/payments`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/payments/order` | Subscription Razorpay order |
| POST | `/payments/verify` | Verify subscription payment |
| POST | `/payments/commission/order` | Driver commission order |
| POST | `/payments/commission/verify` | Verify commission payment |

---

## 🔌 Socket.IO Events

**Namespace: `/rides`**

| Event | Direction | Description |
|---|---|---|
| `driver:online` | client→server | Driver announces presence |
| `driver:location_update` | client→server | Stream live GPS coordinates |
| `ride_request` | server→driver | New ride request (30s window) |
| `ride_request_expired` | server→driver | Driver timed out |
| `ride:accept` | client→server | Driver accepts ride |
| `ride:reject` | client→server | Driver rejects ride |
| `ride_assigned` | server→rider | Driver confirmed |
| `ride_cancelled` | server→both | Ride cancelled |
| `ride:complete` | client→server | Driver marks trip complete |
| `payment:success` | server→driver | Online payment confirmed |
| `driver:location` | server→rider | Live position update |

**Namespace: `/sos`**

| Event | Description |
|---|---|
| `sos:triggered` | Alert sent to emergency contacts |
| `sos:cancelled` | SOS dismissed |

---

## 🤖 Matching Engine

RAR-weighted composite dispatch score:

```
composite_score = distance_meters × (1 + 1.5 × (1 − RAR))
```

- **RAR** = acceptance_rate (total_accepts / total_requests)
- Low-RAR drivers appear farther — reliable drivers get priority
- New drivers (< 5 requests) treated as RAR = 1.0 (neutral)
- Radius expands: 2km → 3km → ... → 10km → no drivers available
- Per-driver timeout: **30 seconds**
- Global cap: **5 minutes**

---

## ⏱️ Background Workers

| Worker | Schedule | Purpose |
|---|---|---|
| `SubscriptionRideScheduler` | Every 5 min | Auto-assign subscription rides |
| `DriverTimeoutWorker` | Every 5 min | Cancel stalled/offline rides |
| `LoyaltyMilestoneWorker` | Midnight daily IST | Award loyalty milestones |
| `LeaderboardWorker` | Mon 01:30 IST | Recalculate driver leaderboard |
| `LoyaltyTierWorker` | Daily 02:00 IST | Recalculate Gold/Silver tiers |

---

## 📱 Customer App — Screen Map

```
(auth)/   splash → login → otp
(kyc)/    intro → aadhaar → face → pending
(tabs)/   Home | Activity | Subscriptions | Safety | Profile
          ├── active-ride        live map + driver tracking
          ├── driver-arrived     driver at pickup
          ├── ride-finding       searching for driver
          ├── ride-estimate      fare + book CTA
          ├── ride-summary       post-ride summary
          ├── payment            Razorpay sheet
          ├── payment-success    confirmation
          ├── subscription-*     plans, details, payment, live ride
          ├── sos-warning        3s countdown
          ├── sos-active         active SOS
          ├── sos-settings       manage contacts
          ├── location-search    pickup / drop search
          ├── saved-places       favourite locations
          ├── wallet             balance + transactions
          ├── notifications      notification centre
          ├── edit-profile       name, photo
          ├── change-phone       phone number flow
          ├── complaint          raise complaint
          ├── about              app info
          └── terms              ToS + Privacy (inline)
```

---

## 🚗 Driver App — Screen Map

```
Auth/          Splash → Login → OTP
Onboarding/    KYC Upload → Gender Verify → Vehicle → Under Review → Approved
Home/          DriverHome (offline) → OnlineDashboard → IncomingRideRequest (overlay)
Ride/          EnRouteToPickup → ArrivedWaiting → TripInProgress → PaymentDetails
               → RideHistory → CompletedRideDetails
Earnings/      EarningsDashboard → DailyCommissionPayment → CommissionConfirmation
Subscriptions/ RidesOverview → AssignmentDetails → WeeklyCalendar
Profile/       MyProfile → EditProfile → MyDocuments → PaymentDetails
               → TransactionHistory → Notifications → Complaints → RaiseComplaint
               → HelpSupport → About → TermsPrivacy → ChangePhone → Logout
```

### Driver Ride Flow
```
IncomingRequest (30s timer)
  → EnRouteToPickup  (live map, location streaming)
  → ArrivedWaiting   (waiting timer)
  → TripInProgress   (live map to dropoff)
  → PaymentDetails   (fare breakdown + rate rider)
  → OnlineDashboard  (ready for next ride)
```

---

## 🎨 Design System (`src/utils/theme.js`)

Both apps share a unified theme file as the single source of truth.

| Token | Value | Usage |
|---|---|---|
| `primary` / `primaryContainer` | `#BEA3D8` | Buttons, loaders, active states |
| `background` / `surface` | `#F5F0FF` | Screen backgrounds |
| `onBackground` / `onSurface` | `#1E1B2E` | Primary text |
| `onSurfaceVariant` | `#64748B` | Muted / secondary text |
| `outline` | `#94A3B8` | Borders, dividers |
| `success` | `#059669` | Online status, completed |
| `error` | `#BA1A1A` | SOS, error states |
| **Font** | Inter (Google Fonts) | All screens |

**Spacing scale:** xs:4 · sm:8 · md:16 · lg:24 · xl:32 · xxl:48

---

## 🔒 Security

- JWT access + refresh token rotation on every session
- Role guards on every route (`rider` / `driver` / `admin`)
- Rate limiting: OTP (5/hr), API (100/15min), estimates (30/min)
- AWS Rekognition face-match for gender + identity KYC
- Signzy Aadhaar verification
- Exotel masked calling — neither party sees real numbers
- RAR penalisation deprioritises low-acceptance drivers

---

## 🧪 Testing

```bash
cd backend
npm test                # Run all unit tests
npm run test:coverage   # Coverage report
```

---

## 📦 Production Deployment

**Backend**
```bash
# Any Node.js host (Railway, Render, EC2, etc.)
NODE_ENV=production npm start
```

**Mobile Apps**
```bash
# Expo EAS Build
eas build --platform ios
eas build --platform android
```

---

## 📄 License

Private — All rights reserved © Sakhi Platform 2026
