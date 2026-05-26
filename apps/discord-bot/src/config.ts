export interface BotConfig {
  apiUrl: string;
  token: string | null;
  guildId: string | null;
  alertChannelId: string | null;
}

export function loadBotConfig(): BotConfig {
  return {
    apiUrl: process.env.WORKSPACE_API_URL ?? 'http://127.0.0.1:4319',
    token: process.env.DISCORD_TOKEN || null,
    guildId: process.env.DISCORD_GUILD_ID || null,
    alertChannelId: process.env.DISCORD_ALERT_CHANNEL_ID || null,
  };
}

/** Mock mode (stdin/stdout) when there is no Discord token. */
export function isMock(cfg: BotConfig): boolean {
  return !cfg.token;
}
