import { GithubProvider, createGithubClient } from '@contribpilot/github';

let provider: GithubProvider | undefined;

export function getGithubProvider(): GithubProvider {
  if (!provider) {
    provider = new GithubProvider(createGithubClient());
  }
  return provider;
}