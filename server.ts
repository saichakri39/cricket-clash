import express, { Request, Response } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { isCurrentDelivery } from './src/utils/multiplayer';

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

export interface Player {
  id: string;
  name: string;
  connected: boolean;
  avatarSeed: number;
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
    settings: room.settings,
    phase: room.phase,
    toss: room.toss,
    innings1: room.innings1,
    innings2: room.innings2,
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
  socket.on('room:create', ({ playerName }: { playerName: string }, callback) => {
    let roomCode = generateRoomCode();
    while (rooms[roomCode]) {
      roomCode = generateRoomCode();
    }

    const player: Player = {
      id: socket.id,
      name: playerName?.trim() || 'Player 1',
      connected: true,
      avatarSeed: Math.floor(Math.random() * 8) + 1,
    };

    const room: RoomState = {
      roomCode,
      hostId: socket.id,
      players: { [socket.id]: player },
      playerOrder: [socket.id],
      settings: { overs: 2, wickets: 3 },
      phase: 'lobby',
      toss: {
        callerId: '',
        isFlipping: false,
      },
      innings1: null,
      innings2: null,
      currentPicks: {},
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
  socket.on('room:join', ({ roomCode, playerName }: { roomCode: string; playerName: string }, callback) => {
    const cleanCode = (roomCode || '').trim().toUpperCase();
    const room = rooms[cleanCode];

    if (!room) {
      if (callback) callback({ success: false, error: 'Room not found. Please check the code.' });
      return;
    }

    // Reconnecting player check
    const existingPlayer = room.players[socket.id];
    if (existingPlayer) {
      existingPlayer.connected = true;
      socket.join(cleanCode);
      playerToRoom[socket.id] = cleanCode;
      if (callback) callback({ success: true, roomCode: cleanCode, state: getSanitizedRoomState(room, socket.id) });
      broadcastRoomState(cleanCode);
      return;
    }

    if (room.playerOrder.length >= 2) {
      // Check if one was disconnected and can be reclaimed by matching name
      const disconnectedId = room.playerOrder.find(id => !room.players[id].connected);
      if (disconnectedId && room.players[disconnectedId].name.toLowerCase() === (playerName || '').trim().toLowerCase()) {
        const oldPlayer = room.players[disconnectedId];
        delete room.players[disconnectedId];
        delete playerToRoom[disconnectedId];

        room.players[socket.id] = {
          ...oldPlayer,
          id: socket.id,
          connected: true,
        };
        const idx = room.playerOrder.indexOf(disconnectedId);
        room.playerOrder[idx] = socket.id;

        if (room.hostId === disconnectedId) room.hostId = socket.id;
        if (room.toss.callerId === disconnectedId) room.toss.callerId = socket.id;
        if (room.toss.winnerId === disconnectedId) room.toss.winnerId = socket.id;
        if (room.innings1) {
          if (room.innings1.batterId === disconnectedId) room.innings1.batterId = socket.id;
          if (room.innings1.bowlerId === disconnectedId) room.innings1.bowlerId = socket.id;
        }
        if (room.innings2) {
          if (room.innings2.batterId === disconnectedId) room.innings2.batterId = socket.id;
          if (room.innings2.bowlerId === disconnectedId) room.innings2.bowlerId = socket.id;
        }
        if (room.currentPicks[disconnectedId] !== undefined) {
          room.currentPicks[socket.id] = room.currentPicks[disconnectedId];
          delete room.currentPicks[disconnectedId];
        }
        if (room.rematchVotes[disconnectedId] !== undefined) {
          room.rematchVotes[socket.id] = room.rematchVotes[disconnectedId];
          delete room.rematchVotes[disconnectedId];
        }

        playerToRoom[socket.id] = cleanCode;
        socket.join(cleanCode);

        if (callback) callback({ success: true, roomCode: cleanCode, state: getSanitizedRoomState(room, socket.id) });
        broadcastRoomState(cleanCode);
        return;
      }

      if (callback) callback({ success: false, error: 'Room is already full.' });
      return;
    }

    const player: Player = {
      id: socket.id,
      name: (playerName || '').trim() || 'Player 2',
      connected: true,
      avatarSeed: Math.floor(Math.random() * 8) + 1,
    };

    room.players[socket.id] = player;
    room.playerOrder.push(socket.id);
    playerToRoom[socket.id] = cleanCode;
    socket.join(cleanCode);

    if (room.playerOrder.length === 2 && room.phase === 'lobby') {
      room.phase = 'settings';
    }

    if (callback) callback({ success: true, roomCode: cleanCode, state: getSanitizedRoomState(room, socket.id) });
    broadcastRoomState(cleanCode);
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
    if (!room || room.hostId !== socket.id || room.playerOrder.length < 2) return;
    if (room.phase !== 'lobby' && room.phase !== 'settings') return;

    const callerId = room.playerOrder[1];
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
        : (room.playerOrder.find(id => id !== room.toss.callerId) || room.hostId);

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
    const otherId = room.playerOrder.find(id => id !== winnerId)!;

    const batterId = decision === 'bat' ? winnerId : otherId;
    const bowlerId = decision === 'bat' ? otherId : winnerId;

    room.phase = 'innings_1';
    room.innings1 = {
      batterId,
      bowlerId,
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      ballHistory: [],
      isComplete: false,
    };
    room.currentPicks = {};
    room.lastBallResult = null;

    broadcastRoomState(code);
  });

  // PLAYER NUMBER PICK (1..6). ballNumber rejects delayed duplicate events from a prior delivery.
  socket.on('room:pick_number', (
    { pick, ballNumber }: { pick: number; ballNumber: number },
    callback?: (response: { success: boolean; error?: string }) => void,
  ) => {
    const reject = (error: string) => callback?.({ success: false, error });
    const code = playerToRoom[socket.id];
    const room = rooms[code];
    if (!room) return reject('You are no longer connected to this room. Rejoin the room.');
    if (!room.playerOrder.includes(socket.id) || !room.players[socket.id]?.connected) {
      return reject('Your player session is out of date. Rejoin the room.');
    }
    if (room.phase !== 'innings_1' && room.phase !== 'innings_2') {
      return reject('The match is changing phases. Please wait for the next delivery.');
    }
    if (!Number.isInteger(pick) || pick < 1 || pick > 6) {
      return reject('Choose a number from 1 to 6.');
    }

    const currentInnings = room.phase === 'innings_1' ? room.innings1 : room.innings2;
    if (!currentInnings || currentInnings.isComplete) {
      return reject('This innings has finished. Please wait for the match to update.');
    }
    if (!isCurrentDelivery(ballNumber, currentInnings.legalBalls)) {
      return reject('That delivery has already changed. Your match is being synchronized.');
    }

    // Reject duplicate picks for the same delivery. The ballNumber check above also
    // rejects a delayed event from the previous delivery after currentPicks is cleared.
    if (room.currentPicks[socket.id] !== undefined && room.currentPicks[socket.id] !== null) {
      return reject('Your number is already locked for this delivery.');
    }

    room.currentPicks[socket.id] = pick;
    broadcastRoomState(code);

    const [p1, p2] = room.playerOrder;
    if (
      room.currentPicks[p1] !== undefined &&
      room.currentPicks[p1] !== null &&
      room.currentPicks[p2] !== undefined &&
      room.currentPicks[p2] !== null
    ) {
      const batterPick = room.currentPicks[currentInnings.batterId]!;
      const bowlerPick = room.currentPicks[currentInnings.bowlerId]!;

      const isOut = batterPick === bowlerPick;
      const runsScored = isOut ? 0 : batterPick;

      currentInnings.legalBalls += 1;
      if (isOut) {
        currentInnings.wickets += 1;
      } else {
        currentInnings.runs += runsScored;
      }

      const overStr = formatOver(currentInnings.legalBalls);
      const ballRecord: BallRecord = {
        ballNumber: currentInnings.legalBalls,
        overStr,
        batterId: currentInnings.batterId,
        bowlerId: currentInnings.bowlerId,
        batterPick,
        bowlerPick,
        isOut,
        runs: runsScored,
        scoreAfter: currentInnings.runs,
        wicketsAfter: currentInnings.wickets,
      };
      currentInnings.ballHistory.push(ballRecord);

      room.lastBallResult = {
        batterPick,
        bowlerPick,
        isOut,
        runs: runsScored,
        batterId: currentInnings.batterId,
        bowlerId: currentInnings.bowlerId,
      };

      room.currentPicks = {};

      const maxBalls = room.settings.overs * 6;
      const allOut = currentInnings.wickets >= room.settings.wickets;
      const oversFinished = currentInnings.legalBalls >= maxBalls;

      if (room.phase === 'innings_1') {
        if (allOut || oversFinished) {
          currentInnings.isComplete = true;
          room.phase = 'innings_break';
        }
      } else if (room.phase === 'innings_2') {
        const target = (room.innings1?.runs || 0) + 1;
        const targetReached = currentInnings.runs >= target;

        if (targetReached || allOut || oversFinished) {
          currentInnings.isComplete = true;
          room.phase = 'match_over';

          const inn1Runs = room.innings1?.runs || 0;
          const inn2Runs = currentInnings.runs;

          if (targetReached) {
            room.winnerId = currentInnings.batterId;
            const wicketsLeft = room.settings.wickets - currentInnings.wickets;
            room.winReason = `${room.players[currentInnings.batterId].name} won by ${wicketsLeft} wicket${wicketsLeft === 1 ? '' : 's'}!`;
          } else if (inn2Runs > inn1Runs) {
            room.winnerId = currentInnings.batterId;
            room.winReason = `${room.players[currentInnings.batterId].name} won by ${room.settings.wickets - currentInnings.wickets} wickets!`;
          } else if (inn2Runs < inn1Runs) {
            room.winnerId = room.innings1?.batterId;
            const runDiff = inn1Runs - inn2Runs;
            room.winReason = `${room.players[room.innings1!.batterId].name} won by ${runDiff} run${runDiff === 1 ? '' : 's'}!`;
          } else {
            room.winnerId = 'tie';
            room.winReason = 'Match tied! What a thrilling clash!';
          }
        }
      }

      broadcastRoomState(code);
    }
    callback?.({ success: true });
  });

  // START INNINGS 2
  socket.on('room:start_innings_2', () => {
    const code = playerToRoom[socket.id];
    const room = rooms[code];
    if (!room || room.phase !== 'innings_break') return;

    const newBatterId = room.innings1!.bowlerId;
    const newBowlerId = room.innings1!.batterId;

    room.phase = 'innings_2';
    room.innings2 = {
      batterId: newBatterId,
      bowlerId: newBowlerId,
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      ballHistory: [],
      isComplete: false,
    };
    room.currentPicks = {};
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
      room.lastBallResult = null;
      room.rematchVotes = {};
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
