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
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
  doc,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
  updateDoc,
  query,
  orderBy,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { openOrCreateThread } from "@/services/chats";

type RouteParams = { itemId: string };

type Item = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  status?: "lost" | "found";
  location?: string;
  createdByUid?: string;
  createdByName?: string; // 🔹 display name stored on the item
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

          // Prefer name stored on the item, fall back to users collection
          if (it.createdByName) {
            setOwnerName(it.createdByName);
          } else if (it.createdByUid) {
            try {
              const us = await getDoc(doc(db, "users", it.createdByUid));
              setOwnerName(
                us.exists() ? ((us.data() as any)?.displayName || "Owner") : "Owner"
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
      const raw = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Claim[];
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

  const openDirections = () => {
    if (!item?.lat || !item?.lng) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;
    Linking.openURL(url).catch(() => Alert.alert("Could not open maps"));
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
      await updateDoc(doc(db, "items", itemId, "claims", claimId), { status });
      if (status === "approved")
        await updateDoc(doc(db, "items", itemId), { claimed: true });
      Alert.alert("Updated", `Claim ${status}.`);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not update claim");
    }
  };

  const startChat = async () => {
    try {
      if (!uid) return;
      const ownerUid = item?.createdByUid;
      if (!ownerUid) return;

      // If you’re the owner and there’s a pending claim, chat the claimer; otherwise viewer ↔ owner.
      let otherUid = isOwner
        ? claims.find((c) => c.status === "pending")?.claimerUid
        : ownerUid;
      if (!otherUid) otherUid = ownerUid;
      if (otherUid === uid) {
        Alert.alert("Chat unavailable", "No other participant found.");
        return;
      }

      const thread = await openOrCreateThread(itemId, uid, otherUid);

      // compute main image for chat preview
      const img =
        ((item?.images?.original?.[0] as string | undefined) ||
          (item?.imageUrl as string | undefined) ||
          undefined);

      navigation.navigate("Chat", {
        threadId: thread.id,
        itemTitle: item?.title || "Item",
        itemImage: img,            // 👈 passes thumbnail to Chat
      });
    } catch (e: any) {
      Alert.alert("Chat error", e?.message || "Could not open chat");
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={s.center}>
        <Text>Item not found.</Text>
      </View>
    );
  }

  const mainImage =
    (item.images?.original?.[0] as string | undefined) ||
    (item.imageUrl as string | undefined) ||
    undefined;

  // label for message button
  const targetName = isOwner
    ? claims.find((c) => c.status === "pending")?.claimerName || "Claimer"
    : ownerName || "Owner";
  const msgLabel = `Message ${targetName}`;

  return (
    <ScrollView
      contentContainerStyle={s.container}
      keyboardShouldPersistTaps="handled"
    >
      {mainImage ? (
        <Image source={{ uri: mainImage }} style={s.hero} resizeMode="cover" />
      ) : (
        <View style={[s.hero, s.heroFallback]}>
          <Text style={{ color: "#6b7280" }}>No image</Text>
        </View>
      )}

      <Text style={s.title}>{item.title}</Text>

      {/* Posted by line */}
      {item.createdByUid ? (
        <Text style={s.postedBy}>
          Posted by{" "}
          <Text
            style={s.link}
            onPress={() => navigation.navigate("Profile", { uid: item.createdByUid })}
          >
            {ownerName || "Owner"}
          </Text>
        </Text>
      ) : null}

      {/* chips */}
      <View style={s.metaRow}>
        {item.category ? <Chip label="Category" value={cap(item.category)} /> : null}
        {item.status ? <Chip label="Status" value={cap(item.status)} /> : null}
        {item.claimed ? <Chip label="Claimed" value="Yes" /> : null}
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

      {item.description ? <Text style={s.desc}>{item.description}</Text> : null}

      {/* primary action */}
      <View style={[s.actionsRow, { marginTop: 16 }]}>
        <TouchableOpacity style={s.chatBtn} onPress={startChat}>
          <Text style={s.chatIcon}>💬</Text>
          <Text style={s.chatTxt}>{msgLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* Claims */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Claims</Text>
        {claims.length === 0 ? (
          <Text style={{ color: "#6b7280" }}>No claims yet.</Text>
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

      {/* footer – subtle report link */}
      <View style={s.footer}>
        <TouchableOpacity onPress={reportPost}>
          <Text style={s.reportTxt}>Report this post</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.chip}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaValue}>{value}</Text>
    </View>
  );
}

function cap(s?: string) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const s = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  hero: { width: "100%", height: 220, borderRadius: 12, backgroundColor: "#e5e7eb" },
  heroFallback: { alignItems: "center", justifyContent: "center" },

  title: { fontSize: 22, fontWeight: "800", marginTop: 12 },

  postedBy: {
    marginTop: 4,
    color: "#4b5563",
    fontSize: 14,
  },

  metaRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 10 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  metaWide: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  metaLabel: { color: "#6b7280", fontSize: 12 },
  metaValue: { fontWeight: "700", color: "#0B1221" },

  desc: { marginTop: 14, fontSize: 16, lineHeight: 22, color: "#111827" },

  actionsRow: { flexDirection: "row", alignItems: "center", gap: 12 },

  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#0B1221",
    alignSelf: "flex-start",
  },
  chatIcon: { color: "white", fontSize: 16, marginTop: -1 },
  chatTxt: { color: "white", fontWeight: "800" },

  section: { marginTop: 26 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 8 },
  claimCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "white",
  },
  claimLine: { marginTop: 2, color: "#111827" },
  claimLabel: { color: "#6b7280" },
  claimActions: { flexDirection: "row", marginTop: 10 },

  footer: { marginTop: 40, alignItems: "center" },
  reportTxt: { color: "#B91C1C", fontSize: 14, textDecorationLine: "underline" },

  link: { color: "#0055A2", fontWeight: "700", textDecorationLine: "underline" },
});
