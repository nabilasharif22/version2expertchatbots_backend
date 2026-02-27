
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import debateRouter from './routes/debate.js';
import { logger } from './utils/logger.js';

const app = express();

app.use(express.json());

const allowedOrigin = process.env.CORS_ORIGIN || '*';
app.use(
  cors({
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'scientist-debate-backend' });
});

app.use('/api/debate', debateRouter);

app.use((err, _req, res, _next) => {
  logger.error({ err }, 'Unhandled error');
  const status = err.status || 500;
  res.status(status).json({ error: true, message: err.message || 'Internal Server Error' });
});

const port = process.env.PORT || 5050;
app.listen(port, () => {
  logger.info({ port, allowedOrigin }, `Server running on http://localhost:${port} (CORS origin: ${allowedOrigin})`);
});
