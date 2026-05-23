import { inngest } from "./client";
import { db } from "@/db";
import { autoReplyRules, connectedAccounts, commentEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { fetchYouTubeComments, replyToYouTubeComment } from "@/lib/publishers/youtube-comments";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function generateReply(promptTemplate: string, commentText: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  const prompt = `${promptTemplate}\n\nUser Comment: "${commentText}"\n\nGenerate a short, engaging reply.`;
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export const pollCommentsCron = inngest.createFunction(
  {
    id: "poll-comments-cron",
    triggers: [
      { schedule: { cron: "*/15 * * * *" } }, // Run every 15 minutes
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
          const accounts = await db.query.connectedAccounts.findMany({
            where: and(
              eq(connectedAccounts.userId, rule.userId),
              eq(connectedAccounts.platform, "youtube")
            ),
          });

          for (const account of accounts) {
            try {
              const comments = await fetchYouTubeComments(account.accessToken, 10);
              
              for (const comment of comments) {
                const commentId = comment.id;
                const topLevelComment = comment.snippet.topLevelComment.snippet;
                const commentText = topLevelComment.textOriginal;
                const commentAuthor = topLevelComment.authorDisplayName;
                
                // Avoid replying to our own comments
                if (commentAuthor === account.accountName) continue;

                // Check if already processed
                const existing = await db.query.commentEvents.findFirst({
                  where: and(
                    eq(commentEvents.ruleId, rule.id),
                    eq(commentEvents.platform, "youtube"),
                    eq(commentEvents.commentAuthor, commentId) // using author field as ID to track processed comments for simplicity
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
                  const replyText = await generateReply(rule.promptTemplate, commentText);
                  
                  await replyToYouTubeComment(account.accessToken, commentId, replyText);
                  
                  await db.insert(commentEvents).values({
                    ruleId: rule.id,
                    platform: "youtube",
                    commentText,
                    commentAuthor: commentId,
                    replyText,
                    status: "published",
                  });
                }
              }
            } catch (error) {
              console.error(`[CRON] Failed to process YouTube comments for account ${account.id}:`, error);
            }
          }
        }
      });
    }

    return { success: true };
  }
);
