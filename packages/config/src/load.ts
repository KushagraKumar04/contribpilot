import { DEFAULT_CONFIG } from './defaults';
import { ConfigSchema, type Config } from './schema';

export class ConfigError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid configuration:\n${issues.join('\n')}`);
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

function optionalString(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}

function numberFromEnv(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanFromEnv(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const base = structuredClone(DEFAULT_CONFIG);

  const raw = {
    ...base,
    app: {
      ...base.app,
      name: env.APP_NAME ?? base.app.name,
      url: env.NEXT_PUBLIC_APP_URL ?? base.app.url,
      supportEmail: optionalString(env.SUPPORT_EMAIL)
    },
    github: {
      ...base.github,
      readToken: optionalString(env.GITHUB_READ_TOKEN),
      appId: optionalString(env.GITHUB_APP_ID),
      clientId: optionalString(env.GITHUB_APP_CLIENT_ID),
      clientSecret: optionalString(env.GITHUB_APP_CLIENT_SECRET),
      privateKeyBase64: optionalString(env.GITHUB_APP_PRIVATE_KEY),
      webhookSecret: optionalString(env.GITHUB_WEBHOOK_SECRET),
      userAgent: optionalString(env.GITHUB_USER_AGENT)
    },
    analysis: {
      ...base.analysis,
      maxTarballMb: numberFromEnv(env.MAX_TARBALL_MB, base.analysis.maxTarballMb),
      maxFilesScanned: numberFromEnv(env.MAX_FILES_SCANNED, base.analysis.maxFilesScanned),
      maxFileBytes: numberFromEnv(env.MAX_FILE_BYTES, base.analysis.maxFileBytes),
      analyzerTimeoutMs: numberFromEnv(env.ANALYZER_TIMEOUT_MS, base.analysis.analyzerTimeoutMs)
    },
    ai: {
      ...base.ai,
      models: {
        fast: optionalString(env.GROQ_MODEL_FAST),
        code: optionalString(env.GROQ_MODEL_CODE),
        fallback: optionalString(env.GROQ_MODEL_FALLBACK)
      },
      maxCallsPerAnalysis: numberFromEnv(
        env.MAX_LLM_CALLS_PER_ANALYSIS,
        base.ai.maxCallsPerAnalysis
      ),
      dailyTokensPerUser: numberFromEnv(
        env.DAILY_AI_TOKENS_PER_USER,
        base.ai.dailyTokensPerUser
      ),
      rpmLimit: numberFromEnv(env.GROQ_RPM_LIMIT, base.ai.rpmLimit),
      tpmLimit: numberFromEnv(env.GROQ_TPM_LIMIT, base.ai.tpmLimit)
    },
    limits: {
      ...base.limits,
      dailyPrsPerUser: numberFromEnv(env.DAILY_PRS_PER_USER, base.limits.dailyPrsPerUser),
      maxOpenPrsPerUser: numberFromEnv(
        env.MAX_OPEN_PRS_PER_USER,
        base.limits.maxOpenPrsPerUser
      )
    },
    features: {
      ...base.features,
      autoPr: booleanFromEnv(env.FEATURE_AUTO_PR, base.features.autoPr),
      sandbox: booleanFromEnv(env.FEATURE_SANDBOX, base.features.sandbox),
      personalization: booleanFromEnv(
        env.FEATURE_PERSONALIZATION,
        base.features.personalization
      )
    },
    dev: {
      ...base.dev,
      useMocks: booleanFromEnv(env.USE_MOCKS, base.dev.useMocks)
    },
    secrets: {
      ...base.secrets,
      databaseUrl: env.DATABASE_URL,
      redisUrl: env.REDIS_URL,
      authSecret: optionalString(env.AUTH_SECRET),
      authGithubId: optionalString(env.AUTH_GITHUB_ID),
      authGithubSecret: optionalString(env.AUTH_GITHUB_SECRET),
      tokenEncKey: optionalString(env.TOKEN_ENC_KEY),
      tokenEncKeyId: env.TOKEN_ENC_KEY_ID ?? base.secrets.tokenEncKeyId,
      groqApiKey: optionalString(env.GROQ_API_KEY),
      sentryDsn: optionalString(env.SENTRY_DSN),
      otelExporterOtlpEndpoint: optionalString(env.OTEL_EXPORTER_OTLP_ENDPOINT),
      posthogKey: optionalString(env.NEXT_PUBLIC_POSTHOG_KEY)
    }
  };

  const parsed = ConfigSchema.safeParse(raw);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => {
      return `${issue.path.join('.')}: ${issue.message}`;
    });

    throw new ConfigError(issues);
  }

  return parsed.data;
}

let cachedConfig: Config | undefined;

export function getConfig(): Config {
  cachedConfig ??= loadConfig();
  return cachedConfig;
}

export function resetConfigForTests(): void {
  cachedConfig = undefined;
}

export function redactConfig(config: Config): unknown {
  return {
    ...config,
    secrets: {
      ...config.secrets,
      databaseUrl: '[redacted]',
      redisUrl: '[redacted]',
      authSecret: config.secrets.authSecret ? '[redacted]' : undefined,
      authGithubId: config.secrets.authGithubId ? '[redacted]' : undefined,
      authGithubSecret: config.secrets.authGithubSecret ? '[redacted]' : undefined,
      tokenEncKey: config.secrets.tokenEncKey ? '[redacted]' : undefined,
      groqApiKey: config.secrets.groqApiKey ? '[redacted]' : undefined,
      sentryDsn: config.secrets.sentryDsn ? '[redacted]' : undefined,
      posthogKey: config.secrets.posthogKey ? '[redacted]' : undefined
    }
  };
}