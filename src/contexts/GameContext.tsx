import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import React, { createContext, useContext, useEffect, useState } from "react";

type SetResultInput = {
    currentServer: "A1" | "A2" | "B1" | "B2" | null;
    currentReceiver?: "A1" | "A2" | "B1" | "B2" | null;
    firstServer?: "A1" | "A2" | "B1" | "B2" | null;
    firstReceiver?: "A1" | "A2" | "B1" | "B2" | null;
    aScore: number;
    bScore: number;
    lastTeamScored: string | null;
    currentRound: number;
    scoresheet?: Array<{
        aSwitch: boolean;
        bSwitch: boolean;
        currentAScore: number;
        currentBScore: number;
        scoredAt: Date;
        scorer: string | null;
        nextServe: string | null;
        toServe: string | null;
        receiver?: string | null;
    }>;
    switchSide?: boolean;
};

const UPDATE_SET_RESULT = gql`
  mutation UpdateSetResult(
    $gameId: ID!
    $setNumber: Int!
    $input: SetInput!
    $currentPlayingSet: Int
  ) {
    updateSetResult(
      gameId: $gameId
      setNumber: $setNumber
      input: $input
      currentPlayingSet: $currentPlayingSet
    ) {
      _id
      sets {
        aScore
        bScore
        lastTeamScored
        currentRound
        currentServer
        currentReceiver
        firstServer
        firstReceiver
        scoresheet {
          aSwitch
          bSwitch
          currentAScore
          currentBScore
          scoredAt
          scorer
          nextServe
          toServe
          receiver
        }
      }
      currentPlayingSet
    }
  }
`;

const UPDATE_PLAYERS = gql`
  mutation UpdatePlayers($gameId: ID!, $players: UpdatePlayersInput!) {
    updatePlayers(gameId: $gameId, players: $players) {
      _id
      players {
        A1
        A2
        B1
        B2
      }
    }
  }
`;

const UPDATE_GAME = gql`
  mutation UpdateGame($input: UpdateGameInput!) {
    updateGame(input: $input) {
      _id
      showOnTV
      status
      start
      end
    }
  }
`;

const HIDE_GAMES_FROM_TV = gql`
  mutation HideAllGamesFromTV($courtId: ID) {
    hideAllGamesFromTV(courtId: $courtId)
  }
`;

interface GameState {
    time: number;
    isRunning: boolean;
    teamAScore: number;
    teamBScore: number;
    teamAFinalScore: number;
    teamBFinalScore: number;
    noOfSets: number;
    gameStarted: boolean;
    gamePhase: "server-selection" | "receiver-selection" | "playing" | "finished";
    selectedServer: string | null;
    status: "PENDING" | "PLAYING" | "COMPLETED";
    selectedReceiver: string | null;
    playerRoles: {
        a1: "server" | "receiver" | null;
        a2: "server" | "receiver" | null;
        b1: "server" | "receiver" | null;
        b2: "server" | "receiver" | null;
    };
    players: {
        a1: string;
        a2: string;
        b1: string;
        b2: string;
    };
    originalPlayers: {
        a1: string;
        a2: string;
        b1: string;
        b2: string;
    };
    swappedPlayers: {
        a1: boolean;
        a2: boolean;
        b1: boolean;
        b2: boolean;
    };
    lastScorer: string | null;
    serveCount: number;
    teamAColor: string;
    teamBColor: string;
    teamA: string;
    teamB: string;
    isSingles: boolean;
    currentSet: number;
    sets: Array<{
        aScore: number;
        bScore: number;
        currentAScore: number;
        currentBScore: number;
        currentRound?: number;
        switchSide?: boolean;
        lastTeamScored?: string | null;
        currentServer: "A1" | "A2" | "B1" | "B2" | null;
        currentReceiver: "A1" | "A2" | "B1" | "B2" | null;
        gamePhase:
        | "server-selection"
        | "receiver-selection"
        | "playing"
        | "finished";
        selectedServer: string | null;
        selectedReceiver: string | null;
        playerRoles: {
            a1: "server" | "receiver" | null;
            a2: "server" | "receiver" | null;
            b1: "server" | "receiver" | null;
            b2: "server" | "receiver" | null;
        };
        time: number;
        isRunning: boolean;
        scoresheet: Array<{
            aSwitch: boolean;
            bSwitch: boolean;
            currentAScore: number;
            currentBScore: number;
            scoredAt: Date;
            scorer: string | null;
            nextServe: string | null;
            toServe: string | null;
        }>;
    }>;
    max: number;
    plusTwo: boolean;
    plusTwoMax: number;
    plusTwoNoLimit: boolean;
    originalTeamAColor: string;
    originalTeamBColor: string;
    originalTeamA: string;
    originalTeamB: string;
    // sidesSwitched: boolean;
    serverPosition: "left" | "right";
    currentPlayingSet: number;
    showOnTV: boolean;
}

interface GamesState {
    [gameId: string]: GameState;
}
type PlayerRole = "server" | "receiver" | null;
type PlayerRoles = {
    a1: PlayerRole;
    a2: PlayerRole;
    b1: PlayerRole;
    b2: PlayerRole;
};

interface GameContextType {
    gamesState: GamesState;
    startTimer: (gameId: string) => void;
    pauseTimer: (gameId: string) => void;
    resetTimer: (gameId: string) => void;
    hideAllGamesFromTV: (courtId: string) => Promise<void>;
    updateScore: (
        gameId: string,
        team: "teamA" | "teamB",
        newScore: number
    ) => void;
    initializeGame: (
        gameId: string,
        players: { a1: string; a2?: string; b1: string; b2?: string },
        noOfSets: number,
        maxScore?: number,
        plusTwo?: boolean,
        plusTwoMax?: number,
        plusTwoNoLimit?: boolean
    ) => void;
    setGameStarted: (gameId: string, started: boolean) => void;
    setGamePhase: (gameId: string, phase: GameState["gamePhase"]) => void;
    setSelectedServer: (gameId: string, server: string | null) => void;
    setSelectedReceiver: (gameId: string, receiver: string | null) => void;
    setPlayerRoles: (gameId: string, roles: GameState["playerRoles"]) => void;
    swapTeamAPlayers: (gameId: string) => void;
    swapTeamBPlayers: (gameId: string) => void;
    setPlayers: (gameId: string, players: GameState["players"]) => void;
    swapTeams: (gameId: string) => void;
    undoAction: (gameId: string) => void;
    canUndo: (gameId: string) => boolean;
    setCurrentSet: (gameId: string, setNumber: number) => void;
    updateState: (gameId: string, newState: Partial<GameState>) => void;
    setShowOnTV: (gameId: string, showOnTV: boolean) => void;
    finishGame: (gameId: string, showOnTV: boolean) => void;
    updatePlayerNames: (
        gameId: string,
        players: { a1: string; a2: string; b1: string; b2: string },
        originalPlayers: { a1: string; a2: string; b1: string; b2: string }
    ) => void;
    updateGameSetResult: (
        gameId: string,
        setNumber: number,
        setResult: SetResultInput
    ) => Promise<void>;
    updatePlayers: (variables: {
        gameId: string;
        players: {
            A1: string;
            A2: string;
            B1: string;
            B2: string;
        };
    }) => Promise<any>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [gamesState, setGamesState] = useState<GamesState>({});
    const [updateGame] = useMutation(UPDATE_GAME);
    const [gameHistory, setGameHistory] = useState<{
        [gameId: string]: GameState[];
    }>({});

    const setCurrentSet = async (gameId: string, setNumber: number) => {
        try {
            console.log('[setCurrentSet] Starting - gameId:', gameId, 'setNumber:', setNumber);

            setGamesState(prev => {
                const currentState = prev[gameId];
                if (!currentState) return prev;

                console.log('[setCurrentSet] Current state:', {
                    currentSet: currentState.currentSet,
                    currentPlayingSet: currentState.currentPlayingSet,
                    noOfSets: currentState.noOfSets
                });

                // Validate set number
                if (setNumber < 1 || setNumber > currentState.noOfSets) {
                    console.error(`[setCurrentSet] Invalid set number: ${setNumber}`);
                    return prev;
                }

                // Don't do anything if we're already on this set
                if (setNumber === currentState.currentSet) {
                    console.log('[setCurrentSet] Already on set', setNumber, '- skipping');
                    return prev;
                }

                console.log(`[setCurrentSet] Switching from Set ${currentState.currentSet} to Set ${setNumber}`);

                // Save current set state before switching
                const updatedSets = [...currentState.sets];
                const currentSetIndex = currentState.currentSet - 1;


                console.log('[setCurrentSet] Saving current set', currentState.currentSet, 'state:', {
                    teamAScore: currentState.teamAScore,
                    teamBScore: currentState.teamBScore,
                    gamePhase: currentState.gamePhase
                });

                updatedSets[currentSetIndex] = {
                    ...updatedSets[currentSetIndex],
                    currentAScore: currentState.teamAScore,
                    currentBScore: currentState.teamBScore,
                    gamePhase: currentState.gamePhase,
                    selectedServer: currentState.selectedServer,
                    selectedReceiver: currentState.selectedReceiver,
                    playerRoles: currentState.playerRoles,
                    time: currentState.time,
                    isRunning: currentState.isRunning,
                };

                // Get target set data (initialize if doesn't exist)
                const targetSetIndex = setNumber - 1;
                let targetSetData = updatedSets[targetSetIndex];

                if (!targetSetData) {
                    targetSetData = {
                        aScore: 0,
                        bScore: 0,
                        currentAScore: 0,
                        currentBScore: 0,
                        currentServer: null,
                        currentReceiver: null,
                        scoresheet: [],
                        gamePhase: "server-selection",
                        selectedServer: null,
                        selectedReceiver: null,
                        playerRoles: { a1: null, a2: null, b1: null, b2: null },
                        time: currentState.time,
                        isRunning: false,
                    };
                    updatedSets[targetSetIndex] = targetSetData;
                }

                const isSetCompleted = targetSetData.aScore > 0 || targetSetData.bScore > 0;
                console.log('[setCurrentSet] Prepared new state for set', setNumber, ':', {
                    currentSet: setNumber,
                    currentPlayingSet: setNumber,
                    teamAScore: targetSetData.currentAScore,
                    teamBScore: targetSetData.currentBScore,
                    isSetCompleted
                });

                return {
                    ...prev,
                    [gameId]: {
                        ...currentState,
                        currentSet: setNumber,
                        currentPlayingSet: setNumber, // Explicitly set both to the same value
                        teamAScore: targetSetData.currentAScore,
                        teamBScore: targetSetData.currentBScore,
                        // gamePhase: targetSetData.gamePhase,
                        gamePhase: isSetCompleted ? "finished" : targetSetData.gamePhase,
                        // selectedServer: targetSetData.selectedServer,
                        // selectedReceiver: targetSetData.selectedReceiver,
                        // playerRoles: targetSetData.playerRoles,
                        // isRunning: targetSetData.isRunning,
                        selectedServer: isSetCompleted ? null : targetSetData.selectedServer,
                        selectedReceiver: isSetCompleted ? null : targetSetData.selectedReceiver,
                        playerRoles: isSetCompleted
                            ? { a1: null, a2: null, b1: null, b2: null }
                            : targetSetData.playerRoles,
                        isRunning: isSetCompleted ? false : targetSetData.isRunning,
                        time: targetSetData.time,
                        sets: updatedSets,
                    }
                };
            });

            console.log('[setCurrentSet] Updated local state, now updating backend for set', setNumber);

            // Update backend with correct set data
            const targetSetIndex = setNumber - 1;
            const targetSetData = gamesState[gameId]?.sets[targetSetIndex] || {};
            console.log('Updating set with lastTeamScored:', null);
            await updateGameSetResult(gameId, setNumber, {
                currentServer: targetSetData.selectedServer?.toUpperCase() as "A1" | "A2" | "B1" | "B2" | null,
                aScore: targetSetData.aScore || 0,
                bScore: targetSetData.bScore || 0,
                lastTeamScored: targetSetData.lastTeamScored || null,
                currentRound: targetSetData.currentRound || 0,
                scoresheet: targetSetData.scoresheet || [],
            });

            console.log('[setCurrentSet] Completed set switch to', setNumber);

        } catch (error) {
            console.error("[setCurrentSet] Failed to switch sets:", error);
        }
    };

    const updatePlayerNames = async (
        gameId: string,
        players: { a1: string; a2: string; b1: string; b2: string },
        originalPlayers: { a1: string; a2: string; b1: string; b2: string }
    ) => {
        try {
            setGamesState((prev: any) => ({
                ...prev,
                [gameId]: {
                    ...prev[gameId],
                    players: {
                        a1: players.a1,
                        a2: players.a2,
                        b1: players.b1,
                        b2: players.b2,
                    },
                    originalPlayers,
                    swappedPlayers: {
                        a1: false,
                        a2: false,
                        b1: false,
                        b2: false,
                    },
                },
            }));

            const result = await updatePlayers({
                variables: {
                    gameId,
                    players: {
                        A1: players.a1,
                        A2: players.a2,
                        B1: players.b1,
                        B2: players.b2,
                    },
                },
            });

            if ((result as any).errors) {
                console.error("Failed to update players:", (result as any).errors);
            }
        } catch (error) {
            console.error("Error updating players:", error);
        }
    };

    const shouldSwitchSides = (
        teamAScore: number,
        teamBScore: number,
        maxScore: number
        // sidesSwitched: boolean
    ) => {
        // if (sidesSwitched) return false;

        const leadingScore = Math.max(teamAScore, teamBScore);
        const switchPoint = Math.ceil(maxScore * 0.5);

        return leadingScore === switchPoint;
    };

    const [updateSetResult] = useMutation(UPDATE_SET_RESULT);
    const [updatePlayers] = useMutation(UPDATE_PLAYERS);
    const [hideGamesFromTV] = useMutation(HIDE_GAMES_FROM_TV);

    const hideAllGamesFromTV = async (courtId: string) => {
        try {
            await hideGamesFromTV({
                variables: { courtId },
            });

            setGamesState((prev) => {
                const updatedState = { ...prev };
                Object.keys(updatedState).forEach((gameId) => {
                    updatedState[gameId].showOnTV = false;
                });
                return updatedState;
            });
        } catch (error) {
            console.error("Error hiding games from TV:", error);
        }
    };

    const initializeGame = (
        gameId: string,
        players: { a1: string; a2?: string; b1: string; b2?: string },
        noOfSets: number,
        maxScore?: number,
        plusTwo: boolean = false,
        plusTwoMax?: number,
        plusTwoNoLimit: boolean = false
    ) => {
        const isSingles = !players.a2 && !players.b2;
        console.log(`Initializing game ${gameId} with plusTwo: ${plusTwo}`, {
            plusTwo,
            plusTwoMax,
        });
        setGamesState((prev) => {
            const isSingles = !players.a2 && !players.b2;
            const validatedNoOfSets = noOfSets === 1 || noOfSets === 3 ? noOfSets : 1;

            return {
                ...prev,
                [gameId]: {
                    time: 0,
                    isRunning: false,
                    teamAScore: 0,
                    teamBScore: 0,
                    teamAFinalScore: 0,
                    teamBFinalScore: 0,
                    gameStarted: false,
                    noOfSets: validatedNoOfSets,
                    status: "PENDING",
                    gamePhase: "server-selection",
                    selectedServer: null,
                    selectedReceiver: null,
                    playerRoles: {
                        a1: null,
                        a2: null,
                        b1: null,
                        b2: null,
                    },
                    // sidesSwitched: false,
                    currentPlayingSet: 1,
                    lastScorer: null,
                    serveCount: 0,
                    isSingles,
                    players: {
                        a1: players.a1 || "",
                        a2: players.a2 || "",
                        b1: players.b1 || "",
                        b2: players.b2 || "",
                    },
                    originalPlayers: {
                        a1: players.a1 || "",
                        a2: players.a2 || "",
                        b1: players.b1 || "",
                        b2: players.b2 || "",
                    },
                    swappedPlayers: {
                        a1: false,
                        a2: false,
                        b1: false,
                        b2: false,
                    },
                    teamAColor: "#ffc067",
                    teamBColor: "#a8dcab",
                    originalTeamAColor: "#ffc067",
                    originalTeamBColor: "#a8dcab",
                    teamA: "Team A",
                    teamB: "Team B",
                    showOnTV: true,
                    originalTeamA: "Team A",
                    originalTeamB: "Team B",
                    currentSet: 1,
                    max: Number(maxScore) || 21,
                    plusTwo: plusTwo,
                    plusTwoMax: plusTwoNoLimit ? 9999 : plusTwoMax || 30,
                    plusTwoNoLimit: plusTwoNoLimit,
                    serverPosition: "right",
                    sets: Array(validatedNoOfSets)
                        .fill(null)
                        .map(() => ({
                            aScore: 0,
                            bScore: 0,
                            currentAScore: 0,
                            currentBScore: 0,
                            currentRound: 0,
                            lastTeamScored: null,
                            currentServer: null,
                            currentReceiver: null,
                            scoresheet: [
                                {
                                    aSwitch: false,
                                    bSwitch: false,
                                    currentAScore: 0,
                                    currentBScore: 0,
                                    scoredAt: new Date(),
                                    scorer: null,
                                    nextServe: null,
                                    toServe: null,
                                },
                            ],
                            gamePhase: "server-selection",
                            selectedServer: null,
                            selectedReceiver: null,
                            playerRoles: {
                                a1: null,
                                a2: null,
                                b1: null,
                                b2: null,
                            },
                            time: 0,
                            isRunning: false,
                        })),
                },
            };
        });
    };

    const updateGameSetResult = async (
        gameId: string,
        setNumber: number,
        setResult: any
    ) => {
        try {
            const result = await updateSetResult({
                variables: {
                    gameId,
                    setNumber,
                    input: {
                        aScore: setResult.aScore,
                        bScore: setResult.bScore,
                        lastTeamScored: setResult.lastTeamScored,
                        currentRound: setResult.currentRound,
                        currentServer: setResult.currentServer,
                        currentReceiver: setResult.currentReceiver,
                        firstServer: setResult.firstServer,
                        firstReceiver: setResult.firstReceiver,
                        scoresheet: setResult.scoresheet?.map(({ __typename, ...rest }: any) => rest),
                        switchSide: setResult.switchSide,
                    },
                    // currentPlayingSet: gamesState[gameId]?.currentPlayingSet || setNumber,
                    currentPlayingSet: setNumber,
                },
            });
            console.log('Updating set result with lastTeamScored:', setResult.lastTeamScored);
            if ((result as any).errors) {
                console.error("Failed to update set result:", (result as any).errors);
            } else if ((result.data as any)?.updateSetResult?.sets) {
                setGamesState((prev) => {
                    const currentState = prev[gameId];
                    if (!currentState) return prev;
                    return {
                        ...prev,
                        [gameId]: {
                            ...currentState,
                            sets: (result.data as any).updateSetResult.sets
                        }
                    };
                });
            }

        } catch (error) {
            console.error("Error updating set result:", error);
        }
    };

    const updateState = (gameId: string, newState: Partial<GameState>) => {
        setGamesState((prev) => {
            const currentState = prev[gameId];
            if (!currentState) return prev;

            console.log("Updating state for game:", gameId);

            if (newState.noOfSets !== undefined) {
                console.log("noOfSets change detected:", {
                    oldValue: currentState.noOfSets,
                    newValue: newState.noOfSets,
                });
            }
            // Start with the current sets array
            let updatedSets = [...currentState.sets];
            const currentSetIndex = currentState.currentSet - 1;
            const currentSetData = updatedSets[currentSetIndex] || {};

            // Handle increasing number of sets
            if (
                newState.noOfSets !== undefined &&
                newState.noOfSets !== currentState.noOfSets
            ) {
                if (newState.noOfSets > currentState.sets.length) {
                    // Add new sets if increasing
                    const setsToAdd = newState.noOfSets - currentState.sets.length;
                    for (let i = 0; i < setsToAdd; i++) {
                        updatedSets.push({
                            aScore: 0,
                            bScore: 0,
                            currentAScore: 0,
                            currentBScore: 0,
                            currentRound: 0,
                            lastTeamScored: null,
                            currentServer: null,
                            currentReceiver: null,
                            switchSide: false,
                            scoresheet: [],
                            gamePhase: "server-selection",
                            selectedServer: null,
                            selectedReceiver: null,
                            playerRoles: { a1: null, a2: null, b1: null, b2: null },
                            time: 0,
                            isRunning: false,
                        });
                    }
                } else if (newState.noOfSets < currentState.sets.length) {
                    // Remove sets if decreasing, but keep at least one set
                    updatedSets = updatedSets.slice(0, newState.noOfSets);

                    // Ensure currentSet is within bounds
                    if (currentState.currentSet > newState.noOfSets) {
                        newState.currentSet = newState.noOfSets;
                    }
                }
            }

            // Update the current set data
            updatedSets[currentSetIndex] = {
                ...currentSetData,
                currentAScore:
                    newState.teamAScore !== undefined
                        ? newState.teamAScore
                        : (currentSetData.aScore ?? currentSetData.currentAScore ?? 0),
                currentBScore:
                    newState.teamBScore !== undefined
                        ? newState.teamBScore
                        : (currentSetData.bScore ?? currentSetData.currentBScore ?? 0),
                gamePhase:
                    newState.gamePhase !== undefined
                        ? newState.gamePhase
                        : currentSetData.gamePhase,
                selectedServer:
                    newState.selectedServer !== undefined
                        ? newState.selectedServer
                        : currentSetData.selectedServer,
                selectedReceiver:
                    newState.selectedReceiver !== undefined
                        ? newState.selectedReceiver
                        : currentSetData.selectedReceiver,
                playerRoles:
                    newState.playerRoles !== undefined
                        ? newState.playerRoles
                        : currentSetData.playerRoles,
                time: newState.time !== undefined ? newState.time : currentSetData.time,
                isRunning:
                    newState.isRunning !== undefined
                        ? newState.isRunning
                        : currentSetData.isRunning,
                // lastTeamScored:
                //   newState.sets?.[currentSetIndex]?.lastTeamScored !== undefined
                //     ? newState.sets[currentSetIndex].lastTeamScored
                //     : currentSetData.lastTeamScored,
            };
            console.log("Updating state for game:", gameId, {
                noOfSets: {
                    old: currentState.noOfSets,
                    new: newState.noOfSets,
                },
                setsLength: {
                    old: currentState.sets.length,
                    new: updatedSets.length,
                },
            });
            setGameHistory((prevHistory) => {
                const gameHistoryForId = prevHistory[gameId] || [];
                if (
                    JSON.stringify(currentState) !==
                    JSON.stringify({ ...currentState, ...newState })
                ) {
                    return {
                        ...prevHistory,
                        [gameId]: [...gameHistoryForId, { ...currentState }],
                    };
                }
                return prevHistory;
            });

            return {
                ...prev,
                [gameId]: {
                    ...currentState,
                    ...newState,
                    sets: updatedSets,
                },
            };
        });
    };

    const startTimer = async (gameId: string) => {
        try {
            // Update local state
            setGamesState((prev) => {
                const currentState = prev[gameId];
                if (!currentState) return prev;

                const updatedState = {
                    ...currentState,
                    isRunning: true,
                    gameStarted: true,
                    currentPlayingSet: currentState.currentSet,
                };

                return {
                    ...prev,
                    [gameId]: updatedState,
                };
            });

            await updateGame({
                variables: {
                    input: {
                        _id: gameId,
                        status: "PLAYING",
                        start: new Date().toISOString(),
                    },
                },
            });

            // Update set result is not needed here as it only modifies Game status
        } catch (error) {
            console.error("Error starting game:", error);
        }
    };

    const pauseTimer = (gameId: string) => {
        updateState(gameId, {
            isRunning: false,
        });
    };
    const finishGame = async (gameId: string, showOnTV: boolean) => {
        try {
            pauseTimer(gameId);

            await updateGame({
                variables: {
                    input: {
                        _id: gameId,
                        showOnTV,
                        status: "COMPLETED",
                        end: new Date().toISOString(),
                    },
                },
            });
        } catch (error) {
            console.error("Error finishing game:", error);
            throw error;
        }
    };

    const updateScore = (
        gameId: string,
        team: "teamA" | "teamB",
        newScore: number
    ) => {
        setGamesState((prev) => {
            const currentState = prev[gameId];
            if (!currentState) return prev;

            console.log(
                `Current plusTwo state for game ${gameId}:`,
                currentState.plusTwo
            );
            console.log(
                `Current plusTwoMax state for game ${gameId}:`,
                currentState.plusTwoMax
            );

            // Save current state for undo
            setGameHistory((prevHistory) => {
                const gameHistoryForId = prevHistory[gameId] || [];
                return {
                    ...prevHistory,
                    [gameId]: [...gameHistoryForId, { ...currentState }],
                };
            });

            const maxScore = currentState.max || 21;
            const isOneSet = Number(currentState.noOfSets) === 1;
            const plusTwoEnabled = isOneSet ? true : (currentState.plusTwo || false);
            const plusTwoMax = isOneSet ? 9999 : (currentState.plusTwoMax || 30);
            const plusTwoNoLimit = isOneSet ? true : (currentState.plusTwoNoLimit || false);

            const currentSetIndex = currentState.currentSet - 1;
            const currentSetData = currentState.sets[currentSetIndex];

            if (currentState.isSingles) {
                // ================ SINGLES LOGIC ================
                const currentSetIndex = currentState.currentSet - 1;
                const currentSetData = currentState.sets[currentSetIndex];
                const currentAScore = currentSetData.aScore ?? currentSetData.currentAScore ?? 0;
                const currentBScore = currentSetData.bScore ?? currentSetData.currentBScore ?? 0;

                const isPlusTwoSituation =
                    plusTwoEnabled &&
                    currentAScore >= maxScore - 1 &&
                    currentBScore >= maxScore - 1;

                const shouldIncrement =
                    (!isPlusTwoSituation &&
                        ((team === "teamA" && currentAScore < maxScore) ||
                            (team === "teamB" && currentBScore < maxScore))) ||
                    (isPlusTwoSituation &&
                        currentAScore < plusTwoMax &&
                        currentBScore < plusTwoMax &&
                        Math.abs(currentAScore - currentBScore) < 2);

                const newAScore =
                    team === "teamA" && shouldIncrement
                        ? currentAScore + 1
                        : currentAScore;
                const newBScore =
                    team === "teamB" && shouldIncrement
                        ? currentBScore + 1
                        : currentBScore;

                const updatedTeamAScore =
                    team === "teamA" && shouldIncrement
                        ? currentState.teamAScore + 1
                        : currentState.teamAScore;
                const updatedTeamBScore =
                    team === "teamB" && shouldIncrement
                        ? currentState.teamBScore + 1
                        : currentState.teamBScore;

                let setShouldEnd = false;
                if (plusTwoEnabled) {
                    const leadingScore = Math.max(newAScore, newBScore);
                    const trailingScore = Math.min(newAScore, newBScore);

                    if (leadingScore >= plusTwoMax) {
                        setShouldEnd = true;
                    } else if (
                        leadingScore >= maxScore &&
                        leadingScore >= trailingScore + 2
                    ) {
                        setShouldEnd = true;
                    }
                } else {
                    if (newAScore >= maxScore || newBScore >= maxScore) {
                        setShouldEnd = true;
                    }
                }

                const newSelectedServer = team === "teamA" ? "a1" : "b1";
                const newSelectedReceiver = team === "teamA" ? "b1" : "a1";

                const serverScore =
                    team === "teamA" ? updatedTeamAScore : updatedTeamBScore;
                const newServerPosition = serverScore % 2 === 0 ? "right" : "left";

                const updatedSets = [...currentState.sets];
                const newCurrentRound = (currentSetData.currentRound || 0) + 1;

                const currentServer = newSelectedServer.toUpperCase() as "A1" | "B1";
                const newScoreSheetEntry = {
                    aSwitch: false,
                    bSwitch: false,
                    currentAScore: newAScore,
                    currentBScore: newBScore,
                    scoredAt: new Date(),
                    scorer: currentServer,
                    nextServe: currentServer,
                    toServe: currentServer,
                };

                updatedSets[currentSetIndex] = {
                    ...currentSetData,
                    currentAScore: newAScore,
                    currentBScore: newBScore,
                    currentRound: newCurrentRound,
                    lastTeamScored: team === "teamA" ? "A" : "B",
                    currentServer,
                    scoresheet: [
                        ...(currentSetData.scoresheet || []),
                        newScoreSheetEntry,
                    ],
                };

                const setResult = {
                    currentServer,
                    aScore: newAScore,
                    bScore: newBScore,
                    lastTeamScored: team === "teamA" ? "A" : "B",
                    currentRound: newCurrentRound,
                    // Omit scoresheet to allow the backend to calculate the receiver and server
                };

                if (!setShouldEnd) {
                    updateGameSetResult(gameId, currentSetIndex + 1, {
                        ...setResult,
                        currentPlayingSet: currentState.currentSet,
                    });
                }

                if (setShouldEnd) {
                    const actualWinningTeam = team === "teamA" ? "A" : "B";
                    const displayAScore = updatedSets[currentSetIndex].currentAScore;
                    const displayBScore = updatedSets[currentSetIndex].currentBScore;

                    const setResult = {
                        aScore: displayAScore,
                        bScore: displayBScore,
                        lastTeamScored: actualWinningTeam,
                        // Omit scoresheet to allow the backend to calculate the receiver and server
                        currentRound: newCurrentRound,
                        currentServer: currentState.selectedServer?.toUpperCase() as
                            | "A1"
                            | "A2"
                            | "B1"
                            | "B2"
                            | null,
                        selectedServer: currentState.selectedServer,
                        selectedReceiver: currentState.selectedReceiver,
                        playerRoles: currentState.playerRoles,
                    };

                    updatedSets[currentSetIndex] = {
                        ...updatedSets[currentSetIndex],
                        ...setResult,
                        gamePhase: "finished",
                        isRunning: false,
                    };

                    const newTeamAFinalScore =
                        actualWinningTeam === "A"
                            ? currentState.teamAFinalScore + 1
                            : currentState.teamAFinalScore;
                    const newTeamBFinalScore =
                        actualWinningTeam === "B"
                            ? currentState.teamBFinalScore + 1
                            : currentState.teamBFinalScore;

                    updateGameSetResult(gameId, currentSetIndex + 1, setResult);

                    const totalSets = updatedSets.length;
                    const setsNeededToWin = Math.ceil(totalSets / 2);
                    const matchShouldEnd =
                        newTeamAFinalScore >= setsNeededToWin ||
                        newTeamBFinalScore >= setsNeededToWin;

                    const nextSetIndex = matchShouldEnd
                        ? currentSetIndex
                        : currentSetIndex + 1;
                    const isStartingNewSet = !matchShouldEnd && nextSetIndex < totalSets;

                    const isBestOf1 = totalSets === 1;
                    if (isStartingNewSet) {
                        updatedSets.push({
                            aScore: 0,
                            bScore: 0,
                            currentAScore: 0,
                            currentBScore: 0,
                            currentRound: 0,
                            lastTeamScored: null,
                            currentServer: null,
                            currentReceiver: null,
                            scoresheet: [
                                {
                                    aSwitch: false,
                                    bSwitch: false,
                                    currentAScore: 0,
                                    currentBScore: 0,
                                    scoredAt: new Date(),
                                    scorer: null,
                                    nextServe: null,
                                    toServe: null,
                                },
                            ],
                            gamePhase: "server-selection",
                            selectedServer: null,
                            selectedReceiver: null,
                            playerRoles: {
                                a1: null,
                                a2: null,
                                b1: null,
                                b2: null,
                            },
                            time: 0,
                            isRunning: false,
                        });
                    }
                    return {
                        ...prev,
                        [gameId]: {
                            ...currentState,
                            currentPlayingSet: currentState.currentSet,
                            // teamAScore: updatedTeamAScore,
                            // teamBScore: updatedTeamBScore,
                            teamAScore: updatedTeamAScore,
                            teamBScore: updatedTeamBScore,
                            sets: updatedSets,
                            gamePhase:
                                matchShouldEnd || isBestOf1 ? "finished" : "server-selection",
                            isRunning:
                                matchShouldEnd || isBestOf1 ? false : currentState.isRunning,
                            teamAFinalScore: newTeamAFinalScore,
                            teamBFinalScore: newTeamBFinalScore,
                            currentSet: currentSetIndex + 1,
                            selectedServer: null,
                            selectedReceiver: null,
                            playerRoles: {
                                a1: null,
                                a2: null,
                                b1: null,
                                b2: null,
                            },
                        },
                    };
                }

                return {
                    ...prev,
                    [gameId]: {
                        ...currentState,
                        serverPosition: newServerPosition,
                        selectedServer: newSelectedServer,
                        selectedReceiver: newSelectedReceiver,
                        playerRoles: {
                            a1: newSelectedServer === "a1" ? "server" : "receiver",
                            a2: null,
                            b1: newSelectedServer === "b1" ? "server" : "receiver",
                            b2: null,
                        },
                        lastScorer: team,
                        serveCount: currentState.serveCount + 1,
                        teamAScore: updatedTeamAScore,
                        teamBScore: updatedTeamBScore,
                        sets: updatedSets,
                    },
                };
            } else {
                // ================ DOUBLES LOGIC ================
                const currentSetIndex = currentState.currentSet - 1;
                const currentSetData = currentState.sets[currentSetIndex];
                const currentAScore = currentSetData.aScore ?? currentSetData.currentAScore ?? 0;
                const currentBScore = currentSetData.bScore ?? currentSetData.currentBScore ?? 0;

                const isPlusTwoSituation =
                    plusTwoEnabled &&
                    currentAScore >= maxScore - 1 &&
                    currentBScore >= maxScore - 1;

                const shouldIncrement =
                    (!isPlusTwoSituation &&
                        ((team === "teamA" && currentAScore < maxScore) ||
                            (team === "teamB" && currentBScore < maxScore))) ||
                    (isPlusTwoSituation &&
                        currentAScore < plusTwoMax &&
                        currentBScore < plusTwoMax &&
                        Math.abs(currentAScore - currentBScore) < 2);

                const newAScore =
                    team === "teamA" && shouldIncrement
                        ? currentAScore + 1
                        : currentAScore;
                const newBScore =
                    team === "teamB" && shouldIncrement
                        ? currentBScore + 1
                        : currentBScore;

                const updatedTeamAScore =
                    team === "teamA" && shouldIncrement
                        ? currentState.teamAScore + 1
                        : currentState.teamAScore;
                const updatedTeamBScore =
                    team === "teamB" && shouldIncrement
                        ? currentState.teamBScore + 1
                        : currentState.teamBScore;

                let setShouldEnd = false;
                if (plusTwoEnabled) {
                    const leadingScore = Math.max(newAScore, newBScore);
                    const trailingScore = Math.min(newAScore, newBScore);

                    if (leadingScore >= plusTwoMax) {
                        setShouldEnd = true;
                    } else if (
                        leadingScore >= maxScore &&
                        leadingScore >= trailingScore + 2
                    ) {
                        setShouldEnd = true;
                    }
                } else {
                    if (newAScore >= maxScore || newBScore >= maxScore) {
                        setShouldEnd = true;
                    }
                }

                const isSwitched = currentSetData.switchSide || false;
                const actualScoringTeam = team;

                const totalScore =
                    (actualScoringTeam === "teamA" ? newScore : currentState.teamAScore) +
                    (actualScoringTeam === "teamB" ? newScore : currentState.teamBScore);

                const newServerPosition = totalScore % 2 === 0 ? "right" : "left";

                let newSelectedServer = currentState.selectedServer;
                let newSelectedReceiver = currentState.selectedReceiver;
                let newPlayerRoles = { ...currentState.playerRoles };

                let aSwitch = false;
                let bSwitch = false;

                const isServingTeam =
                    (actualScoringTeam === "teamA" &&
                        currentState.selectedServer?.startsWith("a")) ||
                    (actualScoringTeam === "teamB" &&
                        currentState.selectedServer?.startsWith("b"));

                if (isServingTeam) {
                    if (actualScoringTeam === "teamA") {
                        aSwitch = true;
                    } else if (actualScoringTeam === "teamB") {
                        bSwitch = true;
                    }
                } else {
                    // Determine new server based on scoresheet history and BWF rules
                    let teamAPos = { right: "a1", left: "a2" };
                    let teamBPos = { right: "b1", left: "b2" };

                    const firstServe = currentSetData.scoresheet.length > 0
                        ? currentSetData.scoresheet[0].scorer?.toLowerCase()
                        : currentState.selectedServer;

                    if (firstServe === "a2") teamAPos = { right: "a2", left: "a1" };
                    if (firstServe === "b2") teamBPos = { right: "b2", left: "b1" };

                    if (currentSetData.scoresheet) {
                        for (const round of currentSetData.scoresheet) {
                            if (round.aSwitch) {
                                const temp = teamAPos.right;
                                teamAPos.right = teamAPos.left;
                                teamAPos.left = temp;
                            }
                            if (round.bSwitch) {
                                const temp = teamBPos.right;
                                teamBPos.right = teamBPos.left;
                                teamBPos.left = temp;
                            }
                        }
                    }

                    if (actualScoringTeam === "teamA") {
                        const isEven = newAScore % 2 === 0;
                        newSelectedServer = isEven ? teamAPos.right : teamAPos.left;
                    } else {
                        const isEven = newBScore % 2 === 0;
                        newSelectedServer = isEven ? teamBPos.right : teamBPos.left;
                    }
                }

                // Determine new receiver
                if (newSelectedServer) {
                    let teamAPosFinal = { right: "a1", left: "a2" };
                    let teamBPosFinal = { right: "b1", left: "b2" };

                    const firstServeFinal = currentSetData.scoresheet.length > 0
                        ? currentSetData.scoresheet[0].scorer?.toLowerCase()
                        : currentState.selectedServer;

                    if (firstServeFinal === "a2") teamAPosFinal = { right: "a2", left: "a1" };
                    if (firstServeFinal === "b2") teamBPosFinal = { right: "b2", left: "b1" };

                    const allRounds = [...(currentSetData.scoresheet || []), { aSwitch, bSwitch }];
                    for (const round of allRounds) {
                        if (round.aSwitch) {
                            const temp = teamAPosFinal.right;
                            teamAPosFinal.right = teamAPosFinal.left;
                            teamAPosFinal.left = temp;
                        }
                        if (round.bSwitch) {
                            const temp = teamBPosFinal.right;
                            teamBPosFinal.right = teamBPosFinal.left;
                            teamBPosFinal.left = temp;
                        }
                    }

                    if (actualScoringTeam === "teamA") {
                        const serverSide = (newSelectedServer === teamAPosFinal.right) ? "right" : "left";
                        newSelectedReceiver = serverSide === "right" ? teamBPosFinal.right : teamBPosFinal.left;
                    } else {
                        const serverSide = (newSelectedServer === teamBPosFinal.right) ? "right" : "left";
                        newSelectedReceiver = serverSide === "right" ? teamAPosFinal.right : teamAPosFinal.left;
                    }

                    if (newSelectedServer && newSelectedReceiver) {
                        newPlayerRoles = {
                            a1: null,
                            a2: null,
                            b1: null,
                            b2: null,
                            [newSelectedServer]: "server",
                            [newSelectedReceiver]: "receiver",
                        };
                    }
                }

                const updatedSets = [...currentState.sets];
                const newCurrentRound = (currentSetData.currentRound || 0) + 1;

                const actualWinningTeam = actualScoringTeam === "teamA" ? "A" : "B";
                const currentServer: "A1" | "A2" | "B1" | "B2" | null =
                    newSelectedServer?.toUpperCase() as "A1" | "A2" | "B1" | "B2" | null;

                const scorer = currentServer;
                const newScoreSheetEntry = {
                    aSwitch,
                    bSwitch,
                    currentAScore: newAScore,
                    currentBScore: newBScore,
                    scoredAt: new Date(),
                    scorer,
                    nextServe: currentServer,
                    toServe: currentServer,
                };

                updatedSets[currentSetIndex] = {
                    ...currentSetData,
                    currentAScore: newAScore,
                    currentBScore: newBScore,
                    currentRound: newCurrentRound,
                    lastTeamScored: actualScoringTeam === "teamA" ? "A" : "B",
                    currentServer,
                    scoresheet: [
                        ...(currentSetData.scoresheet || []),
                        newScoreSheetEntry,
                    ],
                };

                const setResult = {
                    currentServer,
                    currentReceiver: newSelectedReceiver?.toUpperCase() as "A1" | "A2" | "B1" | "B2" | null,
                    aScore: newAScore,
                    bScore: newBScore,
                    lastTeamScored: actualWinningTeam,
                    currentRound: newCurrentRound,
                    scoresheet: updatedSets[currentSetIndex].scoresheet,
                };

                if (!setShouldEnd) {
                    updateGameSetResult(gameId, currentSetIndex + 1, {
                        ...setResult,
                        currentPlayingSet: currentState.currentSet,
                    });
                }

                if (setShouldEnd) {
                    const actualWinningTeam = actualScoringTeam === "teamA" ? "A" : "B";
                    const displayAScore = updatedSets[currentSetIndex].currentAScore;
                    const displayBScore = updatedSets[currentSetIndex].currentBScore;
                    const setResult = {
                        aScore: displayAScore,
                        bScore: displayBScore,
                        lastTeamScored: actualWinningTeam,
                        scoresheet: updatedSets[currentSetIndex].scoresheet || [],
                        currentRound: newCurrentRound,
                        currentServer: currentState.selectedServer?.toUpperCase() as
                            | "A1"
                            | "A2"
                            | "B1"
                            | "B2"
                            | null,
                        selectedServer: currentState.selectedServer,
                        selectedReceiver: currentState.selectedReceiver,
                        playerRoles: currentState.playerRoles,
                    };

                    updatedSets[currentSetIndex] = {
                        ...updatedSets[currentSetIndex],
                        ...setResult,
                        gamePhase: "finished",
                        isRunning: false,
                    };

                    const newTeamAFinalScore =
                        actualWinningTeam === "A"
                            ? currentState.teamAFinalScore + 1
                            : currentState.teamAFinalScore;
                    const newTeamBFinalScore =
                        actualWinningTeam === "B"
                            ? currentState.teamBFinalScore + 1
                            : currentState.teamBFinalScore;

                    updateGameSetResult(gameId, currentSetIndex + 1, setResult);

                    const totalSets = updatedSets.length;
                    const setsNeededToWin = Math.ceil(totalSets / 2);
                    const matchShouldEnd =
                        newTeamAFinalScore >= setsNeededToWin ||
                        newTeamBFinalScore >= setsNeededToWin;

                    const isBestOf1 = totalSets === 1;

                    return {
                        ...prev,
                        [gameId]: {
                            ...currentState,
                            currentPlayingSet: currentState.currentSet,
                            teamAScore: updatedTeamAScore,
                            teamBScore: updatedTeamBScore,
                            sets: updatedSets,
                            gamePhase: matchShouldEnd || isBestOf1 ? "finished" : "playing", // change it to playing ang old ani is finished
                            isRunning:
                                matchShouldEnd || isBestOf1 ? false : currentState.isRunning,
                            teamAFinalScore: newTeamAFinalScore,
                            teamBFinalScore: newTeamBFinalScore,
                            currentSet: currentState.currentSet,
                            selectedServer: null,
                            selectedReceiver: null,
                            playerRoles: {
                                a1: null,
                                a2: null,
                                b1: null,
                                b2: null,
                            },
                        },
                    };
                }

                return {
                    ...prev,
                    [gameId]: {
                        ...currentState,
                        serverPosition: newServerPosition,
                        playerRoles: newPlayerRoles,
                        selectedServer: newSelectedServer,
                        selectedReceiver: newSelectedReceiver,
                        lastScorer: actualScoringTeam,
                        serveCount: currentState.serveCount + 1,
                        teamAScore: updatedTeamAScore,
                        teamBScore: updatedTeamBScore,
                        sets: updatedSets,
                    },
                };
            }
        });
    };
    const undoAction = async (gameId: string) => {
        setGameHistory((prevHistory) => {
            const gameHistoryForId = prevHistory[gameId] || [];
            if (gameHistoryForId.length === 0) {
                console.log('[UNDO] No history available');
                return prevHistory;
            }

            // Get the previous state
            const previousState = gameHistoryForId[gameHistoryForId.length - 1];
            const currentSetIndex = previousState.currentSet - 1;
            const previousSetData = previousState.sets[currentSetIndex];

            console.log('[UNDO] Restoring state:', {
                teamAScore: previousState.teamAScore,
                teamBScore: previousState.teamBScore,
                currentSet: previousState.currentSet,
                setData: previousSetData
            });

            // Update frontend
            setGamesState((prev) => ({
                ...prev,
                [gameId]: {
                    ...previousState,
                    time: prev[gameId]?.time || 0,
                    isRunning: prev[gameId]?.isRunning || false,
                    // Ensure we're using currentAScore/currentBScore for display
                    teamAScore: previousSetData?.currentAScore || previousState.teamAScore,
                    teamBScore: previousSetData?.currentBScore || previousState.teamBScore
                }
            }));

            // Update backend with CORRECT scores
            if (previousSetData) {
                updateGameSetResult(gameId, previousState.currentSet, {
                    aScore: previousSetData.currentAScore || previousSetData.aScore || 0,
                    bScore: previousSetData.currentBScore || previousSetData.bScore || 0,
                    lastTeamScored: previousSetData.lastTeamScored || null,
                    currentRound: previousSetData.currentRound,
                    currentServer: previousSetData.currentServer,
                    scoresheet: previousSetData.scoresheet,
                    switchSide: previousSetData.switchSide
                });
            }

            return {
                ...prevHistory,
                [gameId]: gameHistoryForId.slice(0, -1)
            };
        });
    };
    const setShowOnTV = async (gameId: string, showOnTV: boolean) => {
        try {
            setGamesState((prev) => ({
                ...prev,
                [gameId]: {
                    ...prev[gameId],
                    showOnTV: showOnTV,
                },
            }));

            await updateGame({
                variables: {
                    input: {
                        _id: gameId,
                        showOnTV: showOnTV,
                    },
                },
            });
        } catch (error) {
            console.error("Error updating showOnTV:", error);
        }
    };

    const canUndo = (gameId: string) => {
        return gameHistory[gameId]?.length > 0;
    };

    const swapTeams = (gameId: string) => {
        setGamesState((prev) => {
            const currentState = prev[gameId];
            if (!currentState) return prev;

            // Save current state for undo
            setGameHistory((prevHistory) => {
                const gameHistoryForId = prevHistory[gameId] || [];
                return {
                    ...prevHistory,
                    [gameId]: [...gameHistoryForId, { ...currentState }],
                };
            });

            const currentSetIndex = currentState.currentSet - 1;
            const currentSetData = currentState.sets[currentSetIndex];
            const isSwitched = !currentSetData.switchSide;

            // Update set data with switched flag
            const updatedSets = [...currentState.sets];
            updatedSets[currentSetIndex] = {
                ...currentSetData,
                switchSide: isSwitched,
            };

            return {
                ...prev,
                [gameId]: {
                    ...currentState,
                    sets: updatedSets,
                    // Maintain the same server/receiver logic regardless of visual switch
                    selectedServer: currentState.selectedServer,
                    selectedReceiver: currentState.selectedReceiver,
                    playerRoles: currentState.playerRoles,
                },
            };
        });
    };

    const setGameStarted = (gameId: string, started: boolean) => {
        setGamesState((prev) => ({
            ...prev,
            [gameId]: {
                ...prev[gameId],
                gameStarted: started,
            },
        }));
    };

    const resetTimer = (gameId: string) => {
        setGamesState((prev) => ({
            ...prev,
            [gameId]: {
                ...prev[gameId],
                time: 0,
                isRunning: false,
                gameStarted: false,
                sidesSwitched: false,
            },
        }));
    };

    const setGamePhase = (gameId: string, phase: GameState["gamePhase"]) => {
        updateState(gameId, {
            gamePhase: phase,
        });
    };

    const setSelectedServer = (gameId: string, server: string | null) => {
        setGamesState((prev) => {
            const currentState = prev[gameId];
            if (!currentState) return prev;

            const updatedSets = [...currentState.sets];
            const currentSetIndex = currentState.currentSet - 1;
            const currentSetData = updatedSets[currentSetIndex];

            if (currentSetData && currentSetData.scoresheet && currentSetData.scoresheet.length === 1 && currentSetData.scoresheet[0].scorer === null) {
                updatedSets[currentSetIndex] = {
                    ...currentSetData,
                    scoresheet: [{
                        ...currentSetData.scoresheet[0],
                        scorer: server?.toUpperCase() || null,
                        nextServe: server?.toUpperCase() || null,
                        toServe: server?.toUpperCase() || null,
                    }],
                };
            }

            return {
                ...prev,
                [gameId]: {
                    ...currentState,
                    selectedServer: server,
                    sets: updatedSets,
                },
            };
        });

        // Update the server in the database using the existing mutation
        const currentSet = gamesState[gameId]?.currentSet || 1;
        updateGameSetResult(gameId, currentSet, {
            currentServer: server?.toUpperCase() as "A1" | "A2" | "B1" | "B2" | null,
            aScore: gamesState[gameId]?.sets[currentSet - 1]?.aScore || 0,
            bScore: gamesState[gameId]?.sets[currentSet - 1]?.bScore || 0,
            // lastTeamScored:
            //   gamesState[gameId]?.sets[currentSet - 1]?.lastTeamScored || null,
            lastTeamScored: null,
            currentRound: gamesState[gameId]?.sets[currentSet - 1]?.currentRound || 0,
        });
    };

    const setSelectedReceiver = (gameId: string, receiver: string | null) => {
        updateState(gameId, {
            selectedReceiver: receiver,
        });
    };

    const setPlayerRoles = (gameId: string, roles: GameState["playerRoles"]) => {
        updateState(gameId, {
            playerRoles: roles,
        });
    };

    // const swapTeamAPlayers = async (gameId: string) => {
    //   setGamesState((prev) => {
    //     const currentState = prev[gameId];
    //     if (!currentState) return prev;

    //     setGameHistory((prevHistory) => {
    //       const gameHistoryForId = prevHistory[gameId] || [];
    //       return {
    //         ...prevHistory,
    //         [gameId]: [...gameHistoryForId, { ...currentState }],
    //       };
    //     });

    //     const newPlayers = {
    //       ...currentState.players,
    //       a1: currentState.players.a2,
    //       a2: currentState.players.a1,
    //     };

    //     const currentSetIndex = currentState.currentSet - 1;
    //     const updatedSets = [...currentState.sets];
    //     const currentSetData = updatedSets[currentSetIndex];

    //     // Create new scoresheet entry for the switch
    //     const newScoresheetEntry = {
    //       aSwitch: true, // Team A switched
    //       bSwitch: false,
    //       currentAScore: currentSetData.currentAScore,
    //       currentBScore: currentSetData.currentBScore,
    //       scoredAt: new Date(),
    //       scorer: null,
    //       nextServe: currentState.selectedServer?.toUpperCase() as
    //         | "A1"
    //         | "A2"
    //         | "B1"
    //         | "B2"
    //         | null,
    //       toServe: currentState.selectedServer?.toUpperCase() as
    //         | "A1"
    //         | "A2"
    //         | "B1"
    //         | "B2"
    //         | null,
    //     };

    //     updatedSets[currentSetIndex] = {
    //       ...currentSetData,
    //       scoresheet: [...(currentSetData.scoresheet || []), newScoresheetEntry],
    //     };

    //     // Update backend
    //     updatePlayers({
    //       variables: {
    //         gameId,
    //         players: {
    //           A1: newPlayers.a1,
    //           A2: newPlayers.a2,
    //           B1: currentState.players.b1,
    //           B2: currentState.players.b2,
    //         },
    //       },
    //     });

    //     updateGameSetResult(gameId, currentSetIndex + 1, {
    //       aScore: currentSetData.aScore,
    //       bScore: currentSetData.bScore,
    //       lastTeamScored: currentSetData.lastTeamScored,
    //       currentRound: currentSetData.currentRound,
    //       currentServer: currentState.selectedServer?.toUpperCase() as
    //         | "A1"
    //         | "A2"
    //         | "B1"
    //         | "B2"
    //         | null,
    //       scoresheet: updatedSets[currentSetIndex].scoresheet,
    //     });

    //     return {
    //       ...prev,
    //       [gameId]: {
    //         ...currentState,
    //         players: newPlayers,
    //       },
    //     };
    //   });
    // };

    // const swapTeamBPlayers = async (gameId: string) => {
    //   setGamesState((prev) => {
    //     const currentState = prev[gameId];
    //     if (!currentState) return prev;

    //     setGameHistory((prevHistory) => {
    //       const gameHistoryForId = prevHistory[gameId] || [];
    //       return {
    //         ...prevHistory,
    //         [gameId]: [...gameHistoryForId, { ...currentState }],
    //       };
    //     });

    //     const newPlayers = {
    //       ...currentState.players,
    //       b1: currentState.players.b2,
    //       b2: currentState.players.b1,
    //       A1: currentState.players.a1,
    //       A2: currentState.players.a2,
    //     };

    //     const currentSetIndex = currentState.currentSet - 1;
    //     const updatedSets = [...currentState.sets];
    //     const currentSetData = updatedSets[currentSetIndex];

    //     const newScoresheetEntry = {
    //       aSwitch: false,
    //       bSwitch: true,
    //       currentAScore: currentSetData.currentAScore,
    //       currentBScore: currentSetData.currentBScore,
    //       scoredAt: new Date(),
    //       scorer: null,
    //       nextServe: currentState.selectedServer?.toUpperCase() as
    //         | "A1"
    //         | "A2"
    //         | "B1"
    //         | "B2"
    //         | null,
    //       toServe: currentState.selectedServer?.toUpperCase() as
    //         | "A1"
    //         | "A2"
    //         | "B1"
    //         | "B2"
    //         | null,
    //     };

    //     updatedSets[currentSetIndex] = {
    //       ...currentSetData,
    //       scoresheet: [...(currentSetData.scoresheet || []), newScoresheetEntry],
    //     };

    //     // Update backend
    //     updatePlayers({
    //       variables: {
    //         gameId,
    //         players: {
    //           B1: newPlayers.b1,
    //           B2: newPlayers.b2,
    //         },
    //       },
    //     });

    //     updateGameSetResult(gameId, currentSetIndex + 1, {
    //       aScore: currentSetData.aScore,
    //       bScore: currentSetData.bScore,
    //       lastTeamScored: currentSetData.lastTeamScored,
    //       currentRound: currentSetData.currentRound,
    //       currentServer: currentState.selectedServer?.toUpperCase() as
    //         | "A1"
    //         | "A2"
    //         | "B1"
    //         | "B2"
    //         | null,
    //       scoresheet: updatedSets[currentSetIndex].scoresheet,
    //     });

    //     return {
    //       ...prev,
    //       [gameId]: {
    //         ...currentState,
    //         players: newPlayers,
    //       },
    //     };
    //   });
    // };

    const swapTeamAPlayers = async (gameId: string) => {
        setGamesState((prev) => {
            const currentState = prev[gameId];
            if (!currentState) return prev;

            // Save current state for undo
            setGameHistory((prevHistory) => {
                const gameHistoryForId = prevHistory[gameId] || [];
                return {
                    ...prevHistory,
                    [gameId]: [...gameHistoryForId, { ...currentState }],
                };
            });


            // Track the swap in set data
            const updatedSets = [...currentState.sets];
            const currentSetIndex = currentState.currentSet - 1;
            const currentSetData = updatedSets[currentSetIndex] || {
                currentServer: null,
                currentReceiver: null,
                scoresheet: [],
            };

            // Flip the aSwitch flag
            const newScoresheetEntry = {
                aSwitch: true,
                bSwitch: false,
                currentAScore: currentSetData.aScore || 0,
                currentBScore: currentSetData.bScore || 0,
                scoredAt: new Date(),
                scorer: null,
                nextServe: currentSetData.currentServer,
                toServe: currentSetData.currentServer,
            };

            updatedSets[currentSetIndex] = {
                ...currentSetData,
                scoresheet: [...(currentSetData.scoresheet || []), newScoresheetEntry],
            };

            // Determine if we need to update the backend's currentServer
            let backendUpdateNeeded = false;
            let newCurrentServer = currentSetData.currentServer;
            let newCurrentReceiver = currentSetData.currentReceiver;

            if (currentState.selectedServer) {
                if (currentState.selectedServer === "a1") {
                    newCurrentServer = "A2";
                    backendUpdateNeeded = true;
                } else if (currentState.selectedServer === "a2") {
                    newCurrentServer = "A1";
                    backendUpdateNeeded = true;
                }
            }

            if (currentState.selectedReceiver) {
                if (currentState.selectedReceiver === "a1") {
                    newCurrentReceiver = "A2";
                    backendUpdateNeeded = true;
                } else if (currentState.selectedReceiver === "a2") {
                    newCurrentReceiver = "A1";
                    backendUpdateNeeded = true;
                }
            }

            // Update backend if needed
            if (backendUpdateNeeded) {
                updateSetResult({
                    variables: {
                        gameId,
                        setNumber: currentState.currentSet,
                        input: {
                            currentServer: newCurrentServer,
                            currentReceiver: newCurrentReceiver,
                            scoresheet: updatedSets[currentSetIndex].scoresheet,
                        },
                        currentPlayingSet: currentState.currentSet,
                    },
                });
            } else {
                // Even if we don't update currentServer, we should save the scoresheet swap
                updateSetResult({
                    variables: {
                        gameId,
                        setNumber: currentState.currentSet,
                        input: {
                            scoresheet: updatedSets[currentSetIndex].scoresheet,
                        },
                        currentPlayingSet: currentState.currentSet,
                    },
                });
            }

            return {
                ...prev,
                [gameId]: {
                    ...currentState,
                    sets: updatedSets,
                    // Update selectedServer if it was set
                    selectedServer:
                        currentState.selectedServer === "a1"
                            ? "a2"
                            : currentState.selectedServer === "a2"
                                ? "a1"
                                : currentState.selectedServer,
                    selectedReceiver:
                        currentState.selectedReceiver === "a1"
                            ? "a2"
                            : currentState.selectedReceiver === "a2"
                                ? "a1"
                                : currentState.selectedReceiver,
                    // Swap player roles
                    playerRoles: {
                        ...currentState.playerRoles,
                        a1: currentState.playerRoles.a2,
                        a2: currentState.playerRoles.a1,
                    },
                    // Track the swap in swappedPlayers state
                    swappedPlayers: {
                        ...currentState.swappedPlayers,
                        a1: !currentState.swappedPlayers.a1,
                        a2: !currentState.swappedPlayers.a2,
                    },
                },
            };
        });
    };

    const swapTeamBPlayers = async (gameId: string) => {
        setGamesState((prev) => {
            const currentState = prev[gameId];
            if (!currentState) return prev;

            // Save current state for undo
            setGameHistory((prevHistory) => {
                const gameHistoryForId = prevHistory[gameId] || [];
                return {
                    ...prevHistory,
                    [gameId]: [...gameHistoryForId, { ...currentState }],
                };
            });

            // Track the swap in set data
            const updatedSets = [...currentState.sets];
            const currentSetIndex = currentState.currentSet - 1;
            const currentSetData = updatedSets[currentSetIndex] || {
                currentServer: null,
                currentReceiver: null,
                scoresheet: [],
            };

            // Flip the bSwitch flag
            const newScoresheetEntry = {
                aSwitch: false,
                bSwitch: true,
                currentAScore: currentSetData.aScore || 0,
                currentBScore: currentSetData.bScore || 0,
                scoredAt: new Date(),
                scorer: null,
                nextServe: currentSetData.currentServer,
                toServe: currentSetData.currentServer,
            };

            updatedSets[currentSetIndex] = {
                ...currentSetData,
                scoresheet: [...(currentSetData.scoresheet || []), newScoresheetEntry],
            };

            // Determine if we need to update the backend's currentServer
            let backendUpdateNeeded = false;
            let newCurrentServer = currentSetData.currentServer;
            let newCurrentReceiver = currentSetData.currentReceiver;

            if (currentState.selectedServer) {
                if (currentState.selectedServer === "b1") {
                    newCurrentServer = "B2";
                    backendUpdateNeeded = true;
                } else if (currentState.selectedServer === "b2") {
                    newCurrentServer = "B1";
                    backendUpdateNeeded = true;
                }
            }

            if (currentState.selectedReceiver) {
                if (currentState.selectedReceiver === "b1") {
                    newCurrentReceiver = "B2";
                    backendUpdateNeeded = true;
                } else if (currentState.selectedReceiver === "b2") {
                    newCurrentReceiver = "B1";
                    backendUpdateNeeded = true;
                }
            }

            if (backendUpdateNeeded) {
                updateSetResult({
                    variables: {
                        gameId,
                        setNumber: currentState.currentSet,
                        input: {
                            currentServer: newCurrentServer,
                            currentReceiver: newCurrentReceiver,
                            scoresheet: updatedSets[currentSetIndex].scoresheet,
                        },
                        currentPlayingSet: currentState.currentSet,
                    },
                });
            } else {
                updateSetResult({
                    variables: {
                        gameId,
                        setNumber: currentState.currentSet,
                        input: {
                            scoresheet: updatedSets[currentSetIndex].scoresheet,
                        },
                        currentPlayingSet: currentState.currentSet,
                    },
                });
            }

            return {
                ...prev,
                [gameId]: {
                    ...currentState,
                    sets: updatedSets,
                    selectedServer:
                        currentState.selectedServer === "b1"
                            ? "b2"
                            : currentState.selectedServer === "b2"
                                ? "b1"
                                : currentState.selectedServer,
                    selectedReceiver:
                        currentState.selectedReceiver === "b1"
                            ? "b2"
                            : currentState.selectedReceiver === "b2"
                                ? "b1"
                                : currentState.selectedReceiver,
                    playerRoles: {
                        ...currentState.playerRoles,
                        b1: currentState.playerRoles.b2,
                        b2: currentState.playerRoles.b1,
                    },
                    // Track the swap in swappedPlayers state
                    swappedPlayers: {
                        ...currentState.swappedPlayers,
                        b1: !currentState.swappedPlayers.b1,
                        b2: !currentState.swappedPlayers.b2,
                    },
                },
            };
        });
    };
    const setPlayers = (gameId: string, players: GameState["players"]) => {
        setGamesState((prev) => ({
            ...prev,
            [gameId]: {
                ...prev[gameId],
                players,
            },
        }));
    };

    useEffect(() => {
        const intervals: { [key: string]: any } = {};

        Object.keys(gamesState).forEach((gameId) => {
            if (gamesState[gameId].isRunning) {
                intervals[gameId] = setInterval(() => {
                    setGamesState((prev) => ({
                        ...prev,
                        [gameId]: {
                            ...prev[gameId],
                            time: prev[gameId].time + 1,
                        },
                    }));
                }, 1000);
            }
        });

        return () => {
            Object.keys(intervals).forEach((gameId) => {
                clearInterval(intervals[gameId]);
            });
        };
    }, [gamesState]);

    return (
        <GameContext.Provider
            value={{
                gamesState,
                startTimer,
                pauseTimer,
                resetTimer,
                updateScore,
                initializeGame,
                setGameStarted,
                setGamePhase,
                setSelectedServer,
                setSelectedReceiver,
                setPlayerRoles,
                swapTeamAPlayers,
                swapTeamBPlayers,
                setPlayers,
                swapTeams,
                undoAction,
                canUndo,
                setCurrentSet,
                updateState,
                updatePlayerNames,
                setShowOnTV,
                finishGame,
                hideAllGamesFromTV,
                updateGameSetResult,
                updatePlayers: async (variables) => {
                    return updatePlayers({ variables });
                },
            }}
        >
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error("useGame must be used within a GameProvider");
    }
    return context;
};
