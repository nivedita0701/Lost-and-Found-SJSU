// src/screens/ReportIssueScreen.tsx
import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Platform } from "react-native";
import { auth, db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

type DeviceInfo = {
  platform: string;
  osVersion: string;
  appVersion: string;
  runtimeVersion: string;
  deviceName: string;
};

function safeString(v: any): string {
  if (v == null) return "unknown";
  if (typeof v === "string") return v;
  try {
    return String(v);
  } catch {
    try {
      return JSON.stringify(v);
    } catch {
      return "unknown";
    }
  }
}

function getDeviceInfo(): DeviceInfo {
  let appVersion = "unknown";
  let runtimeVersion = "unknown";
  let deviceName = "unknown";

  // Try to read from expo-constants if available, but don't require it.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require("expo-constants").default;
    appVersion = safeString(
      Constants?.expoConfig?.version ?? (Constants as any)?.manifest?.version ?? "unknown"
    );
    runtimeVersion = safeString(Constants?.expoConfig?.runtimeVersion ?? "unknown");
    deviceName = safeString(Constants?.deviceName ?? "unknown");
  } catch {
    // expo-constants not installed — that's fine
  }

  return {
    platform: safeString(Platform.OS),
    osVersion: safeString(Platform.Version),
    appVersion,
    runtimeVersion,
    deviceName,
  };
}

export default function ReportIssueScreen({ navigation }: any) {
  const uid = auth.currentUser?.uid || null;

  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");

  const deviceInfo = useMemo(() => getDeviceInfo(), []);

  const submit = async () => {
    try {
      if (!subject.trim()) return Alert.alert("Enter a subject");
      await addDoc(collection(db, "issues"), {
        subject: subject.trim(),
        details: details.trim(),
        meta: deviceInfo,
        uid,
        createdAt: serverTimestamp(),
      });
      Alert.alert("Thanks!", "Your report has been submitted.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not submit");
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={s.h1}>Report an Issue</Text>

      <Text style={s.label}>Subject</Text>
      <TextInput
        value={subject}
        onChangeText={setSubject}
        placeholder="Brief summary"
        style={s.input}
      />

      <Text style={s.label}>Details</Text>
      <TextInput
        value={details}
        onChangeText={setDetails}
        placeholder="What happened? Steps to reproduce?"
        style={[s.input, { height: 140 }]}
        multiline
      />

      <View style={{ marginTop: 12 }}>
        <Text style={{ color: "#6b7280" }}>
          We’ll include device details to help us debug:
        </Text>
        <Text style={s.meta}>
          {deviceInfo.platform} {deviceInfo.osVersion} • {deviceInfo.deviceName}
        </Text>
        <Text style={s.meta}>
          App {deviceInfo.appVersion} (runtime {deviceInfo.runtimeVersion})
        </Text>
      </View>

      <TouchableOpacity style={s.cta} onPress={submit}>
        <Text style={s.ctaTxt}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  label: { marginTop: 12, marginBottom: 6, fontWeight: "700", color: "#0B1221" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
  },
  meta: { color: "#475569", marginTop: 4 },
  cta: {
    marginTop: 18,
    backgroundColor: "#0B1221",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaTxt: { color: "white", fontWeight: "800" },
});
