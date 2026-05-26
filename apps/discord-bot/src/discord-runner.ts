/**
 * Live Discord runner. discord.js is imported lazily so mock mode never loads
 * it. The wiring is intentionally thin: slash commands map straight to the same
 * `runCommand` used by the mock REPL, and workspace alerts are posted to the
 * configured channel.
 *
 * NOTE: This path requires a real bot token + a registered application and has
 * not been exercised against live Discord in this MVP. It is structured so that
 * bringing it up is a configuration step, not a code change. See docs.
 */
import { WorkspaceClient } from './api-client.js';
import { parseCommand, runCommand } from './commands.js';
import { consumeEvents } from './sse.js';
import { formatAlert, isAlert } from './alerts.js';
import type { BotConfig } from './config.js';

export async function runDiscord(cfg: BotConfig): Promise<void> {
  const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    Events,
  } = await import('discord.js');

  const client = new WorkspaceClient(cfg.apiUrl);
  const discord = new Client({ intents: [GatewayIntentBits.Guilds] });

  // Slash commands mirror the inbound surface.
  const commands = [
    new SlashCommandBuilder().setName('status').setDescription('Workspace status snapshot'),
    new SlashCommandBuilder().setName('summary').setDescription('What needs the operator now'),
    new SlashCommandBuilder()
      .setName('task')
      .setDescription('Create a task and run it to the first gate')
      .addStringOption((o) => o.setName('role').setDescription('agent role').setRequired(true))
      .addStringOption((o) => o.setName('title').setDescription('task title').setRequired(true)),
    new SlashCommandBuilder()
      .setName('approve')
      .setDescription('Approve a session')
      .addStringOption((o) => o.setName('session').setDescription('session id').setRequired(true)),
    new SlashCommandBuilder()
      .setName('reject')
      .setDescription('Reject a session')
      .addStringOption((o) => o.setName('session').setDescription('session id').setRequired(true)),
  ].map((c) => c.toJSON());

  discord.once(Events.ClientReady, async (c) => {
    console.log(`discord bridge ready as ${c.user.tag}`);
    if (cfg.guildId) {
      const rest = new REST().setToken(cfg.token!);
      await rest.put(Routes.applicationGuildCommands(c.user.id, cfg.guildId), { body: commands });
      console.log(`registered ${commands.length} slash commands to guild ${cfg.guildId}`);
    }
  });

  discord.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const name = interaction.commandName;
    const line =
      name === 'task'
        ? `task ${interaction.options.getString('role')} ${interaction.options.getString('title')}`
        : name === 'approve' || name === 'reject'
          ? `${name} ${interaction.options.getString('session')}`
          : name;
    await interaction.deferReply();
    try {
      const reply = await runCommand(client, parseCommand(line), interaction.user.tag);
      await interaction.editReply(reply.slice(0, 1900));
    } catch (err) {
      await interaction.editReply(`⚠️ ${(err as Error).message}`);
    }
  });

  // Outbound alerts -> channel.
  if (cfg.alertChannelId) {
    void (async function alertLoop() {
      for (;;) {
        try {
          await consumeEvents(cfg.apiUrl, async (e) => {
            if (!isAlert(e)) return;
            const channel = await discord.channels.fetch(cfg.alertChannelId!);
            if (channel && 'send' in channel) await (channel as { send: (m: string) => Promise<unknown> }).send(formatAlert(e.payload));
          });
        } catch {
          /* retry */
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    })();
  }

  await discord.login(cfg.token!);
}
