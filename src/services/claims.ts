import { db } from "@/firebase";
import { addDoc, collection, collectionGroup, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, getDoc, getDocs, writeBatch } from "firebase/firestore";
import { markItemClaimed } from "./items"; 

export async function createClaim(itemId: string, claimerUid: string, message: string) {
  await addDoc(collection(db, `items/${itemId}/claims`), {
    itemId,
    claimerUid,
    message,
    createdAt: Date.now(),
    createdAtTs: serverTimestamp(),
    status: "pending"
  });
}

export function watchClaims(itemId: string, onClaims: (c:any[])=>void) {
  const q = query(collection(db, `items/${itemId}/claims`), orderBy("createdAtTs", "desc"));
  return onSnapshot(q, (snap) => {
    const claims = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onClaims(claims);
  });
}

export async function setClaimStatus(itemId: string, claimId: string, status: "approved" | "rejected") {
  // set this claim's status
  await updateDoc(doc(db, `items/${itemId}/claims/${claimId}`), { status });

  if (status === "approved") {
    // mark the item as claimed by this claimer
    const c = await getDoc(doc(db, `items/${itemId}/claims/${claimId}`));
    const claimerUid = c.exists() ? (c.data()?.claimerUid as string) : undefined;
    await markItemClaimed(itemId, claimerUid);

    // auto-reject all other pending claims
    const snap = await getDocs(collection(db, `items/${itemId}/claims`));
    const batch = writeBatch(db);
    snap.forEach((d) => {
      if (d.id !== claimId && d.data()?.status === "pending") {
        batch.update(doc(db, `items/${itemId}/claims/${d.id}`), { status: "rejected" });
      }
    });
    await batch.commit();
  }
}

export function watchMyClaims(
  uid: string,
  opts: { status?: "pending" | "approved" | "rejected"; onItems: (rows: any[]) => void }
) {
  const q = query(
    collectionGroup(db, "claims"),
    where("claimerUid", "==", uid),
    orderBy("createdAtTs", "desc")
  );

  // Join each claim with its parent item doc (items/{itemId})
  const unsub = onSnapshot(q, async (snap) => {
    const rows = await Promise.all(
      snap.docs.map(async (c) => {
        const cd = c.data();
        if (opts.status && cd.status !== opts.status) return null;
        const itemRef = doc(db, "items", cd.itemId);
        const itemSnap = await getDoc(itemRef);
        if (!itemSnap.exists()) return null;
        return {
          claimId: c.id,
          claimStatus: cd.status as "pending" | "approved" | "rejected",
          claimCreatedAt: cd.createdAt,
          ...{ id: itemSnap.id, ...itemSnap.data() },
        };
      })
    );
    opts.onItems(rows.filter(Boolean) as any[]);
  });

  return unsub;
}