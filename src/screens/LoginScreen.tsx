import React, { useState } from "react";
import { View, TextInput, Button, Text } from "react-native";
import { login } from "@/services/auth";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  return (
    <View style={{ padding: 16, gap: 8 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Welcome back</Text>
      <TextInput placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} style={{ borderWidth: 1, padding: 8 }} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={{ borderWidth: 1, padding: 8 }} />
      {err ? <Text style={{ color: "red" }}>{err}</Text> : null}
      <Button title="Log in" onPress={async () => {
        try { await login(email, password); } catch(e:any){ setErr(e.message); }
      }} />
      <Button title="Create account" onPress={() => navigation.navigate("Register")} />
    </View>
  );
}
