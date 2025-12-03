// src/screens/SettingsScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Alert,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { auth, db } from "@/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { registerForPushAsync } from "@/services/notifications";
import { useTheme } from "@/ui/ThemeProvider";
import type { ThemeMode, Accent } from "@/ui/theme";

export default function SettingsScreen() {
  const uid = auth.currentUser?.uid || "";

  const { theme, mode, accent, setMode, setAccent } = useTheme();
  const { colors } = theme;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!uid) {
          setLoading(false);
          return;
        }
        const snap = await getDoc(doc(db, "users", uid));
        const data = snap.data() || {};
        if (data.prefs?.themeMode) {
          setMode(data.prefs.themeMode as ThemeMode);
        }
        if (data.prefs?.accent) {
          setAccent(data.prefs.accent as Accent);
        }
        if (typeof data.prefs?.pushEnabled === "boolean") {
          setPushEnabled(data.prefs.pushEnabled);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  async function savePrefs() {
    try {
      if (!uid) return;
      setSaving(true);

      await setDoc(
        doc(db, "users", uid),
        {
          prefs: {
            themeMode: mode,
            accent,
            pushEnabled: true,
          },
        },
        { merge: true }
      );
      setPushEnabled(true);
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
      Alert.alert("Ready", "Push notifications enabled.");
    } catch (e: any) {
      Alert.alert("Notifications", e?.message || "Could not register for push");
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.blue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: colors.background },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        {/* Notifications */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Notifications
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Turn on push notifications to hear about new lost or found items
          related to you.
        </Text>

        <TouchableOpacity
          style={[
            styles.primaryBtn,
            {
              backgroundColor: pushEnabled ? colors.border : colors.blue,
              shadowColor: pushEnabled ? "transparent" : colors.shadow,
              opacity: pushEnabled ? 0.6 : 1,
            },
          ]}
          onPress={pushEnabled ? undefined : saveAndRegister}
          disabled={pushEnabled || saving}   // 👈 can't spam when enabled/saving
        >
          <Text style={[styles.primaryBtnText, { color: "#FFFFFF" }]}>
            {pushEnabled
              ? "Push notifications enabled"
              : "Enable push notifications"}
          </Text>
        </TouchableOpacity>

        {/* Theme */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
          Theme
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Choose how the app looks on your device.
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <SegmentRow
            label="Use system setting"
            value="system"
            current={mode}
            onChange={setMode}
            colors={colors}
          />
          <SegmentRow
            label="Light"
            value="light"
            current={mode}
            onChange={setMode}
            colors={colors}
          />
          <SegmentRow
            label="Dark"
            value="dark"
            current={mode}
            onChange={setMode}
            colors={colors}
          />
        </View>

        {/* Accent color */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
          Accent color
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {/* 🔵 use static swatch colors so they don't change with accent */}
          <AccentRow
            label="Blue"
            value="blue"
            current={accent}
            swatchColor="#3B82F6" // fixed blue
            onChange={setAccent}
            colors={colors}
          />
          <AccentRow
            label="Gold"
            value="gold"
            current={accent}
            swatchColor="#FACC15" // fixed gold
            onChange={setAccent}
            colors={colors}
          />
          <AccentRow
            label="Purple"
            value="purple"
            current={accent}
            swatchColor="#A855F7" // fixed purple
            onChange={setAccent}
            colors={colors}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.secondaryBtn,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
          onPress={savePrefs}
          disabled={saving}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
            {saving ? "Saving…" : "Save preferences"}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.footerNote, { color: colors.textMuted }]}>
          Theme and accent are saved to your profile and applied immediately
          across the app.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

type SegmentRowProps = {
  label: string;
  value: ThemeMode;
  current: ThemeMode;
  onChange: (v: ThemeMode) => void;
  colors: any;
};

function SegmentRow({ label, value, current, onChange, colors }: SegmentRowProps) {
  const active = current === value;
  return (
    <TouchableOpacity
      onPress={() => onChange(value)}
      style={[
        styles.segmentRow,
        active && { borderColor: colors.blue, backgroundColor: "#FFFFFF10" },
      ]}
    >
      <Text
        style={[
          styles.segmentLabel,
          { color: active ? colors.text : colors.textMuted },
        ]}
      >
        {label}
      </Text>
      {active && <Text style={{ color: colors.blue, fontWeight: "700" }}>✓</Text>}
    </TouchableOpacity>
  );
}

type AccentRowProps = {
  label: string;
  value: Accent;
  current: Accent;
  swatchColor: string;
  onChange: (v: Accent) => void;
  colors: any;
};

function AccentRow({
  label,
  value,
  current,
  swatchColor,
  onChange,
  colors,
}: AccentRowProps) {
  const active = current === value;
  return (
    <TouchableOpacity
      onPress={() => onChange(value)}
      style={[
        styles.segmentRow,
        active && { borderColor: colors.blue, backgroundColor: "#FFFFFF10" },
      ]}
    >
      <View
        style={[
          styles.swatch,
          { backgroundColor: swatchColor, borderColor: colors.border },
        ]}
      />
      <Text
        style={[
          styles.segmentLabel,
          { color: active ? colors.text : colors.textMuted },
        ]}
      >
        {label}
      </Text>
      {active && <Text style={{ color: colors.blue, fontWeight: "700" }}>✓</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  primaryBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  primaryBtnText: {
    fontWeight: "700",
    fontSize: 15,
  },
  card: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
  },
  segmentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  segmentLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 999,
    marginRight: 10,
    borderWidth: 1,
  },
  secondaryBtn: {
    marginTop: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontWeight: "700",
    fontSize: 15,
  },
  footerNote: {
    fontSize: 12,
    marginTop: 12,
  },
});
