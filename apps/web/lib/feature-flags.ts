import { OpenFeature, Provider, EvaluationContext, ResolutionDetails, ErrorCode, ProviderStatus, JsonValue } from '@openfeature/server-sdk';
import type { Logger } from '@openfeature/server-sdk';

/**
 * Environment variable provider for OpenFeature.
 * Reads feature flags from process.env with the pattern FEATURE_{FLAG_KEY}.
 * Example: FEATURE_ADMIN_EDITING=true
 */
class EnvVarProvider implements Provider {
  readonly metadata = {
    name: 'env-var-provider'
  };

  status = ProviderStatus.READY;

  async resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    _context: EvaluationContext,
    _logger: Logger
  ): Promise<ResolutionDetails<boolean>> {
    const envKey = `FEATURE_${flagKey.toUpperCase().replace(/-/g, '_')}`;
    const value = process.env[envKey];

    if (value === undefined) {
      return {
        value: defaultValue
      };
    }

    const boolValue = value.toLowerCase() === 'true' || value === '1';
    return {
      value: boolValue
    };
  }

  async resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    _context: EvaluationContext,
    _logger: Logger
  ): Promise<ResolutionDetails<string>> {
    const envKey = `FEATURE_${flagKey.toUpperCase().replace(/-/g, '_')}`;
    const value = process.env[envKey];

    if (value === undefined) {
      return {
        value: defaultValue
      };
    }

    return {
      value: value
    };
  }

  async resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    _context: EvaluationContext,
    _logger: Logger
  ): Promise<ResolutionDetails<number>> {
    const envKey = `FEATURE_${flagKey.toUpperCase().replace(/-/g, '_')}`;
    const value = process.env[envKey];

    if (value === undefined) {
      return {
        value: defaultValue
      };
    }

    const numValue = Number(value);
    if (isNaN(numValue)) {
      return {
        value: defaultValue,
        errorCode: ErrorCode.TYPE_MISMATCH
      };
    }

    return {
      value: numValue
    };
  }

  async resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    _context: EvaluationContext,
    _logger: Logger
  ): Promise<ResolutionDetails<T>> {
    const envKey = `FEATURE_${flagKey.toUpperCase().replace(/-/g, '_')}`;
    const value = process.env[envKey];

    if (value === undefined) {
      return {
        value: defaultValue
      };
    }

    try {
      const parsed = JSON.parse(value) as T;
      return {
        value: parsed
      };
    } catch {
      return {
        value: defaultValue,
        errorCode: ErrorCode.PARSE_ERROR
      };
    }
  }
}

// Initialize OpenFeature with the environment variable provider
const provider = new EnvVarProvider();
OpenFeature.setProvider(provider);

/**
 * Get a boolean feature flag value.
 * @param flagKey - The feature flag key (e.g., 'admin-editing')
 * @param defaultValue - Default value if flag is not set
 * @returns The feature flag value
 */
export async function getFeatureFlag(flagKey: string, defaultValue: boolean = false): Promise<boolean> {
  const client = OpenFeature.getClient();
  return await client.getBooleanValue(flagKey, defaultValue);
}

/**
 * Get a string feature flag value.
 * @param flagKey - The feature flag key
 * @param defaultValue - Default value if flag is not set
 * @returns The feature flag value
 */
export async function getFeatureFlagString(flagKey: string, defaultValue: string = ''): Promise<string> {
  const client = OpenFeature.getClient();
  return await client.getStringValue(flagKey, defaultValue);
}

