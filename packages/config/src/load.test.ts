import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './load';

describe('loadConfig', () => {
  it('fails when required secrets are missing', () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
  });

  it('reports missing database and redis urls by path', () => {
    try {
      loadConfig({});
      throw new Error('expected loadConfig to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      const configError = error as ConfigError;
      const joined = configError.issues.join('\n');
      expect(joined).toContain('secrets.databaseUrl');
      expect(joined).toContain('secrets.redisUrl');
    }
  });

  it('loads defaults with required secrets', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgres://localhost/test',
      REDIS_URL: 'redis://localhost:6379'
    });

    expect(config.app.name).toBe('ContribPilot');
    expect(config.features.autoPr).toBe(false);
    expect(config.dev.useMocks).toBe(false);
  });
});