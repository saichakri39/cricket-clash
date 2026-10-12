import express, { Request, Response } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

app.use(express.json());

// API health endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

export type MatchFormat = '1v1' | '2v2';
export type TeamId = 'team1' | 'team2';

export interface TeamInfo {
  id: TeamId;
  name: string;
  color: string;
  playerIds: string[];
}

export interface Player {
  id: string;
  name: string;
  connected: boolean;
  avatarSeed: number;
  sessionId?: string;
  team?: TeamId;
}

export interface BallRecord {
  ballNumber: number;
  deliveryNumber?: number;
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
  battingTeamId?: TeamId;
  bowlingTeamId?: TeamId;
  batterIndex?: number;
  bowlerIndex?: number;
  runs: number;
  wickets: number;
  legalBalls: number;
  ballHistory: BallRecord[];
  isComplete: boolean;
}

export type GamePhase =
  | 'lobby'
  | 'settings'
  | 'toss'
  | 'toss_decision'
  | 'innings_1'
  | 'innings_break'
  | 'innings_2'
  | 'match_over';

export interface RoomState {
  roomCode: string;
  hostId: string;
  players: Record<string, Player>;
  playerOrder: string[];
  matchFormat: MatchFormat;
  maxPlayers: number;
  teams: {
    team1: TeamInfo;
    team2: TeamInfo;
  };
  battingTeamId?: TeamId;
  bowlingTeamId?: TeamId;
  activeBatterId?: string;
  activeBowlerId?: string;
  teamBatterIndex: {
    team1: number;
    team2: number;
  };
  teamBowlerIndex: {
    team1: number;
    team2: number;
  };
  settings: {
    overs: number;
    wickets: number;
  };
  phase: GamePhase;
  toss: {
    callerId: string;
    call?: 'heads' | 'tails';
    coinResult?: 'heads' | 'tails';
    winnerId?: string;
    decision?: 'bat' | 'bowl';
    isFlipping: boolean;
  };
  innings1: InningsState | null;
  innings2: InningsState | null;
  currentPicks: Record<string, number | null>;
  deliverySeq: number;
  isResolvingDelivery: boolean;
  lastBallResult: {
    deliveryNumber?: number;
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

const rooms: Record<string, RoomState> = {};
const playerToRoom: Record<string, string> = {};

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function formatOver(balls: number): string {
  const overs = Math.floor(balls / 6);
  const rem = balls % 6;
  return `${overs}.${rem}`;
}

function balancePlayerTeams(room: RoomState) {
  const t1 = room.teams.team1.playerIds;
  const t2 = room.teams.team2.playerIds;
  for (const pid of room.playerOrder) {
    if (!t1.includes(pid) && !t2.includes(pid)) {
      if (t1.length <= t2.length) {
        t1.push(pid);
        if (room.players[pid]) room.players[pid].team = 'team1';
      } else {
        t2.push(pid);
        if (room.players[pid]) room.players[pid].team = 'team2';
      }
    } else if (t1.includes(pid)) {
      if (room.players[pid]) room.players[pid].team = 'team1';
    } else if (t2.includes(pid)) {
      if (room.players[pid]) room.players[pid].team = 'team2';
    }
  }
}

function getSanitizedRoomState(room: RoomState, forPlayerId: string) {
  const maskedPicks: Record<string, { hasLocked: boolean; value?: number }> = {};
  for (const pid of room.playerOrder) {
    const val = room.currentPicks[pid];
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

  return {
    roomCode: room.roomCode,
    hostId: room.hostId,
    players: room.players,
    playerOrder: room.playerOrder,
    matchFormat: room.matchFormat,
    maxPlayers: room.maxPlayers,
    teams: room.teams,
    battingTeamId: room.battingTeamId,
    bowlingTeamId: room.bowlingTeamId,
    activeBatterId: room.activeBatterId,
    activeBowlerId: room.activeBowlerId,
    settings: room.settings,
    phase: room.phase,
    toss: room.toss,
    innings1: room.innings1,
    innings2: room.innings2,
    deliveryNumber: room.deliverySeq,
    isResolvingDelivery: room.isResolvingDelivery || false,
    maskedPicks,
    lastBallResult: room.lastBallResult,
    winnerId: room.winnerId,
    winReason: room.winReason,
    rematchVotes: room.rematchVotes,
  };
}

function broadcastRoomState(roomCode: string) {
  const room = rooms[roomCode];
  if (!room) return;
  for (const pid of room.playerOrder) {
    io.to(pid).emit('room:state', getSanitizedRoomState(room, pid));
  }
}

io.on('connection', (socket: Socket) => {
  // CREATE ROOM
  socket.on('room:create', ({ playerName, sessionId, format }: { playerName: string; sessionId?: string; format?: '1v1' | '2v2' }, callback) => {
    let roomCode = generateRoomCode();
    while (rooms[roomCode]) {
      roomCode = generateRoomCode();
    }

    const matchFormat: MatchFormat = format === '2v2' ? '2v2' : '1v1';
    const maxPlayers = matchFormat === '2v2' ? 4 : 2;

    const player: Player = {
      id: socket.id,
      name: playerName?.trim() || 'Player 1',
      connected: true,
      avatarSeed: Math.floor(Math.random() * 8) + 1,
      sessionId: sessionId || '',
      team: 'team1',
    };

    const room: RoomState = {
      roomCode,
      hostId: socket.id,
      players: { [socket.id]: player },
      playerOrder: [socket.id],
      matchFormat,
      maxPlayers,
      teams: {
        team1: { id: 'team1', name: 'Royal Strikers', color: '#06b6d4', playerIds: [socket.id] },
        team2: { id: 'team2', name: 'Thunder Titans', color: '#a3e635', playerIds: [] },
      },
      teamBatterIndex: { team1: 0, team2: 0 },
      teamBowlerIndex: { team1: 0, team2: 0 },
      settings: { overs: 2, wickets: matchFormat === '2v2' ? 2 : 3 },
      phase: 'lobby',
      toss: {
        callerId: '',
        isFlipping: false,
      },
      innings1: null,
      innings2: null,
      currentPicks: {},
      deliverySeq: 0,
      isResolvingDelivery: false,
      lastBallResult: null,
      rematchVotes: {},
    };

    rooms[roomCode] = room;
    playerToRoom[socket.id] = roomCode;
    socket.join(roomCode);

    if (callback) callback({ success: true, roomCode, state: getSanitizedRoomState(room, socket.id) });
    broadcastRoomState(roomCode);
  });

  // JOIN ROOM
  socket.on('room:join', ({ roomCode, playerName, sessionId }: { roomCode: string; playerName: string; sessionId?: string }, callback) => {
    const cleanCode = (roomCode || '').trim().toUpperCase();
    const room = rooms[cleanCode];

    if (!room) {
      if (callback) callback({ success: false, error: 'Room not found. Please check the code.' });
      return;
    }

    // Check if player already belongs to room
    let existingPlayerId: string | undefined = undefined;
    if (room.players[socket.id]) {
      existingPlayerId = socket.id;
    } else if (sessionId) {
      existingPlayerId = room.playerOrder.find(id => room.players[id]?.sessionId && room.players[id].sessionId === sessionId);
    }
    if (!existingPlayerId) {
      existingPlayerId = room.playerOrder.find(
        id => !room.players[id]?.connected && room.players[id]?.name.toLowerCase() === (playerName || '').trim().toLowerCase()
      );
    }

    if (existingPlayerId) {
      if (existingPlayerId === socket.id) {
        room.players[socket.id].connected = true;
        if (sessionId) room.players[socket.id].sessionId = sessionId;
      } else {
        const oldPlayer = room.players[existingPlayerId];
        delete room.players[existingPlayerId];
        delete playerToRoom[existingPlayerId];

        room.players[socket.id] = {
          ...oldPlayer,
          id: socket.id,
          connected: true,
          sessionId: sessionId || oldPlayer.sessionId,
        };

        const idx = room.playerOrder.indexOf(existingPlayerId);
        if (idx !== -1) room.playerOrder[idx] = socket.id;

        // Update team rosters
        for (const tKey of ['team1', 'team2'] as const) {
          const tIdx = room.teams[tKey].playerIds.indexOf(existingPlayerId);
          if (tIdx !== -1) room.teams[tKey].playerIds[tIdx] = socket.id;
        }

        if (room.hostId === existingPlayerId) room.hostId = socket.id;
        if (room.toss.callerId === existingPlayerId) room.toss.callerId = socket.id;
        if (room.toss.winnerId === existingPlayerId) room.toss.winnerId = socket.id;
        if (room.winnerId === existingPlayerId) room.winnerId = socket.id;
        if (room.activeBatterId === existingPlayerId) room.activeBatterId = socket.id;
        if (room.activeBowlerId === existingPlayerId) room.activeBowlerId = socket.id;

        if (room.innings1) {
          if (room.innings1.batterId === existingPlayerId) room.innings1.batterId = socket.id;
          if (room.innings1.bowlerId === existingPlayerId) room.innings1.bowlerId = socket.id;
        }
        if (room.innings2) {
          if (room.innings2.batterId === existingPlayerId) room.innings2.batterId = socket.id;
          if (room.innings2.bowlerId === existingPlayerId) room.innings2.bowlerId = socket.id;
        }
        if (room.lastBallResult) {
          if (room.lastBallResult.batterId === existingPlayerId) room.lastBallResult.batterId = socket.id;
          if (room.lastBallResult.bowlerId === existingPlayerId) room.lastBallResult.bowlerId = socket.id;
        }
        if (room.currentPicks[existingPlayerId] !== undefined) {
          room.currentPicks[socket.id] = room.currentPicks[existingPlayerId];
          delete room.currentPicks[existingPlayerId];
        }
        if (room.rematchVotes[existingPlayerId] !== undefined) {
          room.rematchVotes[socket.id] = room.rematchVotes[existingPlayerId];
          delete room.rematchVotes[existingPlayerId];
        }

        try {
          io.sockets.sockets.get(existingPlayerId)?.disconnect(true);
        } catch {
          // ignore
        }
      }

      playerToRoom[socket.id] = cleanCode;
      socket.join(cleanCode);

      if (callback) callback({ success: true, roomCode: cleanCode, state: getSanitizedRoomState(room, socket.id) });
      broadcastRoomState(cleanCode);
      return;
    }

    if (room.playerOrder.length >= room.maxPlayers) {
      if (callback) callback({ success: false, error: 'Room is already full.' });
      return;
    }

    // Auto-balance onto team with fewer members
    const t1Count = room.teams.team1.playerIds.length;
    const t2Count = room.teams.team2.playerIds.length;
    const assignedTeam: TeamId = t1Count <= t2Count ? 'team1' : 'team2';

    const player: Player = {
      id: socket.id,
      name: (playerName || '').trim() || `Player ${room.playerOrder.length + 1}`,
      connected: true,
      avatarSeed: Math.floor(Math.random() * 8) + 1,
      sessionId: sessionId || '',
      team: assignedTeam,
    };

    room.players[socket.id] = player;
    room.playerOrder.push(socket.id);
    room.teams[assignedTeam].playerIds.push(socket.id);
    playerToRoom[socket.id] = cleanCode;
    socket.join(cleanCode);

    if (room.playerOrder.length === room.maxPlayers && room.phase === 'lobby') {
      room.phase = 'settings';
    }

    if (callback) callback({ success: true, roomCode: cleanCode, state: getSanitizedRoomState(room, socket.id) });
    broadcastRoomState(cleanCode);
  });

  // SET MATCH FORMAT (Host can switch between 1v1 and 2v2)
  socket.on('room:set_format', ({ format }: { format: '1v1' | '2v2' }) => {
    const code = playerToRoom[socket.id];
    const room = rooms[code];
    if (!room || room.hostId !== socket.id || (room.phase !== 'lobby' && room.phase !== 'settings')) return;
    if (format !== '1v1' && format !== '2v2') return;

    room.matchFormat = format;
    room.maxPlayers = format === '2v2' ? 4 : 2;
    if (format === '2v2' && room.settings.wickets === 3) {
      room.settings.wickets = 2; // 2 wickets (1 per team member)
    }
    balancePlayerTeams(room);
    broadcastRoomState(code);
  });

  // SWITCH TEAM (Player can join Team 1 or Team 2 in lobby)
  socket.on('room:switch_team', ({ teamId }: { teamId: 'team1' | 'team2' }) => {
    const code = playerToRoom[socket.id];
    const room = rooms[code];
    if (!room || (room.phase !== 'lobby' && room.phase !== 'settings')) return;
    if (teamId !== 'team1' && teamId !== 'team2') return;

    const currentTeamId: TeamId = room.players[socket.id]?.team || (room.teams.team1.playerIds.includes(socket.id) ? 'team1' : 'team2');
    if (currentTeamId === teamId) return;

    const targetTeam = room.teams[teamId];
    const maxPerTeam = room.matchFormat === '2v2' ? 2 : 1;
    if (targetTeam.playerIds.length >= maxPerTeam) {
      return; // Target team already has maximum players
    }

    room.teams[currentTeamId].playerIds = room.teams[currentTeamId].playerIds.filter(id => id !== socket.id);
    room.teams[teamId].playerIds.push(socket.id);
    if (room.players[socket.id]) {
      room.players[socket.id].team = teamId;
    }

    broadcastRoomState(code);
  });

  // UPDATE SETTINGS (Host only)
  socket.on('room:update_settings', ({ overs, wickets }: { overs: number; wickets: number }) => {
    const code = playerToRoom[socket.id];
    const room = rooms[code];
    if (!room || room.hostId !== socket.id) return;
    if (room.phase !== 'lobby' && room.phase !== 'settings') return;

    if ([1, 2, 5].includes(overs)) room.settings.overs = overs;
    if ([1, 2, 3, 5, 10].includes(wickets)) room.settings.wickets = wickets;

    broadcastRoomState(code);
  });

  // START TOSS (Host confirms settings and initiates coin toss)
  socket.on('room:start_toss', () => {
    const code = playerToRoom[socket.id];
    const room = rooms[code];
    if (!room || room.hostId !== socket.id) return;
    if (room.phase !== 'lobby' && room.phase !== 'settings') return;

    balancePlayerTeams(room);

    // Minimum checks
    if (room.matchFormat === '1v1' && room.playerOrder.length < 2) return;
    if (room.matchFormat === '2v2' && (room.teams.team1.playerIds.length === 0 || room.teams.team2.playerIds.length === 0)) return;

    // Caller is captain of Team 2
    const callerId = room.matchFormat === '2v2'
      ? (room.teams.team2.playerIds[0] || room.playerOrder[1])
      : room.playerOrder[1];

    room.phase = 'toss';
    room.toss = {
      callerId,
      isFlipping: false,
    };
    room.lastBallResult = null;
    broadcastRoomState(code);
  });

  // CALL TOSS (Caller selects Heads or Tails)
  socket.on('room:call_toss', ({ call }: { call: 'heads' | 'tails' }) => {
    const code = playerToRoom[socket.id];
    const room = rooms[code];
    if (!room || room.phase !== 'toss' || room.toss.callerId !== socket.id) return;
    if (room.toss.isFlipping) return;

    room.toss.call = call;
    room.toss.isFlipping = true;
    broadcastRoomState(code);

    setTimeout(() => {
      if (!rooms[code]) return;
      const coinResult: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';
      const callerWon = coinResult === call;
      const winnerId = callerWon
        ? room.toss.callerId
        : (room.teams.team1.playerIds[0] || room.hostId);

      room.toss.coinResult = coinResult;
      room.toss.winnerId = winnerId;
      room.toss.isFlipping = false;
      room.phase = 'toss_decision';
      broadcastRoomState(code);
    }, 2200);
  });

  // TOSS DECISION (Winner chooses Bat or Bowl)
  socket.on('room:toss_decision', ({ decision }: { decision: 'bat' | 'bowl' }) => {
    const code = playerToRoom[socket.id];
    const room = rooms[code];
    if (!room || room.phase !== 'toss_decision' || room.toss.winnerId !== socket.id) return;

    room.toss.decision = decision;
    const winnerId = room.toss.winnerId;

    const winnerTeamId: TeamId = room.teams.team1.playerIds.includes(winnerId) ? 'team1' : 'team2';
    const battingTeamId: TeamId = decision === 'bat' ? winnerTeamId : (winnerTeamId === 'team1' ? 'team2' : 'team1');
    const bowlingTeamId: TeamId = battingTeamId === 'team1' ? 'team2' : 'team1';

    room.battingTeamId = battingTeamId;
    room.bowlingTeamId = bowlingTeamId;
    room.teamBatterIndex = { team1: 0, team2: 0 };
    room.teamBowlerIndex = { team1: 0, team2: 0 };

    // Broadcast decision announcement first
    broadcastRoomState(code);

    setTimeout(() => {
      if (!rooms[code]) return;
      room.phase = 'innings_1';

      const battingPlayers = room.teams[battingTeamId].playerIds;
      const bowlingPlayers = room.teams[bowlingTeamId].playerIds;

      const activeBatterId = battingPlayers[0] || winnerId;
      const activeBowlerId = bowlingPlayers[0] || (room.playerOrder.find(id => id !== activeBatterId) || room.hostId);

      room.activeBatterId = activeBatterId;
      room.activeBowlerId = activeBowlerId;

      room.innings1 = {
        batterId: activeBatterId,
        bowlerId: activeBowlerId,
        battingTeamId,
        bowlingTeamId,
        runs: 0,
        wickets: 0,
        legalBalls: 0,
        ballHistory: [],
        isComplete: false,
      };
      room.currentPicks = {};
      room.lastBallResult = null;
      room.isResolvingDelivery = false;

      broadcastRoomState(code);
    }, 1200);
  });

  // PLAYER NUMBER PICK (1..6)
  socket.on('room:pick_number', ({ pick }: { pick: number }, callback?: (res: { success: boolean; error?: string }) => void) => {
    const code = playerToRoom[socket.id];
    const room = rooms[code];
    if (!room) {
      if (callback) callback({ success: false, error: 'Room not found' });
      return;
    }
    if (!room.playerOrder.includes(socket.id)) {
      if (callback) callback({ success: false, error: 'Not a player in this room' });
      return;
    }
    if (room.phase !== 'innings_1' && room.phase !== 'innings_2') {
      if (callback) callback({ success: false, error: 'Match is not in active innings' });
      return;
    }
    if (!Number.isInteger(pick) || pick < 1 || pick > 6) {
      if (callback) callback({ success: false, error: 'Invalid pick. Must be 1-6' });
      return;
    }

    const currentInnings = room.phase === 'innings_1' ? room.innings1 : room.innings2;
    if (!currentInnings || currentInnings.isComplete) {
      if (callback) callback({ success: false, error: 'Innings is complete' });
      return;
    }

    // Prevent submission while delivery is currently resolving
    if (room.isResolvingDelivery) {
      if (callback) callback({ success: false, error: 'Delivery resolving' });
      return;
    }

    const activeBatter = room.activeBatterId || currentInnings.batterId;
    const activeBowler = room.activeBowlerId || currentInnings.bowlerId;

    // Prevent duplicate submission if player has already locked in
    if (room.currentPicks[socket.id] !== undefined && room.currentPicks[socket.id] !== null) {
      if (callback) callback({ success: false, error: 'Already selected' });
      return;
    }

    room.currentPicks[socket.id] = pick;
    if (callback) callback({ success: true });
    broadcastRoomState(code);

    // Delivery resolves when BOTH active striker and active bowler have picked!
    if (
      room.currentPicks[activeBatter] !== undefined &&
      room.currentPicks[activeBatter] !== null &&
      room.currentPicks[activeBowler] !== undefined &&
      room.currentPicks[activeBowler] !== null
    ) {
      room.isResolvingDelivery = true;

      const batterPick = room.currentPicks[activeBatter]!;
      const bowlerPick = room.currentPicks[activeBowler]!;

      const isOut = batterPick === bowlerPick;
      const runsScored = isOut ? 0 : batterPick;

      currentInnings.legalBalls += 1;
      if (isOut) {
        currentInnings.wickets += 1;
      } else {
        currentInnings.runs += runsScored;
      }

      room.deliverySeq = (room.deliverySeq || 0) + 1;
      const overStr = formatOver(currentInnings.legalBalls);
      const ballRecord: BallRecord = {
        ballNumber: currentInnings.legalBalls,
        deliveryNumber: room.deliverySeq,
        overStr,
        batterId: activeBatter,
        bowlerId: activeBowler,
        batterPick,
        bowlerPick,
        isOut,
        runs: runsScored,
        scoreAfter: currentInnings.runs,
        wicketsAfter: currentInnings.wickets,
      };
      currentInnings.ballHistory.push(ballRecord);

      room.lastBallResult = {
        deliveryNumber: room.deliverySeq,
        batterPick,
        bowlerPick,
        isOut,
        runs: runsScored,
        batterId: activeBatter,
        bowlerId: activeBowler,
      };

      room.currentPicks = {};

      // Succession & Bowler rotation in 2v2
      const battingTeamId: TeamId = room.battingTeamId || (currentInnings.batterId === room.playerOrder[0] ? 'team1' : 'team2');
      const bowlingTeamId: TeamId = room.bowlingTeamId || (battingTeamId === 'team1' ? 'team2' : 'team1');
      const battingPlayers = room.teams[battingTeamId]?.playerIds || [activeBatter];
      const bowlingPlayers = room.teams[bowlingTeamId]?.playerIds || [activeBowler];

      if (isOut) {
        // Next teammate from batting team comes in
        room.teamBatterIndex[battingTeamId] = (room.teamBatterIndex[battingTeamId] || 0) + 1;
        const nextBatterIdx = room.teamBatterIndex[battingTeamId];
        if (nextBatterIdx < battingPlayers.length) {
          room.activeBatterId = battingPlayers[nextBatterIdx];
          currentInnings.batterId = room.activeBatterId;
        }
      }

      if (currentInnings.legalBalls % 6 === 0) {
        // Rotate bowler at end of each over
        room.teamBowlerIndex[bowlingTeamId] = (room.teamBowlerIndex[bowlingTeamId] || 0) + 1;
        const nextBowlerIdx = room.teamBowlerIndex[bowlingTeamId] % bowlingPlayers.length;
        room.activeBowlerId = bowlingPlayers[nextBowlerIdx];
        currentInnings.bowlerId = room.activeBowlerId;
      }

      const maxBalls = room.settings.overs * 6;
      const teamWicketsLimit = room.matchFormat === '2v2' ? Math.min(battingPlayers.length, room.settings.wickets) : room.settings.wickets;
      const allOut = currentInnings.wickets >= teamWicketsLimit;
      const oversFinished = currentInnings.legalBalls >= maxBalls;

      if (room.phase === 'innings_1') {
        if (allOut || oversFinished) {
          broadcastRoomState(code);

          setTimeout(() => {
            if (!rooms[code]) return;
            currentInnings.isComplete = true;
            room.phase = 'innings_break';
            room.isResolvingDelivery = false;
            broadcastRoomState(code);
          }, 1800);
          return;
        } else {
          broadcastRoomState(code);
          setTimeout(() => {
            if (rooms[code]) {
              rooms[code].isResolvingDelivery = false;
              broadcastRoomState(code);
            }
          }, 800);
        }
      } else if (room.phase === 'innings_2') {
        const target = (room.innings1?.runs || 0) + 1;
        const targetReached = currentInnings.runs >= target;

        if (targetReached || allOut || oversFinished) {
          const inn1Runs = room.innings1?.runs || 0;
          const inn2Runs = currentInnings.runs;

          const battingTeamName = room.matchFormat === '2v2'
            ? room.teams[battingTeamId]?.name
            : (room.players[activeBatter]?.name || 'Batter');
          const bowlingTeamName = room.matchFormat === '2v2'
            ? room.teams[bowlingTeamId]?.name
            : (room.players[activeBowler]?.name || 'Bowler');

          if (targetReached) {
            room.winnerId = room.matchFormat === '2v2' ? battingTeamId : activeBatter;
            const wicketsLeft = teamWicketsLimit - currentInnings.wickets;
            room.winReason = `${battingTeamName} won by ${wicketsLeft} wicket${wicketsLeft === 1 ? '' : 's'}!`;
          } else if (inn2Runs > inn1Runs) {
            room.winnerId = room.matchFormat === '2v2' ? battingTeamId : activeBatter;
            room.winReason = `${battingTeamName} won by ${teamWicketsLimit - currentInnings.wickets} wickets!`;
          } else if (inn2Runs < inn1Runs) {
            room.winnerId = room.matchFormat === '2v2' ? bowlingTeamId : (room.innings1?.batterId || bowlingPlayers[0]);
            const runDiff = inn1Runs - inn2Runs;
            room.winReason = `${bowlingTeamName} won by ${runDiff} run${runDiff === 1 ? '' : 's'}!`;
          } else {
            room.winnerId = 'tie';
            room.winReason = 'Match tied! What a thrilling clash!';
          }

          broadcastRoomState(code);

          setTimeout(() => {
            if (!rooms[code]) return;
            currentInnings.isComplete = true;
            room.phase = 'match_over';
            room.isResolvingDelivery = false;
            broadcastRoomState(code);
          }, 2000);
          return;
        } else {
          broadcastRoomState(code);
          setTimeout(() => {
            if (rooms[code]) {
              rooms[code].isResolvingDelivery = false;
              broadcastRoomState(code);
            }
          }, 800);
        }
      }
    }
  });

  // START INNINGS 2
  socket.on('room:start_innings_2', () => {
    const code = playerToRoom[socket.id];
    const room = rooms[code];
    if (!room || room.phase !== 'innings_break') return;

    // Swap teams
    const prevBattingTeamId = room.battingTeamId || 'team1';
    const newBattingTeamId: TeamId = prevBattingTeamId === 'team1' ? 'team2' : 'team1';
    const newBowlingTeamId: TeamId = prevBattingTeamId;

    room.battingTeamId = newBattingTeamId;
    room.bowlingTeamId = newBowlingTeamId;
    room.teamBatterIndex = { team1: 0, team2: 0 };
    room.teamBowlerIndex = { team1: 0, team2: 0 };

    const battingPlayers = room.teams[newBattingTeamId]?.playerIds || [];
    const bowlingPlayers = room.teams[newBowlingTeamId]?.playerIds || [];

    const newBatterId = battingPlayers[0] || room.innings1!.bowlerId;
    const newBowlerId = bowlingPlayers[0] || room.innings1!.batterId;

    room.activeBatterId = newBatterId;
    room.activeBowlerId = newBowlerId;

    room.phase = 'innings_2';
    room.innings2 = {
      batterId: newBatterId,
      bowlerId: newBowlerId,
      battingTeamId: newBattingTeamId,
      bowlingTeamId: newBowlingTeamId,
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      ballHistory: [],
      isComplete: false,
    };
    room.currentPicks = {};
    room.isResolvingDelivery = false;
    room.lastBallResult = null;

    broadcastRoomState(code);
  });

  // REMATCH REQUEST
  socket.on('room:request_rematch', () => {
    const code = playerToRoom[socket.id];
    const room = rooms[code];
    if (!room || room.phase !== 'match_over') return;

    room.rematchVotes[socket.id] = true;

    const allAgreed = room.playerOrder.every(pid => room.rematchVotes[pid]);
    if (allAgreed) {
      room.phase = 'settings';
      room.innings1 = null;
      room.innings2 = null;
      room.currentPicks = {};
      room.isResolvingDelivery = false;
      room.lastBallResult = null;
      room.rematchVotes = {};
      room.deliverySeq = 0;
      room.teamBatterIndex = { team1: 0, team2: 0 };
      room.teamBowlerIndex = { team1: 0, team2: 0 };
      room.activeBatterId = undefined;
      room.activeBowlerId = undefined;
      room.battingTeamId = undefined;
      room.bowlingTeamId = undefined;
      room.toss = {
        callerId: '',
        isFlipping: false,
      };
      room.winnerId = undefined;
      room.winReason = undefined;
    }

    broadcastRoomState(code);
  });

  // DISCONNECT HANDLING
  socket.on('disconnect', () => {
    const code = playerToRoom[socket.id];
    if (!code) return;
    const room = rooms[code];
    if (!room) return;

    if (room.players[socket.id]) {
      room.players[socket.id].connected = false;
    }

    const activePlayers = room.playerOrder.filter(pid => room.players[pid]?.connected);
    if (activePlayers.length === 0) {
      setTimeout(() => {
        if (rooms[code]) {
          const stillEmpty = rooms[code].playerOrder.every(pid => !rooms[code].players[pid]?.connected);
          if (stillEmpty) {
            delete rooms[code];
          }
        }
      }, 120000);
    }

    broadcastRoomState(code);
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🏏 Cricket Clash server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
