# Ivanta Property — Mobile App v2 Context Document

> Share this document with any AI assistant to give them full context about the current state of the mobile app.  
> Last updated: August 2026  
> Project path: `/Users/meetjobanputra/Documents/IvantaProperties-main/mobile-app-v2`

---

## Overview

**Ivanta Property** is a React Native (Expo) mobile app for browsing and saving real estate listings in India. The app is a **buyer-only experience** — users can browse properties, search, filter, save favorites, and contact the agency. There is no posting, no broker dashboard, no admin panel in the mobile app.

The backend is a **Next.js 14** app hosted at `https://www.ivantaproperty.com` with MongoDB as the database.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81.5 + Expo SDK 54 |
| Navigation | React Navigation v7 (Stack + Bottom Tabs) |
| Auth | OTP (MSG91) + Google OAuth + Email/Password |
| Storage | AsyncStorage (session + favorites cache) |
| UI | Custom components, Expo Vector Icons, Expo Blur, Expo Linear Gradient |
| Theme | Custom ThemeContext (light / dark / system) |
| Backend | Next.js 14 API routes at `https://www.ivantaproperty.com/api` |
| Database | MongoDB (via Mongoose) |
| Image | expo-image |
| Maps | react-native-maps |

---

## User Role

There is **only one role: `User`**. All broker, builder, owner, and admin roles have been removed from the mobile app. The `AuthUser` type is:

```ts
export type UserRole = 'User';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};
```

---

## Navigation Structure

### Bottom Tab Navigator (4 tabs)

```
HomeTab      → HomeScreen        (home icon)
ExploreTab   → SearchScreen      (search icon)
FavoritesTab → FavoritesScreen   (heart icon)
ProfileTab   → ProfileScreen     (person icon)
```

The tab bar is a custom `FloatingBottomNav` component. On iOS it uses a `BlurView` background; on Android it uses a solid semi-transparent background with elevation.

There is **no Post tab** — property posting has been removed from the mobile app entirely.

### Stack Navigator (wraps the tabs)

```
MainTabs         → Bottom tab navigator (headerShown: false)
Properties       → Property listing screen (with filters)
PropertyDetail   → Full property detail page
Filters          → Filter modal screen
Login            → Auth screen
NearbyMap        → Map view of nearby properties
Notifications    → Notification history
Loans            → EMI calculator / loan info
Builders         → Top builders listing
```

Navigation transitions use horizontal iOS-style spring animations.

---

## Screens

### 1. HomeScreen (`src/screens/HomeScreen.tsx`)

The main landing screen. Contains:
- Animated header with the Ivanta logo and a notification bell icon
- Greeting text (uses `user.name` if logged in)
- Horizontal filter chips for property categories (Buy, Rent, Commercial, Plot, PG, New Projects)
- Horizontally scrollable property cards grouped by category
- Each property card has a heart button for favorites
- Drawer menu accessible from a menu icon

**Data flow:**
- Calls `getPropertiesByCategory()` on mount
- Calls `getFavorites(user.id)` on focus to populate the favorites state
- `toggleFavorite(propertyId)` calls `addFavorite` or `removeFavorite`

---

### 2. SearchScreen (`src/screens/SearchScreen.tsx`) — "Explore" tab

A full search experience with:
- Search text input with real-time suggestions
- Recent searches (stored in AsyncStorage)
- Popular locations quick-pick chips
- Search results rendered as a 2-column property card grid
- Tapping a result navigates to `PropertyDetail`

---

### 3. FavoritesScreen (`src/screens/FavoritesScreen.tsx`) — "Saved" tab

Shows the logged-in user's saved properties.

**States:**
- **Not logged in** → Auth wall: "Sign in to view saved properties" with Sign In and Browse buttons
- **Loading** → Two skeleton placeholder cards
- **Empty** → Empty state with heart icon, "No saved properties" message, Browse button
- **Has favorites** → 2-column grid of `PropertyCard` components with count badge in header

**Behavior:**
- Loads on every screen focus via `useFocusEffect`
- Optimistic removal: card disappears immediately when heart is tapped, then API call fires
- Pull-to-refresh supported

---

### 4. ProfileScreen (`src/screens/ProfileScreen.tsx`) — "Profile" tab

A clean user profile and settings screen. Sections:

**Profile Card** (top)
- Person icon avatar
- User name and email (or "Guest User" / "Sign in to access more features" if not logged in)

**Auth Button**
- If logged in: Logout button (calls `setUser(null)`, clears AsyncStorage session)
- If not logged in: "Sign In / Register" gradient button → navigates to LoginScreen

**My Account** group
- Saved Properties → navigates to FavoritesTab
- Notifications → navigates to Notifications screen

**Services** group
- Loan Solutions → Loans screen
- New Projects → Builders screen

**Contact Ivanta** group
- Call (+91 84605 67890)
- WhatsApp
- Email (ivantaproperty@gmail.com)
- Visit Website (ivantaproperty.com)

**Social** group
- Instagram, Facebook, LinkedIn

**App** group
- Appearance toggle (Light / Dark / System) — segmented control
- Rate App
- Privacy Policy

**Footer**: Office address + app version

---

### 5. PropertyDetailScreen (`src/screens/PropertyDetailScreen.tsx`)

Full property detail view. Contains:
- Image gallery with horizontal scroll and dot indicators
- Animated header that fades in on scroll (with back, share, heart buttons)
- Property title, type badge, price
- Key stats row (sqft, bedrooms, area)
- Description
- Amenities list
- Location section
- Similar properties horizontal list
- Contact buttons: Call, WhatsApp
- Floating bottom bar with contact CTA

**Favorites:**
- Heart icon in header (filled red if favorited, outline if not)
- `toggleFavorite()` does optimistic UI flip, rolls back on failure

---

### 6. LoginScreen (`src/screens/LoginScreen.tsx`)

Three auth flows:

1. **Google OAuth** — Opens a WebBrowser session pointing to `/api/auth/google?role=User&source=app`, gets a token in the redirect URL, exchanges via `/api/auth/token-exchange`

2. **OTP Sign Up** (default tab)
   - Fields: Full Name, Email (optional), Mobile (10-digit)
   - Sends OTP via `POST /api/auth/send-otp`
   - 6-box OTP input UI
   - Verifies via `POST /api/auth/verify-otp`

3. **Email Sign In**
   - Fields: Email, Password
   - Calls `appEmailLogin()` → `POST /api/auth/login` → token exchange

All flows always register/login as `role: 'User'`. After success, `setUser()` is called which persists to AsyncStorage under `@ivanta_user_session`.

---

## Authentication & Session

### How it works

- Session is stored in AsyncStorage under key `@ivanta_user_session`
- On app launch, the session is restored **before** the app renders (prevents auth-wall flash)
- `persistUser(u)` is used everywhere instead of raw `setUser` — it writes to AsyncStorage
- Logout clears the AsyncStorage key and sets `user = null`

### How the backend identifies the mobile user

The mobile app sends the user ID as an HTTP header:
```
x-user-id: <user.id>
```

The backend's `/api/favorites` route accepts **both** the `userData` cookie (web) and the `x-user-id` header (mobile) for authentication.

---

## Favorites System

### How it works end-to-end

1. **Adding a favorite:** Optimistically updates AsyncStorage → then POSTs to `POST /api/favorites` with `x-user-id` header
2. **Removing a favorite:** Optimistically updates AsyncStorage → then calls `DELETE /api/favorites?propertyId=<id>` with `x-user-id` header
3. **Loading favorites:** Tries `GET /api/favorites` first → on success, syncs AsyncStorage cache → on failure (offline/401), falls back to AsyncStorage cache and fetches full property objects via `getPropertyById()`

### Database schema (MongoDB)

```
Collection: favorites
Fields:
  userId:     String (required) — the user's ID from AuthUser.id
  propertyId: String (required) — the property's MongoDB _id
  createdAt:  Date (auto)
  updatedAt:  Date (auto)

Index: { userId: 1, propertyId: 1 } unique — prevents duplicates
```

### Backend API (`/api/favorites`)

| Method | Auth | Behavior |
|---|---|---|
| GET | x-user-id or userData cookie | Returns full property objects for all favorites, ordered by most recently added |
| POST | x-user-id or userData cookie | Adds a favorite; duplicate returns 200 (not 400) |
| DELETE | x-user-id or userData cookie | Removes a favorite by `?propertyId=<id>` |

---

## API Service (`src/services/api.ts`)

Base URL: `process.env.EXPO_PUBLIC_API_BASE` (defaults to `https://www.ivantaproperty.com/api`)

### Key functions

```ts
// Properties
getProperties(filters?)          → Property[]
getPropertiesByCategory()        → Record<string, Property[]>
getPropertyById(id)              → Property | null
searchProperties(query)          → Property[]
getSimilarProperties(property)   → Property[]

// Auth
appEmailLogin(email, password)   → AuthUser | null

// Favorites
getFavorites(userId)             → Property[]      // with AsyncStorage fallback
addFavorite(userId, propertyId)  → boolean         // optimistic local + server sync
removeFavorite(userId, propertyId) → boolean       // optimistic local + server sync

// Settings
getSettings()                    → { areas: string[], landmarks: string[] }
```

All GET requests have a 15-second timeout via `AbortController`. Network failures return `null` and the calling functions fall back gracefully.

---

## Theme System

The app supports **Light**, **Dark**, and **System** themes via a custom `ThemeContext`.

- `useTheme()` returns `{ colors, isDark, mode, setMode }`
- Theme preference is persisted (ThemeContext handles this internally)
- All screens and components receive `colors` from `useTheme()` and never use hardcoded color values

---

## Property Type

```ts
interface Property {
  _id: string;
  title: string;
  slug: string;
  price?: string;
  priceFrom?: string;
  priceTo?: string;
  propertyType: 'buy' | 'rent' | 'commercial' | 'plot' | 'pg' | 'new' | string;
  subType: string;
  area: string;
  city: string;
  state: string;
  sqft: string;
  description: string;
  images: string[];
  isSold?: boolean;
  isVerified?: boolean;
  isNewProject?: boolean;
  amenities?: string[];
  bedrooms?: string;
  bathrooms?: string;
  facing?: string;
  lat?: number;
  lng?: number;
  contactPhone?: string;
  category?: 'Featured' | 'Luxury' | 'Popular' | 'Upcoming' | 'None';
  createdAt: string;
}
```

---

## What Was Removed

The following were stripped from the app to simplify it to a buyer-only experience:

| Removed | Where it was |
|---|---|
| Broker role + dashboard | ProfileScreen, auth/types.ts |
| Builder role + dashboard | ProfileScreen, auth/types.ts |
| Owner role + dashboard | ProfileScreen, auth/types.ts |
| Admin role + Admin Panel | ProfileScreen, auth/types.ts, App.tsx |
| Demo role switcher | ProfileScreen |
| Post Property tab (FAB) | FloatingBottomNav, App.tsx (MainTabs) |
| AdminScreen | App.tsx (stack navigator) |
| `adminLogin()` | api.ts |
| `getAdminCookie()` | api.ts |
| `adminHeaders()` | api.ts |
| `adminGetAllProperties()` | api.ts |
| `adminCreateProperty()` | api.ts |
| `adminDeleteProperty()` | api.ts |
| `adminMarkSold()` | api.ts |
| `adminGetUsers()` | api.ts |
| `adminUpdateUserRole()` | api.ts |
| `getAnalytics()` | api.ts |

---

## File Structure (key files)

```
mobile-app-v2/
├── App.tsx                          Main app entry, session restore, navigation setup
├── src/
│   ├── auth/
│   │   ├── types.ts                 AuthUser, UserRole = 'User'
│   │   └── context.ts               AuthContext, useAuth hook
│   ├── screens/
│   │   ├── HomeScreen.tsx           Landing screen with property categories
│   │   ├── SearchScreen.tsx         Search + Explore tab
│   │   ├── FavoritesScreen.tsx      Saved properties tab
│   │   ├── ProfileScreen.tsx        User profile + settings
│   │   ├── PropertyDetailScreen.tsx Full property view
│   │   ├── LoginScreen.tsx          OTP / Google / Email auth
│   │   ├── PropertiesScreen.tsx     Filtered property listing
│   │   ├── FiltersScreen.tsx        Filter modal
│   │   ├── NearbyMapScreen.tsx      Map view
│   │   ├── NotificationScreen.tsx   Notification history
│   │   ├── LoansScreen.tsx          Loan calculator
│   │   └── BuildersScreen.tsx       Builders listing
│   ├── components/
│   │   ├── PropertyCard.tsx         Reusable property card with heart button
│   │   ├── PropertySkeleton.tsx     Loading placeholder
│   │   ├── DrawerMenu.tsx           Slide-in side menu on HomeScreen
│   │   └── modern/
│   │       ├── FloatingBottomNav.tsx  Custom bottom tab bar (4 tabs)
│   │       └── PremiumGradientButton.tsx
│   ├── services/
│   │   └── api.ts                   All API calls + favorites logic
│   ├── theme/
│   │   ├── ThemeContext.tsx          Light/Dark/System theme provider
│   │   └── colors.ts                Color tokens per theme
│   ├── navigation.ts                RootStackParamList type definitions
│   └── types/
│       └── Property.ts              Property interface
├── .env                             EXPO_PUBLIC_API_BASE=https://www.ivantaproperty.com/api
└── package.json
```

---

## Environment Variables

```env
EXPO_PUBLIC_API_BASE=https://www.ivantaproperty.com/api
EXPO_PUBLIC_DEMO_MODE=false
```

---

## Known Issues / Notes

1. **Favorites 401 error** — The deployed backend at `ivantaproperty.com` was updated to accept `x-user-id` header from mobile. Until the server is redeployed, the app falls back to AsyncStorage for favorites automatically (no crash, just no server sync).

2. **Push notifications** — `expo-notifications` remote push was removed from Expo Go in SDK 53. The app silently skips push token registration when running in Expo Go. This is expected behavior — not a bug.

3. **No `/api/auth/login` route on backend** — The `appEmailLogin()` function calls `POST /api/auth/login`. If this route doesn't exist on the backend, email sign-in will fail. OTP and Google OAuth are the reliable auth flows.

---

## Backend (Next.js — `IvantaProperties-main/`)

The backend is a separate Next.js 14 app at the root of the monorepo. Key API routes relevant to mobile:

| Route | Method | Purpose |
|---|---|---|
| `/api/properties` | GET | List all properties (with filters) |
| `/api/properties/:id` | GET | Single property by ID or slug |
| `/api/favorites` | GET | Get user's favorites (x-user-id header) |
| `/api/favorites` | POST | Add to favorites |
| `/api/favorites` | DELETE | Remove from favorites `?propertyId=<id>` |
| `/api/auth/send-otp` | POST | Send OTP to mobile number |
| `/api/auth/verify-otp` | POST | Verify OTP, returns token |
| `/api/auth/token-exchange` | GET | Exchange one-time token for userData |
| `/api/auth/google` | GET | Initiate Google OAuth |
| `/api/settings` | GET | Get areas and landmarks lists |
| `/api/push-token` | POST | Register Expo push token |
