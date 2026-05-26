/**
 * Mock runner — the bridge with no Discord token. Inbound commands come from
 * stdin; outbound alerts print to stdout. This makes the entire bridge runnable
 * and demonstrable offline, with the workspace API as the only dependency.
 */
import { createInterface } from 'node:readline';
import { WorkspaceClient } from './api-client.js';
import { parseCommand, runCommand } from './commands.js';
import { consumeEvents } from './sse.js';
import { formatAlert, isAlert } from './alerts.js';
import type { BotConfig } from './config.js';

export async function runMock(cfg: BotConfig): Promise<void> {
  const client = new WorkspaceClient(cfg.apiUrl);

  console.log('─'.repeat(60));
  console.log('yule-workspace Discord bridge — MOCK MODE (no DISCORD_TOKEN)');
  console.log(`API: ${cfg.apiUrl}`);
  console.log("Type a command (e.g. 'summary', 'task engineering Fix the build'). 'help' for more.");
  console.log('Outbound alerts from the workspace will print below as they happen.');
  console.log('─'.repeat(60));

  // Outbound: forward workspace alerts to stdout, with reconnect.
  void (async function alertLoop() {
    for (;;) {
      try {
        await consumeEvents(cfg.apiUrl, (e) => {
          if (isAlert(e)) console.log(`\n📨 ${formatAlert(e.payload)}\n> `);
        });
      } catch {
        /* API down / stream closed — retry shortly */
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  })();

  // Inbound: stdin REPL.
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });
  rl.prompt();
  rl.on('line', async (line) => {
    const cmd = parseCommand(line);
    try {
      const reply = await runCommand(client, cmd, 'operator(mock)');
      console.log(reply);
    } catch (err) {
      console.log(`⚠️ ${(err as Error).message}`);
    }
    rl.prompt();
  });
}
