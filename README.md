# 📱 SJSU Lost & Found

A mobile app for SJSU students to **post, search, and claim lost & found items** on campus.  
Built with **React Native (Expo)** and **Firebase**, with support for **real-time updates**, **chat**, **claims**, **push notifications**, and **dark/light theming**.

---

## 📚 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [App Architecture](#app-architecture)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Clone & Install](#2-clone--install)
  - [3. Firebase Setup](#3-firebase-setup)
  - [4. Cloudinary Setup](#4-cloudinary-setup)
  - [5. Google Places API Setup](#5-google-places-api-setup)
  - [6. Notifications Setup](#6-notifications-setup)
  - [7. Run the App](#7-run-the-app)

---

## Overview

**Problem:**  
Students frequently lose ID cards, keys, electronics, etc., but there is no **central, student-only, mobile-friendly** system for connecting finders with owners.

**Solution:**  
SJSU Lost & Found is a **campus-only marketplace** for lost & found items:

- Only **@sjsu.edu** emails can register.
- Items are posted with **photo, category, status, and campus location**.
- Other students can **claim items** and **chat** with the poster to verify ownership.
- Owners can approve a claim, which updates the item’s state and rejects other claims.

---

## Features

### 🔐 Authentication & Profiles

- Email/password auth restricted to **`@sjsu.edu`** addresses.
- User profile with:
  - Photo (upload via gallery)
  - Display name
  - Email
  - Stats: **Items posted**, **Claims made**
- Profile editing for self (photo + display name).
- View other users’ profiles (read-only).

### 📝 Posting Items

- Create new items with:
  - Title, description
  - Category (Electronics, Clothing, ID, Keys, Charger, Other)
  - Status (**Lost** or **Found**)
  - Campus location (search + map)
  - Photo (camera or gallery, uploaded to Cloudinary)
- Items are saved to Firestore with:
  - `claimed` boolean
  - Coordinates, radius, building, and address metadata.

### 🔍 Feed & Search

- Home feed showing latest items.
- Filters:
  - All, Lost, Found, Claimed, Unclaimed
- Sorting:
  - Newest, Oldest, Category
- Full-text-ish search across:
  - Title, description, location, category

### 📍 Map & Location

- **Google Places Autocomplete** in the New Item map modal.
- Long-press map to drop a pin (using `expo-location` and `react-native-maps`).
- “Center on me” shortcut.
- On item detail, open Google Maps directions.

### 🧾 Claims System

- Any logged-in user can submit a **claim** on an item (with optional message).
- Owner sees a list of claims:
  - Claimer name
  - Status (Pending, Approved, Rejected)
  - Message
- Owner can **Approve** or **Reject**:
  - Approve:
    - Marks item as `claimed: true`
    - Sets `claimedByUid`, `claimedAtTs`
    - Auto-rejects all other pending claims
  - Reject:
    - Only updates that claim’s status

### 💬 Chat

- Owner and claimer can open a **direct chat** about an item.
- Thread is tied to an `itemId` and exactly 2 participants.
- Messages stored in Firestore under `/chats/{threadId}/messages`.

### 🎨 Theming & Settings

- Theme modes:
  - **System**, **Light**, **Dark**
- Accent color:
  - **Blue**, **Gold**, **Purple**
- Theme and accent are:
  - Managed via a central `ThemeProvider`
  - Persisted in `users/{uid}.prefs`
- Settings screen:
  - Enable push notifications
  - Change theme & accent

### 🔔 Push Notifications

- Uses **Expo Notifications**.
- “Enable push notifications” in Settings:
  - Registers the device for push
  - Stores token on the user record (via `notifications.ts`)
- Intended triggers (depending on backend cron/service):
  - New item near the user’s saved buildings/keywords
  - Activity (claims, approvals, messages) involving the user

### 🧮 Analytics / Stats

- On create item:
  - `users/{uid}.stats.itemsPosted` is incremented.
- On create claim:
  - `users/{uid}.stats.claimsMade` is incremented.
- Profile screen shows:
  - `Items posted: X • Claims made: Y`

---

## Tech Stack

**Core:**
- React Native (Expo)
- TypeScript
- Firebase JS SDK (Auth + Firestore)

**Packages / Libraries Used:**

- `firebase`
- `@react-native-async-storage/async-storage`
- `@react-navigation/native`
- `@react-navigation/native-stack` (or equivalent for navigation)
- `expo-image-picker`
- `expo-location`
- `expo-notifications`
- `expo-device`
- `expo-constants`
- `react-native-maps`
- `@react-native-community/slider`
- `react-native-google-places-autocomplete`

> All of these packages are installed and referenced in the project.  
> Running `npm install` will install them through `package.json`.

**External Services:**

- **Firebase**: Auth, Firestore, security rules
- **Cloudinary**: Image hosting
- **Google Places API**: Address autocomplete

---

## App Architecture

- **View Layer (Screens)**: in `src/screens`
- **Domain Logic / Services**: in `src/services`
  - `auth.ts`, `items.ts`, `claims.ts`, `chats.ts`, `notifications.ts`
- **Theming**: `src/ui/ThemeProvider.tsx` & `src/ui/theme.ts`
- **Firebase Setup**: `src/firebase.ts`

The UI is **state-driven**, with Firestore `onSnapshot` listeners for:
- Item details
- Claims
- Chat threads and messages
- Live feed

---

## Project Structure

```bash
src/
 ├── screens/
 │    ├── FeedScreen.tsx
 │    ├── ItemDetailScreen.tsx
 │    ├── NewItemScreen.tsx
 │    ├── LoginScreen.tsx
 │    ├── RegisterScreen.tsx
 │    ├── ProfileScreen.tsx
 │    ├── MyItemsScreen.tsx
 │    ├── SettingsScreen.tsx
 │    ├── MapScreen.tsx        # if separated
 │    └── ReportIssueScreen.tsx
 │
 ├── services/
 │    ├── auth.ts
 │    ├── items.ts
 │    ├── claims.ts
 │    ├── chats.ts
 │    └── notifications.ts
 │
 ├── ui/
 │    ├── ThemeProvider.tsx
 │    └── theme.ts
 │
 ├── firebase.ts
 ├── types.ts
 └── App.tsx / app entry

---

## ⚙️ Setup

### Prerequisites

- Node.js and npm
- Expo CLI
- A Firebase project with Firestore + Auth enabled
- A Cloudinary account
- A Google Cloud project with Places API enabled

### 1️⃣ Install dependencies
```bash
git clone https://github.com/nivedita0701/Lost-and-Found-SJSU.git
cd Lost-and-Found-SJSU
npm install
```
Use the modern CLI:

```bash
npm start -- --clear
```

### 2️⃣ Firebase setup

1. Create a Firebase project.
2. Enable:
   * Authentication → Email/Password
   * Cloud Firestore
   * Cloud Storage
   * (Optional) Cloud Functions if you want notifications.
3. Copy your web config from Firebase Console → Project Settings → General
4. Paste it into:
```ts
// src/firebase.ts
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};
```
5. Add rules:
```bash
firebase deploy --only firestore:rules,storage:rules
```

6. (Optional) Deploy Cloud Functions:
```bash
cd functions
npm install
npm run deploy
```

3️⃣ Google Maps / Places API

The app uses Google Maps Places Autocomplete for real search and building suggestions.

1. Enable APIs
2. Go to Google Cloud Console
3. Enable:
   * Places API
   * Maps JavaScript API
   * (Optional) Geocoding API

4. Create an API Key
5. Restrict to Places API and Maps JavaScript API
6. For testing, leave unrestricted.
7. Add key to environment
   * Create a file named .env in your project root:
   ```bash
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
   ```
8. Then update app.config.js:
```ts
export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
  },
});
```

4️⃣ Cloudinary Setup

1. The project uses unsigned uploads to Cloudinary.
2. Go to Cloudinary dashboard → Settings → Upload.
3. Create an unsigned upload preset named: cmpe277
4. Ensure the Cloud name in src/services/items.ts matches your Cloudinary cloud name:
```js
// src/services/items.ts
const CLOUD_NAME = "dgdzposxm";       // change if needed
const UPLOAD_PRESET = "cmpe277";
```
5. Images will be uploaded to the lostfound folder by default.


5️⃣ Required imports

At the top of App.tsx, add this line (must be first):
```ts
import 'react-native-get-random-values';
```

This polyfill fixes the crypto.getRandomValues() error from Google Places Autocomplete.

6️⃣ Permissions

Add this to your app.json:
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "We use your location to help you place lost/found items on the campus map."
      }
    },
    "android": {
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION"
      ]
    }
  }
}
```
Run the app
# Clear cache + start
```bash
npm start -- --clear
```
---

## 🗂️ Data Model

| Collection | Fields |
|-----------|--------------|
|users/{uid}| { uid, email, displayName, preferredLocations[], pushToken }|
|items/{id}| { title, description, category, location, status, imageUrl, createdAt, createdAtTs, createdByUid, lat, lng, radiusM }|
|items/{id}/claims/{claimId}| { itemId, claimerUid, message, createdAt, createdAtTs, status }|
---
📄 License

MIT © 2025 
San José State University
