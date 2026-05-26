/**
 * Bridge entrypoint. With a token it runs the live Discord runner; without one
 * it runs the offline mock runner. Either way, the workspace API is the source
 * of truth — this process holds none.
 */
import { fileURLToPath } from 'node:url';
import { isMock, loadBotConfig } from './config.js';
import { runMock } from './mock-runner.js';

try {
  const envPath = fileURLToPath(new URL('../../../.env', import.meta.url));
  (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(envPath);
} catch {
  /* defaults */
}

const cfg = loadBotConfig();

if (isMock(cfg)) {
  await runMock(cfg);
} else {
  const { runDiscord } = await import('./discord-runner.js');
  await runDiscord(cfg);
}
