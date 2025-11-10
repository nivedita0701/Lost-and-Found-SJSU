const functions = require("firebase-functions");
const admin = require("firebase-admin");

try { admin.app(); } catch { admin.initializeApp(); }
const db = admin.firestore();

async function sendExpoPush(token, payload) {
  if (!token) return;
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ to: token, ...payload }])
  });
}

// New item -> notify users who like that location
exports.notifyOnNewItem = functions.firestore
  .document("items/{itemId}")
  .onCreate(async (snap, context) => {
    const item = snap.data();
    const location = (item.location || "").toLowerCase();
    if (!location) return null;

    const usersSnap = await db.collection("users").get();
    const messages = [];
    usersSnap.forEach((docu) => {
      const u = docu.data();
      const prefs = (u.preferredLocations || []).map((s) => String(s).toLowerCase());
      if (u.pushToken && prefs.some((p) => location.includes(p))) {
        messages.push({
          to: u.pushToken,
          title: "New item posted",
          body: `${item.title} at ${item.location}`,
          data: { itemId: snap.id }
        });
      }
    });

    const CHUNK = 80;
    const fetchMod = await import("node-fetch");
    global.fetch = fetchMod.default;
    for (let i = 0; i < messages.length; i += CHUNK) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages.slice(i, i + CHUNK))
      });
    }
    return null;
  });

// New claim -> notify item owner
exports.notifyOwnerOnClaim = functions.firestore
  .document("items/{itemId}/claims/{claimId}")
  .onCreate(async (snap, ctx) => {
    const claim = snap.data();
    const itemRef = db.collection("items").doc(ctx.params.itemId);
    const itemDoc = await itemRef.get();
    if (!itemDoc.exists) return null;
    const item = itemDoc.data();
    const ownerUid = item.createdByUid;
    const ownerDoc = await db.collection("users").doc(ownerUid).get();
    const token = ownerDoc.exists ? (ownerDoc.data().pushToken || "") : "";

    const fetchMod = await import("node-fetch");
    global.fetch = fetchMod.default;
    await sendExpoPush(token, {
      title: "New claim received",
      body: `${item.title}: someone believes it's theirs.`,
      data: { itemId: ctx.params.itemId, claimId: ctx.params.claimId }
    });
    return null;
  });

// Claim status updated to approved -> notify claimer
exports.notifyClaimerOnApproval = functions.firestore
  .document("items/{itemId}/claims/{claimId}")
  .onUpdate(async (change, ctx) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.status === after.status) return null;
    if (after.status !== "approved") return null;
    const claimerUid = after.claimerUid;
    const claimerDoc = await db.collection("users").doc(claimerUid).get();
    const token = claimerDoc.exists ? (claimerDoc.data().pushToken || "") : "";

    const itemDoc = await db.collection("items").doc(ctx.params.itemId).get();
    const item = itemDoc.exists ? itemDoc.data() : { title: "Your claim" };

    const fetchMod = await import("node-fetch");
    global.fetch = fetchMod.default;
    await sendExpoPush(token, {
      title: "Claim approved",
      body: `${item.title} has been approved as yours.`,
      data: { itemId: ctx.params.itemId, claimId: ctx.params.claimId }
    });
    return null;
  });
