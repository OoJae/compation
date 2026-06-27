/**
 * The agent's runtime brain. Azure OpenAI is the default (Microsoft sponsor —
 * shown on screen); an optional fallback provider keeps dev unblocked until
 * Azure is provisioned. Behind one interface so the orchestrator never changes.
 *
 * Env is read LAZILY (inside getModel) so callers can load .env first.
 */
import { createAzure } from '@ai-sdk/azure';
import type { LanguageModel } from 'ai';

let cached: LanguageModel | null = null;

function azureConfigured(): boolean {
  return Boolean(
    process.env.AZURE_OPENAI_RESOURCE_NAME &&
      process.env.AZURE_OPENAI_API_KEY &&
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  );
}

/** Resolve the language model. Azure first; fallback only if Azure is unset. */
export async function getModel(): Promise<LanguageModel> {
  if (cached) return cached;

  if (azureConfigured()) {
    const azure = createAzure({
      resourceName: process.env.AZURE_OPENAI_RESOURCE_NAME!,
      apiKey: process.env.AZURE_OPENAI_API_KEY!,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || 'v1',
    });
    cached = azure(process.env.AZURE_OPENAI_DEPLOYMENT_NAME!);
    return cached;
  }

  throw new Error(
    'Azure OpenAI not configured. Set AZURE_OPENAI_RESOURCE_NAME, AZURE_OPENAI_API_KEY, ' +
      'AZURE_OPENAI_DEPLOYMENT_NAME in .env (see .env.example).',
  );
}

/** Human label for the active model (for the UI / decision trail / demo). */
export function modelInfo(): string {
  if (azureConfigured()) {
    return `Azure OpenAI · ${process.env.AZURE_OPENAI_RESOURCE_NAME}/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`;
  }
  if (process.env.FALLBACK_OPENAI_API_KEY) {
    return `fallback · ${process.env.FALLBACK_OPENAI_MODEL || 'gpt-4o-mini'} (NOT Azure)`;
  }
  return 'unconfigured';
}
