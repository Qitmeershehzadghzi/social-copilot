import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

type ContentPlanRequest = {
  niche?: string;
  targetAudience?: string;
  platforms?: string[];
  tone?: string;
  goal?: string;
  days?: number;
};

function extractJson(text: string) {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch?.[1]?.trim() || trimmed;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Model response did not contain a JSON object');
  }

  return candidate.slice(firstBrace, lastBrace + 1);
}

function buildPrompt(input: Required<ContentPlanRequest>) {
  return `You are an expert AI Social Media Strategist.

Generate a highly realistic and practical social media content plan for creators, businesses, and brands.

Business or creator niche: ${input.niche}
Target audience: ${input.targetAudience}
Platforms: ${input.platforms.join(', ')}
Tone: ${input.tone}
Goal: ${input.goal}
Number of posts to generate: ${input.days}

You must generate:
* engaging content ideas
* platform-specific captions
* relevant hashtags
* recommended posting times
* content format suggestions
* CTA suggestions

Rules:
1. NEVER generate dummy or repetitive data.
2. Every response must be unique based on niche, target audience, platform, tone, and goal.
3. Captions should feel human-written and platform optimized.
4. Posting times should be realistic based on platform engagement behavior.
5. Use trending and niche-relevant hashtags.
6. Include a mix of reels/videos, carousels, images, educational posts, and engagement posts.
7. Return ONLY valid JSON.
8. Do not include markdown.
9. Generate practical content users can actually publish.
10. Make the strategy look professional and modern.
11. Use day numbers from 1 to ${input.days}.
12. Rotate across the selected platforms instead of repeating the same platform too often.
13. Hashtags must be an array of strings with hashtag symbols.

JSON format:
{
  "monthly_theme": "",
  "strategy_summary": "",
  "posts": [
    {
      "day": 1,
      "platform": "",
      "content_type": "",
      "title": "",
      "hook": "",
      "caption": "",
      "hashtags": [],
      "cta": "",
      "best_posting_time": "",
      "goal": "",
      "target_emotion": ""
    }
  ]
}`;
}

function normalizeRequest(body: ContentPlanRequest): Required<ContentPlanRequest> {
  const niche = body.niche?.trim();
  const targetAudience = body.targetAudience?.trim();
  const platforms = Array.isArray(body.platforms) ? body.platforms.filter(Boolean) : [];
  const tone = body.tone?.trim() || 'Professional and friendly';
  const goal = body.goal?.trim() || 'Increase engagement and build trust';
  const days = Math.min(Math.max(Number(body.days) || 14, 3), 31);

  if (!niche) throw new Error('Niche is required');
  if (!targetAudience) throw new Error('Target audience is required');
  if (platforms.length === 0) throw new Error('At least one platform is required');

  return { niche, targetAudience, platforms, tone, goal, days };
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return new NextResponse('Missing GEMINI_API_KEY', { status: 500 });
    }

    const input = normalizeRequest(await req.json() as ContentPlanRequest);
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.85,
      },
    });

    const result = await model.generateContent(buildPrompt(input));
    const response = await result.response;
    const jsonText = extractJson(response.text());
    const plan = JSON.parse(jsonText);

    if (!plan.monthly_theme || !plan.strategy_summary || !Array.isArray(plan.posts)) {
      return new NextResponse('AI response was missing required strategy fields', { status: 502 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Error';
    const status = message.includes('required') ? 400 : 500;
    console.error('[AI_CONTENT_PLAN]', error);
    return new NextResponse(message, { status });
  }
}
