// src/services/analytics.ts
import { getApp } from "firebase/app";
import { getAnalytics, isSupported, logEvent } from "firebase/analytics";

let enabled = false;
let analytics: ReturnType<typeof getAnalytics> | null = null;

(async () => {
  try {
    enabled = await isSupported();
    if (enabled) {
      analytics = getAnalytics(getApp());
    }
  } catch {
    enabled = false;
  }
})();

export function track(event: string, params?: Record<string, any>) {
  try {
    if (enabled && analytics) {
      logEvent(analytics, event, params);
    }
  } catch {
    // no-op
  }
}
