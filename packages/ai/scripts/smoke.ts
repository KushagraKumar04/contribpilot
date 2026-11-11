import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConfig, resetConfigForTests } from '@contribpilot/config';
import { z } from 'zod';
import { GroqProvider } from '../src/groq';
import { SYSTEM_PREAMBLE } from '../src/prompts/system';

const here = fileURLToPath(new URL('.', import.meta.url));
loadEnv({ path: resolve(here, '../../../.env') });
resetConfigForTests();

const Output = z.object({
  language: z.string().min(1),
  purpose: z.string().min(1),
  beginnerFriendly: z.boolean()
});

async function main(): Promise<void> {
  const config = getConfig();
  const apiKey = config.secrets.groqApiKey;
  if (!apiKey) {
    console.error('GROQ_API_KEY is not set');
    process.exit(1);
  }

  const provider = new GroqProvider(apiKey);

  const user = `Classify this repository for a contributor.
Repository: vercel/next.js
Description: The React framework for the web.
Return JSON with keys: language (primary programming language), purpose (one sentence), beginnerFriendly (boolean).`;

  const started = Date.now();
  const result = await provider.json({
    task: 'classify_issue',
    system: SYSTEM_PREAMBLE,
    user,
    schema: Output,
    promptVersion: 'v1',
    userId: 'smoke-test-user',
    model: config.ai.models.fast ?? undefined,
    maxTokens: 200,
    temperature: 0
  });
  const elapsed = Date.now() - started;

  console.log('Elapsed ms:', elapsed);
  console.log('Result:', result);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });