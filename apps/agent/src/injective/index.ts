/** Execution layer public surface + executor factory. */
export * from './types.js';
export * from './scaling.js';
export * from './adapters.js';
export { FakeExecutor } from './fake-executor.js';
export { SdkExecutor } from './sdk-executor.js';
export { McpExecutor } from './mcp-executor.js';

import type { InjectiveExecutor } from './types.js';
import { FakeExecutor } from './fake-executor.js';
import { SdkExecutor } from './sdk-executor.js';
import { McpExecutor } from './mcp-executor.js';

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
