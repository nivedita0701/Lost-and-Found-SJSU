export type ItemCategory = "Electronics" | "Clothing" | "ID" | "Keys" | "Charger" | "Other";

export interface Item {
  id?: string;
  title: string;
  description: string;
  category: ItemCategory;
  location: string;
  status: "lost" | "found" | "claimed";
  imageUrl: string;
  createdAt: number;
  createdByUid: string;
}

export interface Claim {
  id?: string;
  itemId: string;
  claimerUid: string;
  message?: string;
  createdAt: number;
  status: "pending" | "approved" | "rejected";
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  preferredLocations?: string[]; // for notifications
  pushToken?: string; // Expo push token or FCM token
}
