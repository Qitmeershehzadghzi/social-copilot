import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type GeminiPart = {
  text?: string;
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
};

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
};

type GeminiErrorResponse = {
  error?: {
    message?: string;
    status?: string;
  };
};

const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

function buildThumbnailPrompt(prompt: string) {
  return `Create a polished 16:9 YouTube/social media thumbnail from this brief:

${prompt}

Requirements:
- High contrast, bold focal subject, professional creator thumbnail style.
- Clear visual hierarchy with room for optional short title text.
- No tiny unreadable text, no watermarks, no UI mockup frame.
- Generate only the final thumbnail image.`;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { prompt } = await req.json() as { prompt?: string };
    if (!prompt?.trim()) {
      return new NextResponse("Prompt is required", { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return new NextResponse("Missing GEMINI_API_KEY", { status: 500 });
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: buildThumbnailPrompt(prompt.trim()) }],
            },
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: {
              aspectRatio: "16:9",
            },
          },
        }),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[AI_THUMBNAIL_GEMINI]", errorText);
      let geminiMessage = "";

      try {
        geminiMessage = (JSON.parse(errorText) as GeminiErrorResponse).error?.message ?? "";
      } catch {
        geminiMessage = errorText;
      }

      if (res.status === 429) {
        return NextResponse.json(
          {
            error:
              "Gemini image generation limit hit. Please wait a minute, then try again. If this keeps happening, check your Gemini API quota/billing or use a different image model.",
            details: geminiMessage,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: "Gemini image generation failed",
          details: geminiMessage,
        },
        { status: res.status }
      );
    }

    const data = await res.json() as GeminiGenerateResponse;
    const parts = data.candidates?.flatMap((candidate) => candidate.content?.parts ?? []) ?? [];
    const imagePart = parts.find((part) => part.inlineData?.data);
    const text = parts.find((part) => part.text)?.text ?? "";

    if (!imagePart?.inlineData?.data) {
      return NextResponse.json(
        { error: text || "Gemini did not return an image. Try a more visual prompt." },
        { status: 502 }
      );
    }

    const mimeType = imagePart.inlineData.mimeType || "image/png";
    return NextResponse.json({
      imageUrl: `data:${mimeType};base64,${imagePart.inlineData.data}`,
      mimeType,
      model: GEMINI_IMAGE_MODEL,
      text,
    });
  } catch (error) {
    console.error("[AI_THUMBNAIL]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
