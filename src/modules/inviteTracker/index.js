export default function InviteTrackerModule(client) {
  const guildInvites = new Map();

  async function loadInvitesForGuild(guild) {
    if (!guild || !guild.invites) return;
    try {
      const invites = await guild.invites.fetch();
      guildInvites.set(guild.id, new Map(invites.map(inv => [inv.code, inv.uses])));
      console.log(`[InviteTracker] loaded ${invites.size} invites for guild ${guild.id}`);
    } catch (err) {
      console.warn(`[InviteTracker] failed to fetch invites for guild ${guild.id}:`, err.message || err);
    }
  }

  async function initialize() {
    if (!client || !client.guilds) return;
    for (const [, guild] of client.guilds.cache) {
      await loadInvitesForGuild(guild);
    }
    console.log('[InviteTracker] initialization complete');
  }

  async function refreshGuildInvites(guild) {
    if (!guild) return;
    await loadInvitesForGuild(guild);
  }

  async function detectUsedInvite(guild) {
    if (!guild) return null;

    const previousMap = guildInvites.get(guild.id) || new Map();
    let usedCode = null;

    try {
      const current = await guild.invites.fetch();
      const currentMap = new Map(current.map(inv => [inv.code, inv.uses]));

      // find code where uses increased
      for (const [code, uses] of currentMap.entries()) {
        const oldUses = previousMap.get(code) ?? 0;
        if (uses > oldUses) {
          usedCode = code;
          break;
        }
      }

      // if not found, there could be zeroing due to deleted invites or unknown; from previous snapshot fallback
      if (!usedCode) {
        for (const [code, oldUses] of previousMap.entries()) {
          if (!currentMap.has(code)) {
            // invite deleted: assume used if it had uses > 0; this is heuristic.
            usedCode = code;
            break;
          }
        }
      }

      guildInvites.set(guild.id, currentMap);
    } catch (err) {
      console.error('[InviteTracker] detectUsedInvite failed:', err);
    }

    return usedCode;
  }

  return {
    initialize,
    refreshGuildInvites,
    detectUsedInvite,
    guildInvites,
  };
}
