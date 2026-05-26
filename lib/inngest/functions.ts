import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { connectedAccounts, postTargets, posts } from "@/db/schema";
import { notifyUser } from "@/lib/notifications";
import { publishPost } from "@/lib/publishers";
import { refreshAccessToken } from "@/lib/token-refresh";

import { inngest } from "./client";
import { POST_PUBLISH_EVENT, type PublishPostEventData } from "./events";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

export const publishPostTarget = inngest.createFunction(
  {
    id: "publish-post-target",
    retries: 3,
    triggers: [{ event: POST_PUBLISH_EVENT }],
  },
  async ({ event, step }) => {
    const data = event.data as PublishPostEventData;
    console.log("[PUBLISH_POST_TARGET] Starting for target:", data.postTargetId, "platform:", data.platform);

    if (data.scheduledAt) {
      if (data.platform === 'youtube') {
        console.log("[PUBLISH_POST_TARGET] YouTube post natively scheduled. Bypassing sleep.");
      } else {
        console.log("[PUBLISH_POST_TARGET] Waiting until:", data.scheduledAt);
        await step.sleepUntil("wait-for-scheduled-time", data.scheduledAt);
      }
    } else {
      console.log("[PUBLISH_POST_TARGET] Publishing immediately (no scheduled time)");
    }

    const postRecord = await step.run("load-post", async () => {
      console.log("[PUBLISH_POST_TARGET] Loading post:", data.postId);
      const post = await db.query.posts.findFirst({
        where: eq(posts.id, data.postId),
        with: { mediaAssets: true },
      });
      console.log("[PUBLISH_POST_TARGET] Post loaded:", post?.id, "status:", post?.status);
      return post;
    });

    if (!postRecord) {
      console.log("[PUBLISH_POST_TARGET] Post not found");
      return { skipped: "post-not-found" };
    }

    const expectedScheduledAt = toDate(postRecord.scheduledAt)?.toISOString() ?? null;
    if (expectedScheduledAt !== data.scheduledAt) {
      console.log("[PUBLISH_POST_TARGET] Stale schedule:", expectedScheduledAt, "vs", data.scheduledAt);
      return { skipped: "stale-schedule" };
    }

    const target = await step.run("load-target", async () => {
      console.log("[PUBLISH_POST_TARGET] Loading target:", data.postTargetId);
      const t = await db.query.postTargets.findFirst({
        where: and(
          eq(postTargets.id, data.postTargetId),
          eq(postTargets.postId, data.postId)
        ),
      });
      console.log("[PUBLISH_POST_TARGET] Target loaded:", t?.id, "status:", t?.status);
      return t;
    });

    if (!target || target.status !== "pending") {
      console.log("[PUBLISH_POST_TARGET] Target not pending");
      return { skipped: "target-not-pending" };
    }

    const account = await step.run("load-account", async () => {
      console.log("[PUBLISH_POST_TARGET] Loading account:", data.connectedAccountId);
      const acc = await db.query.connectedAccounts.findFirst({
        where: eq(connectedAccounts.id, data.connectedAccountId),
      });
      console.log("[PUBLISH_POST_TARGET] Account loaded:", acc?.id, "platform:", acc?.platform);
      return acc;
    });

    if (!account) {
      console.error("[PUBLISH_POST_TARGET] Account not found!");
      throw new Error("Account not found");
    }

    let accessToken = account.accessToken;
    const expiresAt = toDate(account.expiresAt);
    if (expiresAt && expiresAt < new Date()) {
      console.log("[PUBLISH_POST_TARGET] Token expired, refreshing...");
      if (!account.refreshToken) throw new Error("No refresh token available");

      const refreshed = await step.run("refresh-access-token", async () => {
        return refreshAccessToken(data.platform, account.refreshToken!, account.id);
      });

      accessToken = refreshed.accessToken;
      console.log("[PUBLISH_POST_TARGET] Token refreshed");
    }

    try {
      console.log("[PUBLISH_POST_TARGET] Publishing to platform:", data.platform);
      const result = await step.run("publish-to-platform", async () => {
        const mediaUrls = data.platform === 'youtube'
          ? postRecord.mediaAssets.filter((media: { type: string }) => media.type === 'video').map((media: { url: string }) => media.url)
          : postRecord.mediaAssets.map((media: { url: string }) => media.url);
        console.log('[PUBLISH_POST_TARGET] Calling publishPost with', mediaUrls.length, 'media URLs for', data.platform);
        return publishPost(data.platform, accessToken, postRecord.content, mediaUrls, account.accountHandle, data.scheduledAt);
      });

      console.log("[PUBLISH_POST_TARGET] Successfully published, platformPostId:", result.platformPostId);

      await step.run("mark-target-published", async () => {
        await db
          .update(postTargets)
          .set({
            status: "published",
            platformPostId: result.platformPostId,
            updatedAt: new Date(),
          })
          .where(eq(postTargets.id, data.postTargetId));
        console.log("[PUBLISH_POST_TARGET] Target marked as published");
      });

      await step.run("maybe-mark-post-published", async () => {
        const targets = await db.query.postTargets.findMany({
          where: eq(postTargets.postId, data.postId),
        });

        if (targets.every((item) => item.status === "published" || item.status === "failed")) {
          await db
            .update(posts)
            .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
            .where(eq(posts.id, data.postId));
          console.log("[PUBLISH_POST_TARGET] Post marked as published");
        }
      });

      await step.run("notify-post-published", async () => {
        await notifyUser(
          postRecord.userId,
          "postPublished",
          `Post published to ${data.platform}`,
          `Your post was published successfully to ${data.platform}.`
        );
      });

      return { published: true };
    } catch (error) {
      console.error("[PUBLISH_POST_TARGET] Publishing failed:", error);
      await step.run("mark-target-failed", async () => {
        const errMsg = getErrorMessage(error);
        console.log("[PUBLISH_POST_TARGET] Marking target as failed with error:", errMsg);
        await db
          .update(postTargets)
          .set({
            status: "failed",
            errorMessage: errMsg,
            updatedAt: new Date(),
          })
          .where(eq(postTargets.id, data.postTargetId));
      });

      await step.run("notify-post-failed", async () => {
        await notifyUser(
          postRecord.userId,
          "postFailed",
          `Post failed on ${data.platform}`,
          getErrorMessage(error)
        );
      });

      throw error;
    }
  }
);

import { pollCommentsCron } from "./cron";

export const functions = [publishPostTarget, pollCommentsCron];
