import EmbedVault from './schema.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export default function EmbedVaultModule(client) {
  return {
    async list(guildId) {
      return EmbedVault.find({ guildId }).sort({ name: 1 }).lean();
    },

    async getByName(guildId, name) {
      return EmbedVault.findOne({ guildId, name: name.trim() }).lean();
    },

    async upsert(guildId, name, data, category = 'Manual') {
      return EmbedVault.findOneAndUpdate(
        { guildId, name: name.trim() },
        { guildId, name: name.trim(), data, category },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    },

    async delete(guildId, name) {
      return EmbedVault.findOneAndDelete({ guildId, name: name.trim() });
    },

    async getByLinkedInvite(guildId, inviteCode) {
      if (!inviteCode) return null;
      return EmbedVault.findOne({ guildId, linkedInviteCode: inviteCode.trim() }).lean();
    },

    async getByCategory(guildId, category) {
      return EmbedVault.findOne({ guildId, category }).sort({ updatedAt: -1 }).lean();
    },

    async link(guildId, name, inviteCode) {
      const doc = await EmbedVault.findOne({ guildId, name: name.trim() });
      if (!doc) return null;
      doc.linkedInviteCode = inviteCode.trim();
      return doc.save();
    },

    async handleSelectMenu(interaction) {
      try {
        if (!interaction.isAnySelectMenu()) return;
        if (!interaction.customId.startsWith('embedvault_select')) return;

        const selectedName = interaction.values?.[0];
        if (!selectedName) {
          return interaction.reply({ content: 'No embed selected.', ephemeral: true });
        }

        const embedDoc = await this.getByName(interaction.guildId, row);
        if (!embedDoc) {
          return interaction.reply({ content: `Embed not found: ${row}`, ephemeral: true });
        }

        // buttons for edit/send/delete
        const menuButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`embedvault_edit:${embedDoc.name}`)
            .setLabel('Edit Embed')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`embedvault_send:${embedDoc.name}`)
            .setLabel('Send Embed')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`embedvault_delete:${embedDoc.name}`)
            .setLabel('Delete Embed')
            .setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({
          content: `Selected vault item: **${embedDoc.name}** (Category: ${embedDoc.category})`,
          embeds: [embedDoc.data],
          components: [menuButtons],
          ephemeral: true,
        });
      } catch (err) {
        console.error('[EmbedVaultModule.handleSelectMenu]', err);
        if (interaction.isRepliable()) {
          await interaction.reply({ content: 'Failed to select embed.', ephemeral: true });
        }
      }
    },

    async handleButtonInteraction(interaction) {
      try {
        if (!interaction.isButton()) return;

        if (interaction.customId.startsWith('embedvault_edit:')) {
          const name = interaction.customId.split(':')[1];
          const embedDoc = await this.getByName(interaction.guildId, name);
          if (!embedDoc) return interaction.reply({ content: 'Embed not found.', ephemeral: true });

          const modal = new ModalBuilder().setCustomId(`embedvault_modal:${name}`).setTitle(`Edit Vault: ${name}`);

          const titleInput = new TextInputBuilder()
            .setCustomId('title')
            .setLabel('Title')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(embedDoc.data?.title || '');

          const descInput = new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Description')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setValue(embedDoc.data?.description || '');

          const imageInput = new TextInputBuilder()
            .setCustomId('image')
            .setLabel('Image URL')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue((embedDoc.data?.image && embedDoc.data.image.url) || embedDoc.data?.image || '');

          modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descInput),
            new ActionRowBuilder().addComponents(imageInput)
          );

          await interaction.showModal(modal);
          return;
        }

        if (interaction.customId.startsWith('embedvault_send:')) {
          const name = interaction.customId.split(':')[1];
          const embedDoc = await this.getByName(interaction.guildId, name);
          if (!embedDoc) return interaction.reply({ content: 'Embed not found.', ephemeral: true });

          const channel = interaction.channel;
          if (!channel || !channel.isTextBased()) {
            return interaction.reply({ content: 'Unable to send from this channel context.', ephemeral: true });
          }

          await channel.send({ embeds: [embedDoc.data] });
          return interaction.reply({ content: `Embed **${name}** sent to channel.`, ephemeral: true });
        }

        if (interaction.customId.startsWith('embedvault_delete:')) {
          const name = interaction.customId.split(':')[1];
          await this.delete(interaction.guildId, name);
          return interaction.reply({ content: `Embed **${name}** deleted from vault.`, ephemeral: true });
        }
      } catch (err) {
        console.error('[EmbedVaultModule.handleButtonInteraction]', err);
        if (interaction.isRepliable()) {
          await interaction.reply({ content: 'Embed button action failed.', ephemeral: true });
        }
      }
    },

    async handleModalSubmit(interaction) {
      try {
        if (!interaction.isModalSubmit()) return;
        if (!interaction.customId.startsWith('embedvault_modal:')) return;

        const name = interaction.customId.split(':')[1];
        const vaultItem = await this.getByName(interaction.guildId, name);
        if (!vaultItem) {
          return interaction.reply({ content: 'Embed slot not found.', ephemeral: true });
        }

        const title = interaction.fields.getTextInputValue('title').trim();
        const description = interaction.fields.getTextInputValue('description').trim();
        const imageUrl = interaction.fields.getTextInputValue('image').trim();

        const updatedData = {
          ...vaultItem.data,
          title: title || vaultItem.data.title || undefined,
          description: description || vaultItem.data.description || undefined,
        };

        if (imageUrl) {
          updatedData.image = { url: imageUrl };
        } else {
          delete updatedData.image;
        }

        await this.upsert(interaction.guildId, name, updatedData, vaultItem.category);

        if (interaction.isRepliable()) {
          await interaction.reply({ content: `✅ Embed **${name}** updated.`, ephemeral: true });
        }
      } catch (err) {
        console.error('[EmbedVaultModule.handleModalSubmit]', err);
        if (interaction.isRepliable()) {
          await interaction.reply({ content: 'Failed to update embed slot.', ephemeral: true });
        }
      }
    },
  };
}
