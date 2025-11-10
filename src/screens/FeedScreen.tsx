// src/screens/FeedScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  FlatList,
  TextInput,
  Pressable,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { watchFeed } from "@/services/items";
import { watchMyClaims } from "@/services/claims";
import { auth } from "@/firebase";
import { signOut } from "firebase/auth";

import { TText, Thumb, Card } from "@/ui/components";
import { useTheme } from "@/ui/ThemeProvider";

type Mode = "browse" | "myClaims";

export default function FeedScreen({ navigation, route }: any) {
  const { colors, spacing, radius } = useTheme();

  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "lost" | "found" | "claimed">("all");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<Mode>("browse");

  // Reset when returning from NewItem (force All + clear search)
  useFocusEffect(
    useCallback(() => {
      if (route?.params?.forceAll) setFilter("all");
      if (route?.params?.clearSearch) setSearch("");
      if (route?.params) navigation.setParams({});
    }, [route?.params, navigation])
  );

  // Data subscriptions
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    let unsub: any;

    if (mode === "browse") {
      unsub = watchFeed({ filter, queryText: search, onItems: setItems });
    } else if (mode === "myClaims" && uid) {
      unsub = watchMyClaims(uid, { onItems: setItems });
    }

    return () => unsub && unsub();
  }, [mode, filter, search]);

  async function handleSignOut() {
    try {
      await signOut(auth);
      Alert.alert("Signed out");
      navigation.replace("Login");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  }

  // --- tiny UI helpers (compact pills / icon button / link) ---
  const Pill = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active?: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? colors.blue : colors.border,
        backgroundColor: active ? colors.blue : "transparent",
      }}
    >
      <TText
        variant="body"
        style={{ color: active ? "white" : colors.blue, fontWeight: "700" }}
      >
        {label}
      </TText>
    </Pressable>
  );

  const IconCircle = ({
    onPress,
    label,
  }: {
    onPress: () => void;
    label: string;
  }) => (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.gold,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: colors.shadow,
        shadowOpacity: 0.25,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <TText variant="h2" style={{ fontWeight: "800" }}>
        +
      </TText>
    </Pressable>
  );

  const LinkButton = ({
    title,
    onPress,
    color = colors.blue,
  }: {
    title: string;
    onPress: () => void;
    color?: string;
  }) => (
    <Pressable onPress={onPress} hitSlop={8}>
      <TText variant="body" style={{ color, fontWeight: "700" }}>
        {title}
      </TText>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, padding: spacing.md, gap: spacing.sm }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: spacing.xs,
        }}
      >
        <TText variant="h1" style={{ flex: 1 }}>
          Feed
        </TText>
        {/* small Sign Out link */}
        <LinkButton title="Sign Out" onPress={handleSignOut} color={"#B00020"} />
      </View>

      {/* Mode pills + Create Post icon on the right */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          marginBottom: spacing.xs,
        }}
      >
        <Pill
          label={`Browse${mode === "browse" ? " ✓" : ""}`}
          active={mode === "browse"}
          onPress={() => setMode("browse")}
        />
        <Pill
          label={`My Claims${mode === "myClaims" ? " ✓" : ""}`}
          active={mode === "myClaims"}
          onPress={() => setMode("myClaims")}
        />
        <View style={{ flex: 1 }} />
        <IconCircle
          label="Create post"
          onPress={() => navigation.navigate("NewItem")}
        />
      </View>

      {/* Search + Clear in one line (browse only) */}
      {mode === "browse" && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            padding: spacing.sm,
            borderRadius: radius.lg,
            backgroundColor: colors.blueMuted,
          }}
        >
          <View
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              backgroundColor: "white",
              paddingHorizontal: spacing.md,
              paddingVertical: 6,
            }}
          >
            <TextInput
              placeholder="Filter by category or building (e.g., Electronics, Library)"
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              style={{ color: colors.text }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>

          <LinkButton
            title="Clear"
            onPress={() => setSearch("")}
            color={colors.blue}
          />
        </View>
      )}

      {/* Status row (browse only) */}
      {mode === "browse" && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: spacing.sm,
            alignItems: "center",
            marginTop: spacing.xs,
          }}
        >
          <Pill
            label={`All${filter === "all" ? " ✓" : ""}`}
            active={filter === "all"}
            onPress={() => setFilter("all")}
          />
          <Pill
            label={`Lost${filter === "lost" ? " ✓" : ""}`}
            active={filter === "lost"}
            onPress={() => setFilter("lost")}
          />
          <Pill
            label={`Found${filter === "found" ? " ✓" : ""}`}
            active={filter === "found"}
            onPress={() => setFilter("found")}
          />
          <Pill
            label={`Claimed${filter === "claimed" ? " ✓" : ""}`}
            active={filter === "claimed"}
            onPress={() => setFilter("claimed")}
          />
        </View>
      )}

      <FlatList
        contentContainerStyle={{ paddingTop: spacing.xs, paddingBottom: spacing.lg }}
        data={items}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={
          <View style={{ padding: spacing.xl, alignItems: "center", gap: spacing.xs }}>
            <TText variant="h2">No items to show</TText>
            {mode === "browse" && (
              <TText muted style={{ textAlign: "center" }}>
                Try changing the filter or clearing the search text.
              </TText>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate("ItemDetail", { itemId: item.id })}>
            <Card
              style={{
                flexDirection: "row",
                gap: spacing.md,
                alignItems: "center",
                marginVertical: spacing.xs,
                opacity: item.status === "claimed" ? 0.55 : 1,
              }}
            >
              <Thumb uri={item.imageUrl} />
              <View style={{ flex: 1 }}>
                <TText variant="h2">{item.title}</TText>

                {/* In My Claims, show my claim status; otherwise show CLAIMED */}
                {mode === "myClaims" ? (
                  <TText
                    variant="small"
                    style={{
                      fontWeight: "700",
                      color:
                        item.claimStatus === "approved"
                          ? "#0a7b0a"
                          : item.claimStatus === "pending"
                          ? "#8a6d00"
                          : "#8a0000",
                    }}
                  >
                    {String(item.claimStatus || "").toUpperCase()}
                  </TText>
                ) : (
                  item.status === "claimed" && (
                    <TText variant="small" style={{ fontWeight: "700", color: "#B00020" }}>
                      CLAIMED
                    </TText>
                  )
                )}

                <TText muted numberOfLines={1} ellipsizeMode="tail">
                  {item.location} • {item.category} •{" "}
                  {new Date(item.createdAt).toLocaleDateString()}
                </TText>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
