// src/screens/ChatScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Modal,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";

import { auth } from "@/firebase";
import { ChatMessage, sendMessage, watchMessages } from "@/services/chats";
import { uploadItemPhotoAsync } from "@/services/items";
import { useTheme } from "@/ui/ThemeProvider";

type RouteParams = {
  threadId: string;
  itemTitle?: string;
  itemImage?: string;
};

const IMAGE_PREFIX = "IMG::";

export default function ChatScreen() {
  const route = useRoute<any>();
  const { threadId, itemTitle, itemImage } = route.params as RouteParams;
  const uid = auth.currentUser?.uid || "";

  const { theme } = useTheme();
  const { colors } = theme;
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const unsub = watchMessages(threadId, setMsgs);
    return unsub;
  }, [threadId]);

  useEffect(() => {
    if (listRef.current && msgs.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [msgs.length]);

  async function onSend() {
    const body = text.trim();
    if (!body || sending) return;

    try {
      setSending(true);
      setText("");
      await sendMessage(threadId, uid, body);
    } catch (e: any) {
      Alert.alert("Send failed", e?.message || "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  async function onAttachImage() {
    try {
      if (uploadingImage) return;

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert(
          "Permission",
          "Photo access is required to attach an image."
        );
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });
      if (res.canceled || !res.assets?.length) return;

      setUploadingImage(true);
      const localUri = res.assets[0].uri;

      const url = await uploadItemPhotoAsync(localUri);
      await sendMessage(threadId, uid, `${IMAGE_PREFIX}${url}`);
    } catch (e: any) {
      Alert.alert("Image upload failed", e?.message || "Could not send image.");
    } finally {
      setUploadingImage(false);
    }
  }

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const mine = item.uid === uid;
    const isImage =
      typeof item.text === "string" && item.text.startsWith(IMAGE_PREFIX);
    const imageUrl = isImage ? item.text.slice(IMAGE_PREFIX.length) : null;

    return (
      <View
        style={[
          s.row,
          mine ? { justifyContent: "flex-end" } : { justifyContent: "flex-start" },
        ]}
      >
        <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
          {isImage && imageUrl ? (
            <Image source={{ uri: imageUrl }} style={s.image} resizeMode="cover" />
          ) : (
            <Text style={[s.text, mine ? s.textMine : s.textTheirs]}>
              {item.text}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>
          {itemTitle ? `Chat • ${itemTitle}` : "Chat"}
        </Text>
      </View>

      {/* Small item banner under header */}
      {itemImage ? (
        <TouchableOpacity
          style={s.itemBanner}
          onPress={() => setImageOpen(true)}
          activeOpacity={0.8}
        >
          <Image source={{ uri: itemImage }} style={s.itemThumb} />
          <View style={{ flex: 1 }}>
            <Text style={s.itemBannerTitle} numberOfLines={1}>
              {itemTitle || "Item"}
            </Text>
            <Text style={s.itemBannerHint}>Tap to view item photo</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={msgs}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={s.listContent}
      />

      {/* Input bar */}
      <View style={s.inputBarWrapper}>
        <View style={s.inputBar}>
          <TouchableOpacity
            onPress={onAttachImage}
            style={s.attachBtn}
            disabled={uploadingImage}
          >
            <Text style={s.attachIcon}>{uploadingImage ? "…" : "📎"}</Text>
          </TouchableOpacity>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message"
            style={s.input}
            placeholderTextColor={colors.textMuted}
            returnKeyType="send"
            onSubmitEditing={onSend}
            blurOnSubmit={false}
          />

          <TouchableOpacity
            style={[
              s.send,
              (!text.trim() || sending) && s.sendDisabled,
            ]}
            onPress={onSend}
            disabled={!text.trim() || sending}
          >
            <Text style={s.sendTxt}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Full-screen item image preview */}
      <Modal visible={imageOpen} transparent animationType="fade">
        <TouchableOpacity
          activeOpacity={1}
          style={s.modalBackdrop}
          onPress={() => setImageOpen(false)}
        >
          <View style={s.modalContent}>
            {itemImage ? (
              <Image
                source={{ uri: itemImage }}
                style={s.modalImage}
                resizeMode="contain"
              />
            ) : null}
            <TouchableOpacity
              style={s.modalClose}
              onPress={() => setImageOpen(false)}
            >
              <Text style={s.modalCloseTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },

    header: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    title: { fontSize: 18, fontWeight: "800", color: colors.text },

    itemBanner: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemThumb: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: colors.border,
      marginRight: 10,
    },
    itemBannerTitle: {
      fontWeight: "700",
      color: colors.text,
    },
    itemBannerHint: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },

    listContent: {
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 6,
    },

    row: {
      flexDirection: "row",
      marginVertical: 2,
    },

    bubble: {
      maxWidth: "72%",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 18,
    },
    bubbleMine: {
      backgroundColor: colors.blue,
      borderBottomRightRadius: 4,
    },
    bubbleTheirs: {
      backgroundColor: colors.card,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },

    text: { fontSize: 15 },
    textMine: { color: colors.background },
    textTheirs: { color: colors.text },

    image: {
      width: 220,
      height: 160,
      borderRadius: 14,
    },

    inputBarWrapper: {
      paddingHorizontal: 8,
      paddingTop: 4,
      paddingBottom: Platform.OS === "ios" ? 20 : 12,
      backgroundColor: colors.background,
    },
    inputBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },

    attachBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 4,
    },
    attachIcon: { fontSize: 18, color: colors.textMuted },

    input: {
      flex: 1,
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 15,
      color: colors.text,
    },

    send: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.blue,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 4,
    },
    sendDisabled: {
      opacity: 0.3,
    },
    sendTxt: {
      color: colors.background,
      fontWeight: "800",
      fontSize: 18,
      marginTop: -1,
    },

    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.8)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    modalContent: {
      width: "100%",
      alignItems: "center",
    },
    modalImage: {
      width: "100%",
      aspectRatio: 4 / 3,
      borderRadius: 16,
      backgroundColor: "#000",
    },
    modalClose: {
      marginTop: 16,
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalCloseTxt: {
      color: colors.text,
      fontWeight: "700",
    },
  });
}
