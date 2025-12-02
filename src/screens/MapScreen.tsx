import React, { useEffect, useState } from "react";
import { View, Alert, Linking } from "react-native";
import MapView, { Marker } from "react-native-maps";
import MapViewClustering from "react-native-map-clustering";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../firebase"; // path: src/screens -> src/firebase.ts
import { useNavigation } from "@react-navigation/native";

type Item = {
  id: string;
  title: string;
  category?: string;
  location?: string;
  lat?: number;
  lng?: number;
};

const SJSU = { latitude: 37.335187, longitude: -121.881071 };

export default function MapScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const nav = useNavigation<any>();

  useEffect(() => {
    const q = query(collection(db, "items"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Item[];
      setItems(data.filter((i) => typeof i.lat === "number" && typeof i.lng === "number"));
    });
    return unsub;
  }, []);

  const openDirections = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url).catch(() => Alert.alert("Could not open maps"));
  };

  return (
    <View style={{ flex: 1 }}>
      <MapViewClustering
        style={{ flex: 1 }}
        initialRegion={{
          latitude: SJSU.latitude,
          longitude: SJSU.longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
      >
        {items.map((it) => (
          <Marker
            key={it.id}
            coordinate={{ latitude: it.lat!, longitude: it.lng! }}
            title={it.title}
            description={`${it.category || "item"} • ${it.location || ""}`}
            onPress={() => openDirections(it.lat!, it.lng!)}                 // tap pin = directions
            onCalloutPress={() => nav.navigate("ItemDetail", { itemId: it.id })} // tap callout = details
          />
        ))}
      </MapViewClustering>
    </View>
  );
}
