// src/screens/NewItemScreen.tsx
import React, { useRef, useState } from "react";
import {
  View,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Modal,
  Pressable,
  Text,
  TextInput,
  Button,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import MapView, { Marker, type Region } from "react-native-maps";
import Slider from "@react-native-community/slider";
import Constants from "expo-constants";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { createItem } from "@/services/items";
import { auth, db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { ItemCategory } from "@/types";

const CATEGORIES: ItemCategory[] = [
  "Electronics",
  "Clothing",
  "ID",
  "Keys",
  "Charger",
  "Other",
];

// 🔑 Put your real key here (or read from app config)
const GOOGLE_PLACES_KEY = "YOUR API KEY";

// SJSU default center
const SJSU = { lat: 37.335187, lng: -121.881071 };
const SJSU_REGION: Region = {
  latitude: SJSU.lat,
  longitude: SJSU.lng,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

// Type for MapView long-press handler
type MapLongPress = NonNullable<
  React.ComponentProps<typeof MapView>["onLongPress"]
>;

export default function NewItemScreen({ navigation }: any) {
  // const GOOGLE_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY as string;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Main-screen label we show under “Location”
  const [location, setLocation] = useState("");

  // Modal fields
  const [addr, setAddr] = useState(""); // search box text
  const [building, setBuilding] = useState(""); // optional
  const [notes, setNotes] = useState(""); // optional

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [radiusM, setRadiusM] = useState<number>(100);

  const [category, setCategory] = useState<ItemCategory>("Electronics");
  const [status, setStatus] = useState<"lost" | "found">("found");
  const [imageUri, setImageUri] = useState<string>("");

  const [err, setErr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    title?: string;
    location?: string;
    image?: string;
    category?: string;
  }>({});

  const [catOpen, setCatOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  // Map ref to animate region
  const mapRef = useRef<MapView | null>(null);

  function animateTo(lat: number, lng: number) {
    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      350
    );
  }

  function validate() {
    const e: typeof errors = {};
    const t = title.trim();
    if (!t || t.length < 3)
      e.title = "Title must be at least 3 characters.";
    if (!imageUri) e.image = "Please pick a photo.";
    if (!location.trim()) e.location = "Location is required.";
    if (!CATEGORIES.includes(category))
      e.category = "Please choose a valid category.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function pickPhoto() {
    setErr("");
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      setErr("Photo permission is required to pick an image.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!res.canceled && res.assets?.length) {
      setImageUri(res.assets[0].uri);
      setErrors((prev) => ({ ...prev, image: undefined }));
    }
  }

  async function takePhoto() {
    setErr("");
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== "granted") {
      setErr("Camera permission is required to take a photo.");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });

    if (!res.canceled && res.assets?.length) {
      setImageUri(res.assets[0].uri);
      setErrors((prev) => ({ ...prev, image: undefined }));
    }
  }

  async function openMap() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted" && !coords) {
        const pos = await Location.getCurrentPositionAsync({});
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }
    } catch {
      // ignore
    } finally {
      if (!coords) setCoords({ lat: SJSU.lat, lng: SJSU.lng });
      if (location && !addr) setAddr(location);
      setMapOpen(true);
      setTimeout(() => {
        const c = coords || SJSU;
        animateTo(c.lat, c.lng);
      }, 200);
    }
  }

  // Optional reverse geocode for long-press
  async function reverseGeocode(lat: number, lng: number) {
    try {
      const r = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      const top = r?.[0];
      if (top) {
        const line = [top.name || top.street, top.city, top.region]
          .filter(Boolean)
          .join(", ");
        setAddr(line);
      }
    } catch {
      /* ignore */
    }
  }

  const onMapLongPress: MapLongPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setCoords({ lat: latitude, lng: longitude });
    reverseGeocode(latitude, longitude);
    animateTo(latitude, longitude);
  };

  function saveMapSelection() {
    const label = [building.trim(), addr.trim()]
      .filter(Boolean)
      .join(", ");
    if (label) setLocation(label);
    setErrors((p) => ({ ...p, location: undefined }));
    setMapOpen(false);
  }

  async function onPost() {
    try {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setErr("");

      if (!validate()) {
        setIsSubmitting(false);
        return;
      }

      const uid = auth.currentUser?.uid || "";
      if (!uid) throw new Error("Not authenticated.");

      // 🔹 Look up displayName from users/{uid}
      let createdByName: string | undefined;
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          createdByName = (data.displayName as string) || undefined;
        }
      } catch {
        // if it fails, we just leave createdByName undefined
      }

      await createItem(
        {
          title: title.trim(),
          description: description.trim(),
          category,
          location: location.trim(), // final human label only
          status,
          createdByUid: uid,
          createdByName, // 🔹 store human name for UI
          lat: coords?.lat,
          lng: coords?.lng,
          radiusM,
          notes: notes.trim() || undefined,
          building: building.trim() || undefined,
          address: addr.trim() || undefined,
        } as any,
        imageUri
      );

      Alert.alert("Posted", "Your item has been posted.");

      // reset
      setTitle("");
      setDescription("");
      setLocation("");
      setCategory("Electronics");
      setStatus("found");
      setImageUri("");
      setCoords(null);
      setRadiusM(100);
      setAddr("");
      setBuilding("");
      setNotes("");
      setErrors({});

      navigation.navigate("Feed", { forceAll: true, clearSearch: true });
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  const canPost =
    !!imageUri && title.trim().length >= 3 && !!location.trim() && !isSubmitting;

  return (
    <SafeAreaView style={s.flex}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={s.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Row: photo + title/description */}
          <View style={s.topRow}>
            <Pressable onPress={pickPhoto} style={s.thumb}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={s.thumbImage} />
              ) : (
                <View style={{ alignItems: "center" }}>
                  <Text style={s.muted}>Tap to</Text>
                  <Text style={s.addPhoto}>Add Photo</Text>
                </View>
              )}
            </Pressable>

            <View style={s.rightCol}>
              <TextInput
                placeholder="Title"
                value={title}
                onChangeText={(t) => {
                  setTitle(t);
                  if (errors.title)
                    setErrors({ ...errors, title: undefined });
                }}
                style={[s.input, errors.title ? s.errorBorder : undefined]}
                placeholderTextColor="#667085"
              />
              {errors.title ? (
                <Text style={s.errorText}>{errors.title}</Text>
              ) : null}

              <TextInput
                placeholder="Description"
                value={description}
                onChangeText={setDescription}
                multiline
                style={[
                  s.input,
                  { minHeight: 96, textAlignVertical: "top" },
                ]}
                placeholderTextColor="#667085"
              />
            </View>
          </View>
          {errors.image ? (
            <Text style={s.errorText}>{errors.image}</Text>
          ) : null}

          {/* Category (UNCHANGED UI) */}
          <View style={{ gap: 6 }}>
            <Text style={s.label}>Category</Text>
            <Pressable
              onPress={() => setCatOpen(true)}
              style={[s.selectBox, errors.category ? s.errorBorder : undefined]}
            >
              <Text style={{ color: "#0B1221" }}>{category}</Text>
              <Text style={{ color: "#667085" }}>▼</Text>
            </Pressable>
            {errors.category ? (
              <Text style={s.errorText}>{errors.category}</Text>
            ) : null}
          </View>

          {/* Location (opens modal) */}
          <Text style={s.label}>Location</Text>
          <Pressable
            onPress={openMap}
            style={[s.selectBox, errors.location ? s.errorBorder : undefined]}
          >
            <Text style={{ color: location ? "#0B1221" : "#667085" }}>
              {location || "Select on map / search address"}
            </Text>
            <Text style={{ color: "#667085" }}>📍</Text>
          </Pressable>
          {errors.location ? (
            <Text style={s.errorText}>{errors.location}</Text>
          ) : null}

          {/* Status */}
          <Text style={s.label}>Status</Text>
          <View style={s.statusRow}>
            {(["lost", "found"] as const).map((key) => {
              const active = status === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setStatus(key)}
                  style={[s.pill, active ? s.pillActive : s.pillInactive]}
                >
                  <Text
                    style={[
                      s.pillText,
                      active ? s.pillTextActive : s.pillTextInactive,
                    ]}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Footer summary — NO coordinates */}
          <Text style={s.muted}>
            Selected: {status} • {category}
            {location ? ` • ${location}` : ""}
          </Text>

          {err ? <Text style={s.errorText}>{err}</Text> : null}

          <Button
            title={isSubmitting ? "Posting..." : "Post"}
            disabled={!canPost}
            onPress={onPost}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Modal (UNCHANGED) */}
      <Modal visible={catOpen} transparent animationType="fade">
        <Pressable onPress={() => setCatOpen(false)} style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Select category</Text>
            <View style={{ gap: 6 }}>
              {CATEGORIES.map((c) => {
                const active = c === category;
                return (
                  <Pressable
                    key={c}
                    onPress={() => {
                      setCategory(c);
                      setErrors((e) => ({ ...e, category: undefined }));
                      setCatOpen(false);
                    }}
                    style={[s.optionRow, active && s.optionRowActive]}
                  >
                    <Text
                      style={{ fontWeight: active ? "700" : "400" }}
                    >
                      {c}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={s.modalActions}>
              <Pressable onPress={() => setCatOpen(false)} hitSlop={8}>
                <Text style={s.link}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Map + Address Modal with Google Autocomplete */}
      <Modal visible={mapOpen} transparent animationType="fade">
        <Pressable onPress={() => setMapOpen(false)} style={s.modalBackdrop}>
          <View style={[s.modalCard, { padding: 0, overflow: "hidden" }]}>
            <View style={{ padding: 12, gap: 8 }}>
              <Text style={s.modalTitle}>Choose Location</Text>

              {/* Google Places Autocomplete input */}
              <View style={{ zIndex: 20 }}>
                <GooglePlacesAutocomplete
                  placeholder="Search address or place (e.g., Clark Hall)"
                  fetchDetails
                  enablePoweredByContainer={false}
                  textInputProps={{
                    value: addr,
                    onChangeText: setAddr,
                    placeholderTextColor: "#667085",
                  }}
                  query={{
                    key: GOOGLE_PLACES_KEY,
                    language: "en",
                    // Bias suggestions to SJSU area (~5km)
                    location: `${SJSU.lat},${SJSU.lng}`,
                    radius: 5000,
                    components: "country:us",
                  }}
                  onPress={(data, details) => {
                    const loc = details?.geometry?.location;
                    if (loc) {
                      setAddr(data.description);
                      setCoords({ lat: loc.lat, lng: loc.lng });
                      animateTo(loc.lat, loc.lng);
                    }
                  }}
                  styles={{
                    container: { flex: 0 },
                    textInputContainer: { padding: 0, margin: 0 },
                    textInput: [s.input],
                    listView: {
                      backgroundColor: "white",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      borderRadius: 10,
                      marginTop: 6,
                    },
                    row: { paddingVertical: 10, paddingHorizontal: 12 },
                    separator: { height: 1, backgroundColor: "#F1F5F9" },
                  }}
                />
              </View>

              {/* Building / Notes (optional) */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  placeholder="Building / Room (optional)"
                  value={building}
                  onChangeText={setBuilding}
                  style={[s.input, { flex: 1 }]}
                  placeholderTextColor="#667085"
                />
                <TextInput
                  placeholder="Notes (optional)"
                  value={notes}
                  onChangeText={setNotes}
                  style={[s.input, { flex: 1 }]}
                  placeholderTextColor="#667085"
                />
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={s.muted}>Long-press map to drop a pin</Text>
                <Pressable
                  onPress={async () => {
                    try {
                      const { status } =
                        await Location.requestForegroundPermissionsAsync();
                      if (status !== "granted") return;
                      const pos = await Location.getCurrentPositionAsync({});
                      const { latitude, longitude } = pos.coords;
                      setCoords({ lat: latitude, lng: longitude });
                      animateTo(latitude, longitude);
                    } catch {}
                  }}
                  hitSlop={8}
                >
                  <Text style={s.link}>Center on me</Text>
                </Pressable>
              </View>
            </View>

            <View style={{ height: 280 }}>
              <MapView
                ref={mapRef}
                style={{ flex: 1 }}
                initialRegion={SJSU_REGION} // always default to SJSU
                onLongPress={onMapLongPress}
              >
                <Marker
                  coordinate={{
                    latitude: coords?.lat ?? SJSU.lat,
                    longitude: coords?.lng ?? SJSU.lng,
                  }}
                />
              </MapView>
            </View>

            <View style={{ padding: 12, gap: 10 }}>
              <Text>Radius: ~{radiusM} m</Text>
              <Slider
                minimumValue={25}
                maximumValue={500}
                step={5}
                value={radiusM}
                onValueChange={setRadiusM}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 16,
                }}
              >
                <Pressable onPress={() => setMapOpen(false)}>
                  <Text style={s.link}>Cancel</Text>
                </Pressable>
                <Pressable onPress={saveMapSelection}>
                  <Text style={s.link}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, gap: 12, paddingBottom: 40 },

  topRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },

  thumb: {
    width: 112,
    height: 112,
    borderRadius: 10,
    backgroundColor: "#EDEEEF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  thumbImage: { width: "100%", height: "100%" },

  rightCol: { flex: 1, gap: 6 },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
    color: "#0B1221",
  },

  label: { fontWeight: "700", fontSize: 16 },

  selectBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  statusRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillActive: { borderColor: "#0055A2", backgroundColor: "#0055A2" },
  pillInactive: { borderColor: "#E5E7EB", backgroundColor: "white" },
  pillText: { fontWeight: "700" },
  pillTextActive: { color: "white" },
  pillTextInactive: { color: "#0055A2" },

  muted: { color: "#667085" },
  addPhoto: { fontSize: 18, fontWeight: "700", color: "#0B1221" },

  errorText: { color: "#B00020" },
  errorBorder: { borderColor: "#B00020" },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: { backgroundColor: "white", borderRadius: 14, padding: 16, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  optionRow: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  optionRowActive: {
    backgroundColor: "#EEF4FF",
    borderWidth: 1,
    borderColor: "#0055A2",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  link: { color: "#0055A2", fontWeight: "700" },

  photoAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "white",
  },
  photoActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0B1221",
  },
});
