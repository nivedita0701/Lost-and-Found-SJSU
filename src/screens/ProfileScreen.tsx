// src/screens/ProfileScreen.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRoute } from "@react-navigation/native";
import { auth, db } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { uploadItemPhotoAsync } from "@/services/items";
import { useTheme } from "@/ui/ThemeProvider";

export default function ProfileScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { colors } = theme;
  const s = useMemo(() => makeStyles(colors), [colors]);

  const route = useRoute<any>();
  const viewingUid: string | undefined = route.params?.uid; // viewing someone else?
  const myUid = auth.currentUser?.uid!;
  const uid = viewingUid || myUid;

  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [uploading, setUploading] = useState(false);

  const isSelf = uid === myUid;

  useEffect(() => {
    (async () => {
      if (!uid) return;
      const snap = await getDoc(doc(db, "users", uid));
      const data = snap.data() || {};
      const displayName = data.displayName || "";

      setUser({
        email: isSelf ? auth.currentUser?.email : data.email,
        ...data,
      });
      setName(displayName);
      setOriginalName(displayName);
    })();
  }, [uid, isSelf]);

  async function autoSaveName() {
    if (!isSelf || !uid) return;
    const trimmed = name.trim();

    // nothing changed → no-op
    if (trimmed === (originalName || "").trim()) return;

    try {
      await setDoc(
        doc(db, "users", uid),
        { displayName: trimmed || null },
        { merge: true }
      );
      setOriginalName(trimmed);
      // also reflect in local user object (e.g. for stats header elsewhere)
      setUser((u: any) => ({ ...u, displayName: trimmed }));
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save name");
    }
  }

  async function changePhoto() {
    if (!isSelf || uploading) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Permission", "Please allow photo access.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });
      if (res.canceled || !res.assets?.length) return;

      const asset = res.assets[0];
      setUploading(true);

      const url = await uploadItemPhotoAsync(asset.uri);
      await updateDoc(doc(db, "users", uid), { photoURL: url });
      setUser((u: any) => ({ ...u, photoURL: url }));

      Alert.alert("Saved", "Profile photo updated.");
    } catch (e: any) {
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

  const email = user?.email as string | undefined;
  const headingName =
    name?.trim() ||
    (email ? email.split("@")[0] : undefined) ||
    (isSelf ? "My Profile" : "Profile");

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.screen}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top: avatar + info row */}
          <View style={s.topRow}>
            <Pressable
              onPress={changePhoto}
              disabled={!isSelf || uploading}
              style={s.avatarWrap}
            >
              <Image
                source={{
                  uri: user?.photoURL || "https://placehold.co/120x120",
                }}
                style={s.avatar}
              />
              {isSelf ? (
                <Text style={s.photoLink}>
                  {uploading ? "Uploading…" : "Change photo"}
                </Text>
              ) : null}
            </Pressable>

            <View style={s.infoCol}>
              <Text style={s.heading}>{headingName}</Text>

              <View style={{ marginTop: 8 }}>
                <Text style={s.labelSmall}>Email</Text>
                <Text style={s.value}>{email || "—"}</Text>
              </View>

              <View style={{ marginTop: 10 }}>
                <Text style={s.labelSmall}>Display name</Text>
                <TextInput
                  value={name}
                  onChangeText={isSelf ? setName : () => {}}
                  onEndEditing={autoSaveName}
                  placeholder="Name"
                  style={s.input}
                  autoCapitalize="words"
                  editable={isSelf}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          </View>

          {/* Stats section */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Overview</Text>
            <Text style={s.statsText}>
              Items posted: {user?.stats?.itemsPosted || 0} • Claims made:{" "}
              {user?.stats?.claimsMade || 0}
            </Text>
          </View>

          {/* Actions section (only for self) */}
          {isSelf && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>Actions</Text>
              <Pressable
                style={s.actionBtn}
                onPress={() => navigation.navigate("MyItems")}
              >
                <Text style={s.actionText}>My Items</Text>
              </Pressable>

              <Pressable
                style={s.actionBtn}
                onPress={() => navigation.navigate("Settings")}
              >
                <Text style={s.actionText}>Settings</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* Sign out pinned at bottom */}
        {isSelf && (
          <View style={s.signOutBar}>
            <Pressable style={s.signOutBtn} onPress={doSignOut}>
              <Text style={s.signOutText}>Sign out</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 24,
    },

    topRow: {
      flexDirection: "row",
      gap: 16,
      alignItems: "flex-start",
    },
    avatarWrap: {
      alignItems: "center",
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    photoLink: {
      color: colors.blue,
      marginTop: 6,
      fontWeight: "600",
      fontSize: 13,
    },
    infoCol: {
      flex: 1,
    },
    heading: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
    },
    labelSmall: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
      marginBottom: 2,
    },
    value: {
      color: colors.text,
      fontSize: 14,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: colors.card,
      color: colors.text,
      fontSize: 14,
    },

    section: {
      marginTop: 24,
    },
    sectionLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textMuted,
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    statsText: {
      color: colors.text,
      fontSize: 14,
    },

    actionBtn: {
      marginTop: 10,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: "center",
    },
    actionText: {
      color: colors.blue,
      fontWeight: "700",
      fontSize: 15,
    },

    signOutBar: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      paddingTop: 4,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    signOutBtn: {
      paddingVertical: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.red,
      alignItems: "center",
    },
    signOutText: {
      color: colors.red,
      fontWeight: "700",
      fontSize: 15,
    },
  });
}
