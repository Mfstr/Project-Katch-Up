import { Writable } from 'node:stream';
import express from 'express';
import request from 'supertest';
import pino from 'pino';
import { logger, httpLogger } from '../src/logger.ts';

describe('Structured JSON Logger', () => {
  it('should export a configured pino logger with standard logging methods', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should default log level to silent in test environment', () => {
    expect(logger.level).toBe('silent');
  });

  it('should export httpLogger middleware function', () => {
    expect(typeof httpLogger).toBe('function');
  });

  it('should format logs as valid structured JSON with metadata', async () => {
    const logs = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        logs.push(chunk.toString());
        callback();
      },
    });

    const testLogger = pino(
      {
        timestamp: pino.stdTimeFunctions.isoTime,
        base: {
          service: 'project-katch-up-backend',
          env: 'test',
        },
        formatters: {
          level: (label) => ({ level: label }),
        },
      },
      stream,
    );

    testLogger.info({ userId: 'user-123', event: 'task_created' }, 'Task successfully created');

    expect(logs.length).toBe(1);
    const parsed = JSON.parse(logs[0]);

    expect(parsed).toMatchObject({
      level: 'info',
      service: 'project-katch-up-backend',
      env: 'test',
      userId: 'user-123',
      event: 'task_created',
      msg: 'Task successfully created',
    });
    expect(parsed.time).toBeDefined();
    // Validate ISO timestamp format
    expect(new Date(parsed.time).toISOString()).toBe(parsed.time);
  });

  it('should properly serialize errors in structured JSON', () => {
    const logs = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        logs.push(chunk.toString());
        callback();
      },
    });

    const testLogger = pino(
      {
        formatters: {
          level: (label) => ({ level: label }),
        },
      },
      stream,
    );

    const testError = new Error('Database connection failed');
    testLogger.error({ err: testError }, 'An unexpected database error occurred');

    expect(logs.length).toBe(1);
    const parsed = JSON.parse(logs[0]);

    expect(parsed).toMatchObject({
      level: 'error',
      msg: 'An unexpected database error occurred',
    });
    expect(parsed.err).toBeDefined();
    expect(parsed.err.message).toBe('Database connection failed');
    expect(parsed.err.stack).toBeDefined();
  });

  it('should integrate seamlessly as Express middleware without disrupting requests', async () => {
    const testApp = express();
    testApp.use(httpLogger);
    testApp.get('/test-route', (_req, res) => {
      res.json({ status: 'ok' });
    });

    const response = await request(testApp).get('/test-route');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('should capture HTTP request logs in structured JSON format', async () => {
    const logs = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        logs.push(chunk.toString());
        callback();
      },
    });

    const capturingLogger = pino(
      {
        level: 'info',
        timestamp: pino.stdTimeFunctions.isoTime,
        formatters: {
          level: (label) => ({ level: label }),
        },
      },
      stream,
    );

    const { pinoHttp } = await import('pino-http');
    const customHttpMiddleware = pinoHttp({
      logger: capturingLogger,
    });

    const testApp = express();
    testApp.use(customHttpMiddleware);
    testApp.get('/ping', (_req, res) => {
      res.status(200).send('pong');
    });

    const response = await request(testApp).get('/ping');
    expect(response.status).toBe(200);
    expect(logs.length).toBeGreaterThanOrEqual(1);

    const parsedLog = JSON.parse(logs[logs.length - 1]);
    expect(parsedLog).toHaveProperty('req');
    expect(parsedLog.req.url).toBe('/ping');
    expect(parsedLog.req.method).toBe('GET');
    expect(parsedLog).toHaveProperty('res');
    expect(parsedLog.res.statusCode).toBe(200);
  });
});
