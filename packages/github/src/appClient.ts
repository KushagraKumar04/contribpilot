import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from 'octokit';
import { getConfig } from '@contribpilot/config';

export function createAppOctokit(): Octokit {
  const config = getConfig();
  const appId = config.github.appId;
  const privateKeyBase64 = config.github.privateKeyBase64;
  if (!appId || !privateKeyBase64) {
    throw new Error('GitHub App credentials are not configured');
  }
  const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf8');
  return new Octokit({
    authStrategy: createAppAuth,
    auth: { appId: Number(appId), privateKey },
    userAgent: config.github.userAgent ?? config.app.name
  });
}

export function createInstallationOctokit(installationId: number): Octokit {
  const config = getConfig();
  const appId = config.github.appId;
  const privateKeyBase64 = config.github.privateKeyBase64;
  if (!appId || !privateKeyBase64) {
    throw new Error('GitHub App credentials are not configured');
  }
  const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf8');
  return new Octokit({
    authStrategy: createAppAuth,
    auth: { appId: Number(appId), privateKey, installationId },
    userAgent: config.github.userAgent ?? config.app.name
  });
}