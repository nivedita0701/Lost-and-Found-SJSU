// items.ts
import { Item } from "@/types";
import { db, auth } from "@/firebase";
import {
  addDoc, collection, onSnapshot, orderBy, query, serverTimestamp,
  updateDoc, doc, getDoc
} from "firebase/firestore";

const CLOUD_NAME = "dgdzposxm";
const UPLOAD_PRESET = "cmpe277";

// items.ts
type Mime = string | undefined;

function guessMime(uri: string, mime?: Mime): string {
  if (mime) return mime;
  const ext = uri.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "heic" || ext === "heif") return "image/heic";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "image/*";
}

export async function uploadItemPhotoAsync(localUri: string, mimeType?: Mime) {
  const data = new FormData();
  const type = guessMime(localUri, mimeType);

  // @ts-ignore React Native FormData file
  data.append("file", { uri: localUri, name: `photo_${Date.now()}`, type });
  data.append("upload_preset", UPLOAD_PRESET);
  data.append("folder", "lostfound");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: data as any,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed: ${text}`);
  }

  const json = await res.json();
  return json.secure_url as string;
}


type ItemDoc = Item & { id: string };

export async function createItem(
  data: Omit<Item, "id" | "imageUrl" | "createdAt">,
  localImageUri: string
) {
  const imageUrl = await uploadItemPhotoAsync(localImageUri);
  await addDoc(collection(db, "items"), {
    ...data,
    imageUrl,
    createdAt: Date.now(),
    createdAtTs: serverTimestamp(),
  });
}

export function watchFeed(opts: {
  filter?: "all" | "lost" | "found" | "claimed";
  queryText?: string;
  onItems: (docs: Array<Item & { id: string }>) => void;
}) {
  const q = query(collection(db, "items"), orderBy("createdAtTs", "desc"));
  const unsub = onSnapshot(q, (snap) => {
    let items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Item) }));

    // Text filter (category/location)
    if (opts.queryText) {
      const f = opts.queryText.toLowerCase();
      items = items.filter(
        (i) =>
          String(i.category || "").toLowerCase().includes(f) ||
          String(i.location || "").toLowerCase().includes(f)
      );
    }

    // Status filter
    const f = opts.filter || "all";
    if (f === "lost" || f === "found" || f === "claimed") {
      items = items.filter((i) => i.status === f);
    } else {
      // "all" → hide claimed
      items = items.filter((i) => i.status !== "claimed");
    }

    opts.onItems(items);
  });
  return unsub;
}

export async function updateItemStatus(itemId: string, status: "claimed"|"lost"|"found") {
  if (status === "claimed") {
    return markItemClaimed(itemId);
  }
  await updateDoc(doc(db, "items", itemId), { status });
}

export async function fetchItem(itemId: string) {
  const d = await getDoc(doc(db, "items", itemId));
  return d.exists() ? ({ id: d.id, ...(d.data() as Item) } as ItemDoc) : null;
}

export async function markItemClaimed(itemId: string, claimedByUid?: string) {
  const ownerUid = auth.currentUser?.uid || "";
  // use client ms for immediate UI + serverTimestamp for canonical time
  await updateDoc(doc(db, "items", itemId), {
    status: "claimed",
    claimedAtMs: Date.now(),
    claimedAtTs: serverTimestamp(),
    // If a claimer was approved, prefer that; otherwise default to the owner who marked it
    claimedByUid: claimedByUid || ownerUid,
  });
}

