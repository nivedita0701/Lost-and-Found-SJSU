// src/screens/RegisterScreen.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useTheme } from "@/ui/ThemeProvider";

export default function RegisterScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { colors } = theme;
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function onRegister() {
    try {
      const em = email.trim();
      if (!em.endsWith("@sjsu.edu")) {
        Alert.alert("Use SJSU email", "Please register with your @sjsu.edu email.");
        return;
      }
      if (!pass || pass.length < 6) {
        Alert.alert("Weak password", "Password must be at least 6 characters.");
        return;
      }
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, em, pass);

      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }

      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          email: em,
          displayName: name.trim() || null,
          photoURL: cred.user.photoURL || null,
          verified: true,
          stats: { itemsPosted: 0, claimsMade: 0 },
          preferredLocations: [],
          tokens: [],
          prefs: { themeMode: "system", accent: "blue" },
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      Alert.alert("Welcome!", "Account created.");
      navigation.replace("Feed");
    } catch (e: any) {
      Alert.alert("Register failed", e?.message || "Try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[s.flex, { backgroundColor: colors.background }]}>
      <View style={s.wrap}>
        <Text style={s.titleBadge}>SJSU Lost &amp; Found</Text>
        <Text style={s.h1}>Create account</Text>
        <Text style={s.subtitle}>
          Use your SJSU email to securely post and find items on campus.
        </Text>

        <View style={s.card}>
          <Text style={s.label}>Full name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoCapitalize="words"
            style={s.input}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={s.label}>SJSU email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@sjsu.edu"
            autoCapitalize="none"
            keyboardType="email-address"
            style={s.input}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            value={pass}
            onChangeText={setPass}
            placeholder="••••••••"
            secureTextEntry
            style={s.input}
            placeholderTextColor={colors.textMuted}
          />

          <TouchableOpacity
            style={[s.cta, loading && s.ctaDisabled]}
            onPress={onRegister}
            disabled={loading}
          >
            <Text style={s.ctaTxt}>
              {loading ? "Creating…" : "Create account"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.replace("Login")}
            style={{ marginTop: 14, alignItems: "center" }}
          >
            <Text style={s.link}>
              Already have an account?{" "}
              <Text style={s.linkBold}>Sign in</Text>
            </Text>
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
      padding: 20,
      justifyContent: "center",
    },
    titleBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.textMuted,
      fontSize: 12,
      marginBottom: 6,
    },
    h1: {
      fontSize: 26,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 14,
      marginBottom: 18,
    },
    card: {
      borderRadius: 16,
      padding: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOpacity: 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      gap: 8,
    },
    label: {
      marginTop: 8,
      marginBottom: 4,
      fontWeight: "700",
      color: colors.text,
      fontSize: 14,
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
    cta: {
      marginTop: 18,
      backgroundColor: colors.blue,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: "center",
    },
    ctaDisabled: {
      opacity: 0.6,
    },
    ctaTxt: {
      color: colors.background,
      fontWeight: "800",
      fontSize: 15,
    },
    link: {
      color: colors.textMuted,
      fontSize: 14,
    },
    linkBold: {
      color: colors.blue,
      fontWeight: "700",
    },
  });
}
