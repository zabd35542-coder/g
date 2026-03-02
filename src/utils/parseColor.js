
/**
 * Validate and parse a hex color string.
 * Accepts either "#rrggbb" or "rrggbb" (case insensitive).
 * Returns a number suitable for discord.js embed color or `null` if invalid.
 *
 * @param {string} hex
 * @param {string} fallbackHex optional default when input is invalid (also can be number)
 * @returns {number}
 */
export function parseColor(hex, fallbackHex = '#2ecc71') {
  if (!hex || typeof hex !== 'string') {
    hex = fallbackHex;
  }

  // remove leading # if present
  const cleaned = hex.replace(/^#/, '').trim();
  const match = /^[0-9A-Fa-f]{6}$/.exec(cleaned);
  if (!match) {
    // invalid; fall back
    const fb = (typeof fallbackHex === 'string' ? fallbackHex : '')
      .replace(/^#/, '');
    return parseInt(fb || '2ecc71', 16);
  }

  return parseInt(cleaned, 16);
}
