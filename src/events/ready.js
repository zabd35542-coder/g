import { Events } from 'discord.js';

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    if (client.inviteTracker && typeof client.inviteTracker.initialize === 'function') {
      try {
        await client.inviteTracker.initialize();
      } catch (err) {
        console.error('[Ready] inviteTracker initialization failed:', err);
      }
    }
  },
};
