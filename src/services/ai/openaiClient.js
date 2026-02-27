
import OpenAI from 'openai';

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getOpenAIReply(messages) {
  const resp = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 600,
  });
  const text = resp.choices?.[0]?.message?.content?.trim() || '';
  return text;
}
