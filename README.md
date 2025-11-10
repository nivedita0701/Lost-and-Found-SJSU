# SJSU Lost & Found (React Native + Firebase)

A complete starter implementing auth, real-time feed, photo uploads, search & filters, claims workflow, and push notifications.

## Features
- Email/Password **Authentication**
- **Post Lost/Found items** with photo (Firebase Storage)
- **Real-time Feed** (Firestore)
- **Search & Filter** (category/location)
- **Claims**: users can request ownership; owners can approve/reject
- **Push Notifications**:
  - New item near preferred locations (owner: anyone with matching prefs)
  - Owner notified when a new claim arrives
  - Claimer notified when claim is **approved**
- **Security Rules** for users/items/claims
- **Cloud Functions** for notifications
- Minimal unit test setup (Jest)

## Setup
1. `npm install`
2. Create Firebase project → enable Auth, Firestore, Storage.
3. Put Web config into `src/firebase.ts` (replace placeholders).
4. In Firebase Console → Rules: use `firestore.rules` and `storage.rules`.
5. **Functions**:
   ```bash
   cd functions
   npm install
   npm run deploy
   ```
6. Run app:
   ```bash
   npm run start
   ```

## Data Model
- `users/{uid}`: { uid, email, displayName, preferredLocations[], pushToken }
- `items/{id}`: { title, description, category, location, status, imageUrl, createdAt, createdAtTs, createdByUid }
- `items/{id}/claims/{claimId}`: { itemId, claimerUid, message, createdAt, createdAtTs, status }

## Milestones (tie to your course rubric)
- UX artifacts (personas, wireframes) in Figma
- System architecture diagram (app ↔ Firebase services)
- Implementation with code quality/testing
- Performance: avoid blocking UI; use listeners prudently
- Final report + demo
