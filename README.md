# 🟦 SJSU Lost & Found (React Native + Firebase + Google Maps)

A full-stack React Native + Firebase Expo app for San José State University’s Lost & Found system.  
Implements real-time item posting, maps-based search, and claim workflows.

---

## ✨ Features
- 🔐 **Email/Password Authentication**
- 📸 **Post Lost/Found items** with photo (Firebase Storage)
- 🕒 **Real-time Feed** (Firestore)
- 🧭 **Search & Filter** (category, building, map-based location)
- 📍 **Google Maps Integration**
  - Interactive map centered on **SJSU campus**
  - Autocomplete search (Google Places API) for buildings like *Clark Hall*
  - Pin placement and adjustable radius
- 💬 **Claims Workflow**
  - Claimer requests ownership
  - Owner can approve or reject
  - Both get push notifications
- 🔔 **Push Notifications**
  - New item near user’s preferred area
  - Claim updates
- 🧱 **Security Rules**
  - User / Item / Claim access control
- ☁️ **Firebase Cloud Functions**
  - Notifications & cleanup jobs
- 🧪 **Testing**
  - Jest + @testing-library/react-native

---

## ⚙️ Setup

### 1️⃣ Install dependencies
```bash
git clone https://github.com/nivedita0701/Lost-and-Found-SJSU.git
cd Lost-and-Found-SJSU
npm install
```
Use the modern CLI:

```bash
npx expo start -c
```

---

2️⃣ Firebase setup

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
---

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
---
4️⃣ Required imports

At the top of App.tsx, add this line (must be first):
```ts
import 'react-native-get-random-values';
```

This polyfill fixes the crypto.getRandomValues() error from Google Places Autocomplete.

---
5️⃣ Permissions

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
6️⃣ Run the app
# Clear cache + start
```bash
npx expo start -c
```

🗂️ Data Model

| Collection | Fields |
|-----------|--------------|
|users/{uid}| { uid, email, displayName, preferredLocations[], pushToken }|
|items/{id}| { title, description, category, location, status, imageUrl, createdAt, createdAtTs, createdByUid, lat, lng, radiusM }|
|items/{id}/claims/{claimId}| { itemId, claimerUid, message, createdAt, createdAtTs, status }|
---
📄 License

MIT © 2025 San José State University — CMPE 277 Lost & Found Project
