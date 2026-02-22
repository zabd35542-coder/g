export default {
  name: 'messageCreate',
  async execute(message) {
    try {
      // Ignore bot messages
      if (message.author?.bot) return;

      // Ignore DMs
      if (!message.guild) return;

      const { client } = message;

      // Allow Gateway module to handle message triggers
      if (client && client.gateway && typeof client.gateway.handleMessage === 'function') {
        try {
          await client.gateway.handleMessage(message);
        } catch (err) {
          console.error('[Gateway] Message handler error:', err);
        }
      }
    } catch (err) {
      console.error('[messageCreate] Handler failed:', err);
    }
  },
};
