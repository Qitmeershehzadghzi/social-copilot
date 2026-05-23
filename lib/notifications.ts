import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export type NotificationPreferences = {
  postPublished: boolean;
  postFailed: boolean;
  autoReplySent: boolean;
  autoReplyFailed: boolean;
  weeklyDigest: boolean;
};

export type AppPreferences = {
  defaultReplyTone: "friendly" | "professional" | "short";
  requireKeywordsForAutoReplies: boolean;
  pauseAutoReplies: boolean;
  maxReplyLength: number;
};

export type UserPreferences = NotificationPreferences & AppPreferences;

export const DEFAULT_PREFERENCES: UserPreferences = {
  postPublished: false,
  postFailed: true,
  autoReplySent: false,
  autoReplyFailed: true,
  weeklyDigest: true,
  defaultReplyTone: "friendly",
  requireKeywordsForAutoReplies: false,
  pauseAutoReplies: false,
  maxReplyLength: 280,
};

function parsePreferences(preferences: string | null): UserPreferences {
  if (!preferences) return DEFAULT_PREFERENCES;

  try {
    const parsed = JSON.parse(preferences) as Partial<UserPreferences>;
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendPlunkEmail(to: string, subject: string, body: string) {
  const apiKey = process.env.PLUNK_SECRET_KEY;
  if (!apiKey) {
    console.warn("[PLUNK] PLUNK_SECRET_KEY is not configured; email skipped");
    return { skipped: "missing-plunk-secret-key" };
  }

  const res = await fetch("https://next-api.useplunk.com/v1/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, subject, body }),
  });

  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error?.message || "Plunk email send failed");
  }

  return data;
}

export async function notifyUser(
  userDbId: string,
  preferenceKey: keyof NotificationPreferences,
  subject: string,
  message: string
) {
  const [user] = await db.select().from(users).where(eq(users.id, userDbId)).limit(1);
  if (!user) return { skipped: "user-not-found" };

  const preferences = parsePreferences(user.preferences);
  if (!preferences[preferenceKey]) {
    return { skipped: "preference-disabled" };
  }

  return sendPlunkEmail(
    user.email,
    subject,
    `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h2 style="margin:0 0 12px">${escapeHtml(subject)}</h2>
      <p>${escapeHtml(message)}</p>
    </div>`
  );
}

export { parsePreferences };
