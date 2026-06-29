import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { ScheduleBlock } from "../types";

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/calendar");
googleProvider.addScope("https://www.googleapis.com/auth/calendar.events");

// In-memory token cache
let cachedAccessToken: string | null = null;

// Track auth changes to invalidate the cached token on logout
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedAccessToken = null;
  }
});

/**
 * Initiates standard Google Auth popup to retrieve/cache Calendar access token.
 */
export async function connectGoogleCalendar(): Promise<string> {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to extract Google OAuth Access Token from authentication result.");
    }
    cachedAccessToken = credential.accessToken;
    return cachedAccessToken;
  } catch (err: any) {
    console.error("Google Calendar connection failed:", err);
    throw err;
  }
}

/**
 * Returns cached token if available.
 */
export function getCachedGoogleToken(): string | null {
  return cachedAccessToken;
}

/**
 * Fetches existing events from the user's primary Google Calendar for the next 7 days.
 */
export async function fetchGoogleCalendarEvents(accessToken: string): Promise<ScheduleBlock[]> {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    now.toISOString()
  )}&timeMax=${encodeURIComponent(nextWeek.toISOString())}&singleEvents=true&orderBy=startTime`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Calendar Fetch error: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  const items = data.items || [];

  return items.map((item: any, idx: number) => {
    const startStr = item.start?.dateTime || item.start?.date || now.toISOString();
    const endStr = item.end?.dateTime || item.end?.date || new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    // Map keywords to help auto-categorize types
    const summary = item.summary || "Google Calendar Event";
    const lowerSummary = summary.toLowerCase();
    let type: "work" | "meeting" | "break" | "personal" | "travel" = "meeting";

    if (lowerSummary.includes("break") || lowerSummary.includes("rest") || lowerSummary.includes("coffee")) {
      type = "break";
    } else if (lowerSummary.includes("personal") || lowerSummary.includes("dentist") || lowerSummary.includes("gym")) {
      type = "personal";
    } else if (lowerSummary.includes("travel") || lowerSummary.includes("flight") || lowerSummary.includes("drive")) {
      type = "travel";
    } else if (lowerSummary.includes("work") || lowerSummary.includes("deep") || lowerSummary.includes("code")) {
      type = "work";
    }

    return {
      id: item.id || `gcal-${idx}-${Date.now()}`,
      taskId: null,
      title: summary,
      startTime: new Date(startStr).toISOString(),
      endTime: new Date(endStr).toISOString(),
      type
    };
  });
}

/**
 * Creates a new event (focus block) in the user's primary Google Calendar.
 */
export async function writeEventToGoogleCalendar(
  accessToken: string,
  block: Omit<ScheduleBlock, "id">
): Promise<any> {
  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

  const payload = {
    summary: block.title,
    description: "Scheduled automatically via DeadlineHero AI Focus Block Companion",
    start: {
      dateTime: new Date(block.startTime).toISOString()
    },
    end: {
      dateTime: new Date(block.endTime).toISOString()
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Calendar Insert error: ${res.status} - ${errText}`);
  }

  return await res.json();
}
