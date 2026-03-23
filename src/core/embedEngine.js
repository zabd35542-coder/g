/**
 * ─── src/core/embedEngine.js ──────────────────────────────────────────────────
 * UNIFIED EMBED RENDERER & LOGIC ENGINE
 * Handles placeholder resolution, rendering, and live preview for ALL embed fields.
 *
 * Supported placeholders (text AND URL fields):
 *   {user}            – @mention
 *   {user.name}       – username
 *   {user.avatar}     – avatar URL (png, 256px)
 *   {user.mention}    – @mention (alias)
 *   {user.id}         – user ID
 *   {user.discriminator}
 *   {server}          – guild name
 *   {server.name}     – guild name (alias)
 *   {server.icon}     – guild icon URL
 *   {member_count}    – guild member count
 *   {joined_at}       – join date string
 *   {account_age}     – account age in days
 *   {join_pos}        – join position (if provided externally)
 *   {choose:A|B|C}    – random pick
 */

import { EmbedBuilder } from 'discord.js';

// ─── Placeholder resolution ───────────────────────────────────────────────────

function applyRandomChoices(str) {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/\{choose:([^}]+)\}/g, (_match, list) => {
    const parts = list.split('|');
    return parts[Math.floor(Math.random() * parts.length)] ?? '';
  });
}

function resolvePlaceholders(text, placeholders = {}) {
  if (!text || typeof text !== 'string') return text;

  let out = applyRandomChoices(text);

  // Build a flat key→value map including all member/guild context
  const ph = { ...placeholders };

  if (placeholders.member) {
    const member = placeholders.member;
    const user   = member.user;
    const guild  = member.guild;

    ph['user']             = `<@${member.id}>`;
    ph['user.mention']     = `<@${member.id}>`;
    ph['user.id']          = member.id;
    ph['user.name']        = user?.username        ?? 'Unknown';
    ph['user.discriminator'] = user?.discriminator ?? '0000';

    // Avatar – works for both bot and human accounts
    ph['user.avatar'] = member.displayAvatarURL?.({ extension: 'png', size: 256, forceStatic: false })
      ?? user?.displayAvatarURL?.({ extension: 'png', size: 256 })
      ?? '';

    if (member.joinedAt) {
      ph['joined_at'] = member.joinedAt.toLocaleDateString();
      ph['join_pos']  = placeholders.join_pos ?? '?';
    }

    if (user?.createdAt) {
      const ageDays = Math.floor((Date.now() - user.createdAt.getTime()) / 86_400_000);
      ph['account_age'] = ageDays.toString();
    }

    if (guild) {
      ph['server']        = guild.name;
      ph['server.name']   = guild.name;
      ph['member_count']  = guild.memberCount?.toString() ?? '0';
      // FIX #3 – server icon URL placeholder for icon fields
      ph['server.icon']   = guild.iconURL?.({ extension: 'png', size: 256 }) ?? '';
    }
  }

  // Resolve all placeholders with escaped regex keys
  for (const [key, value] of Object.entries(ph)) {
    if (key === 'member') continue; // skip the raw member object
    const replacement = value != null ? String(value) : '';
    const escapedKey  = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`\\{${escapedKey}\\}`, 'g'), replacement);
  }

  return out;
}

// ─── Color resolver ───────────────────────────────────────────────────────────

function resolveColor(color) {
  if (!color) return 0x2f3136;
  if (typeof color === 'string' && color.startsWith('#')) {
    const n = parseInt(color.replace('#', ''), 16);
    return isNaN(n) ? 0x2f3136 : n;
  }
  if (typeof color === 'number') return color;
  return 0x2f3136;
}

// ─── Main render ──────────────────────────────────────────────────────────────

/**
 * Render embed data into a plain object suitable for new EmbedBuilder(obj).
 * Applies placeholder resolution to EVERY string field including URL fields.
 *
 * @param {object} data         – raw embed data (title, description, author, footer, image, thumbnail, fields, color, …)
 * @param {object} placeholders – { member, join_pos, … }
 * @returns {object}            – resolved embed data object
 */
export function render(data = {}, placeholders = {}) {
  const out = {};

  if (data.title)       out.title       = resolvePlaceholders(data.title, placeholders);
  if (data.description) out.description = resolvePlaceholders(data.description, placeholders);
  if (data.url)         out.url         = resolvePlaceholders(data.url, placeholders);

  out.color = resolveColor(data.color);

  if (data.timestamp) {
    out.timestamp = data.timestamp === true ? new Date().toISOString() : data.timestamp;
  }

  // ── Author ── flat fields (authorName/authorIcon) take priority, fall back to nested author.*
  // FIX #3 – author icon URL is resolved through placeholder engine
  const authorName = data.authorName || data.author?.name;
  const authorIcon = data.authorIcon || data.author?.iconURL;
  const authorUrl  = data.author?.url;

  if (authorName) {
    const resolvedIcon = authorIcon ? resolvePlaceholders(authorIcon, placeholders) : undefined;
    out.author = {
      name:    resolvePlaceholders(authorName, placeholders),
      // Only set iconURL if resolved value looks like a real URL or was a placeholder that resolved
      iconURL: resolvedIcon && (resolvedIcon.startsWith('http') || resolvedIcon.startsWith('//'))
        ? resolvedIcon
        : undefined,
      url: authorUrl,
    };
  }

  // ── Thumbnail – FIX #3 – placeholder in URL resolved
  if (data.thumbnail) {
    const thumbUrl = typeof data.thumbnail === 'string' ? data.thumbnail : data.thumbnail.url;
    if (thumbUrl) {
      const resolved = resolvePlaceholders(thumbUrl, placeholders);
      if (resolved) out.thumbnail = { url: resolved };
    }
  }

  // ── Image – FIX #3 – placeholder in URL resolved
  if (data.image) {
    const imgUrl = typeof data.image === 'string' ? data.image : data.image.url;
    if (imgUrl) {
      const resolved = resolvePlaceholders(imgUrl, placeholders);
      if (resolved) out.image = { url: resolved };
    }
  }

  // ── Footer – flat fields take priority
  // FIX #3 – footer icon URL resolved through placeholder engine
  const footerText = data.footerText || data.footer?.text;
  const footerIcon = data.footerIcon || data.footer?.iconURL;

  if (footerText) {
    const resolvedIcon = footerIcon ? resolvePlaceholders(footerIcon, placeholders) : undefined;
    out.footer = {
      text:    resolvePlaceholders(footerText, placeholders),
      iconURL: resolvedIcon && (resolvedIcon.startsWith('http') || resolvedIcon.startsWith('//'))
        ? resolvedIcon
        : undefined,
    };
  }

  // ── Fields
  if (Array.isArray(data.fields) && data.fields.length > 0) {
    out.fields = data.fields
      .filter(f => f.name && f.value)
      .map(f => ({
        name:   resolvePlaceholders(f.name, placeholders),
        value:  resolvePlaceholders(f.value, placeholders),
        inline: !!f.inline,
      }));
  }

  return out;
}

// ─── Live preview (returns EmbedBuilder instance) ─────────────────────────────

/**
 * FIX #4 – returns a fully rendered EmbedBuilder with real member context.
 */
export function createPreview(data = {}, placeholders = {}) {
  const rendered = render(data, placeholders);
  return new EmbedBuilder(rendered);
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateEmbed(data = {}) {
  const errors = [];

  if (data.title && data.title.length > 256)
    errors.push('Title must be 256 characters or less.');

  if (data.description && data.description.length > 4096)
    errors.push('Description must be 4096 characters or less.');

  if (data.fields) {
    if (data.fields.length > 25)
      errors.push('Cannot have more than 25 fields.');
    data.fields.forEach((f, i) => {
      if (f.name  && f.name.length  > 256)  errors.push(`Field ${i + 1} name exceeds 256 chars.`);
      if (f.value && f.value.length > 1024) errors.push(`Field ${i + 1} value exceeds 1024 chars.`);
    });
  }

  const authorName = data.authorName || data.author?.name;
  if (authorName && authorName.length > 256)
    errors.push('Author name must be 256 characters or less.');

  const footerText = data.footerText || data.footer?.text;
  if (footerText && footerText.length > 2048)
    errors.push('Footer text must be 2048 characters or less.');

  return errors;
}

export default { render, createPreview, validateEmbed };