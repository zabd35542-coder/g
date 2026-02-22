export default {
      name: "messageReactionAdd",
        async execute(reaction, user) {
                if (user.bot) return;
                    const { client } = reaction;
                        if (!client.gateway) return;
                            if (typeof client.gateway.handleReaction === 'function') {
                                      await client.gateway.handleReaction(reaction, user);
                            }
        },
};
