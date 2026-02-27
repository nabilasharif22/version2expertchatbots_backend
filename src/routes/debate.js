
import { Router } from 'express';
import { validateScientistHasPublications } from '../services/crossref.js';
import { runDebateSSE } from '../services/debateOrchestrator.js';
import { getDebateById, listDebates } from '../services/persistence.js';

const router = Router();

router.get('/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const { topic, a, b, turns = '6', first = 'A' } = req.query;

  const send = (event, payload) => {
    res.write(`event: ${event}
`);
    res.write(`data: ${JSON.stringify(payload)}

`);
  };

  try {
    if (!topic || !a || !b) {
      send('error', { message: 'Missing required query params: topic, a, b' });
      return res.end();
    }
    const turnsInt = Math.max(1, Math.min(parseInt(String(turns), 10) || 6, 24));
    const firstSpeaker = String(first).toUpperCase() === 'B' ? 'B' : 'A';

    send('info', { message: 'Validating scientists via CrossRef…' });

    const [aOk, bOk] = await Promise.all([
      validateScientistHasPublications(String(a)),
      validateScientistHasPublications(String(b)),
    ]);

    if (!aOk) {
      send('error', { message: 'Scientist A not found with published works (CrossRef). Please check spelling or try a different name.' });
      return res.end();
    }
    if (!bOk) {
      send('error', { message: 'Scientist B not found with published works (CrossRef). Please check spelling or try a different name.' });
      return res.end();
    }

    send('info', { message: 'Starting debate…' });

    await runDebateSSE({
      res,
      send,
      topic: String(topic),
      scientistA: String(a),
      scientistB: String(b),
      turns: turnsInt,
      firstSpeaker,
    });
  } catch (err) {
    send('error', { message: err.message || 'Unexpected error' });
    res.end();
  }
});

router.get('/', async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
  const debates = await listDebates({ limit });
  res.json({ debates });
});

router.get('/:id', async (req, res) => {
  const d = await getDebateById(req.params.id);
  if (!d) return res.status(404).json({ error: true, message: 'Debate not found' });
  res.json(d);
});

export default router;
