import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  Button,
  Pressable,
  Alert,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRoute } from "@react-navigation/native";
import { auth, db } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

// ⬅️ use your existing Cloudinary uploader from items.ts
import { uploadItemPhotoAsync } from "@/services/items"; // adjust path if needed

export default function ProfileScreen({ navigation }: any) {
  const route = useRoute<any>();
  const viewingUid: string | undefined = route.params?.uid; // viewing someone else?
  const myUid = auth.currentUser?.uid!;
  const uid = viewingUid || myUid;

  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);

  const isSelf = uid === myUid;

  useEffect(() => {
    (async () => {
      if (!uid) return;
      try {
        const snap = await getDoc(doc(db, "users", uid));
        const data = snap.data() || {};
        setUser({
          email: isSelf ? auth.currentUser?.email : data.email,
          ...data,
        });
        setName(data.displayName || "");
      } catch (e: any) {
        console.warn("Failed to load user profile", e?.message);
      }
    })();
  }, [uid, isSelf]);

  async function saveName() {
    if (!isSelf) return;
    try {
      await setDoc(
        doc(db, "users", uid),
        { displayName: name },
        { merge: true }
      );
      Alert.alert("Saved", "Display name updated.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save name");
    }
  }

  async function changePhoto() {
    if (!isSelf) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Permission", "Please allow photo access.");
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (res.canceled || !res.assets?.length) return;

      const asset = res.assets[0];
      if (!asset.uri) {
        Alert.alert("Error", "Could not read selected image.");
        return;
      }

      setUploading(true);

      // 👉 upload to Cloudinary using your existing helper
      const url = await uploadItemPhotoAsync(asset.uri);

      // save URL on user doc
      await updateDoc(doc(db, "users", uid), { photoURL: url });

      // update local state so UI refreshes
      setUser((u: any) => ({ ...u, photoURL: url }));

      Alert.alert("Saved", "Profile photo updated.");
    } catch (e: any) {
      console.error("changePhoto error", e);
      Alert.alert("Error", e?.message || "Could not update photo");
    } finally {
      setUploading(false);
    }
  }

  async function doSignOut() {
    try {
      await signOut(auth);
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not sign out");
    }
  }

  const avatarUri =
    typeof user?.photoURL === "string" && user.photoURL.length > 0
      ? user.photoURL
      : "https://placehold.co/120x120";

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "800" }}>
        {isSelf ? "My Profile" : "Profile"}
      </Text>

      <Pressable
        onPress={changePhoto}
        disabled={!isSelf || uploading}
        style={{ alignSelf: "flex-start" }}
      >
        <Image
          source={{ uri: avatarUri }}
          style={s.avatar}
        />
        {isSelf ? (
          <Text style={{ color: "#0055A2", marginTop: 6 }}>
            {uploading ? "Uploading…" : "Change photo"}
          </Text>
        ) : null}
      </Pressable>

      <Text>Email: {user?.email || "—"}</Text>

      <Text style={s.label}>Display name</Text>
      <TextInput
        value={name}
        onChangeText={isSelf ? setName : () => {}}
        placeholder="Name"
        style={s.input}
        autoCapitalize="words"
        editable={isSelf}
      />
      {isSelf ? <Button title="Save name" onPress={saveName} /> : null}

      <View style={{ height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 }} />

      {isSelf ? (
        <>
          <Button title="My Items" onPress={() => navigation.navigate("MyItems")} />
          <View style={{ height: 8 }} />
          <Button color="#8A0000" title="Sign out" onPress={doSignOut} />
        </>
      ) : null}

      <View style={{ marginTop: 8 }}>
        <Text style={{ color: "#475569" }}>
          Items posted: {user?.stats?.itemsPosted || 0} • Claims made:{" "}
          {user?.stats?.claimsMade || 0}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  label: { marginTop: 8, marginBottom: 6, fontWeight: "700", color: "#0B1221" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#e5e7eb",
  },
});
