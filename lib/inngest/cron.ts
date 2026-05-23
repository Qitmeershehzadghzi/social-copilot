import { inngest } from "./client";
import { db } from "@/db";
import { autoReplyRules, connectedAccounts, commentEvents, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { fetchYouTubeChannel, fetchYouTubeComments, replyToYouTubeComment } from "@/lib/publishers/youtube-comments";
import { fetchTwitterMe, fetchTwitterMentions, replyToTwitterTweet } from "@/lib/publishers/twitter";
import { generateReply } from "@/lib/gemini";
import { refreshAccessToken } from "@/lib/token-refresh";
import { notifyUser, parsePreferences } from "@/lib/notifications";

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

async function getRulePreferences(userDbId: string) {
  const [user] = await db.select({ preferences: users.preferences }).from(users).where(eq(users.id, userDbId)).limit(1);
  return parsePreferences(user?.preferences || null);
}

function buildPrompt(promptTemplate: string, commentText: string, preferences: Awaited<ReturnType<typeof getRulePreferences>>) {
  const toneInstruction = {
    friendly: "Use a friendly, helpful tone.",
    professional: "Use a polished, professional tone.",
    short: "Keep the reply very short and direct.",
  }[preferences.defaultReplyTone];

  return `${promptTemplate}

${toneInstruction}
Keep the reply under ${preferences.maxReplyLength} characters.
Comment: {{comment}}`.replace(/\{\{comment\}\}/g, commentText);
}

export const pollCommentsCron = inngest.createFunction(
  {
    id: "poll-comments-cron",
    triggers: [
      { cron: "*/15 * * * *" }, // Run every 15 minutes
    ],
  },
  async ({ step }) => {
    // Load all active auto-reply rules
    const activeRules = await step.run("load-active-rules", async () => {
      return await db.query.autoReplyRules.findMany({
        where: eq(autoReplyRules.isActive, true),
      });
    });

    if (activeRules.length === 0) {
      return { skipped: "no-active-rules" };
    }

    // Process YouTube
    const ytRules = activeRules.filter(r => r.platforms.includes("youtube"));
    if (ytRules.length > 0) {
      await step.run("process-youtube-comments", async () => {
        for (const rule of ytRules) {
          const preferences = await getRulePreferences(rule.userId);
          if (preferences.pauseAutoReplies) continue;
          if (preferences.requireKeywordsForAutoReplies && rule.triggerType !== "keyword") continue;

          if (!rule.connectedAccountIds || rule.connectedAccountIds.length === 0) {
            console.warn(`[CRON] Skipping rule ${rule.id}: no connected accounts selected`);
            continue;
          }

          const accounts = await db.query.connectedAccounts.findMany({
            where: and(
              eq(connectedAccounts.userId, rule.userId),
              eq(connectedAccounts.platform, "youtube"),
              inArray(connectedAccounts.id, rule.connectedAccountIds)
            ),
          });

          for (const account of accounts) {
            try {
              let accessToken = account.accessToken;
              const expiresAt = toDate(account.expiresAt);
              if (expiresAt && expiresAt < new Date()) {
                if (!account.refreshToken) {
                  console.warn(`[CRON] Skipping YouTube account ${account.id}: refresh token missing`);
                  continue;
                }

                const refreshed = await refreshAccessToken("youtube", account.refreshToken, account.id);
                accessToken = refreshed.accessToken;
              }

              const channel = await fetchYouTubeChannel(accessToken);
              const channelId = channel?.id;
              if (!channelId) {
                console.warn(`[CRON] Skipping YouTube account ${account.id}: channel not found`);
                continue;
              }

              const comments = await fetchYouTubeComments(accessToken, channelId, 10);
              
              for (const comment of comments) {
                const topLevelComment = comment.snippet.topLevelComment.snippet;
                const commentId = comment.snippet.topLevelComment.id;
                const commentText = topLevelComment.textOriginal;
                const commentAuthor = topLevelComment.authorDisplayName;
                
                // Avoid replying to our own comments
                if (commentAuthor === account.accountName) continue;

                // Check if already processed
                const existing = await db.query.commentEvents.findFirst({
                  where: and(
                    eq(commentEvents.ruleId, rule.id),
                    eq(commentEvents.connectedAccountId, account.id),
                    eq(commentEvents.platform, "youtube"),
                    eq(commentEvents.externalCommentId, commentId)
                  ),
                });

                if (existing) continue;

                // Check triggers
                let matches = false;
                if (rule.triggerType === "any") {
                  matches = true;
                } else if (rule.triggerType === "keyword" && rule.keywords) {
                  matches = rule.keywords.some(k => commentText.toLowerCase().includes(k.toLowerCase()));
                }

                if (matches) {
                  const replyText = await generateReply(buildPrompt(rule.promptTemplate, commentText, preferences), commentText);
                  
                  await replyToYouTubeComment(accessToken, commentId, replyText);
                  
                  await db.insert(commentEvents).values({
                    ruleId: rule.id,
                    connectedAccountId: account.id,
                    externalCommentId: commentId,
                    platform: "youtube",
                    commentText,
                    commentAuthor,
                    replyText,
                    status: "published",
                  });

                  await notifyUser(
                    rule.userId,
                    "autoReplySent",
                    "Auto-reply sent on YouTube",
                    `Rule "${rule.name}" replied to ${commentAuthor}: ${replyText}`
                  );
                }
              }
            } catch (error) {
              console.error(`[CRON] Failed to process YouTube comments for account ${account.id}:`, error);
              await notifyUser(
                rule.userId,
                "autoReplyFailed",
                "Auto-reply failed on YouTube",
                error instanceof Error ? error.message : "Unknown YouTube auto-reply error"
              );
            }
          }
        }
      });
    }

    const twitterRules = activeRules.filter(r => r.platforms.includes("twitter"));
    if (twitterRules.length > 0) {
      await step.run("process-twitter-mentions", async () => {
        for (const rule of twitterRules) {
          const preferences = await getRulePreferences(rule.userId);
          if (preferences.pauseAutoReplies) continue;
          if (preferences.requireKeywordsForAutoReplies && rule.triggerType !== "keyword") continue;

          if (!rule.connectedAccountIds || rule.connectedAccountIds.length === 0) {
            console.warn(`[CRON] Skipping rule ${rule.id}: no connected accounts selected`);
            continue;
          }

          const accounts = await db.query.connectedAccounts.findMany({
            where: and(
              eq(connectedAccounts.userId, rule.userId),
              eq(connectedAccounts.platform, "twitter"),
              inArray(connectedAccounts.id, rule.connectedAccountIds)
            ),
          });

          for (const account of accounts) {
            try {
              let accessToken = account.accessToken;
              const expiresAt = toDate(account.expiresAt);
              if (expiresAt && expiresAt < new Date()) {
                if (!account.refreshToken) {
                  console.warn(`[CRON] Skipping Twitter account ${account.id}: refresh token missing`);
                  continue;
                }

                const refreshed = await refreshAccessToken("twitter", account.refreshToken, account.id);
                accessToken = refreshed.accessToken;
              }

              const twitterUser = await fetchTwitterMe(accessToken);
              const mentions = await fetchTwitterMentions(accessToken, twitterUser.id, 10);

              for (const mention of mentions) {
                if (mention.authorId === twitterUser.id) continue;

                const existing = await db.query.commentEvents.findFirst({
                  where: and(
                    eq(commentEvents.ruleId, rule.id),
                    eq(commentEvents.connectedAccountId, account.id),
                    eq(commentEvents.platform, "twitter"),
                    eq(commentEvents.externalCommentId, mention.id)
                  ),
                });

                if (existing) continue;

                const commentText = mention.text;
                let matches = false;
                if (rule.triggerType === "any") {
                  matches = true;
                } else if (rule.triggerType === "keyword" && rule.keywords) {
                  matches = rule.keywords.some(k => commentText.toLowerCase().includes(k.toLowerCase()));
                }

                if (!matches) continue;

                const replyText = await generateReply(buildPrompt(rule.promptTemplate, commentText, preferences), commentText);
                await replyToTwitterTweet(accessToken, mention.id, replyText);

                const commentAuthor = mention.authorUsername
                  ? `@${mention.authorUsername}`
                  : mention.authorName || mention.authorId || "Twitter user";

                await db.insert(commentEvents).values({
                  ruleId: rule.id,
                  connectedAccountId: account.id,
                  externalCommentId: mention.id,
                  platform: "twitter",
                  commentText,
                  commentAuthor,
                  replyText,
                  status: "published",
                });

                await notifyUser(
                  rule.userId,
                  "autoReplySent",
                  "Auto-reply sent on Twitter",
                  `Rule "${rule.name}" replied to ${commentAuthor}: ${replyText}`
                );
              }
            } catch (error) {
              console.error(`[CRON] Failed to process Twitter mentions for account ${account.id}:`, error);
              await notifyUser(
                rule.userId,
                "autoReplyFailed",
                "Auto-reply failed on Twitter",
                error instanceof Error ? error.message : "Unknown Twitter auto-reply error"
              );
            }
          }
        }
      });
    }

    return { success: true };
  }
);
