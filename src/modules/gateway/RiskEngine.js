export function calculateRiskScore(member) {
  let score = 0;

  // Account age (newer accounts = higher risk)
  const accountAge = Date.now() - member.user.createdTimestamp;
  const accountAgeDays = accountAge / (1000 * 60 * 60 * 24);

  if (accountAgeDays < 1) score += 50; // Very new account
  else if (accountAgeDays < 7) score += 30; // New account
  else if (accountAgeDays < 30) score += 15; // Relatively new
  else if (accountAgeDays < 90) score += 5; // Somewhat established

  // Avatar check (no avatar = slightly higher risk)
  if (!member.user.avatar) score += 10;

  // Username patterns (suspicious patterns)
  const username = member.user.username.toLowerCase();
  if (/\d{4,}/.test(username)) score += 15; // Many numbers
  if (/spam|bot|fake|test/i.test(username)) score += 20; // Suspicious words

  // Display name vs username mismatch
  if (member.displayName && member.displayName !== member.user.username) {
    score -= 5; // Slight trust bonus for custom display name
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  return Math.round(score);
}

export function getRiskLevel(score) {
  if (score <= 20) return 'LOW';
  if (score <= 50) return 'MEDIUM';
  return 'HIGH';
}

export function getRiskColor(level) {
  switch (level) {
    case 'LOW':
      return 0x2ecc71; // Green
    case 'MEDIUM':
      return 0xf39c12; // Orange
    case 'HIGH':
      return 0xe74c3c; // Red
    default:
      return 0x95a5a6; // Gray
  }
}

export default {
  calculateRiskScore,
  getRiskLevel,
  getRiskColor,
};