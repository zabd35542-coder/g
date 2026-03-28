import { getRiskLevel } from './RiskEngine.js';

export class GatewayManager {
  constructor(client) {
    this.client = client;
    this.states = {
      EASY: 'easy',
      NORMAL: 'normal',
      HARD: 'hard',
    };
  }

  async render(member, riskScore = null) {
    try {
      if (riskScore === null) {
        const { calculateRiskScore } = await import('./RiskEngine.js');
        riskScore = calculateRiskScore(member);
      }

      const riskLevel = getRiskLevel(riskScore);
      const state = this.getStateFromRisk(riskLevel);

      const embedData = this.getEmbedForState(state, member, riskScore);
      const components = this.getComponentsForState(state);

      return {
        embeds: [embedData],
        components: components,
        state: state,
        riskScore: riskScore,
      };
    } catch (error) {
      console.error('[GatewayManager] render failed:', error);
      return this.getFallbackResponse(member);
    }
  }

  getStateFromRisk(riskLevel) {
    switch (riskLevel) {
      case 'LOW':
        return this.states.EASY;
      case 'MEDIUM':
        return this.states.NORMAL;
      case 'HIGH':
        return this.states.HARD;
      default:
        return this.states.NORMAL;
    }
  }

  getEmbedForState(state, member, riskScore) {
    const baseEmbed = {
      title: `Welcome to ${member.guild.name}`,
      description: `Hello ${member.user.username}! Please verify yourself to access the server.`,
      color: 0x3498db,
      footer: { text: `Risk Score: ${riskScore}` },
      timestamp: new Date(),
    };

    switch (state) {
      case this.states.EASY:
        return {
          ...baseEmbed,
          description: `${baseEmbed.description}\n\n**Easy Verification:** Click the button below to verify instantly.`,
          color: 0x2ecc71,
        };
      case this.states.NORMAL:
        return {
          ...baseEmbed,
          description: `${baseEmbed.description}\n\n**Normal Verification:** Solve a simple captcha or answer a question.`,
          color: 0xf39c12,
        };
      case this.states.HARD:
        return {
          ...baseEmbed,
          description: `${baseEmbed.description}\n\n**Strict Verification:** Complete multiple verification steps.`,
          color: 0xe74c3c,
        };
      default:
        return baseEmbed;
    }
  }

  getComponentsForState(state) {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const row = new ActionRowBuilder();

    switch (state) {
      case this.states.EASY:
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('gateway_verify_easy')
            .setLabel('Verify (Easy)')
            .setStyle(ButtonStyle.Success)
        );
        break;
      case this.states.NORMAL:
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('gateway_verify_normal')
            .setLabel('Start Verification')
            .setStyle(ButtonStyle.Primary)
        );
        break;
      case this.states.HARD:
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('gateway_verify_hard')
            .setLabel('Start Strict Verification')
            .setStyle(ButtonStyle.Danger)
        );
        break;
      default:
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('gateway_verify_normal')
            .setLabel('Verify')
            .setStyle(ButtonStyle.Primary)
        );
    }

    return [row];
  }

  getFallbackResponse(member) {
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const embed = new EmbedBuilder()
      .setTitle('Welcome!')
      .setDescription('Please verify yourself to continue.')
      .setColor(0x95a5a6);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('gateway_verify_fallback')
        .setLabel('Verify')
        .setStyle(ButtonStyle.Primary)
    );

    return {
      embeds: [embed],
      components: [row],
      state: 'fallback',
      riskScore: 0,
    };
  }
}

export default GatewayManager;