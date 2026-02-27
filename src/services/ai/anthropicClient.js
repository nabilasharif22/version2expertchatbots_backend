
import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function getAnthropicReply(system, messages) {
  const resp = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 600,
    temperature: 0.7,
    system,
    messages,
  });
  const first = resp?.content?.find?.((b) => b.type === 'text');
  return first?.text?.trim() || '';
}
