export default function InviteTrackerModule(client) {
  const guildInvites = new Map();
  const processingGuilds = new Set(); // Mutex: prevents concurrent processing for same guild

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

    // ─── MUTEX: Prevent race conditions on concurrent member joins ───
    // If this guild is already being processed, wait for it
    while (processingGuilds.has(guild.id)) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    processingGuilds.add(guild.id);

    try {
      const previousMap = guildInvites.get(guild.id) || new Map();
      let usedCode = null;

      const current = await guild.invites.fetch();
      const currentMap = new Map(current.map(inv => [inv.code, inv.uses]));

      // find code where uses increased
      for (const [code, uses] of currentMap.entries()) {
        const oldUses = previousMap.get(code) ?? 0;
        if (uses > oldUses) {
          console.log(`[InviteTracker] Detected used invite: ${code} (uses: ${oldUses} → ${uses})`);
          usedCode = code;
          break;
        }
      }

      // if not found, there could be zeroing due to deleted invites or unknown; from previous snapshot fallback
      if (!usedCode) {
        for (const [code, oldUses] of previousMap.entries()) {
          if (!currentMap.has(code)) {
            // invite deleted: assume used if it had uses > 0; this is heuristic.
            console.log(`[InviteTracker] Assuming deleted invite was used: ${code}`);
            usedCode = code;
            break;
          }
        }
      }

      guildInvites.set(guild.id, currentMap);
      return usedCode;
    } catch (err) {
      console.error('[InviteTracker] detectUsedInvite failed:', err);
      return null;
    } finally {
      // ─── Release MUTEX lock ───
      processingGuilds.delete(guild.id);
    }
  }

  return {
    initialize,
    refreshGuildInvites,
    detectUsedInvite,
    guildInvites,
  };
}
