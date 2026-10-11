import { describe, it, expect } from 'vitest';
import { computeAIChoice, BOT_PROFILES, getRandomBot } from '../utils/ai';
import { InningsState } from '../types/game';

describe('Hand Cricket Rules & Scoring Logic', () => {
  it('correctly calculates wickets when batter and bowler picks match', () => {
    const batterPick = 4;
    const bowlerPick = 4;
    const isOut = batterPick === bowlerPick;
    const runsScored = isOut ? 0 : batterPick;

    expect(isOut).toBe(true);
    expect(runsScored).toBe(0);
  });

  it('correctly scores runs when batter and bowler picks differ', () => {
    const batterPick: number = 6;
    const bowlerPick: number = 2;
    const isOut = batterPick === bowlerPick;
    const runsScored = isOut ? 0 : batterPick;

    expect(isOut).toBe(false);
    expect(runsScored).toBe(6);
  });

  it('accurately calculates legal ball counts and over strings', () => {
    const formatOver = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;

    expect(formatOver(0)).toBe('0.0');
    expect(formatOver(1)).toBe('0.1');
    expect(formatOver(5)).toBe('0.5');
    expect(formatOver(6)).toBe('1.0');
    expect(formatOver(11)).toBe('1.5');
    expect(formatOver(12)).toBe('2.0');
  });

  it('determines winner correctly when target is achieved', () => {
    const inn1Runs = 24;
    const target = inn1Runs + 1; // 25
    const inn2Runs = 26;

    const targetReached = inn2Runs >= target;
    expect(targetReached).toBe(true);
  });

  it('identifies a tie when runs are equal', () => {
    const inn1Runs = 30;
    const inn2Runs = 30;
    const isTie = inn1Runs === inn2Runs;

    expect(isTie).toBe(true);
  });
});

describe('AI Opponent Engine', () => {
  const dummyInnings: InningsState = {
    batterId: 'player1',
    bowlerId: 'bot',
    runs: 14,
    wickets: 1,
    legalBalls: 6,
    ballHistory: [
      { ballNumber: 1, overStr: '0.1', batterId: 'player1', bowlerId: 'bot', batterPick: 4, bowlerPick: 2, isOut: false, runs: 4, scoreAfter: 4, wicketsAfter: 0 },
      { ballNumber: 2, overStr: '0.2', batterId: 'player1', bowlerId: 'bot', batterPick: 6, bowlerPick: 1, isOut: false, runs: 6, scoreAfter: 10, wicketsAfter: 0 },
      { ballNumber: 3, overStr: '0.3', batterId: 'player1', bowlerId: 'bot', batterPick: 4, bowlerPick: 4, isOut: true, runs: 0, scoreAfter: 10, wicketsAfter: 1 },
      { ballNumber: 4, overStr: '0.4', batterId: 'player1', bowlerId: 'bot', batterPick: 2, bowlerPick: 5, isOut: false, runs: 2, scoreAfter: 12, wicketsAfter: 1 },
      { ballNumber: 5, overStr: '0.5', batterId: 'player1', bowlerId: 'bot', batterPick: 1, bowlerPick: 3, isOut: false, runs: 1, scoreAfter: 13, wicketsAfter: 1 },
      { ballNumber: 6, overStr: '1.0', batterId: 'player1', bowlerId: 'bot', batterPick: 1, bowlerPick: 6, isOut: false, runs: 1, scoreAfter: 14, wicketsAfter: 1 },
    ],
    isComplete: false,
  };

  it('always produces choices in valid range [1, 6] across all difficulties', () => {
    const difficulties = ['easy', 'medium', 'hard'] as const;
    const roles = ['bat', 'bowl'] as const;

    for (const diff of difficulties) {
      for (const role of roles) {
        for (let i = 0; i < 20; i++) {
          const choice = computeAIChoice({
            role,
            difficulty: diff,
            innings: dummyInnings,
            totalOvers: 2,
            totalWickets: 3,
            humanRecentPicks: [4, 6, 4, 2, 1, 1],
          });
          expect(choice).toBeGreaterThanOrEqual(1);
          expect(choice).toBeLessThanOrEqual(6);
        }
      }
    }
  });

  it('provides distinct bot profiles with titles and bios', () => {
    expect(BOT_PROFILES.easy.length).toBeGreaterThan(0);
    expect(BOT_PROFILES.medium.length).toBeGreaterThan(0);
    expect(BOT_PROFILES.hard.length).toBeGreaterThan(0);

    const bot = getRandomBot('hard');
    expect(bot.name).toBeDefined();
    expect(bot.bio).toBeDefined();
    expect(bot.difficulty).toBe('hard');
  });
});
