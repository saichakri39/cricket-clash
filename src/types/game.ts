export type GameMode = 'vs_computer' | 'online_friend';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface MatchSettings {
  overs: number; // 1, 2, or 5
  wickets: number; // 1, 2, 3, 5, 10
}

export interface PlayerInfo {
  id: string;
  name: string;
  isHost?: boolean;
  avatarSeed: number;
  isComputer?: boolean;
  difficulty?: AIDifficulty;
}

export interface BallRecord {
  ballNumber: number;
  overStr: string;
  batterId: string;
  bowlerId: string;
  batterPick: number;
  bowlerPick: number;
  isOut: boolean;
  runs: number;
  scoreAfter: number;
  wicketsAfter: number;
}

export interface InningsState {
  batterId: string;
  bowlerId: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  ballHistory: BallRecord[];
  isComplete: boolean;
}

export interface TossInfo {
  callerId: string;
  call?: 'heads' | 'tails';
  coinResult?: 'heads' | 'tails';
  winnerId?: string;
  decision?: 'bat' | 'bowl';
  isFlipping: boolean;
}

export type AppScreen =
  | 'landing'
  | 'player_setup'
  | 'match_settings'
  | 'room_lobby'
  | 'toss'
  | 'match'
  | 'innings_break'
  | 'result';

export interface RoomSanitizedState {
  roomCode: string;
  hostId: string;
  players: Record<string, { id: string; name: string; connected: boolean; avatarSeed: number }>;
  playerOrder: string[];
  settings: MatchSettings;
  phase:
    | 'lobby'
    | 'settings'
    | 'toss'
    | 'toss_decision'
    | 'innings_1'
    | 'innings_break'
    | 'innings_2'
    | 'match_over';
  toss: TossInfo;
  innings1: InningsState | null;
  innings2: InningsState | null;
  maskedPicks: Record<string, { hasLocked: boolean; value?: number }>;
  lastBallResult: {
    batterPick: number;
    bowlerPick: number;
    isOut: boolean;
    runs: number;
    batterId: string;
    bowlerId: string;
  } | null;
  winnerId?: string | 'tie';
  winReason?: string;
  rematchVotes: Record<string, boolean>;
}
