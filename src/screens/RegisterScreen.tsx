import React, { useState } from "react";
import { View, TextInput, Button, Text } from "react-native";
import { register } from "@/services/auth";

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState("");

  return (
    <View style={{ padding: 16, gap: 8 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Create an account</Text>
      <TextInput placeholder="Name" value={displayName} onChangeText={setDisplayName} style={{ borderWidth: 1, padding: 8 }} />
      <TextInput placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} style={{ borderWidth: 1, padding: 8 }} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={{ borderWidth: 1, padding: 8 }} />
      {err ? <Text style={{ color: "red" }}>{err}</Text> : null}
      <Button title="Register" onPress={async () => {
        try { await register(email, password, displayName); navigation.navigate("Feed"); } catch(e:any){ setErr(e.message); }
      }} />
    </View>
  );
}
