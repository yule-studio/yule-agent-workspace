/**
 * API entrypoint. Loads the root .env (if present), builds the app, and listens.
 */
import { fileURLToPath } from 'node:url';
import { buildApp } from './server.js';
import { loadConfig } from './config.js';

// Best-effort: load repo-root .env. Node 20.12+/22 provides process.loadEnvFile.
try {
  const envPath = fileURLToPath(new URL('../../../.env', import.meta.url));
  (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(envPath);
} catch {
  /* no .env — local-dev defaults apply */
}

const config = loadConfig();

const { app } = await buildApp(config);
app
  .listen({ host: config.host, port: config.port })
  .then(() => {
    app.log.info(`workspace API on http://${config.host}:${config.port} (adapter=${config.adapter.mode})`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
