import type { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

export interface FeatureFlagOptions {
  /**
   * If the environment variable is not defined, whether the feature is enabled by default.
   * Defaults to true.
   */
  defaultEnabled?: boolean;
  /**
   * Custom message returned in the JSON response when the feature is disabled.
   */
  message?: string;
}

/**
 * Determines whether a given feature flag is enabled based on environment variables.
 *
 * @param flagName - The name of the environment variable (e.g., 'ENABLE_CALENDAR')
 * @param defaultEnabled - Fallback status if the environment variable is not set (default: true)
 * @returns boolean indicating if the feature is enabled
 */
export function isFeatureEnabled(flagName: string, defaultEnabled = true): boolean {
  const envVal = process.env[flagName];
  if (envVal === undefined) {
    return defaultEnabled;
  }

  const normalized = envVal.trim().toLowerCase();
  if (['false', '0', 'off', 'disabled', 'no'].includes(normalized)) {
    return false;
  }
  if (['true', '1', 'on', 'enabled', 'yes'].includes(normalized)) {
    return true;
  }

  return defaultEnabled;
}

/**
 * Express middleware factory to gate routes behind a feature flag configured via environment variables.
 * If the feature is disabled, the request is blocked and returns 503 Service Unavailable.
 *
 * @param flagName - The environment variable name controlling the feature (e.g. 'ENABLE_CALENDAR')
 * @param optionsOrFallback - Options object or boolean fallback if env var is unset
 */
export const featureFlag = (flagName: string, optionsOrFallback?: boolean | FeatureFlagOptions) => {
  const options: FeatureFlagOptions =
    typeof optionsOrFallback === 'boolean'
      ? { defaultEnabled: optionsOrFallback }
      : (optionsOrFallback ?? {});

  const defaultEnabled = options.defaultEnabled ?? true;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isFeatureEnabled(flagName, defaultEnabled)) {
      const message = options.message ?? `Feature '${flagName}' is disabled.`;
      logger.warn({ flag: flagName, path: req.originalUrl }, message);
      res.status(503).json({
        error: 'Service Unavailable',
        message,
      });
      return;
    }

    next();
  };
};

export default featureFlag;
