import * as cache from "./cache.js";
import * as checker from "./checker.js";
import * as actions from "./actions.js";

export default function gatewayModule(client) {
      cache.init(client);

        return {
                async handleInteraction(interaction) {
                          const config = await cache.getGuildConfig(interaction.guildId);
                                if (!config) {
                                            return interaction.reply({ content: "Verification not configured.", ephemeral: true });
                                }

                                      const allowed = await checker.verifyUser(interaction, config);
                                            if (!allowed) {
                                                        return interaction.reply({ content: "Verification failed or already verified.", ephemeral: true });
                                            }

                                                  await actions.assignRole(interaction, config);
                                                        await interaction.reply({ content: "Verification successful.", ephemeral: true });
                },
        };
}
