// src/screens/ItemDetailScreen.tsx
import React, { useEffect, useState } from "react";
import { View, Text, Image, Button, Alert, FlatList, TextInput } from "react-native";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db, auth } from "@/firebase";
import { fetchItem, markItemClaimed } from "@/services/items";
import { createClaim, watchClaims, setClaimStatus } from "@/services/claims";

export default function ItemDetailScreen({ route }: any) {
  const { itemId } = route.params;

  const [item, setItem] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Track my most recent claim (if any)
  const [myClaim, setMyClaim] = useState<any | null>(null);

  // Load item + subscribe to claims
  useEffect(() => {
    let unsubClaims: any;

    (async () => {
      const i = await fetchItem(itemId);
      setItem(i);

      unsubClaims = watchClaims(itemId, setClaims);
    })();

    return () => {
      if (unsubClaims) unsubClaims();
    };
  }, [itemId]);

  // Subscribe to *my* latest claim on this item
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, `items/${itemId}/claims`),
      where("claimerUid", "==", uid),
      orderBy("createdAtTs", "desc"),
      limit(1)
    );

    const unsubMine = onSnapshot(q, (snap) => {
      setMyClaim(snap.docs[0]?.data() ?? null);
    });

    return () => unsubMine();
  }, [itemId]);

  if (!item) return null;

  const isOwner = auth.currentUser?.uid === item.createdByUid;
  const isClaimed = item.status === "claimed";
  const claimedAt = item.claimedAtMs ? new Date(item.claimedAtMs) : null;

  return (
    <View style={{ padding: 16, gap: 8 }}>
      <Image source={{ uri: item.imageUrl }} style={{ width: "100%", height: 240, borderRadius: 12 }} />
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>{item.title}</Text>

      {/* Claimed badge */}
      {isClaimed && (
        <View style={{ paddingVertical: 6 }}>
          <Text style={{ fontWeight: "700", color: "#b00000" }}>CLAIMED</Text>
          <Text style={{ color: "#555" }}>
            {claimedAt ? `on ${claimedAt.toLocaleString()}` : "recently"}
            {item.claimedByUid ? ` • by ${item.claimedByUid === item.createdByUid ? "owner" : "claimer"}` : ""}
          </Text>
        </View>
      )}

      <Text>{item.description}</Text>
      <Text>
        {item.location} • {item.category} • {new Date(item.createdAt).toLocaleString()}
      </Text>

      {isOwner ? (
        <>
          {/* Owner actions */}
          {!isClaimed ? (
            <Button
              title="Mark as Claimed"
              onPress={async () => {
                await markItemClaimed(itemId);
                Alert.alert("Marked as claimed");
                const i = await fetchItem(itemId);
                setItem(i);
              }}
            />
          ) : (
            <Button title="Claimed" disabled />
          )}

          <Text style={{ marginTop: 12, fontWeight: "bold" }}>Claims</Text>
          {claims.length === 0 ? (
          <Text style={{ color: "#666", marginTop: 8 }}>No claims yet.</Text>
          ) : (
            <FlatList
              data={claims}
              keyExtractor={(c) => c.id}
              renderItem={({ item: c }) => {
                const pending = c.status === "pending";
                const disabled = isClaimed || !pending || isUpdating === c.id;

                return (
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: "#ddd",
                      borderRadius: 8,
                      padding: 8,
                      marginVertical: 6,
                    }}
                  >
                    <Text>{c.message || "(no message)"}</Text>

                    {!disabled ? (
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                        <Button
                          title={isUpdating === c.id ? "Approving..." : "Approve"}
                          onPress={async () => {
                            setIsUpdating(c.id);
                            try {
                              await setClaimStatus(itemId, c.id, "approved");
                            } finally {
                              setIsUpdating(null);
                            }
                          }}
                          disabled={isUpdating === c.id}
                        />
                        <Button
                          title={isUpdating === c.id ? "Rejecting..." : "Reject"}
                          onPress={async () => {
                            setIsUpdating(c.id);
                            try {
                              await setClaimStatus(itemId, c.id, "rejected");
                            } finally {
                              setIsUpdating(null);
                            }
                          }}
                          color="#8a0000"
                          disabled={isUpdating === c.id}
                        />
                      </View>
                    ) : (
                      <Text style={{ marginTop: 6, color: "#666" }}>Status: {c.status}</Text>
                    )}
                  </View>
                );
              }}
          />
          )}
        </>
      ) : (
        // Non-owner view
        <>
          {isClaimed ? (
            <Text style={{ color: "#555", marginTop: 8 }}>
              This item has been marked as claimed.
            </Text>
          ) : myClaim ? (
            // Already claimed by me → show my status, don't allow duplicate claims
            <View style={{ gap: 6, marginTop: 8 }}>
              <Text>
                Your claim status: <Text style={{ fontWeight: "700" }}>{myClaim.status}</Text>
              </Text>
              <Text style={{ color: "#666" }}>
                We’ll notify the owner. You can check status under **My Claims**.
              </Text>
            </View>
          ) : (
            // No claim yet → show composer
            <View style={{ gap: 8 }}>
              <TextInput
                placeholder="Message to owner (optional)"
                value={message}
                onChangeText={setMessage}
                style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 8 }}
              />
              <Button
                title="I think this is mine"
                onPress={async () => {
                  const uid = auth.currentUser?.uid || "";
                  if (!uid) return;
                  await createClaim(itemId, uid, message);
                  Alert.alert("Claim sent to owner");
                  setMessage("");
                }}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}
