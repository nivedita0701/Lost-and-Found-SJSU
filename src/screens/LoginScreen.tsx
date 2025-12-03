// src/screens/LoginScreen.tsx
import React, { useState, useMemo } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { login } from "@/services/auth";
import { useTheme } from "@/ui/ThemeProvider";

export default function LoginScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { colors } = theme;
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onLogin() {
    if (!email.trim() || !password) {
      setErr("Please enter your email and password.");
      return;
    }
    try {
      setErr("");
      setLoading(true);
      await login(email.trim(), password);
    } catch (e: any) {
      setErr(e?.message || "Could not log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.container}>
          <Text style={s.title}>Welcome back</Text>
          <Text style={s.subtitle}>
            Sign in to continue to SJSU Lost &amp; Found.
          </Text>

          <View style={s.card}>
            <Text style={s.label}>SJSU Email</Text>
            <TextInput
              placeholder="you@sjsu.edu"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor={colors.textMuted}
              style={s.input}
            />

            <Text style={[s.label, { marginTop: 12 }]}>Password</Text>
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={colors.textMuted}
              style={s.input}
            />

            {err ? <Text style={s.error}>{err}</Text> : null}

            <TouchableOpacity
              style={[s.primaryBtn, loading && s.btnDisabled]}
              onPress={onLogin}
              disabled={loading}
            >
              <Text style={s.primaryBtnTxt}>
                {loading ? "Logging in…" : "Log in"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.secondaryBtn}
              onPress={() => navigation.navigate("Register")}
            >
              <Text style={s.secondaryBtnTxt}>Create account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 40,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
    },
    subtitle: {
      marginTop: 4,
      fontSize: 14,
      color: colors.textMuted,
    },
    card: {
      marginTop: 24,
      padding: 18,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOpacity: 0.25,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      elevation: 4,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.background,
    },
    error: {
      marginTop: 8,
      color: colors.red,
      fontSize: 13,
    },
    primaryBtn: {
      marginTop: 18,
      paddingVertical: 12,
      borderRadius: 999,
      alignItems: "center",
      backgroundColor: colors.blue,
    },
    primaryBtnTxt: {
      color: colors.background,
      fontWeight: "700",
      fontSize: 16,
    },
    btnDisabled: {
      opacity: 0.5,
    },
    secondaryBtn: {
      marginTop: 10,
      paddingVertical: 10,
      borderRadius: 999,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    secondaryBtnTxt: {
      color: colors.text,
      fontWeight: "600",
    },
  });
}
