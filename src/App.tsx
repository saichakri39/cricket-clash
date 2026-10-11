import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { StadiumBackground } from './components/StadiumBackground';
import { RulesModal } from './components/RulesModal';
import { LandingScreen } from './components/LandingScreen';
import { PlayerSetupScreen } from './components/PlayerSetupScreen';
import { MatchSettingsScreen } from './components/MatchSettingsScreen';
import { RoomLobbyScreen } from './components/RoomLobbyScreen';
import { TossScreen } from './components/TossScreen';
import { MatchScoreboard } from './components/MatchScoreboard';
import { NumberSelection } from './components/NumberSelection';
import { BallOutcomeBanner } from './components/BallOutcomeBanner';
import { InningsBreakScreen } from './components/InningsBreakScreen';
import { ResultScreen } from './components/ResultScreen';

import {
  GameMode,
  AIDifficulty,
  MatchSettings,
  AppScreen,
  InningsState,
  BallRecord,
  RoomSanitizedState,
} from './types/game';
import { BotProfile, getRandomBot, computeAIChoice } from './utils/ai';
import { soundManager } from './utils/sound';
import { socketService } from './services/socket';
import { safeGetStorage } from './utils/storage';

export default function App() {
  // Navigation & Modal State
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('landing');
  const [showRules, setShowRules] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('vs_computer');

  // Player & Opponent State
  const [playerName, setPlayerName] = useState(() => {
    return safeGetStorage('cricket_clash_player_name', 'Striker');
  });
  const [playerAvatar, setPlayerAvatar] = useState(1);
  const [botProfile, setBotProfile] = useState<BotProfile>(() => getRandomBot('medium'));
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');

  // Match Configuration
  const [matchSettings, setMatchSettings] = useState<MatchSettings>({
    overs: 2,
    wickets: 3,
  });

  // Solo Play Match In-memory State
  const [soloTossWinner, setSoloTossWinner] = useState<'user' | 'bot' | null>(null);
  const [soloTossDecision, setSoloTossDecision] = useState<'bat' | 'bowl' | null>(null);
  const [currentInningsNum, setCurrentInningsNum] = useState<1 | 2>(1);
  const [soloInnings1, setSoloInnings1] = useState<InningsState | null>(null);
  const [soloInnings2, setSoloInnings2] = useState<InningsState | null>(null);
  const [soloSelectedNumber, setSoloSelectedNumber] = useState<number | null>(null);
  const [isProcessingBall, setIsProcessingBall] = useState(false);
  const [soloLastBallResult, setSoloLastBallResult] = useState<{
    batterPick: number;
    bowlerPick: number;
    isOut: boolean;
    runs: number;
    batterName: string;
    bowlerName: string;
  } | null>(null);
  const [soloWinner, setSoloWinner] = useState<string | 'tie' | null>(null);
  const [soloWinReason, setSoloWinReason] = useState<string>('');

  // Multiplayer State
  const [multiplayerRoomCode, setMultiplayerRoomCode] = useState<string>('');
  const [multiplayerRoomState, setMultiplayerRoomState] = useState<RoomSanitizedState | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [multiplayerError, setMultiplayerError] = useState<string>('');
  const [initialUrlRoomCode, setInitialUrlRoomCode] = useState<string>('');

  // Check URL query for invited room code on mount (e.g. ?room=CRIC77)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        const clean = roomParam.trim().toUpperCase();
        setInitialUrlRoomCode(clean);
        setGameMode('online_friend');
        setCurrentScreen('player_setup');
      }
    }
  }, []);

  // Socket Connection & State listener setup
  useEffect(() => {
    const unsubConnection = socketService.subscribeConnection((connected) => {
      setSocketConnected(connected);
    });

    const unsubState = socketService.subscribeState((newState) => {
      setMultiplayerRoomState(newState);

      // Synchronize screen with server-authoritative phase
      if (gameMode === 'online_friend') {
        const socketId = socketService.getSocket().id;
        const isHost = newState.hostId === socketId;

        if (newState.phase === 'lobby') {
          setCurrentScreen('room_lobby');
        } else if (newState.phase === 'settings') {
          if (isHost) {
            setCurrentScreen('match_settings');
          } else {
            setCurrentScreen('room_lobby');
          }
        } else if (newState.phase === 'toss' || newState.phase === 'toss_decision') {
          setCurrentScreen('toss');
        } else if (newState.phase === 'innings_1' || newState.phase === 'innings_2') {
          setCurrentScreen('match');
        } else if (newState.phase === 'innings_break') {
          setCurrentScreen('innings_break');
        } else if (newState.phase === 'match_over') {
          setCurrentScreen('result');
        }
      }
    });

    return () => {
      unsubConnection();
      unsubState();
    };
  }, [gameMode]);

  // Navigate to Home
  const handleGoHome = useCallback(() => {
    socketService.clearRoomSession();
    setCurrentScreen('landing');
    setSoloInnings1(null);
    setSoloInnings2(null);
    setSoloLastBallResult(null);
    setSoloSelectedNumber(null);
    setSoloWinner(null);
    setMultiplayerRoomCode('');
    setMultiplayerRoomState(null);
  }, []);

  // Mode Selection from Landing
  const handleSelectMode = (mode: GameMode) => {
    setGameMode(mode);
    setCurrentScreen('player_setup');
  };

  // VS Computer Setup Complete -> Go to Match Settings
  const handleSetupVsComputer = (
    name: string,
    diff: AIDifficulty,
    bot: BotProfile,
    avatar: number
  ) => {
    setPlayerName(name);
    setDifficulty(diff);
    setBotProfile(bot);
    setPlayerAvatar(avatar);
    setCurrentScreen('match_settings');
  };

  // Multiplayer: Create Room
  const handleCreateRoom = async (name: string, avatar: number) => {
    setPlayerName(name);
    setPlayerAvatar(avatar);
    setMultiplayerError('');

    const res = await socketService.createRoom(name);
    if (res.success && res.roomCode && res.state) {
      setMultiplayerRoomCode(res.roomCode);
      setMultiplayerRoomState(res.state);
      setCurrentScreen('room_lobby');
    } else {
      setMultiplayerError(res.error || 'Failed to create room.');
    }
  };

  // Multiplayer: Join Room
  const handleJoinRoom = async (name: string, roomCode: string, avatar: number) => {
    setPlayerName(name);
    setPlayerAvatar(avatar);
    setMultiplayerError('');

    const res = await socketService.joinRoom(roomCode, name);
    if (res.success && res.roomCode && res.state) {
      setMultiplayerRoomCode(res.roomCode);
      setMultiplayerRoomState(res.state);
      setCurrentScreen('room_lobby');
    } else {
      setMultiplayerError(res.error || 'Failed to join room.');
    }
  };

  // Confirm Match Settings (Overs & Wickets) -> Proceed to Toss
  const handleConfirmSettings = (settings: MatchSettings) => {
    setMatchSettings(settings);

    if (gameMode === 'vs_computer') {
      setCurrentScreen('toss');
    } else {
      socketService.updateSettings(settings.overs, settings.wickets);
      socketService.startToss();
    }
  };

  // Toss: Computer Mode Decision
  const handleCoinFlippedVsComputer = (call: 'heads' | 'tails') => {
    // local toss handles spin
  };

  const handleTossDecisionVsComputer = (winner: 'player1' | 'player2', decision: 'bat' | 'bowl') => {
    setSoloTossWinner(winner === 'player1' ? 'user' : 'bot');
    setSoloTossDecision(decision);

    // If winner is player1 & decision is 'bat', player1 bats first.
    // If winner is player1 & decision is 'bowl', player2 bats first.
    // If winner is player2 & decision is 'bat', player2 bats first.
    // If winner is player2 & decision is 'bowl', player1 bats first.
    const userBatsFirst =
      (winner === 'player1' && decision === 'bat') ||
      (winner === 'player2' && decision === 'bowl');

    const batterId = userBatsFirst ? 'player1' : 'player2';
    const bowlerId = userBatsFirst ? 'player2' : 'player1';

    const firstInnings: InningsState = {
      batterId,
      bowlerId,
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      ballHistory: [],
      isComplete: false,
    };

    setSoloInnings1(firstInnings);
    setSoloInnings2(null);
    setCurrentInningsNum(1);
    setSoloLastBallResult(null);
    setSoloSelectedNumber(null);
    setIsProcessingBall(false);

    setTimeout(() => {
      setCurrentScreen('match');
    }, 1200);
  };

  // Solo Play: Pick Number Action
  const handlePickNumberVsComputer = (playerPick: number) => {
    if (isProcessingBall || soloSelectedNumber !== null) return;
    setSoloSelectedNumber(playerPick);
    setIsProcessingBall(true);

    const activeInnings = currentInningsNum === 1 ? soloInnings1 : soloInnings2;
    if (!activeInnings) return;

    const isUserBatting = activeInnings.batterId === 'player1';
    const roleForBot: 'bat' | 'bowl' = isUserBatting ? 'bowl' : 'bat';

    // AI computes choice based on difficulty & historical patterns
    const botChoice = computeAIChoice({
      role: roleForBot,
      difficulty,
      innings: activeInnings,
      target: currentInningsNum === 2 ? (soloInnings1?.runs || 0) + 1 : undefined,
      totalOvers: matchSettings.overs,
      totalWickets: matchSettings.wickets,
      humanRecentPicks: activeInnings.ballHistory.map(b =>
        isUserBatting ? b.batterPick : b.bowlerPick
      ),
    });

    const batterPick = isUserBatting ? playerPick : botChoice;
    const bowlerPick = isUserBatting ? botChoice : playerPick;
    const batterName = isUserBatting ? playerName : botProfile.name;
    const bowlerName = isUserBatting ? botProfile.name : playerName;

    // Simulate natural simultaneous delivery reveal (450ms)
    setTimeout(() => {
      const isOut = batterPick === bowlerPick;
      const runsScored = isOut ? 0 : batterPick;

      if (isOut) {
        soundManager.playWicket();
      } else if (runsScored === 4 || runsScored === 6) {
        soundManager.playBoundary(runsScored === 6);
      } else {
        soundManager.playBatHit();
      }

      const nextLegalBalls = activeInnings.legalBalls + 1;
      const nextRuns = isOut ? activeInnings.runs : activeInnings.runs + runsScored;
      const nextWickets = isOut ? activeInnings.wickets + 1 : activeInnings.wickets;

      const oversStr = `${Math.floor(nextLegalBalls / 6)}.${nextLegalBalls % 6}`;
      const newRecord: BallRecord = {
        ballNumber: nextLegalBalls,
        overStr: oversStr,
        batterId: activeInnings.batterId,
        bowlerId: activeInnings.bowlerId,
        batterPick,
        bowlerPick,
        isOut,
        runs: runsScored,
        scoreAfter: nextRuns,
        wicketsAfter: nextWickets,
      };

      const updatedInnings: InningsState = {
        ...activeInnings,
        runs: nextRuns,
        wickets: nextWickets,
        legalBalls: nextLegalBalls,
        ballHistory: [...activeInnings.ballHistory, newRecord],
      };

      setSoloLastBallResult({
        batterPick,
        bowlerPick,
        isOut,
        runs: runsScored,
        batterName,
        bowlerName,
      });

      const maxBalls = matchSettings.overs * 6;
      const allOut = nextWickets >= matchSettings.wickets;
      const oversFinished = nextLegalBalls >= maxBalls;

      if (currentInningsNum === 1) {
        setSoloInnings1(updatedInnings);

        if (allOut || oversFinished) {
          updatedInnings.isComplete = true;
          setSoloInnings1(updatedInnings);
          setTimeout(() => {
            setCurrentScreen('innings_break');
            setSoloSelectedNumber(null);
            setIsProcessingBall(false);
          }, 1800);
        } else {
          setSoloSelectedNumber(null);
          setIsProcessingBall(false);
        }
      } else {
        // Innings 2 (Chase)
        setSoloInnings2(updatedInnings);
        const target = (soloInnings1?.runs || 0) + 1;
        const targetReached = nextRuns >= target;

        if (targetReached || allOut || oversFinished) {
          updatedInnings.isComplete = true;
          setSoloInnings2(updatedInnings);

          // Calculate winner
          let winId = '';
          let reason = '';
          const inn1Runs = soloInnings1?.runs || 0;

          if (targetReached) {
            winId = updatedInnings.batterId;
            const wicketsLeft = matchSettings.wickets - nextWickets;
            reason = `${updatedInnings.batterId === 'player1' ? playerName : botProfile.name} won by ${wicketsLeft} wicket${wicketsLeft === 1 ? '' : 's'}!`;
          } else if (nextRuns > inn1Runs) {
            winId = updatedInnings.batterId;
            reason = `${updatedInnings.batterId === 'player1' ? playerName : botProfile.name} won by ${matchSettings.wickets - nextWickets} wickets!`;
          } else if (nextRuns < inn1Runs) {
            winId = soloInnings1!.batterId;
            const diff = inn1Runs - nextRuns;
            reason = `${soloInnings1!.batterId === 'player1' ? playerName : botProfile.name} won by ${diff} run${diff === 1 ? '' : 's'}!`;
          } else {
            winId = 'tie';
            reason = 'Match tied in a breathtaking thriller!';
          }

          setSoloWinner(winId);
          setSoloWinReason(reason);

          setTimeout(() => {
            setCurrentScreen('result');
            setSoloSelectedNumber(null);
            setIsProcessingBall(false);
          }, 2000);
        } else {
          setSoloSelectedNumber(null);
          setIsProcessingBall(false);
        }
      }
    }, 500);
  };

  // Solo Play: Start Innings 2 from Break
  const handleStartSoloInnings2 = () => {
    if (!soloInnings1) return;
    const newBatterId = soloInnings1.bowlerId;
    const newBowlerId = soloInnings1.batterId;

    const secondInnings: InningsState = {
      batterId: newBatterId,
      bowlerId: newBowlerId,
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      ballHistory: [],
      isComplete: false,
    };

    setSoloInnings2(secondInnings);
    setCurrentInningsNum(2);
    setSoloLastBallResult(null);
    setSoloSelectedNumber(null);
    setIsProcessingBall(false);
    setCurrentScreen('match');
  };

  // Solo Play: Play Again
  const handleSoloPlayAgain = () => {
    setSoloInnings1(null);
    setSoloInnings2(null);
    setCurrentInningsNum(1);
    setSoloTossWinner(null);
    setSoloTossDecision(null);
    setSoloLastBallResult(null);
    setSoloSelectedNumber(null);
    setSoloWinner(null);
    setSoloWinReason('');
    setCurrentScreen('match_settings');
  };

  // Multiplayer Actions
  const handleMultiplayerPickNumber = async (pick: number) => {
    setMultiplayerError('');
    const currentBallNumber = multiplayerRoomState?.phase === 'innings_2'
      ? multiplayerRoomState.innings2?.legalBalls
      : multiplayerRoomState?.innings1?.legalBalls;

    if (currentBallNumber === undefined || currentBallNumber === null) {
      setMultiplayerError('The match is synchronizing. Please try again in a moment.');
      return;
    }

    const response = await socketService.pickNumber(pick, currentBallNumber);
    if (!response.success) setMultiplayerError(response.error || 'Your move could not be sent. Please try again.');
  };

  const currentSocketId = socketService.getSocket().id || '';
  const isHost = multiplayerRoomState?.hostId === currentSocketId;

  // Determine active match parameters
  const isMultiplayer = gameMode === 'online_friend';

  // Current innings state depending on mode
  let activeInningsState: InningsState | null = null;
  let activeInningsNumber: 1 | 2 = 1;
  let activeBatterName = '';
  let activeBowlerName = '';
  let activeBatterAvatar = 1;
  let activeBowlerAvatar = 2;
  let isUserBatting = true;
  let currentTarget: number | undefined = undefined;

  if (isMultiplayer && multiplayerRoomState) {
    const p1Id = multiplayerRoomState.playerOrder[0];
    const p2Id = multiplayerRoomState.playerOrder[1];

    if (multiplayerRoomState.phase === 'innings_2') {
      activeInningsState = multiplayerRoomState.innings2;
      activeInningsNumber = 2;
      currentTarget = (multiplayerRoomState.innings1?.runs || 0) + 1;
    } else {
      activeInningsState = multiplayerRoomState.innings1;
      activeInningsNumber = 1;
    }

    if (activeInningsState) {
      activeBatterName = multiplayerRoomState.players[activeInningsState.batterId]?.name || 'Batter';
      activeBowlerName = multiplayerRoomState.players[activeInningsState.bowlerId]?.name || 'Bowler';
      activeBatterAvatar = multiplayerRoomState.players[activeInningsState.batterId]?.avatarSeed || 1;
      activeBowlerAvatar = multiplayerRoomState.players[activeInningsState.bowlerId]?.avatarSeed || 2;
      isUserBatting = activeInningsState.batterId === currentSocketId;
    }
  } else {
    // Solo vs Computer
    activeInningsNumber = currentInningsNum;
    activeInningsState = currentInningsNum === 1 ? soloInnings1 : soloInnings2;

    if (activeInningsState) {
      const batterIsUser = activeInningsState.batterId === 'player1';
      activeBatterName = batterIsUser ? playerName : botProfile.name;
      activeBowlerName = batterIsUser ? botProfile.name : playerName;
      activeBatterAvatar = batterIsUser ? playerAvatar : botProfile.avatarSeed;
      activeBowlerAvatar = batterIsUser ? botProfile.avatarSeed : playerAvatar;
      isUserBatting = batterIsUser;

      if (currentInningsNum === 2 && soloInnings1) {
        currentTarget = soloInnings1.runs + 1;
      }
    }
  }

  // Multiplayer mask & lock state
  const myMultiplayerPick = isMultiplayer && multiplayerRoomState && currentSocketId
    ? multiplayerRoomState.maskedPicks[currentSocketId]?.value
    : null;
  const opponentHasLocked = isMultiplayer && multiplayerRoomState && currentSocketId
    ? multiplayerRoomState.playerOrder.some(
        pid => pid !== currentSocketId && multiplayerRoomState.maskedPicks[pid]?.hasLocked
      )
    : false;
  const isWaitingForOpponent = isMultiplayer && multiplayerRoomState && currentSocketId
    ? !!multiplayerRoomState.maskedPicks[currentSocketId]?.hasLocked
    : false;

  return (
    <div className="min-h-screen flex flex-col relative stadium-bg selection:bg-lime-400 selection:text-slate-950">
      <StadiumBackground />

      {/* Persistent Global Header */}
      <Header
        onGoHome={handleGoHome}
        onOpenRules={() => setShowRules(true)}
        isMatchActive={currentScreen === 'match' || currentScreen === 'innings_break'}
        onlineConnected={isMultiplayer ? socketConnected : undefined}
        roomCode={isMultiplayer ? multiplayerRoomState?.roomCode : undefined}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4">
        {/* Screen 1: Landing */}
        {currentScreen === 'landing' && (
          <LandingScreen
            onSelectMode={handleSelectMode}
            onOpenRules={() => setShowRules(true)}
          />
        )}

        {/* Screen 2: Player Setup */}
        {currentScreen === 'player_setup' && (
          <PlayerSetupScreen
            gameMode={gameMode}
            initialRoomCode={initialUrlRoomCode}
            onBack={() => setCurrentScreen('landing')}
            onSubmitVsComputer={handleSetupVsComputer}
            onSubmitCreateRoom={handleCreateRoom}
            onSubmitJoinRoom={handleJoinRoom}
          />
        )}

        {/* Screen 3: Match Settings */}
        {currentScreen === 'match_settings' && (
          <MatchSettingsScreen
            initialSettings={matchSettings}
            player1Name={playerName}
            player2Name={gameMode === 'vs_computer' ? botProfile.name : (multiplayerRoomState?.playerOrder[1] && multiplayerRoomState.players[multiplayerRoomState.playerOrder[1]]?.name) || 'Friend'}
            isHost={!isMultiplayer || isHost}
            onBack={() => setCurrentScreen('player_setup')}
            onConfirmSettings={handleConfirmSettings}
          />
        )}

        {/* Room Lobby Screen for Multiplayer */}
        {currentScreen === 'room_lobby' && multiplayerRoomState && (
          <RoomLobbyScreen
            roomState={multiplayerRoomState}
            currentUserId={currentSocketId}
            onLeaveRoom={handleGoHome}
            onHostProceed={() => setCurrentScreen('match_settings')}
          />
        )}

        {/* Screen 4: Toss */}
        {currentScreen === 'toss' && (
          <TossScreen
            player1Name={playerName}
            player2Name={
              isMultiplayer
                ? (multiplayerRoomState?.playerOrder[1] &&
                    multiplayerRoomState.players[multiplayerRoomState.playerOrder[1]]?.name) ||
                  'Player 2'
                : botProfile.name
            }
            player1Avatar={playerAvatar}
            player2Avatar={
              isMultiplayer
                ? (multiplayerRoomState?.playerOrder[1] &&
                    multiplayerRoomState.players[multiplayerRoomState.playerOrder[1]]?.avatarSeed) ||
                  2
                : botProfile.avatarSeed
            }
            isComputerMode={!isMultiplayer}
            tossInfo={multiplayerRoomState?.toss}
            isHost={isHost}
            currentUserId={currentSocketId}
            onCoinFlippedVsComputer={handleCoinFlippedVsComputer}
            onTossDecisionVsComputer={handleTossDecisionVsComputer}
            onCallTossMultiplayer={(call) => socketService.callToss(call)}
            onTossDecisionMultiplayer={(decision) => socketService.tossDecision(decision)}
          />
        )}

        {/* Screen 5: Match */}
        {currentScreen === 'match' && activeInningsState && (
          <div className="w-full flex flex-col items-center justify-center space-y-4 py-2">
            {/* Real-time Stadium Scoreboard */}
            <MatchScoreboard
              innings={activeInningsState}
              inningsNumber={activeInningsNumber}
              settings={isMultiplayer ? multiplayerRoomState!.settings : matchSettings}
              batterName={activeBatterName}
              bowlerName={activeBowlerName}
              batterAvatar={activeBatterAvatar}
              bowlerAvatar={activeBowlerAvatar}
              target={currentTarget}
              isUserBatting={isUserBatting}
            />

            {/* Ball Outcome Visual Banner */}
            {isMultiplayer ? (
              multiplayerRoomState?.lastBallResult && (
                <BallOutcomeBanner
                  result={{
                    batterPick: multiplayerRoomState.lastBallResult.batterPick,
                    bowlerPick: multiplayerRoomState.lastBallResult.bowlerPick,
                    isOut: multiplayerRoomState.lastBallResult.isOut,
                    runs: multiplayerRoomState.lastBallResult.runs,
                    batterName: multiplayerRoomState.players[multiplayerRoomState.lastBallResult.batterId]?.name || 'Batter',
                    bowlerName: multiplayerRoomState.players[multiplayerRoomState.lastBallResult.bowlerId]?.name || 'Bowler',
                  }}
                />
              )
            ) : (
              soloLastBallResult && <BallOutcomeBanner result={soloLastBallResult} />
            )}

            {isMultiplayer && multiplayerError && (
              <div role="alert" className="w-full max-w-3xl rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {multiplayerError}
              </div>
            )}

            {/* Hand Cricket Number Selector (1..6) */}
            <NumberSelection
              onPickNumber={isMultiplayer ? handleMultiplayerPickNumber : handlePickNumberVsComputer}
              disabled={isMultiplayer ? false : isProcessingBall}
              selectedNumber={isMultiplayer ? (myMultiplayerPick ?? null) : soloSelectedNumber}
              isUserBatting={isUserBatting}
              opponentHasLocked={opponentHasLocked}
              isWaitingForOpponent={isWaitingForOpponent}
            />
          </div>
        )}

        {/* Screen 6: Innings Break */}
        {currentScreen === 'innings_break' && (
          <InningsBreakScreen
            innings1={isMultiplayer ? multiplayerRoomState!.innings1! : soloInnings1!}
            settings={isMultiplayer ? multiplayerRoomState!.settings : matchSettings}
            batter1Name={
              isMultiplayer
                ? multiplayerRoomState!.players[multiplayerRoomState!.innings1!.batterId]?.name || 'Player 1'
                : soloInnings1?.batterId === 'player1'
                ? playerName
                : botProfile.name
            }
            batter2Name={
              isMultiplayer
                ? multiplayerRoomState!.players[multiplayerRoomState!.innings1!.bowlerId]?.name || 'Player 2'
                : soloInnings1?.batterId === 'player1'
                ? botProfile.name
                : playerName
            }
            batter1Avatar={
              isMultiplayer
                ? multiplayerRoomState!.players[multiplayerRoomState!.innings1!.batterId]?.avatarSeed || 1
                : soloInnings1?.batterId === 'player1'
                ? playerAvatar
                : botProfile.avatarSeed
            }
            batter2Avatar={
              isMultiplayer
                ? multiplayerRoomState!.players[multiplayerRoomState!.innings1!.bowlerId]?.avatarSeed || 2
                : soloInnings1?.batterId === 'player1'
                ? botProfile.avatarSeed
                : playerAvatar
            }
            isHost={!isMultiplayer || isHost}
            onContinue={isMultiplayer ? () => socketService.startInnings2() : handleStartSoloInnings2}
          />
        )}

        {/* Screen 7: Result */}
        {currentScreen === 'result' && (
          <ResultScreen
            innings1={isMultiplayer ? multiplayerRoomState!.innings1! : soloInnings1!}
            innings2={isMultiplayer ? multiplayerRoomState!.innings2! : soloInnings2!}
            settings={isMultiplayer ? multiplayerRoomState!.settings : matchSettings}
            player1Name={playerName}
            player2Name={
              isMultiplayer
                ? (multiplayerRoomState?.playerOrder[1] &&
                    multiplayerRoomState.players[multiplayerRoomState.playerOrder[1]]?.name) ||
                  'Friend'
                : botProfile.name
            }
            player1Avatar={playerAvatar}
            player2Avatar={
              isMultiplayer
                ? (multiplayerRoomState?.playerOrder[1] &&
                    multiplayerRoomState.players[multiplayerRoomState.playerOrder[1]]?.avatarSeed) ||
                  2
                : botProfile.avatarSeed
            }
            winnerId={isMultiplayer ? multiplayerRoomState?.winnerId : (soloWinner || undefined)}
            winReason={isMultiplayer ? multiplayerRoomState?.winReason : soloWinReason}
            currentUserId={isMultiplayer ? currentSocketId : 'player1'}
            isComputerMode={!isMultiplayer}
            onPlayAgain={
              isMultiplayer
                ? () => socketService.requestRematch()
                : handleSoloPlayAgain
            }
            onReturnHome={handleGoHome}
            rematchRequested={isMultiplayer && currentSocketId ? !!multiplayerRoomState?.rematchVotes[currentSocketId] : false}
          />
        )}
      </main>

      {/* Rules Modal */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}
