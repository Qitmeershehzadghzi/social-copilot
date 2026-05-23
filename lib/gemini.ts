import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateReply(promptTemplate: string, comment: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    
    // Replace placeholder with actual comment
    const fullPrompt = promptTemplate.replace(/\{\{comment\}\}/g, comment);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      }
    });

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini generateReply error:', error);
    throw new Error('Failed to generate AI reply');
  }
}
