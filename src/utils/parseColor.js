
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