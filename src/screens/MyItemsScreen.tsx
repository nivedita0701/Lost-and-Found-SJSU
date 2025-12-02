// src/screens/MyItemsScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../firebase";
import { collection, onSnapshot, orderBy, query, where, getDocs, limit } from "firebase/firestore";

type Item = {
  id: string;
  title: string;
  imageUrl?: string;
  category?: string;
  status?: "lost" | "found";
  claimed?: boolean;
  location?: string;
  createdAt?: any;
};

export default function MyItemsScreen() {
  const uid = auth.currentUser?.uid || "";
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<"all" | "claimed" | "unclaimed">("all");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const base = collection(db, "items");
    const qy = query(base, where("createdByUid", "==", uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(qy, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return unsub;
  }, [uid]);

  const stats = useMemo(() => {
    const total = items.length;
    const claimed = items.filter((i) => i.claimed).length;
    const open = total - claimed;
    return { total, claimed, open };
  }, [items]);

  const list = useMemo(() => {
    if (filter === "claimed") return items.filter((i) => i.claimed);
    if (filter === "unclaimed") return items.filter((i) => !i.claimed);
    return items;
  }, [items, filter]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      const base = collection(db, "items");
      const qy = query(base, where("createdByUid", "==", uid), orderBy("createdAt", "desc"), limit(1));
      await getDocs(qy);
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity style={s.card} onPress={() => navigation.navigate("ItemDetail", { itemId: item.id })}>
      <Image source={{ uri: item.imageUrl || "https://placehold.co/96x96?text=No+Image" }} style={s.thumb} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text numberOfLines={1} style={s.title}>{item.title}</Text>
        <Text numberOfLines={2} style={s.meta}>
          {(item.category ? `${capitalize(item.category)} • ` : "") + (item.location || "Unknown location")}
        </Text>
        <View style={s.badges}>
          <Badge label={item.status === "found" ? "Found" : "Lost"} />
          <Badge label={item.claimed ? "Claimed" : "Open"} variant={item.claimed ? "ok" : "warn"} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}>
        <Text style={s.h1}>My Items</Text>
        <View style={s.stats}>
          <Stat label="Total" value={stats.total} />
          <Stat label="Open" value={stats.open} />
          <Stat label="Claimed" value={stats.claimed} />
        </View>
        <View style={s.pills}>
          <Pill label="All" active={filter === "all"} onPress={() => setFilter("all")} />
          <Pill label="Open" active={filter === "unclaimed"} onPress={() => setFilter("unclaimed")} />
          <Pill label="Claimed" active={filter === "claimed"} onPress={() => setFilter("claimed")} />
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={{ padding: 24, alignItems: "center" }}>
            <Text style={{ color: "#6b7280" }}>You haven’t posted anything yet.</Text>
          </View>
        }
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: "center", minWidth: 70 }}>
      <Text style={{ fontSize: 18, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: "#6b7280" }}>{label}</Text>
    </View>
  );
}

function Pill({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[s.pill, active && { backgroundColor: "#0B1221", borderColor: "#0B1221" }]}
    >
      <Text style={[s.pillTxt, active && { color: "white" }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Badge({ label, variant = "plain" }: { label: string; variant?: "plain" | "ok" | "warn" }) {
  const colors =
    variant === "ok"
      ? { bg: "#DCFCE7", fg: "#166534", br: "#86EFAC" }
      : variant === "warn"
      ? { bg: "#FEF9C3", fg: "#92400E", br: "#FDE68A" }
      : { bg: "#E5E7EB", fg: "#111827", br: "#D1D5DB" };
  return (
    <View style={{ backgroundColor: colors.bg, borderColor: colors.br, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
      <Text style={{ color: colors.fg, fontWeight: "700", fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function capitalize(s?: string) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 12 },
  h1: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  stats: { flexDirection: "row", gap: 18, marginTop: 4 },
  pills: { flexDirection: "row", gap: 8, marginTop: 12 },
  pill: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "white",
  },
  pillTxt: { fontWeight: "700", color: "#0B1221" },
  card: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 12,
    marginBottom: 12, backgroundColor: "white", flexDirection: "row",
  },
  thumb: { width: 88, height: 88, borderRadius: 8, backgroundColor: "#e5e7eb" },
  title: { fontSize: 16, fontWeight: "800" },
  meta: { marginTop: 4, color: "#475569" },
  badges: { flexDirection: "row", gap: 8, marginTop: 8 },
});
