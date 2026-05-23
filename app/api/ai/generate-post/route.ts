import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getStrictestPlatformLimit } from '@/lib/platforms';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
type AiAction = 'generate' | 'improve' | 'shorten' | 'hashtags';

function buildPrompt(prompt: string, platforms: string[], action: AiAction) {
  const strictLimit = getStrictestPlatformLimit(platforms);
  const platformContext = platforms.length > 0
    ? `Platforms: ${platforms.join(', ')}. Use the right tone and format for these platforms. Strict character limit: ${strictLimit}.`
    : 'No platform selected yet. Write a flexible post that can be adapted later.';

  const actionInstructions: Record<AiAction, string> = {
    generate: 'Generate a fresh, engaging social media post from the topic/instructions.',
    improve: 'Rewrite the post to be clearer, more engaging, and more likely to get responses while preserving the original meaning.',
    shorten: 'Shorten the post so it is concise and comfortably under the strictest platform limit.',
    hashtags: 'Improve the post and add a small, relevant set of hashtags. Do not overuse hashtags.',
  };

  return `You are an expert social media manager.

Task: ${actionInstructions[action]}

${platformContext}

Input:
${prompt}

Output only the final post text. Do not include preambles, markdown fences, labels, or quotes.`;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { prompt, platforms = [], action = 'generate' } = await req.json() as {
      prompt?: string;
      platforms?: string[];
      action?: AiAction;
    };

    if (!prompt) {
      return new NextResponse('Prompt is required', { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return new NextResponse('Missing GEMINI_API_KEY', { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const fullPrompt = buildPrompt(prompt, platforms, action);

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });

  } catch (error) {
    console.error('[AI_GENERATE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
