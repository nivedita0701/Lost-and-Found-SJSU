// src/screens/FeedScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  Modal,
  Pressable,
  Animated,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../firebase";

type Item = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  status?: "lost" | "found";
  location?: string;
  createdAt?: any;
  createdByUid?: string;
  createdByName?: string;   // 🔹 NEW: display name stored on the item
  imageUrl?: string;
  lat?: number;
  lng?: number;
  claimed?: boolean;
};

type SortKey = "newest" | "oldest" | "category";

const SORT_KEY = "feed.sort";
const FILTER_KEY = "feed.filter";
const SEARCH_KEY = "feed.search";

export default function FeedScreen() {
  const navigation = useNavigation<any>();

  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "lost" | "found" | "claimed" | "unclaimed">("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [refreshing, setRefreshing] = useState(false);

  // header avatar
  const [avatar, setAvatar] = useState<string | null>(null);
  const uid = auth.currentUser?.uid || "";

  useEffect(() => {
    (async () => {
      if (!uid) return;
      try {
        const us = await getDoc(doc(db, "users", uid));
        if (us.exists()) setAvatar(((us.data() as any).photoURL as string) || null);
      } catch {}
    })();
  }, [uid]);

  // sort sheet
  const [sortOpen, setSortOpen] = useState(false);
  const sheetAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    (async () => {
      const s = await AsyncStorage.getItem(SORT_KEY);
      const f = await AsyncStorage.getItem(FILTER_KEY);
      const q = await AsyncStorage.getItem(SEARCH_KEY);
      if (s) setSort(JSON.parse(s));
      if (f) setFilter(JSON.parse(f));
      if (q) setSearch(JSON.parse(q));
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(SORT_KEY, JSON.stringify(sort));
  }, [sort]);
  useEffect(() => {
    AsyncStorage.setItem(FILTER_KEY, JSON.stringify(filter));
  }, [filter]);
  useEffect(() => {
    AsyncStorage.setItem(SEARCH_KEY, JSON.stringify(search));
  }, [search]);

  // live feed
  useEffect(() => {
    const base = collection(db, "items");
    const qy = query(base, orderBy("createdAt", "desc"), limit(200));
    const unsub = onSnapshot(qy, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Item[];
      setItems(rows);
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    let arr = [...items];

    if (filter === "lost") arr = arr.filter((i) => i.status === "lost");
    if (filter === "found") arr = arr.filter((i) => i.status === "found");
    if (filter === "claimed") arr = arr.filter((i: any) => i.claimed === true);
    if (filter === "unclaimed") arr = arr.filter((i: any) => i.claimed !== true);

    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter(
        (i) =>
          i.title?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.location?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q)
      );
    }

    if (sort === "newest") {
      arr.sort((a, b) => tsToMillis(b.createdAt) - tsToMillis(a.createdAt));
    } else if (sort === "oldest") {
      arr.sort((a, b) => tsToMillis(a.createdAt) - tsToMillis(b.createdAt));
    } else if (sort === "category") {
      arr.sort((a, b) => String(a.category || "").localeCompare(String(b.category || "")));
    }

    return arr;
  }, [items, filter, search, sort]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const base = collection(db, "items");
      const qy = query(base, orderBy("createdAt", "desc"), limit(1));
      await getDocs(qy);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // sort sheet helpers
  function openSort() {
    setSortOpen(true);
    Animated.timing(sheetAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }
  function closeSort() {
    Animated.timing(sheetAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setSortOpen(false);
    });
  }
  function chooseSort(v: SortKey) {
    setSort(v);
    closeSort();
  }
  const translateY = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });
  const opacity = sheetAnim;

  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity
      style={s.card}
      onPress={() => navigation.navigate("ItemDetail", { itemId: item.id })}
    >
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Image
          source={{ uri: item.imageUrl || "https://placehold.co/96x96?text=No+Image" }}
          style={s.thumb}
        />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={s.cardTitle}>
            {item.title}
          </Text>
          <Text numberOfLines={2} style={s.cardMeta}>
            {(item.category ? `${capitalize(item.category)} • ` : "") +
              (item.location || "Unknown location")}
          </Text>
          <Text style={s.cardTime}>
            {timeAgo(item.createdAt)}
            {item.createdByName ? ` • Posted by ${item.createdByName}` : ""}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const sortLabel =
    sort === "newest" ? "Newest" : sort === "oldest" ? "Oldest" : "Category";

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Header: profile left, title center (rendered by navigator), plus right */}
      <View style={s.header}>
        <Text style={s.headerTitle}>SJSU Lost & Found</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate("Profile")}
          style={s.avatarBtn}
          accessibilityLabel="Open Profile"
        >
          {avatar ? (
            <Image source={{ uri: avatar }} style={s.avatarImg} />
          ) : (
            <Text style={s.avatarFallback}>🙂</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.navigate("NewItem")}
        >
          <Text style={s.addBtnText}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.toolbar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search title, category, building…"
          style={s.search}
          returnKeyType="search"
        />

        {/* Filters: single horizontal row (scrollable) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsRow}
          style={{ marginTop: 10 }}
        >
          <Pill active={filter === "all"} onPress={() => setFilter("all")} label="All" />
          <Pill active={filter === "lost"} onPress={() => setFilter("lost")} label="Lost" />
          <Pill active={filter === "found"} onPress={() => setFilter("found")} label="Found" />
          <Pill
            active={filter === "unclaimed"}
            onPress={() => setFilter("unclaimed")}
            label="Unclaimed"
          />
          <Pill
            active={filter === "claimed"}
            onPress={() => setFilter("claimed")}
            label="Claimed"
          />
        </ScrollView>

        {/* Sort button (kept separate) */}
        <View style={s.sortBar}>
          <Text style={s.sortLabel}>Sort by:</Text>
          <TouchableOpacity style={s.sortBtn} onPress={openSort}>
            <Text style={s.sortBtnText}>{sortLabel}</Text>
            <Text style={{ color: "#6b7280", marginLeft: 6 }}>⌄</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled"
      />

      {/* Sort action-sheet */}
      <Modal
        visible={sortOpen}
        transparent
        animationType="none"
        onRequestClose={closeSort}
      >
        <Pressable style={s.backdrop} onPress={closeSort}>
          <Animated.View
            style={[s.sheet, { opacity, transform: [{ translateY }] }]}
          >
            <Text style={s.sheetTitle}>Sort by</Text>
            <SortRow
              label="Newest"
              selected={sort === "newest"}
              onPress={() => chooseSort("newest")}
            />
            <SortRow
              label="Oldest"
              selected={sort === "oldest"}
              onPress={() => chooseSort("oldest")}
            />
            <SortRow
              label="Category"
              selected={sort === "category"}
              onPress={() => chooseSort("category")}
            />
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Pill({
  label,
  onPress,
  active,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        s.pill,
        active && { backgroundColor: "#0B1221", borderColor: "#0B1221" },
      ]}
    >
      <Text style={[s.pillText, active && { color: "white" }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SortRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.row, selected && s.rowActive]}>
      <Text style={[s.rowText, selected && s.rowTextActive]}>{label}</Text>
      {selected ? <Text style={s.check}>✓</Text> : null}
    </TouchableOpacity>
  );
}

function capitalize(s?: string) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function tsToMillis(t?: any) {
  if (!t) return 0;
  if (t instanceof Date) return t.getTime();
  if (typeof t?.toMillis === "function") return t.toMillis();
  if (t?.seconds) return t.seconds * 1000;
  return Number(t) || 0;
}
function timeAgo(t?: any) {
  const ms = Date.now() - tsToMillis(t);
  if (ms <= 0) return "just now";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", flex: 1 },

  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarFallback: { fontSize: 18 },

  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFD166",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { fontSize: 22, fontWeight: "800", color: "#0B1221" },

  toolbar: { paddingHorizontal: 16 },
  search: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
  },

  // Single-line chips row
  chipsRow: { alignItems: "center", gap: 8, paddingRight: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "white",
  },
  pillText: { fontWeight: "700", color: "#0B1221" },

  sortBar: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sortLabel: { fontWeight: "700", color: "#0B1221" },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "white",
  },
  sortBtnText: { fontWeight: "700", color: "#0B1221" },

  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "white",
  },
  thumb: { width: 88, height: 88, borderRadius: 8, backgroundColor: "#e5e7eb" },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  cardMeta: { marginTop: 4, color: "#475569" },
  cardTime: { marginTop: 6, color: "#6b7280", fontSize: 12 },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetTitle: { fontWeight: "800", fontSize: 16, marginBottom: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  rowActive: { backgroundColor: "#F3F4F6" },
  rowText: { fontSize: 16, color: "#0B1221" },
  rowTextActive: { fontWeight: "800" },
  check: { color: "#0B1221", fontSize: 16, fontWeight: "800" },
});
