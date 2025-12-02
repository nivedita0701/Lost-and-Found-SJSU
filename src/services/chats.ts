// src/services/chats.ts
import { db } from "@/firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

export type ChatThread = {
  id: string;
  itemId: string;
  participants: string[]; // [ownerUid, claimerUid]
  updatedAt?: any;
};

export type ChatMessage = {
  id: string;
  uid: string;
  text: string;
  createdAt: any;
};

function threadKey(a: string, b: string) {
  return [a, b].sort().join("_");
}

export async function openOrCreateThread(itemId: string, aUid: string, bUid: string) {
  // try to find existing
  const qy = query(
    collection(db, "chats"),
    where("itemId", "==", itemId),
    where("participants", "array-contains", aUid),
    limit(20)
  );
  const snap = await getDocs(qy);
  const existing = snap.docs
    .map(d => ({ id: d.id, ...(d.data() as any) }))
    .find((t: any) => Array.isArray(t.participants) && t.participants.includes(bUid));

  if (existing) return existing as ChatThread;

  // create new thread
  const docRef = await addDoc(collection(db, "chats"), {
    itemId,
    participants: [aUid, bUid],
    key: threadKey(aUid, bUid),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, itemId, participants: [aUid, bUid] } as ChatThread;
}

export function watchMessages(threadId: string, cb: (msgs: ChatMessage[]) => void) {
  const qy = query(
    collection(db, "chats", threadId, "messages"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(qy, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
  });
}

export async function sendMessage(threadId: string, uid: string, text: string) {
  await addDoc(collection(db, "chats", threadId, "messages"), {
    uid, text, createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, "chats", threadId), { updatedAt: serverTimestamp() }, { merge: true });
}
