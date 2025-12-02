// src/screens/RegisterScreen.tsx
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function RegisterScreen({ navigation }: any) {
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

      // seed user profile doc
      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          email: em,
          displayName: name.trim() || null,
          photoURL: cred.user.photoURL || null,
          verified: true, // SJSU email -> verified
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
    <View style={s.wrap}>
      <Text style={s.h1}>Create account</Text>

      <Text style={s.label}>Full name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        autoCapitalize="words"
        style={s.input}
      />

      <Text style={s.label}>SJSU email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@sjsu.edu"
        autoCapitalize="none"
        keyboardType="email-address"
        style={s.input}
      />

      <Text style={s.label}>Password</Text>
      <TextInput
        value={pass}
        onChangeText={setPass}
        placeholder="••••••••"
        secureTextEntry
        style={s.input}
      />

      <TouchableOpacity style={s.cta} onPress={onRegister} disabled={loading}>
        <Text style={s.ctaTxt}>{loading ? "Creating…" : "Create account"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.replace("Login")} style={{ marginTop: 12 }}>
        <Text style={{ color: "#0055A2" }}>Already have an account? Sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 16, gap: 10, justifyContent: "center" },
  h1: { fontSize: 24, fontWeight: "800", marginBottom: 8 },
  label: { marginTop: 8, fontWeight: "700" },
  input: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "white",
  },
  cta: { marginTop: 16, backgroundColor: "#0B1221", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  ctaTxt: { color: "white", fontWeight: "800" },
});
