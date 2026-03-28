/**
 * Calculate XP required for a specific level
 * Using exponential growth: XP = 100 * level^2
 */
export function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level - 1, 2));
}

/**
 * Calculate level from total XP
 * Inverse of xpForLevel: level = sqrt(XP/100) + 1
 */
export function levelFromXP(xp) {
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

/**
 * Get XP progress within current level
 */
export function getLevelProgress(xp) {
  const currentLevel = levelFromXP(xp);
  const currentLevelXP = xpForLevel(currentLevel);
  const nextLevelXP = xpForLevel(currentLevel + 1);

  return {
    currentLevel,
    currentLevelXP,
    nextLevelXP,
    progressXP: xp - currentLevelXP,
    requiredXP: nextLevelXP - currentLevelXP,
    progressPercent: Math.round(((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100),
  };
}

/**
 * Format XP amount with appropriate suffix
 */
export function formatXP(xp) {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M`;
  } else if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`;
  }
  return xp.toString();
}

/**
 * Calculate time until next level (estimated)
 * Based on average XP per minute
 */
export function timeToNextLevel(currentXP, averageXPPerMinute = 10) {
  const progress = getLevelProgress(currentXP);
  const remainingXP = progress.requiredXP - progress.progressXP;

  if (remainingXP <= 0) return 0;

  const minutes = Math.ceil(remainingXP / averageXPPerMinute);
  return minutes;
}

export default {
  xpForLevel,
  levelFromXP,
  getLevelProgress,
  formatXP,
  timeToNextLevel,
};