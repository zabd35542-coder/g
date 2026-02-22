/**
 * Gateway Actions Module
 * Handles role management, DM notifications, and styled embed responses
 */

/**
 * Create a styled embed for verification messages
 * @param {Object} config - Gateway config from database
 * @param {string} message - Message content for the embed
 * @param {boolean} isSuccess - Whether this is a success message
 * @returns {Object} Embed object
 */
export function createVerificationEmbed(config, message, isSuccess = true) {
  const embedColor = config.embedColor ? parseInt(config.embedColor.replace('#', ''), 16) : 0x2ecc71;
  
  const embed = {
    title: config.embedTitle || '🔐 Server Verification',
    description: message || config.embedDescription || 'Verification processed.',
    color: embedColor,
    footer: { text: 'Guardian Bot v4.0' },
  };

  if (config.embedImage && config.embedImage.trim()) {
    embed.image = { url: config.embedImage };
  }

  return embed;
}

/**
 * Add verified role and remove unverified role
 * @param {GuildMember} member - Guild member to verify
 * @param {Object} config - Gateway config from database
 * @returns {Object} { success: boolean, message: string }
 */
export async function grantRoles(member, config) {
  try {
    const { verifiedRole, unverifiedRole } = config;
    
    if (!member || !member.roles) {
      return { success: false, message: 'Invalid member object' };
    }

    // Add verified role
    if (verifiedRole) {
      try {
        const role = member.guild.roles.cache.get(verifiedRole);
        if (role && !member.roles.cache.has(verifiedRole)) {
          await member.roles.add(verifiedRole);
        } else if (!role) {
          return { success: false, message: `Verified role ${verifiedRole} not found` };
        }
      } catch (err) {
        return { success: false, message: `Failed to add verified role: ${err.message}` };
      }
    }

    // Remove unverified role (penalty role)
    if (unverifiedRole) {
      try {
        const role = member.guild.roles.cache.get(unverifiedRole);
        if (role && member.roles.cache.has(unverifiedRole)) {
          await member.roles.remove(unverifiedRole);
        }
      } catch (err) {
        return { success: false, message: `Failed to remove unverified role: ${err.message}` };
      }
    }

    return { success: true, message: 'Roles updated successfully' };
  } catch (err) {
    return { success: false, message: `Role update failed: ${err.message}` };
  }
}

/**
 * Send a styled DM to the user with robust error handling
 * @param {User} user - Discord user to DM
 * @param {Object} config - Gateway config from database
 * @returns {Object} { success: boolean, message: string }
 */
export async function sendVerificationDM(user, config = {}) {
  try {
    if (!user) {
      return { success: false, message: 'Invalid user object' };
    }

    // Create styled embed for DM
    const dmText = config.successDM || 'You have been verified! Welcome to the server.';
    const dmEmbed = createVerificationEmbed(config, dmText, true);

    // Send DM with robust error handling
    try {
      await user.send({
        embeds: [dmEmbed],
      });
      return { success: true, message: 'DM sent successfully' };
    } catch (dmErr) {
      // Graceful handling of DM failures
      if (dmErr.code === 50007) {
        return { success: false, message: 'User has DMs disabled' };
      }
      return { success: false, message: `Failed to send DM: ${dmErr.message}` };
    }
  } catch (err) {
    return { success: false, message: `DM error: ${err.message}` };
  }
}

/**
 * Perform complete verification flow
 * @param {GuildMember} member - Member to verify
 * @param {Message|null} triggerMessage - Message that triggered verification (if using trigger method)
 * @param {Object} config - Gateway config
 * @returns {Object} { success: boolean, rolesToast: Object, dmToast: Object }
 */
export async function performVerificationFlow(member, triggerMessage, config) {
  const results = {
    success: true,
    rolesToast: null,
    dmToast: null,
  };

  // Step 1: Grant/Remove roles
  results.rolesToast = await grantRoles(member, config);
  if (!results.rolesToast.success) {
    results.success = false;
  }

  // Step 2: Send styled DM
  if (member.user) {
    results.dmToast = await sendVerificationDM(member.user, config);
    // DM failure is non-fatal, so don't set success to false
  }

  return results;
}

/**
 * Send a verification button/embed to a channel
 * @param {Channel} channel - Channel to send to
 * @param {Object} config - Gateway config
 * @returns {Object} { success: boolean, message: string }
 */
export async function sendVerificationPrompt(channel, config) {
  try {
    if (!channel || !channel.send) {
      return { success: false, message: 'Invalid channel' };
    }

    const message = config.embedDescription || 'Click the button below to verify your account and gain access to the server.';
    const embed = createVerificationEmbed(config, message);

    const components = [];

    // For button method, create a button
    if (config.method === 'button') {
      components.push({
        type: 1, // ActionRow
        components: [
          {
            type: 2, // Button
            style: 1, // Primary
            label: 'Verify',
            custom_id: 'gateway_verify_button',
          },
        ],
      });
    }

    // For trigger method, add instructions
    if (config.method === 'trigger') {
      embed.description += `\n\n**Type this to verify:** \`${config.triggerWord}\``;
    }

    const sent = await channel.send({
      embeds: [embed],
      components: components.length > 0 ? components : undefined,
    });

    return { success: true, message: 'Verification prompt sent' };
  } catch (err) {
    return { success: false, message: `Failed to send prompt: ${err.message}` };
  }
}
