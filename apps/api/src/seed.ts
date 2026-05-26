/**
 * Seed script — populates the workspace with a realistic mix of tasks/sessions
 * across the lifecycle so the dashboard and pixel office have something to show
 * on first run. Safe to re-run; it creates fresh tasks each time.
 *
 * Usage:  npm run seed   (from repo root)  ->  apps/api/src/seed.ts
 */
import { fileURLToPath } from 'node:url';
import { buildApp } from './server.js';
import { loadConfig } from './config.js';

try {
  const envPath = fileURLToPath(new URL('../../../.env', import.meta.url));
  (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(envPath);
} catch {
  /* defaults */
}

const { app, svc, db } = await buildApp(loadConfig());

async function seed() {
  // 1. Engineering task driven all the way to an approval gate.
  const eng = svc.createTask({
    title: 'Fix flaky retrieval-eval test',
    description: 'Stabilise the top-5 retrieval eval that intermittently fails in CI.',
    source: 'github',
    role: 'engineering',
    workItemKey: 'github:yule-studio/yule-studio-agent#201',
    github: { repo: 'yule-studio/yule-studio-agent', issueNumber: 201, prNumber: null, branch: null },
  });
  const engSession = svc.openSession(eng.task.id).session;
  svc.applyTransition(engSession.id, 'submit', 'seed');
  await svc.runToGate(engSession.id, 'seed'); // -> awaiting_approval

  // 2. Planning task mid-execution.
  const plan = svc.createTask({
    title: 'Draft Q3 workspace roadmap',
    description: 'Outline the next quarter of workspace features.',
    source: 'operator',
    role: 'planning',
  });
  const planSession = svc.openSession(plan.task.id).session;
  svc.applyTransition(planSession.id, 'submit', 'seed');
  await svc.runToGate(planSession.id, 'seed');
  svc.decide(planSession.id, 'approved', 'operator', 'workspace', 'looks good');
  await svc.runToGate(planSession.id, 'seed'); // -> ready_to_merge

  // 3. A fresh queued marketing task (idle-ish).
  const mkt = svc.createTask({
    title: 'Announce workspace MVP',
    description: 'Prepare a short launch note for the workspace MVP.',
    source: 'discord',
    role: 'marketing',
  });
  const mktSession = svc.openSession(mkt.task.id).session;
  svc.applyTransition(mktSession.id, 'submit', 'seed'); // -> queued

  // 4. A blocked product task.
  const prod = svc.createTask({
    title: 'Spec the pixel-office interaction model',
    description: 'Define click/hover affordances for the office view.',
    source: 'operator',
    role: 'product',
  });
  const prodSession = svc.openSession(prod.task.id).session;
  svc.applyTransition(prodSession.id, 'submit', 'seed');
  await svc.runToGate(prodSession.id, 'seed');
  svc.decide(prodSession.id, 'approved', 'operator', 'workspace');
  await svc.runToGate(prodSession.id, 'seed');
  // simulate getting blocked during execution
  svc.applyTransition(prodSession.id, 'block', 'seed', 'waiting on design tokens from Figma');

  const status = svc.status();
  app.log.info({ status }, 'seed complete');
  console.log('\nSeeded workspace:');
  console.log(JSON.stringify(status, null, 2));
}

await seed();
db.close();
process.exit(0);
