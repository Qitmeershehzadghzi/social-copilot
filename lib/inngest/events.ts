import { inngest } from "./client";

export type PublishPostEventData = {
  postId: string;
  postTargetId: string;
  platform: string;
  connectedAccountId: string;
  scheduledAt: string | null;
};

export const POST_PUBLISH_EVENT = "post/publish.requested";

export async function requestPostPublish(data: PublishPostEventData) {
  console.log("[REQUEST_POST_PUBLISH] Sending Inngest event:", {
    postId: data.postId,
    platform: data.platform,
    scheduledAt: data.scheduledAt,
  });
  
  try {
    await inngest.send({
      name: POST_PUBLISH_EVENT,
      data,
    });
    console.log("[REQUEST_POST_PUBLISH] Event sent successfully");
  } catch (error) {
    console.error("[REQUEST_POST_PUBLISH] Failed to send event:", error);
    throw error;
  }
}
