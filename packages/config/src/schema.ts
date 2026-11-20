import { z } from 'zod';

const NonEmptyString = z.string().min(1);
const UrlString = z.string().url();
const SecretString = z.string().min(1);

export const ConfigSchema = z.object({
  app: z.object({
    name: NonEmptyString,
    url: UrlString,
    supportEmail: z.string().email().optional()
  }),
  github: z.object({
    readToken: SecretString.optional(),
    appId: NonEmptyString.optional(),
    clientId: NonEmptyString.optional(),
    clientSecret: SecretString.optional(),
    privateKeyBase64: SecretString.optional(),
    webhookSecret: SecretString.optional(),
    branchPrefix: NonEmptyString,
    userAgent: NonEmptyString.optional(),
    allowedHosts: z.array(z.string().min(1)).min(1),
    apiBaseUrl: UrlString,
    apiVersion: NonEmptyString,
    maxInputLength: z.number().int().positive(),
    ownerPattern: NonEmptyString,
    repoPattern: NonEmptyString
  }),
  analysis: z.object({
    maxTarballMb: z.number().int().positive(),
    maxFilesScanned: z.number().int().positive(),
    maxFileBytes: z.number().int().positive(),
    analyzerTimeoutMs: z.number().int().positive(),
    issuesMaxIngest: z.number().int().positive(),
    prsMaxIngest: z.number().int().positive(),
    mergedHistoryCount: z.number().int().positive(),
    inactiveMonthsWarning: z.number().int().positive(),
    ignoreGlobs: z.array(z.string()),
    docsGapsSections: z.array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        aliases: z.array(z.string().min(1)).min(1)
      })
    ),
    communityFiles: z.array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        paths: z.array(z.string().min(1)).min(1)
      })
    )
  }),
  labels: z.object({
    beginner: z.array(z.string()),
    docs: z.array(z.string()),
    bug: z.array(z.string())
  }),
  linkCheck: z.object({
    timeoutMs: z.number().int().positive(),
    concurrency: z.number().int().positive(),
    maxRedirects: z.number().int().nonnegative(),
    retries: z.number().int().nonnegative(),
    perHostLimit: z.number().int().positive()
  }),
  typos: z.object({
    wordlistPath: z.string(),
    supportedLanguages: z.array(z.string())
  }),
  ranking: z.object({
    weights: z.object({
      impact: z.number().min(0).max(1),
      acceptance: z.number().min(0).max(1),
      freshness: z.number().min(0).max(1),
      ease: z.number().min(0).max(1),
      confidence: z.number().min(0).max(1),
      beginner: z.number().min(0).max(1),
      tolerance: z.number().min(0).max(1)
    }),
    acceptanceByType: z.record(z.string(), z.number().min(0).max(1)),
    freshnessHalfLifeDays: z.number().int().positive(),
    staleIssueDays: z.number().int().positive(),
    inProgressMultiplier: z.number().min(0).max(1)
  }),
  duplicates: z.object({
    blockThreshold: z.number().min(0).max(1),
    warnThreshold: z.number().min(0).max(1)
  }),
  patch: z.object({
    warnLines: z.number().int().positive(),
    blockLines: z.number().int().positive(),
    maxFiles: z.number().int().positive(),
    noiseRatioMax: z.number().min(0).max(1)
  }),
  ai: z.object({
    baseUrl: UrlString,
    models: z.object({
      fast: NonEmptyString.optional(),
      code: NonEmptyString.optional(),
      fallback: NonEmptyString.optional()
    }),
    modelValidation: z.object({
      enabled: z.boolean(),
      cacheSeconds: z.number().int().positive()
    }),
    cache: z.object({
      enabled: z.boolean()
    }),
    budget: z.object({
      enabled: z.boolean()
    }),
    limiter: z.object({
      enabled: z.boolean(),
      keyPrefix: NonEmptyString
    }),
    temperature: z.object({
      classification: z.number().min(0).max(2),
      patch: z.number().min(0).max(2),
      prose: z.number().min(0).max(2)
    }),
    timeoutMs: z.number().int().positive(),
    retry: z.object({
      max: z.number().int().positive(),
      baseMs: z.number().int().positive()
    }),
    maxCallsPerAnalysis: z.number().int().positive(),
    dailyTokensPerUser: z.number().int().positive(),
    rpmLimit: z.number().int().positive(),
    tpmLimit: z.number().int().positive(),
    disclosureText: z.string(),
    disclosureDefault: z.boolean()
  }),
  limits: z.object({
    dailyPrsPerUser: z.number().int().positive(),
    maxOpenPrsPerUser: z.number().int().positive(),
    analysesPerHour: z.object({
      anon: z.number().int().positive(),
      user: z.number().int().positive()
    })
  }),
  cache: z.object({
    ttl: z.object({
      repoMetaSeconds: z.number().int().positive(),
      llmSeconds: z.number().int().positive(),
      linkCheckSeconds: z.number().int().positive(),
      registrySeconds: z.number().int().positive()
    })
  }),
  retention: z.object({
    analysisDays: z.number().int().positive(),
    draftDays: z.number().int().positive()
  }),
  sync: z.object({
    prPollMinutes: z.number().int().positive()
  }),
  ui: z.object({
    pageSize: z.number().int().positive(),
    effortLabels: z.array(z.string()),
    themeDefault: z.enum(['light', 'dark', 'system'])
  }),
  auth: z.object({
    trustHost: z.boolean()
  }),
  draft: z.object({
    maxFiles: z.number().int().positive(),
    maxFileBytes: z.number().int().positive(),
    maxContextBytes: z.number().int().positive()
  }),
  queues: z.object({
    names: z.object({
      analysis: z.string().min(1),
      draft: z.string().min(1),
      pr: z.string().min(1)
    }),
    concurrency: z.object({
      analysis: z.number().int().positive(),
      draft: z.number().int().positive(),
      pr: z.number().int().positive()
    })
  }),
  sse: z.object({
    keepAliveMs: z.number().int().positive(),
    eventRetentionSeconds: z.number().int().positive()
  }),
  worker: z.object({
    stubStageDelayMs: z.number().int().nonnegative()
  }),
  features: z.object({
    autoPr: z.boolean(),
    sandbox: z.boolean(),
    personalization: z.boolean()
  }),
  pr: z.object({
    defaultDraft: z.boolean(),
    branchMaxLength: z.number().int().positive()
  }),
  dev: z.object({
    useMocks: z.boolean()
  }),
  secrets: z.object({
    databaseUrl: SecretString,
    redisUrl: SecretString,
    authSecret: SecretString.optional(),
    authGithubId: NonEmptyString.optional(),
    authGithubSecret: SecretString.optional(),
    tokenEncKey: SecretString.optional(),
    tokenEncKeyId: NonEmptyString,
    groqApiKey: SecretString.optional(),
    sentryDsn: UrlString.optional(),
    otelExporterOtlpEndpoint: UrlString.optional(),
    posthogKey: NonEmptyString.optional()
  })
});

export type Config = z.infer<typeof ConfigSchema>;
export type ConfigInput = z.input<typeof ConfigSchema>;