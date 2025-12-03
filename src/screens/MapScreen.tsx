// src/screens/MapScreen.tsx
import React, { useEffect, useState, useMemo } from "react";
import { View, Alert, Linking, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import MapViewClustering from "react-native-map-clustering";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/ui/ThemeProvider";

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

  const { theme } = useTheme();
  const { colors } = theme;
  const s = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    const qy = query(collection(db, "items"));
    const unsub = onSnapshot(qy, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Item[];
      setItems(
        data.filter(
          (i) => typeof i.lat === "number" && typeof i.lng === "number"
        )
      );
    });
    return unsub;
  }, []);

  const openDirections = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url).catch(() => Alert.alert("Could not open maps"));
  };

  return (
    <View style={s.container}>
      <MapViewClustering
        style={StyleSheet.absoluteFill}
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
            onPress={() => openDirections(it.lat!, it.lng!)} // tap pin = directions
            onCalloutPress={() =>
              nav.navigate("ItemDetail", { itemId: it.id })
            } // tap callout = details
          />
        ))}
      </MapViewClustering>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });
}
