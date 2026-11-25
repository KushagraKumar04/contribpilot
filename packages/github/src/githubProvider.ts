import { Readable } from 'node:stream';
import type { RepoMeta, RepoRef } from '@contribpilot/shared';
import type { GithubClient } from './client';
import type { GitProvider, Issue, ListOptions, Pull, TreeEntry } from './provider';

interface RepoApiResponse {
  id: number;
  name: string;
  owner: { login: string } | null;
  default_branch: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  license: { spdx_id: string | null } | null;
  archived: boolean;
  pushed_at: string | null;
  topics?: string[];
  html_url: string;
}

function mapRepo(ref: RepoRef, data: RepoApiResponse): RepoMeta {
  return {
    owner: data.owner?.login ?? ref.owner,
    name: data.name,
    githubRepoId: data.id,
    defaultBranch: data.default_branch,
    description: data.description,
    stars: data.stargazers_count,
    forks: data.forks_count,
    openIssues: data.open_issues_count,
    openPulls: 0,
    language: data.language,
    license: data.license?.spdx_id ?? null,
    archived: data.archived,
    lastPushAt: data.pushed_at ?? new Date(0).toISOString(),
    topics: data.topics ?? [],
    htmlUrl: data.html_url
  };
}

export class GithubProvider implements GitProvider {
  private readonly client: GithubClient;

  constructor(client: GithubClient) {
    this.client = client;
  }

  async getRepo(ref: RepoRef): Promise<RepoMeta> {
    const response = await this.client.rest.repos.get({
      owner: ref.owner,
      repo: ref.name
    });
    return mapRepo(ref, response.data as unknown as RepoApiResponse);
  }

  async getCommitSha(ref: RepoRef, branch: string): Promise<string> {
    const response = await this.client.rest.repos.getBranch({
      owner: ref.owner,
      repo: ref.name,
      branch
    });
    return response.data.commit.sha;
  }

  async getTree(ref: RepoRef, sha: string): Promise<TreeEntry[]> {
    const response = await this.client.rest.git.getTree({
      owner: ref.owner,
      repo: ref.name,
      tree_sha: sha,
      recursive: 'true'
    });
    return response.data.tree
      .filter(
        (entry): entry is typeof entry & { path: string; sha: string; type: TreeEntry['type'] } =>
          typeof entry.path === 'string' &&
          typeof entry.sha === 'string' &&
          (entry.type === 'blob' || entry.type === 'tree' || entry.type === 'commit')
      )
      .map((entry) => {
        const result: TreeEntry = { path: entry.path, type: entry.type, sha: entry.sha };
        if (typeof entry.size === 'number') {
          result.size = entry.size;
        }
        return result;
      });
  }

  async downloadTarball(ref: RepoRef, sha: string): Promise<Readable> {
    const response = await this.client.rest.repos.downloadTarballArchive({
      owner: ref.owner,
      repo: ref.name,
      ref: sha
    });
    return Readable.fromWeb(response.data as unknown as import('node:stream/web').ReadableStream);
  }

  async getFile(ref: RepoRef, path: string, sha: string): Promise<string> {
    const response = await this.client.rest.repos.getContent({
      owner: ref.owner,
      repo: ref.name,
      path,
      ref: sha
    });
    const data = response.data;
    if (Array.isArray(data) || data.type !== 'file' || typeof data.content !== 'string') {
      throw new Error(`Path is not a file: ${path}`);
    }
    return Buffer.from(data.content, data.encoding === 'base64' ? 'base64' : 'utf8').toString(
      'utf8'
    );
  }

  async *listIssues(ref: RepoRef, opts: ListOptions = {}): AsyncIterable<Issue> {
    const iterator = this.client.paginate.iterator(this.client.rest.issues.listForRepo, {
      owner: ref.owner,
      repo: ref.name,
      state: 'open',
      per_page: opts.perPage ?? 100
    });
    for await (const page of iterator) {
      for (const raw of page.data) {
        if ('pull_request' in raw && raw.pull_request) {
          continue;
        }
        yield {
          number: raw.number,
          title: raw.title,
          body: raw.body ?? null,
          state: raw.state === 'closed' ? 'closed' : 'open',
          labels: raw.labels
            .map((label) => (typeof label === 'string' ? label : label.name ?? ''))
            .filter((label) => label.length > 0),
          comments: raw.comments,
          assignees: (raw.assignees ?? [])
            .map((assignee) => assignee?.login ?? '')
            .filter((login) => login.length > 0),
          authorLogin: raw.user?.login ?? null,
          createdAt: raw.created_at,
          updatedAt: raw.updated_at,
          htmlUrl: raw.html_url
        };
      }
    }
  }

  async *listPulls(ref: RepoRef, opts: ListOptions = {}): AsyncIterable<Pull> {
    const iterator = this.client.paginate.iterator(this.client.rest.pulls.list, {
      owner: ref.owner,
      repo: ref.name,
      state: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: opts.perPage ?? 100
    });
    for await (const page of iterator) {
      for (const raw of page.data) {
        yield {
          number: raw.number,
          title: raw.title,
          body: raw.body ?? null,
          state: raw.state === 'closed' ? 'closed' : 'open',
          draft: raw.draft ?? false,
          merged: raw.merged_at !== null,
          authorLogin: raw.user?.login ?? null,
          baseRef: raw.base.ref,
          headRef: raw.head.ref,
          createdAt: raw.created_at,
          updatedAt: raw.updated_at,
          mergedAt: raw.merged_at ?? null,
          htmlUrl: raw.html_url
        };
      }
    }
  }
}