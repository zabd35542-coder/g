export default {
      name: "interactionCreate",
        async execute(interaction) {
                const { client } = interaction;
                    if (!interaction.isButton()) return;

                        if (interaction.customId === "gateway_verify_btn") {
                                  if (!client.gateway) {
                                            return interaction.reply({ content: "Verification system unavailable.", ephemeral: true });
                                  }
                                        try {
                                                    await client.gateway.handleInteraction(interaction);
                                        } catch (err) {
                                                    if (!interaction.replied) {
                                                                  await interaction.reply({ content: "Verification failed.", ephemeral: true });
                                                    }
                                        }
                        }
        },
};
