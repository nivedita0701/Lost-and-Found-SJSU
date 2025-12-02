// src/screens/SettingsScreen.tsx
import React, { useEffect, useState } from "react";
import { View, TextInput, Button, Text, Alert } from "react-native";
import { auth, db } from "@/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { registerForPushAsync } from "@/services/notifications"; // already exists in your repo
import { Picker } from "@react-native-picker/picker";

type ThemeMode = "system" | "light" | "dark";
type Accent = "blue" | "gold" | "purple";

export default function SettingsScreen() {
  const uid = auth.currentUser?.uid || "";

  const [locations, setLocations] = useState("Engineering Building, Library");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [accent, setAccent] = useState<Accent>("blue");
  const [saving, setSaving] = useState(false);

  // hydrate from Firestore (if present)
  useEffect(() => {
    (async () => {
      try {
        if (!uid) return;
        const snap = await getDoc(doc(db, "users", uid));
        const data = snap.data() || {};
        if (Array.isArray(data.preferredLocations) && data.preferredLocations.length) {
          setLocations(data.preferredLocations.join(", "));
        }
        if (data.prefs?.themeMode) setThemeMode(data.prefs.themeMode);
        if (data.prefs?.accent) setAccent(data.prefs.accent);
      } catch {
        // ignore
      }
    })();
  }, [uid]);

  async function savePrefs() {
    try {
      if (!uid) return;
      setSaving(true);

      const prefs = {
        themeMode,
        accent,
      };

      await setDoc(
        doc(db, "users", uid),
        {
          preferredLocations: locations.split(",").map((s) => s.trim()).filter(Boolean),
          prefs,
        },
        { merge: true }
      );

      Alert.alert("Saved", "Preferences updated.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  async function saveAndRegister() {
    try {
      await savePrefs();
      await registerForPushAsync();
      Alert.alert("Ready", "Push notifications enabled for your locations.");
    } catch (e: any) {
      Alert.alert("Notifications", e?.message || "Could not register for push");
    }
  }

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "800" }}>Settings</Text>

      {/* Notifications */}
      <Text style={{ fontSize: 18, fontWeight: "700", marginTop: 8 }}>Notification Preferences</Text>
      <Text style={{ color: "#475569" }}>
        Buildings/areas you care about (comma-separated). When a new item is posted that contains any of
        these terms in its location, you’ll get a push.
      </Text>
      <TextInput
        value={locations}
        onChangeText={setLocations}
        style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 10, backgroundColor: "white" }}
        placeholder="e.g., Engineering Building, Library"
        placeholderTextColor="#667085"
        autoCapitalize="none"
      />
      <Button title={saving ? "Saving…" : "Save preferences"} onPress={savePrefs} disabled={saving} />
      <Button title="Save & Register for Push" onPress={saveAndRegister} />

      {/* Theme */}
      <Text style={{ fontSize: 18, fontWeight: "700", marginTop: 16 }}>Theme</Text>
      <Text style={{ color: "#475569" }}>Choose how the app looks. (Stored in your profile prefs.)</Text>
      <View style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, overflow: "hidden", backgroundColor: "white" }}>
        <Picker selectedValue={themeMode} onValueChange={(v) => setThemeMode(v)}>
          <Picker.Item label="Use system setting" value="system" />
          <Picker.Item label="Light" value="light" />
          <Picker.Item label="Dark" value="dark" />
        </Picker>
      </View>

      {/* Accent color */}
      <Text style={{ fontSize: 18, fontWeight: "700", marginTop: 8 }}>Accent color</Text>
      <View style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, overflow: "hidden", backgroundColor: "white" }}>
        <Picker selectedValue={accent} onValueChange={(v) => setAccent(v)}>
          <Picker.Item label="Blue" value="blue" />
          <Picker.Item label="Gold" value="gold" />
          <Picker.Item label="Purple" value="purple" />
        </Picker>
      </View>

      <Text style={{ color: "#6b7280" }}>
        (Hook this into your ThemeProvider to apply immediately. For now, we persist the preference on your user
        profile so it’s available on next app load.)
      </Text>
    </View>
  );
}
