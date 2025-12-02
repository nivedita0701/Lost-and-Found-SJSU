// src/services/notifications.ts
import * as Notifications from "expo-notifications";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export async function registerForPushAsync(nativeFcmToken?: string) {
  // Ask permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    throw new Error("Permission not granted for notifications");
  }

  // Expo push token (SDK 51: projectId param is optional)
  const tokenData = await Notifications.getExpoPushTokenAsync();
  const expoToken = tokenData.data;

  const uid = auth.currentUser?.uid;
  if (!uid) return;

  // Upsert user doc with tokens
  await setDoc(
    doc(db, "users", uid),
    {
      pushToken: expoToken, // legacy single token
      nativeFcmToken: nativeFcmToken || null,
      email: auth.currentUser?.email || null,
    },
    { merge: true }
  );

  // Read existing tokens[], de-dupe, write back
  const snap = await getDoc(doc(db, "users", uid));
  const existing: string[] = Array.isArray(snap.data()?.tokens) ? snap.data()!.tokens : [];
  const dedup = Array.from(new Set([...(existing || []), expoToken].filter(Boolean)));
  await updateDoc(doc(db, "users", uid), { tokens: dedup });
}
