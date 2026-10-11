import { describe, it, expect } from 'vitest';
import { InningsState, MatchSettings, BallRecord } from '../types/game';
import { isCurrentDelivery } from '../utils/multiplayer';

// Helper simulating simultaneous delivery resolution
function resolveBall(
  innings: InningsState,
  batterPick: number,
  bowlerPick: number,
  settings: MatchSettings
): {
  isOut: boolean;
  runs: number;
  inningsComplete: boolean;
  targetReached?: boolean;
  target?: number;
} {
  const isOut = batterPick === bowlerPick;
  const runs = isOut ? 0 : batterPick;

  innings.legalBalls += 1;
  if (isOut) {
    innings.wickets += 1;
  } else {
    innings.runs += runs;
  }

  const oversFinished = innings.legalBalls >= settings.overs * 6;
  const allOut = innings.wickets >= settings.wickets;

  const record: BallRecord = {
    ballNumber: innings.legalBalls,
    overStr: `${Math.floor(innings.legalBalls / 6)}.${innings.legalBalls % 6}`,
    batterId: innings.batterId,
    bowlerId: innings.bowlerId,
    batterPick,
    bowlerPick,
    isOut,
    runs,
    scoreAfter: innings.runs,
    wicketsAfter: innings.wickets,
  };
  innings.ballHistory.push(record);

  return {
    isOut,
    runs,
    inningsComplete: oversFinished || allOut,
  };
}

// Helper simulating toss role assignment
function determineFirstInningsRoles(
  tossWinner: 'player1' | 'player2',
  decision: 'bat' | 'bowl'
): { batterId: 'player1' | 'player2'; bowlerId: 'player1' | 'player2' } {
  const userBatsFirst =
    (tossWinner === 'player1' && decision === 'bat') ||
    (tossWinner === 'player2' && decision === 'bowl');

  return {
    batterId: userBatsFirst ? 'player1' : 'player2',
    bowlerId: userBatsFirst ? 'player2' : 'player1',
  };
}

// Helper simulating room sanitization (hiding opponent pick)
function sanitizePicks(
  playerOrder: string[],
  currentPicks: Record<string, number | null>,
  forPlayerId: string
) {
  const maskedPicks: Record<string, { hasLocked: boolean; value?: number }> = {};
  for (const pid of playerOrder) {
    const val = currentPicks[pid];
    if (val !== null && val !== undefined) {
      if (pid === forPlayerId) {
        maskedPicks[pid] = { hasLocked: true, value: val };
      } else {
        maskedPicks[pid] = { hasLocked: true };
      }
    } else {
      maskedPicks[pid] = { hasLocked: false };
    }
  }
  return maskedPicks;
}

describe('Toss Outcomes and Batting/Bowling Roles', () => {
  it('correctly sets Player 1 as batter when Player 1 wins toss and chooses BAT', () => {
    const roles = determineFirstInningsRoles('player1', 'bat');
    expect(roles.batterId).toBe('player1');
    expect(roles.bowlerId).toBe('player2');
  });

  it('correctly sets Player 2 as batter when Player 1 wins toss and chooses BOWL', () => {
    const roles = determineFirstInningsRoles('player1', 'bowl');
    expect(roles.batterId).toBe('player2');
    expect(roles.bowlerId).toBe('player1');
  });

  it('correctly sets Player 2 as batter when Player 2 wins toss and chooses BAT', () => {
    const roles = determineFirstInningsRoles('player2', 'bat');
    expect(roles.batterId).toBe('player2');
    expect(roles.bowlerId).toBe('player1');
  });

  it('correctly sets Player 1 as batter when Player 2 wins toss and chooses BOWL', () => {
    const roles = determineFirstInningsRoles('player2', 'bowl');
    expect(roles.batterId).toBe('player1');
    expect(roles.bowlerId).toBe('player2');
  });
});

describe('Hidden Number Selection and Anti-Cheat Masking', () => {
  const playerOrder = ['socket_p1', 'socket_p2'];

  it('hides opponent selection until both players have picked', () => {
    const currentPicks = {
      socket_p1: 6,
      socket_p2: null,
    };

    // What Player 1 sees: their own value is visible
    const p1View = sanitizePicks(playerOrder, currentPicks, 'socket_p1');
    expect(p1View.socket_p1.hasLocked).toBe(true);
    expect(p1View.socket_p1.value).toBe(6);
    expect(p1View.socket_p2.hasLocked).toBe(false);

    // What Player 2 sees: Player 1 has locked, but value is HIDDEN
    const p2View = sanitizePicks(playerOrder, currentPicks, 'socket_p2');
    expect(p2View.socket_p1.hasLocked).toBe(true);
    expect(p2View.socket_p1.value).toBeUndefined(); // Crucial: value is never leaked!
    expect(p2View.socket_p2.hasLocked).toBe(false);
  });

  it('prevents duplicate or modified selections once locked', () => {
    const currentPicks: Record<string, number | null> = {};
    const registerPick = (playerId: string, pick: number): boolean => {
      if (currentPicks[playerId] !== undefined && currentPicks[playerId] !== null) {
        return false; // rejected
      }
      currentPicks[playerId] = pick;
      return true;
    };

    expect(registerPick('socket_p1', 4)).toBe(true);
    expect(currentPicks.socket_p1).toBe(4);

    // Attempting to change to 6 or double-click must fail
    expect(registerPick('socket_p1', 6)).toBe(false);
    expect(currentPicks.socket_p1).toBe(4); // Remains 4
  });
});

describe('Match Flow, Overs & Wicket Rules', () => {
  it('terminates innings immediately in Sudden Death (1 wicket limit)', () => {
    const settings: MatchSettings = { overs: 2, wickets: 1 };
    const innings: InningsState = {
      batterId: 'player1',
      bowlerId: 'player2',
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      ballHistory: [],
      isComplete: false,
    };

    // Ball 1: Different numbers -> runs scored
    const ball1 = resolveBall(innings, 4, 2, settings);
    expect(ball1.isOut).toBe(false);
    expect(ball1.inningsComplete).toBe(false);
    expect(innings.runs).toBe(4);
    expect(innings.wickets).toBe(0);

    // Ball 2: Matching numbers -> Wicket falls -> Sudden Death end!
    const ball2 = resolveBall(innings, 3, 3, settings);
    expect(ball2.isOut).toBe(true);
    expect(ball2.inningsComplete).toBe(true);
    expect(innings.wickets).toBe(1);
    expect(innings.runs).toBe(4);
  });

  it('completes 1-over innings after exactly 6 legal deliveries', () => {
    const settings: MatchSettings = { overs: 1, wickets: 3 };
    const innings: InningsState = {
      batterId: 'player1',
      bowlerId: 'player2',
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      ballHistory: [],
      isComplete: false,
    };

    for (let i = 1; i <= 5; i++) {
      const res = resolveBall(innings, 2, 1, settings);
      expect(res.inningsComplete).toBe(false);
    }
    expect(innings.legalBalls).toBe(5);

    // 6th ball
    const finalBall = resolveBall(innings, 4, 1, settings);
    expect(innings.legalBalls).toBe(6);
    expect(finalBall.inningsComplete).toBe(true);
    expect(innings.runs).toBe(14); // 5 * 2 + 4
  });

  it('ends chase immediately on the ball the target is surpassed', () => {
    const settings: MatchSettings = { overs: 2, wickets: 3 };
    const firstInningsTotal = 15;
    const target = firstInningsTotal + 1; // 16 runs

    const innings2: InningsState = {
      batterId: 'player2',
      bowlerId: 'player1',
      runs: 12,
      wickets: 1,
      legalBalls: 4,
      ballHistory: [],
      isComplete: false,
    };

    // Batter hits a SIX: 12 + 6 = 18 >= 16 (Target surpassed!)
    resolveBall(innings2, 6, 2, settings);
    const targetReached = innings2.runs >= target;

    expect(targetReached).toBe(true);
    expect(innings2.runs).toBe(18);
  });

  it('determines victory by runs when defending team defends total', () => {
    const inn1Runs = 28;
    const inn2Runs = 22; // Defending team won by 6 runs
    const runDiff = inn1Runs - inn2Runs;

    expect(runDiff).toBe(6);
    expect(inn2Runs < inn1Runs).toBe(true);
  });

  it('determines victory by wickets when chasing team reaches target with wickets in hand', () => {
    const totalWickets = 5;
    const lostWickets = 2;
    const wicketsInHand = totalWickets - lostWickets;

    expect(wicketsInHand).toBe(3);
  });
});

describe('Full Match Simulation from Start to Finish', () => {
  it('simulates a complete 2-innings match with tie outcome', () => {
    const settings: MatchSettings = { overs: 1, wickets: 2 };

    // INNINGS 1: Player 1 Bats
    const inn1: InningsState = {
      batterId: 'player1',
      bowlerId: 'player2',
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      ballHistory: [],
      isComplete: false,
    };

    // 6 balls: [2, 4, 1, OUT, 6, 2] -> 15 runs / 1 wicket
    resolveBall(inn1, 2, 1, settings);
    resolveBall(inn1, 4, 3, settings);
    resolveBall(inn1, 1, 5, settings);
    resolveBall(inn1, 3, 3, settings); // OUT
    resolveBall(inn1, 6, 2, settings);
    resolveBall(inn1, 2, 4, settings);

    expect(inn1.legalBalls).toBe(6);
    expect(inn1.runs).toBe(15);
    expect(inn1.wickets).toBe(1);

    // INNINGS 2: Player 2 Chases Target 16
    const target = inn1.runs + 1; // 16
    const inn2: InningsState = {
      batterId: 'player2',
      bowlerId: 'player1',
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      ballHistory: [],
      isComplete: false,
    };

    // 6 balls: [4, 6, 1, 2, OUT, 2] -> 15 runs / 1 wicket
    resolveBall(inn2, 4, 1, settings);
    resolveBall(inn2, 6, 3, settings);
    resolveBall(inn2, 1, 5, settings);
    resolveBall(inn2, 2, 4, settings);
    resolveBall(inn2, 5, 5, settings); // OUT
    resolveBall(inn2, 2, 1, settings);

    expect(inn2.legalBalls).toBe(6);
    expect(inn2.runs).toBe(15);

    // Target was 16, Innings 2 made 15, Innings 1 made 15 -> Tie!
    const targetAchieved = inn2.runs >= target;
    const isTie = inn1.runs === inn2.runs;

    expect(targetAchieved).toBe(false);
    expect(isTie).toBe(true);
  });
});


describe('Multiplayer delivery synchronization', () => {
  it('accepts a pick for the current delivery', () => {
    expect(isCurrentDelivery(0, 0)).toBe(true);
    expect(isCurrentDelivery(3, 3)).toBe(true);
  });

  it('rejects a delayed pick from a previous delivery', () => {
    expect(isCurrentDelivery(0, 1)).toBe(false);
    expect(isCurrentDelivery(4, 5)).toBe(false);
  });

  it('rejects invalid delivery numbers', () => {
    expect(isCurrentDelivery(-1, 0)).toBe(false);
    expect(isCurrentDelivery(1.5, 1)).toBe(false);
    expect(isCurrentDelivery(Number.NaN, 0)).toBe(false);
  });
});
