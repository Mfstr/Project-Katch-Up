import pino from 'pino';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

const isTest = process.env.NODE_ENV === 'test';
const defaultLogLevel = isTest ? 'silent' : 'info';

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? defaultLogLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'project-katch-up-backend',
    env: process.env.NODE_ENV ?? 'development',
  },
  formatters: {
    level: (label: string) => ({ level: label }),
  },
});

export const httpLogger = pinoHttp({
  logger,
  autoLogging: !isTest,
});

export default logger;
