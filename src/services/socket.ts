import { io, Socket } from 'socket.io-client';
import { RoomSanitizedState } from '../types/game';

class SocketService {
  private socket: Socket | null = null;
  private stateListeners: ((state: RoomSanitizedState) => void)[] = [];
  private connectListeners: ((connected: boolean) => void)[] = [];
  private activeRoom: { roomCode: string; playerName: string } | null = null;
  private hasConnectedOnce = false;

  public getSocket(): Socket {
    if (!this.socket) {
      try {
        // Connect to current origin, preferring polling first for proxy/iframe compatibility
        this.socket = io({
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 15,
          reconnectionDelay: 1000,
          transports: ['polling', 'websocket'],
        });

        this.socket.on('connect', () => {
          this.notifyConnection(true);

          // Socket.IO assigns a new socket ID after reconnecting. Rejoin the existing
          // room so the server can restore this player and remap their pending pick.
          if (this.hasConnectedOnce && this.activeRoom) {
            this.rejoinActiveRoom();
          }
          this.hasConnectedOnce = true;
        });

        this.socket.on('disconnect', () => {
          this.notifyConnection(false);
        });

        this.socket.on('connect_error', () => {
          this.notifyConnection(false);
        });

        this.socket.on('room:state', (state: RoomSanitizedState) => {
          this.notifyState(state);
        });
      } catch (err) {
        console.warn('Socket initialization error (fallback mode):', err);
        // Fallback dummy socket object to prevent runtime crashes
        this.socket = {
          id: '',
          connected: false,
          emit: () => this.socket,
          on: () => this.socket,
          off: () => this.socket,
        } as unknown as Socket;
      }
    }
    return this.socket;
  }

  public isConnected(): boolean {
    return !!this.socket?.connected;
  }

  public clearRoomSession() {
    this.activeRoom = null;
  }

  public subscribeState(listener: (state: RoomSanitizedState) => void): () => void {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }

  public subscribeConnection(listener: (connected: boolean) => void): () => void {
    this.connectListeners.push(listener);
    return () => {
      this.connectListeners = this.connectListeners.filter(l => l !== listener);
    };
  }

  private notifyState(state: RoomSanitizedState) {
    this.stateListeners.forEach(listener => {
      try {
        listener(state);
      } catch {
        // ignore listener errors
      }
    });
  }

  private notifyConnection(connected: boolean) {
    this.connectListeners.forEach(listener => {
      try {
        listener(connected);
      } catch {
        // ignore listener errors
      }
    });
  }

  private rejoinActiveRoom(attempt = 0) {
    const socket = this.getSocket();
    const session = this.activeRoom;
    if (!session || !socket.connected) return;

    socket.emit('room:join', session, (response: { success: boolean; roomCode?: string; state?: RoomSanitizedState; error?: string }) => {
      if (response?.success && response.state) {
        this.activeRoom = { roomCode: response.roomCode || session.roomCode, playerName: session.playerName };
        this.notifyState(response.state);
        return;
      }

      // Give the server's disconnect handler a moment to mark the old socket offline.
      if (attempt < 3 && socket.connected) {
        setTimeout(() => this.rejoinActiveRoom(attempt + 1), 500 * (attempt + 1));
      } else if (response?.error) {
        console.warn('Could not restore multiplayer room after reconnect:', response.error);
      }
    });
  }

  public createRoom(playerName: string): Promise<{ success: boolean; roomCode?: string; state?: RoomSanitizedState; error?: string }> {
    const s = this.getSocket();
    return new Promise((resolve) => {
      try {
        s.emit('room:create', { playerName }, (res: { success: boolean; roomCode?: string; state?: RoomSanitizedState; error?: string }) => {
          if (res?.success && res.roomCode) this.activeRoom = { roomCode: res.roomCode, playerName };
          resolve(res || { success: false, error: 'Empty server response' });
        });
      } catch {
        resolve({ success: false, error: 'Could not connect to multiplayer server.' });
      }
    });
  }

  public joinRoom(roomCode: string, playerName: string): Promise<{ success: boolean; roomCode?: string; state?: RoomSanitizedState; error?: string }> {
    const s = this.getSocket();
    return new Promise((resolve) => {
      try {
        s.emit('room:join', { roomCode, playerName }, (res: { success: boolean; roomCode?: string; state?: RoomSanitizedState; error?: string }) => {
          if (res?.success && res.roomCode) this.activeRoom = { roomCode: res.roomCode, playerName };
          resolve(res || { success: false, error: 'Empty server response' });
        });
      } catch {
        resolve({ success: false, error: 'Could not connect to multiplayer server.' });
      }
    });
  }

  public updateSettings(overs: number, wickets: number) {
    try {
      this.getSocket().emit('room:update_settings', { overs, wickets });
    } catch {
      // ignore
    }
  }

  public startToss() {
    try {
      this.getSocket().emit('room:start_toss');
    } catch {
      // ignore
    }
  }

  public callToss(call: 'heads' | 'tails') {
    try {
      this.getSocket().emit('room:call_toss', { call });
    } catch {
      // ignore
    }
  }

  public tossDecision(decision: 'bat' | 'bowl') {
    try {
      this.getSocket().emit('room:toss_decision', { decision });
    } catch {
      // ignore
    }
  }

  public pickNumber(pick: number, ballNumber: number): Promise<{ success: boolean; error?: string }> {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      if (!socket.connected) {
        resolve({ success: false, error: 'Connection lost. Please wait for reconnection and try again.' });
        return;
      }

      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve({ success: false, error: 'The server did not confirm your move. Check your connection before trying again.' });
      }, 6000);

      try {
        socket.emit('room:pick_number', { pick, ballNumber }, (response: { success: boolean; error?: string }) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          resolve(response || { success: false, error: 'The server returned an empty response.' });
        });
      } catch {
        clearTimeout(timeout);
        settled = true;
        resolve({ success: false, error: 'Could not send your move. Please check your connection.' });
      }
    });
  }

  public startInnings2() {
    try {
      this.getSocket().emit('room:start_innings_2');
    } catch {
      // ignore
    }
  }

  public requestRematch() {
    try {
      this.getSocket().emit('room:request_rematch');
    } catch {
      // ignore
    }
  }
}

export const socketService = new SocketService();
