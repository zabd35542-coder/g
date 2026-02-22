export default {
  name: 'messageCreate',
  async execute(message) {
    try {
      // Skip bot messages and messages without content
      if (message.author.bot) return;
      if (!message.content) return;

      const { client } = message;

      // Always forward every message to gateway handler if present
      if (client && client.gateway && typeof client.gateway.handleMessage === 'function') {
        try {
          console.log(`[MessageCreate] Received: "${message.content.substring(0, 50)}" from ${message.author.tag}`);
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
