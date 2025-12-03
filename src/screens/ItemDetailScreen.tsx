// src/screens/ItemDetailScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Button,
  Linking,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  SafeAreaView,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
  doc,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { openOrCreateThread } from "@/services/chats";
import { useTheme } from "@/ui/ThemeProvider";
import {
  createClaim,
  setClaimStatus as setClaimStatusSvc,
} from "@/services/claims";

type RouteParams = { itemId: string };

type Item = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  status?: "lost" | "found";
  location?: string;
  createdByUid?: string;
  createdByName?: string;
  imageUrl?: string;
  images?: { original: string[]; thumb?: string[] };
  lat?: number;
  lng?: number;
  claimed?: boolean;
};

type Claim = {
  id: string;
  claimerUid: string;
  status: "pending" | "approved" | "rejected";
  message?: string;
  createdAt?: any;
  claimerName?: string;
};

export default function ItemDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { itemId } = route.params as RouteParams;

  const { theme } = useTheme();
  const { colors } = theme;
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");
  const [claimSubmitting, setClaimSubmitting] = useState(false);

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [ownerName, setOwnerName] = useState<string>("");
  const uid = auth.currentUser?.uid || "";

  // Item + owner name
  useEffect(() => {
    const ref = doc(db, "items", itemId);
    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (snap.exists()) {
          const it = { id: snap.id, ...(snap.data() as any) } as Item;
          setItem(it);

          if (it.createdByName) {
            setOwnerName(it.createdByName);
          } else if (it.createdByUid) {
            try {
              const us = await getDoc(doc(db, "users", it.createdByUid));
              setOwnerName(
                us.exists()
                  ? ((us.data() as any)?.displayName || "Owner")
                  : "Owner"
              );
            } catch {
              setOwnerName("Owner");
            }
          } else {
            setOwnerName("Owner");
          }
        } else {
          setItem(null);
        }
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [itemId]);

  // claims + claimer names
  useEffect(() => {
    const ref = collection(db, "items", itemId, "claims");
    const q = query(ref, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, async (snap) => {
      const raw = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Claim[];
      const withNames = await Promise.all(
        raw.map(async (c) => {
          try {
            const us = await getDoc(doc(db, "users", c.claimerUid));
            const name = us.exists()
              ? (us.data() as any)?.displayName || "Unknown user"
              : "Unknown user";
            return { ...c, claimerName: name };
          } catch {
            return { ...c, claimerName: "Unknown user" };
          }
        })
      );
      setClaims(withNames);
    });
    return unsub;
  }, [itemId]);

  const isOwner = useMemo(
    () => item?.createdByUid && uid && item?.createdByUid === uid,
    [item?.createdByUid, uid]
  );

  const myClaim = useMemo(
    () => claims.find((c) => c.claimerUid === uid),
    [claims, uid]
  );

  const topClaimForOwner = useMemo(() => {
    if (!isOwner) return null;
    // Prefer newest pending, else newest approved
    return (
      claims.find((c) => c.status === "pending") ||
      claims.find((c) => c.status === "approved") ||
      null
    );
  }, [isOwner, claims]);


  const openDirections = () => {
    if (!item?.lat || !item?.lng) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Could not open maps")
    );
  };

  const reportPost = async () => {
    try {
      await addDoc(collection(db, "flags"), {
        type: "item",
        refId: itemId,
        reporterUid: uid || null,
        createdAt: serverTimestamp(),
      });
      Alert.alert("Reported", "Thanks. We’ll review this post.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not report this post");
    }
  };

  const setClaimStatus = async (
    claimId: string,
    status: "approved" | "rejected"
  ) => {
    try {
      await setClaimStatusSvc(itemId, claimId, status);
      Alert.alert("Updated", `Claim ${status}.`);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not update claim");
    }
  };

  const startChat = async () => {
    try {
      if (!uid || !item?.createdByUid) {
        Alert.alert("Chat unavailable", "User information is missing.");
        return;
      }

      let otherUid: string | undefined;

            if (isOwner) {
        const pending = claims.find((c) => c.status === "pending");
        const approved = claims.find((c) => c.status === "approved");
        const target = pending || approved || null;
        otherUid = target?.claimerUid;
      } else {
        otherUid = item.createdByUid;
      }

      if (!otherUid || otherUid === uid) {
        Alert.alert("Chat unavailable", "No other participant found.");
        return;
      }

      const thread = await openOrCreateThread(itemId, uid, otherUid);

      const img =
        (item.images?.original?.[0] as string | undefined) ||
        (item.imageUrl as string | undefined) ||
        undefined;

      navigation.navigate("Chat", {
        threadId: thread.id,
        itemTitle: item.title || "Item",
        itemImage: img,
      });
    } catch (e: any) {
      Alert.alert("Chat error", e?.message || "Could not open chat");
    }
  };

  const submitClaim = async () => {
    try {
      if (!uid) {
        Alert.alert("Sign in required", "Please log in to claim this item.");
        return;
      }
      if (!item) return;
      if (isOwner) {
        Alert.alert("Not allowed", "You can’t claim your own item.");
        return;
      }
      if (item.claimed) {
        Alert.alert("Already claimed", "This item is already marked as claimed.");
        return;
      }
      if (myClaim && myClaim.status !== "rejected") {
        Alert.alert("Already claimed", "You already have a claim on this item.");
        return;
      }

      setClaimSubmitting(true);
      await createClaim(itemId, uid, claimMsg.trim());
      setClaimMsg("");
      setClaimModalOpen(false);
      Alert.alert("Submitted", "Your claim has been submitted to the owner.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not submit claim");
    } finally {
      setClaimSubmitting(false);
    }
  };

  // --------- RENDER ----------

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <View style={s.center}>
          <ActivityIndicator color={colors.blue} />
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <View style={s.center}>
          <Text style={{ color: colors.text }}>Item not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const mainImage =
    (item.images?.original?.[0] as string | undefined) ||
    (item.imageUrl as string | undefined) ||
    undefined;

  const targetName = isOwner
    // ? claims.find((c) => c.status === "pending")?.claimerName || "Claimer"
    // : ownerName || "Owner";
     ? topClaimForOwner?.claimerName || "Claimer"
    : ownerName || "Owner";
  const msgLabel = `Message ${targetName}`;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[s.container, { flexGrow: 1 }]} // 👈 fill height
        keyboardShouldPersistTaps="handled"
      >
        {mainImage ? (
          <Image
            source={{ uri: mainImage }}
            style={s.hero}
            resizeMode="cover"
          />
        ) : (
          <View style={[s.hero, s.heroFallback]}>
            <Text style={{ color: colors.textMuted }}>No image</Text>
          </View>
        )}

        <Text style={s.title}>{item.title}</Text>

        {item.createdByUid ? (
          <Text style={s.postedBy}>
            Posted by{" "}
            <Text
              style={s.link}
              onPress={() =>
                navigation.navigate("Profile", { uid: item.createdByUid })
              }
            >
              {ownerName || "Owner"}
            </Text>
          </Text>
        ) : null}

        <View style={s.metaRow}>
          {item.category ? (
            <Chip label="Category" value={cap(item.category)} styles={s} />
          ) : null}
          {item.status ? (
            <Chip label="Status" value={cap(item.status)} styles={s} />
          ) : null}
          {item.claimed ? (
            <Chip label="Claimed" value="Yes" styles={s} />
          ) : null}
        </View>

        {item.location ? (
          <View style={{ marginTop: 10 }}>
            <View style={s.metaWide}>
              <Text style={s.metaLabel}>Location</Text>
              <Text style={s.metaValue}>{item.location}</Text>
            </View>
          </View>
        ) : null}

        {typeof item.lat === "number" && typeof item.lng === "number" ? (
          <View style={{ marginTop: 8 }}>
            <Button title="Open in Maps" onPress={openDirections} />
          </View>
        ) : null}

        {item.description ? (
          <Text style={s.desc}>{item.description}</Text>
        ) : null}

        <View style={[s.actionsRow, { marginTop: 16 }]}>
          {/* Chat button: 
              - non-owner: always message owner
              - owner: only if there is someone to message (topClaimForOwner) */}
          {(!isOwner || topClaimForOwner) && (
            <TouchableOpacity style={s.chatBtn} onPress={startChat}>
              <Text style={s.chatIcon}>💬</Text>
              <Text style={s.chatTxt}>{msgLabel}</Text>
            </TouchableOpacity>
          )}

          {/* Claim button */}
          {!isOwner &&
            !item.claimed &&
            (!myClaim || myClaim.status === "rejected") && (
              <TouchableOpacity
                style={[
                  s.chatBtn,
                  {
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginLeft: 8,
                  },
                ]}
                onPress={() => setClaimModalOpen(true)}
              >
                <Text style={[s.chatTxt, { color: colors.text }]}>
                  Claim this item
                </Text>
              </TouchableOpacity>
            )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Claims</Text>
          {claims.length === 0 ? (
            <Text style={{ color: colors.textMuted }}>No claims yet.</Text>
          ) : (
            claims.map((c) => (
              <View key={c.id} style={s.claimCard}>
                <Text style={s.claimLine}>
                  <Text style={s.claimLabel}>Claimer: </Text>
                  <Text
                    style={s.link}
                    onPress={() =>
                      navigation.navigate("Profile", { uid: c.claimerUid })
                    }
                  >
                    {c.claimerName || "Unknown user"}
                  </Text>
                </Text>
                <Text style={s.claimLine}>
                  <Text style={s.claimLabel}>Status:</Text> {cap(c.status)}
                </Text>
                {c.message ? (
                  <Text style={s.claimLine}>
                    <Text style={s.claimLabel}>Message:</Text> {c.message}
                  </Text>
                ) : null}

                {isOwner && c.status === "pending" ? (
                  <View style={s.claimActions}>
                    <Button
                      title="Approve"
                      onPress={() => setClaimStatus(c.id, "approved")}
                    />
                    <View style={{ width: 12 }} />
                    <Button
                      title="Reject"
                      color="#8A0000"
                      onPress={() => setClaimStatus(c.id, "rejected")}
                    />
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>

        <View style={s.footer}>
          <TouchableOpacity onPress={reportPost}>
            <Text style={s.reportTxt}>Report this post</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Claim modal */}
      <Modal
        visible={claimModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setClaimModalOpen(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.sectionTitle}>Claim this item</Text>
            <Text style={s.modalHint}>
              Add an optional note for the owner (where you lost it, how you
              can verify, etc.).
            </Text>
            <TextInput
              value={claimMsg}
              onChangeText={setClaimMsg}
              placeholder="Optional message"
              multiline
              style={s.modalInput}
              placeholderTextColor={colors.textMuted}
            />
            <View style={s.modalActions}>
              <Button title="Cancel" onPress={() => setClaimModalOpen(false)} />
              <View style={{ width: 8 }} />
              <Button
                title={claimSubmitting ? "Submitting…" : "Submit claim"}
                onPress={submitClaim}
                disabled={claimSubmitting}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Chip({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.chip}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function cap(s?: string) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      padding: 16,
      backgroundColor: colors.background,
      paddingBottom: 40,
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },

    hero: {
      width: "100%",
      height: 220,
      borderRadius: 12,
      backgroundColor: colors.card,
    },
    heroFallback: { alignItems: "center", justifyContent: "center" },

    title: {
      fontSize: 22,
      fontWeight: "800",
      marginTop: 12,
      color: colors.text,
    },

    postedBy: {
      marginTop: 4,
      color: colors.textMuted,
      fontSize: 14,
    },

    metaRow: {
      flexDirection: "row",
      gap: 10,
      flexWrap: "wrap",
      marginTop: 10,
    },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metaWide: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metaLabel: { color: colors.textMuted, fontSize: 12 },
    metaValue: { fontWeight: "700", color: colors.text },

    desc: {
      marginTop: 14,
      fontSize: 16,
      lineHeight: 22,
      color: colors.text,
    },

    actionsRow: { flexDirection: "row", alignItems: "center", gap: 12 },

    chatBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.blue,
      alignSelf: "flex-start",
    },
    chatIcon: { color: "white", fontSize: 16, marginTop: -1 },
    chatTxt: { color: "white", fontWeight: "800" },

    section: { marginTop: 26 },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 8,
      color: colors.text,
    },
    claimCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      backgroundColor: colors.card,
    },
    claimLine: { marginTop: 2, color: colors.text },
    claimLabel: { color: colors.textMuted },
    claimActions: { flexDirection: "row", marginTop: 10 },

    footer: { marginTop: 40, alignItems: "center" },
    reportTxt: {
      color: colors.red,
      fontSize: 14,
      textDecorationLine: "underline",
    },

    link: {
      color: colors.blue,
      fontWeight: "700",
      textDecorationLine: "underline",
    },

    // modal
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.25)",
      justifyContent: "center",
      padding: 24,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalHint: {
      color: colors.textMuted,
      marginBottom: 8,
    },
    modalInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      minHeight: 80,
      textAlignVertical: "top",
      marginTop: 4,
      backgroundColor: colors.background,
      color: colors.text,
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 12,
    },
  });
}
