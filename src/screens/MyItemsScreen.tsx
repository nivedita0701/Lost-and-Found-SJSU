// src/screens/MyItemsScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { useTheme } from "@/ui/ThemeProvider";

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
  const [filter, setFilter] =
    useState<"all" | "claimed" | "unclaimed">("all");
  const [refreshing, setRefreshing] = useState(false);

  const { theme } = useTheme();
  const { colors } = theme;
  const s = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    if (!uid) return;
    const base = collection(db, "items");
    const qy = query(
      base,
      where("createdByUid", "==", uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(qy, (snap) => {
      setItems(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      );
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
      const qy = query(
        base,
        where("createdByUid", "==", uid),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      await getDocs(qy);
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity
      style={s.card}
      onPress={() =>
        navigation.navigate("ItemDetail", { itemId: item.id })
      }
    >
      <Image
        source={{
          uri:
            item.imageUrl ||
            "https://placehold.co/96x96?text=No+Image",
        }}
        style={s.thumb}
      />
      <View style={s.cardBody}>
        <Text numberOfLines={1} style={s.title}>
          {item.title}
        </Text>
        <Text numberOfLines={2} style={s.meta}>
          {(item.category ? `${capitalize(item.category)} • ` : "") +
            (item.location || "Unknown location")}
        </Text>
        <View style={s.badges}>
          <Badge
            label={item.status === "found" ? "Found" : "Lost"}
            styles={s}
          />
          <Badge
            label={item.claimed ? "Claimed" : "Open"}
            variant={item.claimed ? "ok" : "warn"}
            styles={s}
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.h1}>My Items</Text>
        <View style={s.statsRow}>
          <Stat label="Total" value={stats.total} styles={s} />
          <Stat label="Open" value={stats.open} styles={s} />
          <Stat label="Claimed" value={stats.claimed} styles={s} />
        </View>
        <View style={s.pillsRow}>
          <Pill
            label="All"
            active={filter === "all"}
            onPress={() => setFilter("all")}
            styles={s}
            colors={colors}
          />
          <Pill
            label="Open"
            active={filter === "unclaimed"}
            onPress={() => setFilter("unclaimed")}
            styles={s}
            colors={colors}
          />
          <Pill
            label="Claimed"
            active={filter === "claimed"}
            onPress={() => setFilter("claimed")}
            styles={s}
            colors={colors}
          />
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTxt}>
              You haven’t posted anything yet.
            </Text>
          </View>
        }
      />
    </View>
  );
}

function Stat({
  label,
  value,
  styles,
}: {
  label: string;
  value: number;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Pill({
  label,
  active,
  onPress,
  styles,
  colors,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  colors: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.pill,
        active && {
          backgroundColor: colors.blue,
          borderColor: colors.blue,
        },
      ]}
    >
      <Text
        style={[
          styles.pillTxt,
          active && { color: colors.background },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Badge({
  label,
  variant = "plain",
  styles,
}: {
  label: string;
  variant?: "plain" | "ok" | "warn";
  styles: ReturnType<typeof makeStyles>;
}) {
  const palette =
    variant === "ok"
      ? { bg: "#DCFCE7", fg: "#166534", br: "#86EFAC" }
      : variant === "warn"
      ? { bg: "#FEF9C3", fg: "#92400E", br: "#FDE68A" }
      : { bg: "#E5E7EB", fg: "#111827", br: "#D1D5DB" };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: palette.bg,
          borderColor: palette.br,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeTxt,
          {
            color: palette.fg,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function capitalize(s?: string) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
      backgroundColor: colors.background,
    },
    h1: {
      fontSize: 22,
      fontWeight: "800",
      marginBottom: 8,
      color: colors.text,
    },
    statsRow: {
      flexDirection: "row",
      gap: 18,
      marginTop: 4,
    },
    statBox: {
      alignItems: "center",
      minWidth: 70,
    },
    statValue: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
    },
    statLabel: {
      color: colors.textMuted,
      fontSize: 13,
    },
    pillsRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    pillTxt: {
      fontWeight: "700",
      color: colors.text,
    },
    listContent: {
      padding: 16,
      paddingBottom: 60,
    },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      backgroundColor: colors.card,
      flexDirection: "row",
    },
    thumb: {
      width: 88,
      height: 88,
      borderRadius: 8,
      backgroundColor: colors.border,
    },
    cardBody: { flex: 1, marginLeft: 12 },
    title: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    meta: {
      marginTop: 4,
      color: colors.textMuted,
    },
    badges: {
      flexDirection: "row",
      gap: 8,
      marginTop: 8,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },
    badgeTxt: {
      fontWeight: "700",
      fontSize: 12,
    },
    empty: {
      padding: 24,
      alignItems: "center",
    },
    emptyTxt: {
      color: colors.textMuted,
    },
  });
}
