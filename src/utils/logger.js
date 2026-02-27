
import pino from 'pino';

export const logger = pino({
  name: 'scientist-debate-backend',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty', options: { translateTime: true, colorize: true } },
});
