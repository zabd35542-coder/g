import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { calculateRiskScore, getRiskLevel } from './RiskEngine.js';

export async function verifyMember(interaction, member) {
  try {
    // Calculate risk score if not provided
    let riskScore = interaction.message?.embeds?.[0]?.footer?.text?.match(/Risk Score: (\d+)/)?.[1];
    if (!riskScore) {
      riskScore = calculateRiskScore(member);
    } else {
      riskScore = parseInt(riskScore);
    }

    const riskLevel = getRiskLevel(riskScore);

    // For easy verification, just grant access
    if (riskLevel === 'LOW') {
      await grantAccess(member, interaction);
      return;
    }

    // For medium/high risk, start verification process
    await startVerificationProcess(interaction, member, riskLevel);

  } catch (error) {
    console.error('[Gateway] verifyMember failed:', error);
    await interaction.reply({
      content: 'Verification failed. Please try again or contact an administrator.',
      ephemeral: true,
    });
  }
}

export async function startStrictGauntlet(interaction, member) {
  try {
    // Start a multi-step verification process
    const embed = new EmbedBuilder()
      .setTitle('Strict Verification Required')
      .setDescription('Please complete the following verification steps:')
      .setColor(0xe74c3c)
      .addFields(
        { name: 'Step 1', value: 'Answer the security question below', inline: false },
        { name: 'Security Question', value: 'What is 2 + 2?', inline: false }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('gauntlet_answer_4')
        .setLabel('4')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('gauntlet_answer_5')
        .setLabel('5')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('gauntlet_answer_6')
        .setLabel('6')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
      embeds: [embed],
      components: [row],
    });

  } catch (error) {
    console.error('[Gateway] startStrictGauntlet failed:', error);
  }
}

async function grantAccess(member, interaction) {
  try {
    // Add verified role (assuming role exists)
    const verifiedRole = member.guild.roles.cache.find(role => role.name === 'Verified');
    if (verifiedRole) {
      await member.roles.add(verifiedRole);
    }

    // Remove unverified role if exists
    const unverifiedRole = member.guild.roles.cache.find(role => role.name === 'Unverified');
    if (unverifiedRole) {
      await member.roles.remove(unverifiedRole);
    }

    const embed = new EmbedBuilder()
      .setTitle('Verification Complete!')
      .setDescription('Welcome to the server! You now have access to all channels.')
      .setColor(0x2ecc71);

    await interaction.update({
      embeds: [embed],
      components: [], // Remove buttons
    });

  } catch (error) {
    console.error('[Gateway] grantAccess failed:', error);
    await interaction.reply({
      content: 'Access granted, but there was an error updating your roles.',
      ephemeral: true,
    });
  }
}

async function startVerificationProcess(interaction, member, riskLevel) {
  const embed = new EmbedBuilder()
    .setTitle('Verification Required')
    .setDescription('Please complete the verification to access the server.')
    .setColor(riskLevel === 'MEDIUM' ? 0xf39c12 : 0xe74c3c);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verify_captcha')
      .setLabel('Start Captcha')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('verify_cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({
    embeds: [embed],
    components: [row],
  });
}

export default {
  verifyMember,
  startStrictGauntlet,
};
