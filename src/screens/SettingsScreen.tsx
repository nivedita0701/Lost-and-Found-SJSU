import React, { useState } from "react";
import { View, TextInput, Button, Text } from "react-native";
import { auth, db } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { registerForPushAsync } from "@/services/notifications";

export default function SettingsScreen() {
  const [locations, setLocations] = useState("Engineering Building, Library");

  return (
    <View style={{ padding: 16, gap: 8 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Notification Preferences</Text>
      <TextInput value={locations} onChangeText={setLocations} style={{ borderWidth: 1, padding: 8 }} />
      <Button title="Save & Register for Push" onPress={async () => {
        const uid = auth.currentUser?.uid || "";
        if (!uid) return;
        await updateDoc(doc(db, "users", uid), { preferredLocations: locations.split(",").map(s => s.trim()) });
        await registerForPushAsync();
      }} />
    </View>
  );
}
