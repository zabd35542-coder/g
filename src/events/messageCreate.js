export default {
      name: "messageCreate",
        async execute(message) {
                if (message.author.bot) return;
                    const { client } = message;
                        if (!client.gateway) return;
                            if (typeof client.gateway.handleMessage === 'function') {
                                      await client.gateway.handleMessage(message);
                            }
        },
};
