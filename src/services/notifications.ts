import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { db, auth } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";

export async function registerForPushAsync() {
  let token = "";
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    return "";
  }
  token = (await Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig?.extra?.eas?.projectId || "" })).data;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", { name: "default" });
  }
  const uid = auth.currentUser?.uid;
  if (uid && token) {
    await updateDoc(doc(db, "users", uid), { pushToken: token });
  }
  return token;
}
