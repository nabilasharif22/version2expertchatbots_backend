
import { getOpenAIReply } from './ai/openaiClient.js';
import { getAnthropicReply } from './ai/anthropicClient.js';
import { logger } from '../utils/logger.js';
import { extractVizPayload, summarizeViz } from './vizProtocol.js';
import { createDebate, appendMessage, appendVisualization, completeDebate, errorDebate } from './persistence.js';

const DISCLOSURE = `
Disclosure: The following is a simulated debate between two AI-generated personas based on public information.
These personas are *not* the real individuals, and the responses may be incorrect or incomplete.
Do not attribute quotes to the real people. For informational and educational use only.
`;

const VIZ_PROTOCOL = `
Optional Visualization Protocol:
- If a simple chart would clarify your point, include exactly ONE fenced block at the END of your message:
```viz
{
  "type": "chart",
  "chart": "line" | "bar" | "scatter",
  "title": "Short title",
  "labels": ["x1","x2","x3"],            // omit for scatter
  "series": [
    { "label": "Series A", "data": [0.1,0.2,0.3], "color": "#7c9cff" }
  ]
}
```
- Keep arrays small (<= 50 labels, <= 200 points/series).
- Do not include external URLs or sensitive data.
- The UI will render it and your counterpart will see a summary to respond to.
`;

function buildSystemPersona(scientistName, topic) {
  return `
You are *simulating* the academic communication style of "${scientistName}" for an educational debate on:
"${topic}"

${DISCLOSURE}

Requirements:
- Maintain a professional, evidence-based tone aligned with typical academic discourse.
- Cite general lines of argument or well-known results **without** asserting real, private, or unverifiable quotes.
- Avoid claiming to be the real person. You are a simulation.
- Prefer clarity and concision. Use bullet points for enumerations.
- If unsure, say so. Avoid hallucinations.
- Avoid defamation or personal commentary. Focus on the topic.

${VIZ_PROTOCOL}

Output format:
- 1–3 short paragraphs, optionally with bullet points.
- Place any optional ` + "`viz`" + ` fenced block at the END, separate from the prose.
- Do not include the disclosure text in your response.
`;
}

function lastContextText(transcript) {
  if (!transcript.length) return '';
  const last = transcript[transcript.length - 1];
  if (last.speaker !== 'SYS') return last.text;
  const prev = transcript[transcript.length - 2];
  return [prev?.text || '', `

[System note]
${last.text}`].join('
');
}

export async function runDebateSSE({ res, send, topic, scientistA, scientistB, turns, firstSpeaker }) {
  const systemA = buildSystemPersona(scientistA, topic);
  const systemB = buildSystemPersona(scientistB, topic);
  const transcript = [];

  const debate = await createDebate({ topic, scientistA, scientistB, firstSpeaker, totalTurns: turns });
  const debateId = debate.id;
  send('info', { message: `Debate session id: ${debateId}` });

  const openingInstruction = `Debate topic: "${topic}". Please start with your perspective, including 2–3 key points and at least one challenge for your counterpart.`;

  let nextSpeaker = firstSpeaker;
  let currentTurn = 1;

  try {
    while (currentTurn <= turns) {
      if (nextSpeaker === 'A') {
        const messages = [{ role: 'system', content: systemA }];
        if (transcript.length === 0) {
          messages.push({ role: 'user', content: openingInstruction });
        } else {
          messages.push({ role: 'user', content: `Your counterpart said:
"${lastContextText(transcript)}"

Respond concisely with new, substantive points.` });
        }
        const raw = await getOpenAIReply(messages);
        const { payload, strippedText } = extractVizPayload(raw);
        transcript.push({ speaker: 'A', text: strippedText });
        await appendMessage({ debateId, turn: currentTurn, speaker: 'A', model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', text: strippedText });
        send('message', { speaker: 'A', model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', text: strippedText, turn: currentTurn });
        if (payload) {
          await appendVisualization({ debateId, payload });
          send('visualization', payload);
          const summary = summarizeViz(payload);
          transcript.push({ speaker: 'SYS', text: summary });
          send('info', { message: 'Visualization displayed to the user.' });
        }
        nextSpeaker = 'B';
        currentTurn += 1;
        continue;
      }

      if (nextSpeaker === 'B') {
        const history = [];
        if (transcript.length === 0) {
          history.push({ role: 'user', content: openingInstruction });
        } else {
          history.push({ role: 'user', content: `Your counterpart said:
"${lastContextText(transcript)}"

Respond concisely with new, substantive points.` });
        }
        const raw = await getAnthropicReply(systemB, history);
        const { payload, strippedText } = extractVizPayload(raw);
        transcript.push({ speaker: 'B', text: strippedText });
        await appendMessage({ debateId, turn: currentTurn, speaker: 'B', model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest', text: strippedText });
        send('message', { speaker: 'B', model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest', text: strippedText, turn: currentTurn });
        if (payload) {
          await appendVisualization({ debateId, payload });
          send('visualization', payload);
          const summary = summarizeViz(payload);
          transcript.push({ speaker: 'SYS', text: summary });
          send('info', { message: 'Visualization displayed to the user.' });
        }
        nextSpeaker = 'A';
        currentTurn += 1;
        continue;
      }
    }
    await completeDebate({ debateId });
    send('done', { totalTurns: turns });
    res.end();
  } catch (err) {
    await errorDebate({ debateId });
    send('error', { message: err?.message || 'A provider call failed. Please try again or reduce the number of turns.' });
    logger.error({ err, turn: currentTurn, nextSpeaker, debateId }, 'Debate loop error');
    res.end();
  }
}
