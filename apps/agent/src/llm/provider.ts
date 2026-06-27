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

  const fb = process.env.FALLBACK_OPENAI_API_KEY;
  if (fb) {
    try {
      // Variable specifier keeps @ai-sdk/openai an OPTIONAL (uninstalled) dep:
      // tsc won't resolve it at compile time; it loads only if the fallback runs.
      const mod = '@ai-sdk/openai';
      const { createOpenAI } = (await import(mod)) as {
        createOpenAI: (cfg: { apiKey: string }) => (model: string) => LanguageModel;
      };
      const openai = createOpenAI({ apiKey: fb });
      cached = openai(process.env.FALLBACK_OPENAI_MODEL || 'gpt-4o-mini');
      return cached;
    } catch {
      throw new Error(
        'FALLBACK_OPENAI_API_KEY is set but @ai-sdk/openai is not installed. ' +
          'Run: pnpm --filter @compation/agent add @ai-sdk/openai',
      );
    }
  }

  throw new Error(
    'No LLM configured. Set AZURE_OPENAI_RESOURCE_NAME, AZURE_OPENAI_API_KEY, ' +
      'AZURE_OPENAI_DEPLOYMENT_NAME in .env (see .env.example), or set FALLBACK_OPENAI_API_KEY for dev.',
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
