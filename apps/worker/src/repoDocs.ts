import type { GitProvider } from '@contribpilot/github';
import type { RepoRef } from '@contribpilot/shared';

const CONTRIBUTING_CANDIDATES = [
  'CONTRIBUTING.md',
  'CONTRIBUTING.rst',
  'CONTRIBUTING.txt',
  '.github/CONTRIBUTING.md',
  'docs/CONTRIBUTING.md',
  'docs/contributing.md'
];

const PR_TEMPLATE_CANDIDATES = [
  '.github/pull_request_template.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/PULL_REQUEST_TEMPLATE/pull_request_template.md',
  'PULL_REQUEST_TEMPLATE.md',
  'docs/PULL_REQUEST_TEMPLATE.md',
  '.github/pull_request_template.txt'
];

const CI_WORKFLOW_CANDIDATES = [
  '.github/workflows/ci.yml',
  '.github/workflows/ci.yaml',
  '.github/workflows/test.yml',
  '.github/workflows/test.yaml',
  '.github/workflows/build.yml',
  '.github/workflows/build.yaml',
  '.github/workflows/main.yml',
  '.github/workflows/main.yaml'
];

const README_CANDIDATES = [
  'README.md',
  'readme.md',
  'Readme.md',
  'README.MD',
  'README.rst',
  'README.txt',
  'README',
  'readme.rst'
];

const CODE_OF_CONDUCT_CANDIDATES = [
  'CODE_OF_CONDUCT.md',
  '.github/CODE_OF_CONDUCT.md',
  'docs/CODE_OF_CONDUCT.md',
  'CODE_OF_CONDUCT.txt'
];

async function tryGetFile(
  provider: GitProvider,
  ref: RepoRef,
  sha: string,
  path: string
): Promise<string> {
  try {
    return await provider.getFile(ref, path, sha);
  } catch {
    return '';
  }
}

async function firstMatch(
  provider: GitProvider,
  ref: RepoRef,
  sha: string,
  candidates: string[]
): Promise<{ path: string; text: string }> {
  for (const path of candidates) {
    const text = await tryGetFile(provider, ref, sha, path);
    if (text.length > 0) {
      return { path, text };
    }
  }
  return { path: '', text: '' };
}

export interface RepoDocBundle {
  readmePath: string;
  readmeText: string;
  contributingPath: string;
  contributingText: string;
  prTemplateText: string;
  ciWorkflowText: string;
  codeOfConductText: string;
}

export async function loadRepoDocs(
  provider: GitProvider,
  ref: RepoRef,
  sha: string
): Promise<RepoDocBundle> {
  const [
    readme,
    contributing,
    prTemplateResult,
    ciWorkflowResult,
    codeOfConductResult
  ] = await Promise.all([
    firstMatch(provider, ref, sha, README_CANDIDATES),
    firstMatch(provider, ref, sha, CONTRIBUTING_CANDIDATES),
    firstMatch(provider, ref, sha, PR_TEMPLATE_CANDIDATES),
    firstMatch(provider, ref, sha, CI_WORKFLOW_CANDIDATES),
    firstMatch(provider, ref, sha, CODE_OF_CONDUCT_CANDIDATES)
  ]);

  return {
    readmePath: readme.path,
    readmeText: readme.text,
    contributingPath: contributing.path,
    contributingText: contributing.text,
    prTemplateText: prTemplateResult.text,
    ciWorkflowText: ciWorkflowResult.text,
    codeOfConductText: codeOfConductResult.text
  };
}