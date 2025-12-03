// src/screens/ReportIssueScreen.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  SafeAreaView,
} from "react-native";
import { auth, db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useTheme } from "@/ui/ThemeProvider";

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

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require("expo-constants").default;
    appVersion = safeString(
      Constants?.expoConfig?.version ??
        (Constants as any)?.manifest?.version ??
        "unknown"
    );
    runtimeVersion = safeString(
      Constants?.expoConfig?.runtimeVersion ?? "unknown"
    );
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
  const { theme } = useTheme();
  const { colors } = theme;
  const s = useMemo(() => makeStyles(colors), [colors]);

  const uid = auth.currentUser?.uid || null;

  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");

  const deviceInfo = useMemo(() => getDeviceInfo(), []);

  const submit = async () => {
    try {
      if (!subject.trim()) {
        Alert.alert("Enter a subject");
        return;
      }
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
    <SafeAreaView style={[s.flex, { backgroundColor: colors.background }]}>
      <View style={s.wrap}>
        <Text style={s.h1}>Report an issue</Text>
        <Text style={s.subtitle}>
          Something broken or confusing? Send it our way so we can fix it.
        </Text>

        <View style={s.card}>
          <Text style={s.label}>Subject</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Brief summary"
            style={s.input}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={s.label}>Details</Text>
          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="What happened? Steps to reproduce?"
            style={[s.input, s.detailsInput]}
            multiline
            placeholderTextColor={colors.textMuted}
          />

          <View style={s.metaBox}>
            <Text style={s.metaIntro}>
              We’ll include device details to help us debug:
            </Text>
            <Text style={s.meta}>
              {deviceInfo.platform} {deviceInfo.osVersion} •{" "}
              {deviceInfo.deviceName}
            </Text>
            <Text style={s.meta}>
              App {deviceInfo.appVersion} (runtime {deviceInfo.runtimeVersion})
            </Text>
          </View>

          <TouchableOpacity style={s.cta} onPress={submit}>
            <Text style={s.ctaTxt}>Submit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    flex: { flex: 1 },
    wrap: {
      flex: 1,
      padding: 16,
    },
    h1: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 14,
      marginBottom: 16,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOpacity: 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    label: {
      marginTop: 10,
      marginBottom: 6,
      fontWeight: "700",
      color: colors.text,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.card,
      color: colors.text,
    },
    detailsInput: {
      height: 140,
      textAlignVertical: "top",
    },
    metaBox: {
      marginTop: 12,
      padding: 10,
      borderRadius: 10,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metaIntro: {
      color: colors.textMuted,
      marginBottom: 4,
      fontSize: 13,
    },
    meta: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    cta: {
      marginTop: 18,
      backgroundColor: colors.blue,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: "center",
    },
    ctaTxt: {
      color: colors.background,
      fontWeight: "800",
      fontSize: 15,
    },
  });
}
