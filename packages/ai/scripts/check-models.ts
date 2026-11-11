import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConfig, resetConfigForTests } from '@contribpilot/config';
import { GroqProvider } from '../src/groq';

const here = fileURLToPath(new URL('.', import.meta.url));
loadEnv({ path: resolve(here, '../../../.env') });
resetConfigForTests();

async function main(): Promise<void> {
  const config = getConfig();
  const apiKey = config.secrets.groqApiKey;
  if (!apiKey) {
    console.error('GROQ_API_KEY is not set in .env');
    process.exit(1);
  }

  console.log('Configured models:', {
    fast: config.ai.models.fast,
    code: config.ai.models.code,
    fallback: config.ai.models.fallback
  });

  const provider = new GroqProvider(apiKey);
  const available = await provider.listModels();
  console.log('Total models available to your key:', available.length);
  console.log('First 20:', available.slice(0, 20));

  const result = await provider.validateConfiguredModels();
  console.log('Validation result:', result);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });