import { AIDifficulty, InningsState } from '../types/game';

export interface BotProfile {
  name: string;
  title: string;
  difficulty: AIDifficulty;
  avatarSeed: number;
  bio: string;
  badgeColor: string;
}

export const BOT_PROFILES: Record<AIDifficulty, BotProfile[]> = {
  easy: [
    {
      name: 'Rookie Bot',
      title: 'First-timer',
      difficulty: 'easy',
      avatarSeed: 1,
      bio: 'Still getting used to hand gestures. Plays random numbers and loves easy singles.',
      badgeColor: 'border-emerald-500 text-emerald-400',
    },
    {
      name: 'Gully Guru',
      title: 'Street Casual',
      difficulty: 'easy',
      avatarSeed: 2,
      bio: 'Plays with casual flair. Predictable patterns, generous with loose deliveries.',
      badgeColor: 'border-teal-500 text-teal-400',
    },
  ],
  medium: [
    {
      name: 'Pacer Pete',
      title: 'Club Captain',
      difficulty: 'medium',
      avatarSeed: 3,
      bio: 'Balanced all-rounder who keeps the scoreboard ticking and mixes up deliveries.',
      badgeColor: 'border-blue-500 text-blue-400',
    },
    {
      name: 'Captain Clark',
      title: 'Tactical Leader',
      difficulty: 'medium',
      avatarSeed: 4,
      bio: 'Reads the situation well. Punishes repeated moves and values wickets.',
      badgeColor: 'border-cyan-500 text-cyan-400',
    },
  ],
  hard: [
    {
      name: 'Master Blaster',
      title: 'Grandmaster',
      difficulty: 'hard',
      avatarSeed: 5,
      bio: 'Legendary strike rate. Analyzes your psychology, baits traps, and hits big when needed.',
      badgeColor: 'border-amber-500 text-amber-400',
    },
    {
      name: 'Yorker King',
      title: 'Lethal Bowler',
      difficulty: 'hard',
      avatarSeed: 6,
      bio: 'Pinpoints your exact pattern and strikes when you least expect it.',
      badgeColor: 'border-rose-500 text-rose-400',
    },
  ],
};

export function getRandomBot(difficulty: AIDifficulty): BotProfile {
  const bots = BOT_PROFILES[difficulty];
  return bots[Math.floor(Math.random() * bots.length)];
}

interface AIChoiceParams {
  role: 'bat' | 'bowl';
  difficulty: AIDifficulty;
  innings: InningsState;
  target?: number;
  totalOvers: number;
  totalWickets: number;
  humanRecentPicks: number[];
}

export function computeAIChoice({
  role,
  difficulty,
  innings,
  target,
  totalOvers,
  totalWickets,
  humanRecentPicks,
}: AIChoiceParams): number {
  const allChoices = [1, 2, 3, 4, 5, 6];
  const maxBalls = totalOvers * 6;
  const ballsRemaining = Math.max(1, maxBalls - innings.legalBalls);
  const wicketsInHand = Math.max(1, totalWickets - innings.wickets);

  // EASY DIFFICULTY: 60% uniform random, 25% low numbers, 15% previous pick
  if (difficulty === 'easy') {
    const roll = Math.random();
    if (roll < 0.6) {
      return allChoices[Math.floor(Math.random() * 6)];
    } else if (roll < 0.85) {
      return Math.floor(Math.random() * 3) + 1; // 1, 2, 3
    } else {
      const lastHistory = innings.ballHistory[innings.ballHistory.length - 1];
      if (lastHistory) {
        return role === 'bat' ? lastHistory.batterPick : lastHistory.bowlerPick;
      }
      return 4;
    }
  }

  // MEDIUM DIFFICULTY: Situational balance with responsive adjustments
  if (difficulty === 'medium') {
    if (role === 'bat') {
      const lastBall = innings.ballHistory[innings.ballHistory.length - 1];
      const lastHumanBowl = lastBall ? lastBall.bowlerPick : null;
      const candidates = allChoices.filter(n => n !== lastHumanBowl);
      const isDeathOvers = ballsRemaining <= 6;

      if (isDeathOvers && wicketsInHand > 1) {
        const aggressive = [4, 6, 5, 3].filter(n => n !== lastHumanBowl);
        return aggressive[Math.floor(Math.random() * aggressive.length)] || candidates[0];
      }

      return candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      // Bowling: 45% chance to attack human's recent favored pick
      if (humanRecentPicks.length >= 2) {
        const counts: Record<number, number> = {};
        humanRecentPicks.slice(-4).forEach(p => { counts[p] = (counts[p] || 0) + 1; });
        let topPick = 4;
        let maxCount = 0;
        for (const [num, count] of Object.entries(counts)) {
          if (count > maxCount) {
            maxCount = count;
            topPick = Number(num);
          }
        }
        if (Math.random() < 0.45) {
          return topPick;
        }
      }
      return allChoices[Math.floor(Math.random() * 6)];
    }
  }

  // HARD DIFFICULTY: High-IQ analytical play
  if (role === 'bat') {
    const lastBall = innings.ballHistory[innings.ballHistory.length - 1];
    const humanBowledHistory = innings.ballHistory.map(b => b.bowlerPick);

    // Human tendency analysis
    const humanFreq: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    humanBowledHistory.slice(-6).forEach(p => {
      humanFreq[p] = (humanFreq[p] || 0) + 1;
    });

    const dangerousPicks = Object.entries(humanFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(entry => Number(entry[0]));

    let safeOptions = allChoices.filter(n => !dangerousPicks.includes(n));
    if (safeOptions.length === 0) safeOptions = allChoices;

    if (target !== undefined) {
      const runsNeeded = target - innings.runs;
      if (runsNeeded <= 0) return 1;

      const reqRate = (runsNeeded / ballsRemaining) * 6;

      if (reqRate <= 4.0 || ballsRemaining > runsNeeded * 2) {
        const conservative = safeOptions.filter(n => n <= 3);
        if (conservative.length > 0) {
          return conservative[Math.floor(Math.random() * conservative.length)];
        }
      }

      if (reqRate >= 7.0 || ballsRemaining <= 4) {
        const bigHits = safeOptions.filter(n => n === 4 || n === 6);
        if (bigHits.length > 0 && Math.random() < 0.75) {
          return bigHits[Math.floor(Math.random() * bigHits.length)];
        }
      }
    } else {
      if (wicketsInHand >= 2 && ballsRemaining <= 6) {
        const aggressive = safeOptions.filter(n => n >= 4);
        if (aggressive.length > 0 && Math.random() < 0.7) {
          return aggressive[Math.floor(Math.random() * aggressive.length)];
        }
      }
    }

    if (lastBall && lastBall.runs >= 4) {
      const smartSneak = safeOptions.filter(n => n === 1 || n === 2 || n === 3);
      if (smartSneak.length > 0 && Math.random() < 0.7) {
        return smartSneak[Math.floor(Math.random() * smartSneak.length)];
      }
    }

    return safeOptions[Math.floor(Math.random() * safeOptions.length)];
  } else {
    // Hard Bowling: Target player's patterns
    const humanBattingHistory = innings.ballHistory.map(b => b.batterPick);

    if (target !== undefined) {
      const runsNeeded = target - innings.runs;
      const reqRate = (runsNeeded / ballsRemaining) * 6;

      if (reqRate >= 6.5 || ballsRemaining <= 4) {
        if (Math.random() < 0.7) {
          return Math.random() < 0.55 ? 6 : 4;
        }
      }
    }

    // Pattern matching
    if (humanBattingHistory.length >= 2) {
      const lastHumanPick = humanBattingHistory[humanBattingHistory.length - 1];
      const transitions: Record<number, number> = {};

      for (let i = 0; i < humanBattingHistory.length - 1; i++) {
        if (humanBattingHistory[i] === lastHumanPick) {
          const next = humanBattingHistory[i + 1];
          transitions[next] = (transitions[next] || 0) + 1;
        }
      }

      let bestNext: number | null = null;
      let maxOccur = 0;
      for (const [nxt, cnt] of Object.entries(transitions)) {
        if (cnt > maxOccur) {
          maxOccur = cnt;
          bestNext = Number(nxt);
        }
      }

      if (bestNext !== null && Math.random() < 0.6) {
        return bestNext;
      }
    }

    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    humanBattingHistory.forEach(p => { counts[p] = (counts[p] || 0) + 1; });

    const sortedByCount = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => Number(entry[0]));

    if (humanBattingHistory.length >= 3 && Math.random() < 0.65) {
      return sortedByCount[0];
    }

    return allChoices[Math.floor(Math.random() * 6)];
  }
}
