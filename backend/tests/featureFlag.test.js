import express from 'express';
import request from 'supertest';
import { featureFlag, isFeatureEnabled } from '../src/featureFlag.ts';

describe('Feature Flag Middleware & Utility', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isFeatureEnabled', () => {
    it('returns true when env var is set to truthy values', () => {
      process.env.FLAG_TRUE = 'true';
      process.env.FLAG_ONE = '1';
      process.env.FLAG_ON = 'on';
      process.env.FLAG_YES = 'yes';
      process.env.FLAG_ENABLED = 'enabled';
      process.env.FLAG_UPPER = 'TRUE';
      process.env.FLAG_SPACED = '  true  ';

      expect(isFeatureEnabled('FLAG_TRUE')).toBe(true);
      expect(isFeatureEnabled('FLAG_ONE')).toBe(true);
      expect(isFeatureEnabled('FLAG_ON')).toBe(true);
      expect(isFeatureEnabled('FLAG_YES')).toBe(true);
      expect(isFeatureEnabled('FLAG_ENABLED')).toBe(true);
      expect(isFeatureEnabled('FLAG_UPPER')).toBe(true);
      expect(isFeatureEnabled('FLAG_SPACED')).toBe(true);
    });

    it('returns false when env var is set to falsy values', () => {
      process.env.FLAG_FALSE = 'false';
      process.env.FLAG_ZERO = '0';
      process.env.FLAG_OFF = 'off';
      process.env.FLAG_NO = 'no';
      process.env.FLAG_DISABLED = 'disabled';
      process.env.FLAG_UPPER = 'FALSE';
      process.env.FLAG_SPACED = '  false  ';

      expect(isFeatureEnabled('FLAG_FALSE')).toBe(false);
      expect(isFeatureEnabled('FLAG_ZERO')).toBe(false);
      expect(isFeatureEnabled('FLAG_OFF')).toBe(false);
      expect(isFeatureEnabled('FLAG_NO')).toBe(false);
      expect(isFeatureEnabled('FLAG_DISABLED')).toBe(false);
      expect(isFeatureEnabled('FLAG_UPPER')).toBe(false);
      expect(isFeatureEnabled('FLAG_SPACED')).toBe(false);
    });

    it('falls back to defaultEnabled (defaulting to true) when env var is undefined', () => {
      delete process.env.UNDEFINED_FLAG;
      expect(isFeatureEnabled('UNDEFINED_FLAG')).toBe(true);
      expect(isFeatureEnabled('UNDEFINED_FLAG', true)).toBe(true);
      expect(isFeatureEnabled('UNDEFINED_FLAG', false)).toBe(false);
    });
  });

  describe('featureFlag middleware in Express', () => {
    it('allows the request through when the feature flag is enabled', async () => {
      process.env.TEST_FEATURE = 'true';

      const app = express();
      app.use('/test', featureFlag('TEST_FEATURE'), (_req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    it('blocks the request and returns 503 when the feature flag is disabled', async () => {
      process.env.TEST_FEATURE = 'false';

      const app = express();
      app.use('/test', featureFlag('TEST_FEATURE'), (_req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/test');
      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        error: 'Service Unavailable',
        message: "Feature 'TEST_FEATURE' is disabled.",
      });
    });

    it('supports custom error message when feature is disabled', async () => {
      process.env.TEST_CUSTOM_MSG = 'false';

      const app = express();
      app.use(
        '/custom',
        featureFlag('TEST_CUSTOM_MSG', { message: 'Calendar sync is temporarily disabled.' }),
        (_req, res) => {
          res.status(200).json({ success: true });
        },
      );

      const response = await request(app).get('/custom');
      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        error: 'Service Unavailable',
        message: 'Calendar sync is temporarily disabled.',
      });
    });

    it('defaults to blocking if defaultEnabled is set to false and env is unset', async () => {
      delete process.env.OPT_IN_FEATURE;

      const app = express();
      app.use('/opt-in', featureFlag('OPT_IN_FEATURE', { defaultEnabled: false }), (_req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/opt-in');
      expect(response.status).toBe(503);
      expect(response.body.error).toBe('Service Unavailable');
    });

    it('supports boolean defaultEnabled shortcut', async () => {
      delete process.env.SHORTCUT_FLAG;

      const app = express();
      app.use('/shortcut', featureFlag('SHORTCUT_FLAG', false), (_req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/shortcut');
      expect(response.status).toBe(503);
    });
  });
});
