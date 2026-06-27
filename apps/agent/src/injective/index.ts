/** Execution layer public surface + executor factory. */
export * from './types';
export * from './scaling';
export * from './adapters';
export * from './read';
export { FakeExecutor } from './fake-executor';
export { SdkExecutor } from './sdk-executor';
export { McpExecutor } from './mcp-executor';

import type { InjectiveExecutor } from './types';
import { FakeExecutor } from './fake-executor';
import { SdkExecutor } from './sdk-executor';
import { McpExecutor } from './mcp-executor';

/** Select the execution backend by the EXECUTOR env var (default: fake). */
export function createExecutor(env: NodeJS.ProcessEnv = process.env): InjectiveExecutor {
  switch (env.EXECUTOR ?? 'fake') {
    case 'sdk':
      return new SdkExecutor(env);
    case 'mcp':
      return new McpExecutor();
    default:
      return new FakeExecutor();
  }
}
