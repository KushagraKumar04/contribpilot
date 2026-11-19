import type { Config } from './schema';

type ConfigDefaults = Omit<Config, 'secrets'> & {
  secrets: Omit<Config['secrets'], 'databaseUrl' | 'redisUrl'>;
};

export const DEFAULT_CONFIG: ConfigDefaults = {
  app: {
    name: 'ContribPilot',
    url: 'http://localhost:3000'
  },
  github: {
    branchPrefix: 'contrib',
    allowedHosts: ['github.com', 'www.github.com'],
    apiBaseUrl: 'https://api.github.com',
    apiVersion: '2022-11-28',
    maxInputLength: 300,
    ownerPattern: '^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$',
    repoPattern: '^[A-Za-z0-9._-]{1,100}$'
  },
  analysis: {
    maxTarballMb: 200,
    maxFilesScanned: 20000,
    maxFileBytes: 1000000,
    analyzerTimeoutMs: 20000,
    issuesMaxIngest: 300,
    prsMaxIngest: 200,
    mergedHistoryCount: 50,
    inactiveMonthsWarning: 12,
    ignoreGlobs: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'vendor/**',
      '.git/**',
      '**/*.min.*',
      '**/generated/**'
    ],
    docsGapsSections: [
      {
        id: 'installation',
        label: 'Installation',
        aliases: ['install', 'installation', 'getting started', 'quick start', 'setup']
      },
      {
        id: 'usage',
        label: 'Usage',
        aliases: ['usage', 'how to use', 'example', 'examples', 'quickstart']
      },
      {
        id: 'contributing',
        label: 'Contributing',
        aliases: ['contributing', 'contribute']
      },
      {
        id: 'license',
        label: 'License',
        aliases: ['license', 'licence']
      }
    ],
    communityFiles: [
      {
        id: 'license',
        label: 'LICENSE',
        paths: ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING']
      },
      {
        id: 'code-of-conduct',
        label: 'CODE_OF_CONDUCT.md',
        paths: ['CODE_OF_CONDUCT.md', '.github/CODE_OF_CONDUCT.md', 'docs/CODE_OF_CONDUCT.md']
      },
      {
        id: 'contributing',
        label: 'CONTRIBUTING.md',
        paths: ['CONTRIBUTING.md', '.github/CONTRIBUTING.md', 'docs/CONTRIBUTING.md']
      },
      {
        id: 'security',
        label: 'SECURITY.md',
        paths: ['SECURITY.md', '.github/SECURITY.md', 'docs/SECURITY.md']
      },
      {
        id: 'issue-template',
        label: 'Issue templates',
        paths: ['.github/ISSUE_TEMPLATE', '.github/ISSUE_TEMPLATE.md']
      },
      {
        id: 'pr-template',
        label: 'Pull request template',
        paths: [
          '.github/pull_request_template.md',
          '.github/PULL_REQUEST_TEMPLATE.md',
          'PULL_REQUEST_TEMPLATE.md',
          'docs/PULL_REQUEST_TEMPLATE.md'
        ]
      }
    ]
  },
  labels: {
    beginner: ['good first issue', 'help wanted', 'easy', 'beginner'],
    docs: ['documentation', 'docs'],
    bug: ['bug', 'defect']
  },
  linkCheck: {
    timeoutMs: 5000,
    concurrency: 10,
    maxRedirects: 3,
    retries: 2,
    perHostLimit: 2
  },
  typos: {
    wordlistPath: 'packages/config/data/typos.txt',
    supportedLanguages: ['en']
  },
  ranking: {
    weights: {
      impact: 0.25,
      acceptance: 0.25,
      freshness: 0.1,
      ease: 0.15,
      confidence: 0.1,
      beginner: 0.05,
      tolerance: 0.1
    },
    acceptanceByType: {
      labeled_issue: 0.8,
      test_gap: 0.7,
      docs_gap: 0.6,
      typo: 0.4,
      lint_type: 0.3
    },
    freshnessHalfLifeDays: 90,
    staleIssueDays: 730,
    inProgressMultiplier: 0.2
  },
  duplicates: {
    blockThreshold: 0.8,
    warnThreshold: 0.5
  },
  patch: {
    warnLines: 200,
    blockLines: 600,
    maxFiles: 10,
    noiseRatioMax: 0.3
  },
  ai: {
    baseUrl: 'https://api.groq.com/openai/v1',
    models: {},
    modelValidation: {
      enabled: true,
      cacheSeconds: 3600
    },
    cache: {
      enabled: true
    },
    budget: {
      enabled: true
    },
    limiter: {
      enabled: true,
      keyPrefix: 'ai:limiter'
    },
    temperature: {
      classification: 0,
      patch: 0.1,
      prose: 0.3
    },
    timeoutMs: 60000,
    retry: {
      max: 5,
      baseMs: 1000
    },
    maxCallsPerAnalysis: 40,
    dailyTokensPerUser: 200000,
    rpmLimit: 30,
    tpmLimit: 12000,
    disclosureText: 'AI-generated, review before submitting',
    disclosureDefault: true
  },
  limits: {
    dailyPrsPerUser: 3,
    maxOpenPrsPerUser: 10,
    analysesPerHour: {
      anon: 5,
      user: 30
    }
  },
  cache: {
    ttl: {
      repoMetaSeconds: 600,
      llmSeconds: 604800,
      linkCheckSeconds: 86400,
      registrySeconds: 21600
    }
  },
  retention: {
    analysisDays: 30,
    draftDays: 30
  },
  sync: {
    prPollMinutes: 15
  },
  ui: {
    pageSize: 20,
    effortLabels: ['XS', 'S', 'M', 'L'],
    themeDefault: 'system'
  },
  auth: {
    trustHost: true
  },
  draft: {
    maxFiles: 6,
    maxFileBytes: 60000,
    maxContextBytes: 180000
  },
  queues: {
    names: {
      analysis: 'analysis',
      draft: 'draft',
      pr: 'pr'
    },
    concurrency: {
      analysis: 4,
      draft: 2,
      pr: 2
    }
  },
  sse: {
    keepAliveMs: 15000,
    eventRetentionSeconds: 3600
  },
  worker: {
    stubStageDelayMs: 500
  },
  features: {
    autoPr: false,
    sandbox: false,
    personalization: false
  },
  pr: {
    defaultDraft: true,
    branchMaxLength: 60
  },
  dev: {
    useMocks: false
  },
  secrets: {
    tokenEncKeyId: 'v1'
  }
};