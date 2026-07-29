import { Orbitron_700Bold, useFonts } from "@expo-google-fonts/orbitron";
import {
    AntDesign,
    FontAwesome,
    MaterialCommunityIcons,
    Octicons,
} from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { Link, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Dimensions,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { useGame } from "../contexts/GameContext";
import SettingsTab from "./settings";

import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";

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

const FETCH_GAME = gql`
  query FetchGame($id: ID!) {
    fetchGame(_id: $id) {
      _id
      max
      noOfSets
      plusTwo
      plusTwoMax
      plusTwoNoLimit
      sets {
        aScore
        bScore
        currentRound
        currentServer
        currentReceiver
        firstServer
        firstReceiver
        lastTeamScored
        switchSide
      }
      players {
        A1
        A2
        B1
        B2
      }
    }
  }
`;

type TabType = "Score" | "Scoresheet" | "Settings" | "Details";

export default function ScoreboardScreen() {
    const [fontsLoaded] = useFonts({ Orbitron_700Bold });
    const params = useLocalSearchParams();
    const [dimensions, setDimensions] = useState(Dimensions.get("window"));
    const [activeTab, setActiveTab] = useState<TabType>("Score");
    const [setsDropdownOpen, setSetsDropdownOpen] = useState(false);
    const [showFinishModal, setShowFinishModal] = useState(false);
    const [showServerSelectionModal, setShowServerSelectionModal] =
        useState(false);
    const [tempSelectedServer, setTempSelectedServer] = useState<string | null>(
        null
    );
    const [tempSelectedReceiver, setTempSelectedReceiver] = useState<
        string | null
    >(null);
    const [updatePlayerSwitch] = useMutation(UPDATE_PLAYERS);

    const {
        gamesState,
        startTimer,
        pauseTimer,
        initializeGame,
        setGameStarted,
        setGamePhase,
        setSelectedServer,
        setSelectedReceiver,
        setPlayerRoles,
        swapTeamAPlayers: contextSwapTeamAPlayers,
        swapTeamBPlayers: contextSwapTeamBPlayers,
        updateScore,
        undoAction,
        canUndo,
        setCurrentSet,
        updateState,
        setShowOnTV,
        hideAllGamesFromTV,
        finishGame,
        updateGameSetResult,
        updatePlayers,
    } = useGame();

    const {
        gameId,
        teamAName,
        teamBName,
        maxScore,
        noOfSets,
        plusTwo,
        plusTwoMax,
        plusTwoNoLimit,
    } = params;

    const teamANameStr = Array.isArray(teamAName) ? teamAName[0] : teamAName;
    const teamBNameStr = Array.isArray(teamBName) ? teamBName[0] : teamBName;
    const [hidePlayers, setHidePlayers] = useState(false);

    const gameIdString = Array.isArray(gameId) ? gameId[0] : gameId;
    const currentGameState = gamesState[gameIdString] || {
        time: 0,
        isRunning: false,
        teamAScore: 0,
        teamBScore: 0,
        teamA: "Team A",
        teamB: "Team B",
        teamAFinalScore: 0,
        teamBFinalScore: 0,
        gameStarted: false,
        gamePhase: "server-selection",
        selectedServer: null,
        selectedReceiver: null,
        playerRoles: {
            a1: null,
            a2: null,
            b1: null,
            b2: null,
        },
        players: {
            a1: "A1",
            a2: "A2",
            b1: "B1",
            b2: "B2",
        },
    };
    const { loading, error, data } = useQuery<any>(FETCH_GAME, {
        variables: { id: gameIdString },
        skip: !gameIdString,
    });
    const teamAColor = currentGameState.teamAColor || "#ffc067";
    const teamBColor = currentGameState.teamBColor || "#a8dcab";
    const {
        gamePhase,
        selectedServer,
        selectedReceiver,
        playerRoles,
        players,
        gameStarted,
        isRunning,
        time,
        teamAScore,
        teamBScore,
        teamA,
        teamB,
        teamAFinalScore,
        teamBFinalScore,
        currentSet,
        sets,
    } = currentGameState;

    const displayTeamAScore = teamAScore;
    const displayTeamBScore = teamBScore;
    const displayTeamAName = teamA;
    const displayTeamBName = teamB;
    const displayTeamAColor = teamAColor;
    const displayTeamBColor = teamBColor;

    useEffect(() => {
        if (data?.fetchGame) {
            const gameData = data.fetchGame;
            console.log("Syncing with database:", {
                plusTwo: gameData.plusTwo,
                plusTwoMax: gameData.plusTwoMax,
            });

            updateState(gameIdString, {
                plusTwo: gameData.plusTwo,
                plusTwoMax: gameData.plusTwoMax,
                plusTwoNoLimit: gameData.plusTwoNoLimit,
                max: gameData.max,
            });
        }
    }, [data, gameIdString]);

    useEffect(() => {
        const playerA1 = teamANameStr.includes("/")
            ? teamANameStr.split("/")[0]
            : teamANameStr;
        const playerA2 = teamANameStr.includes("/")
            ? teamANameStr.split("/")[1]
            : null;
        const playerB1 = teamBNameStr.includes("/")
            ? teamBNameStr.split("/")[0]
            : teamBNameStr;
        const playerB2 = teamBNameStr.includes("/")
            ? teamBNameStr.split("/")[1]
            : null;

        if (!gamesState[gameIdString]) {
            initializeGame(
                gameIdString,
                {
                    a1: playerA1,
                    a2: playerA2 || "",
                    b1: playerB1,
                    b2: playerB2 || "",
                },
                Number(noOfSets) || 1,
                Number(maxScore) || 21,
                plusTwo === "true",
                Number(plusTwoMax) || 30,
                plusTwoNoLimit === "true"
            );
        }
    }, [gameIdString]);

    // console.log('Initializing game with params:', {
    //   gameId: gameIdString,
    //   noOfSets,
    //   maxScore,
    //   plusTwo: currentGameState.plusTwo,
    //   plusTwoMax: currentGameState.plusTwoMax
    // });
    // useEffect(() => {
    //   console.log('Current game state:', {
    //     plusTwo: currentGameState.plusTwo,
    //     plusTwoMax: currentGameState.plusTwoMax
    //   });
    // }, [currentGameState]);
    // useEffect(() => {
    //   if (showServerSelectionModal) {
    //     // Auto-select A2 as server and B2 as receiver
    //     setTempSelectedServer('a2');
    //     setTempSelectedReceiver('b2');
    //   }
    // }, [showServerSelectionModal]);

    useEffect(() => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        const subscription = Dimensions.addEventListener("change", ({ window }) => {
            setDimensions(window);
        });
        return () => {
            ScreenOrientation.unlockAsync();
            subscription?.remove();
        };
    }, []);

    useFocusEffect(
        useCallback(() => {
            let isFocused = true;

            async function hideNavBar() {
                if (Platform.OS === 'android' && isFocused) {
                    try {
                        await NavigationBar.setVisibilityAsync("hidden");
                        await NavigationBar.setBehaviorAsync("overlay-swipe");
                    } catch (e) {
                        console.log("Error hiding navigation bar:", e);
                    }
                }
            }
            hideNavBar();

            return () => {
                isFocused = false;
                if (Platform.OS === 'android') {
                    NavigationBar.setVisibilityAsync("visible").catch(err => console.log(err));
                }
            };
        }, [])
    );

    const swapTeamAPlayers = () => {
        console.log("Swapping Team A players");
        contextSwapTeamAPlayers(gameIdString);
    };

    const swapTeamBPlayers = () => {
        console.log("Swapping Team B players");
        contextSwapTeamBPlayers(gameIdString);
    };

    const currentSetData = (sets && sets[currentSet - 1]) || {
        aScore: 0,
        bScore: 0,
    };

    const teamATotalScore =
        sets?.slice(0, currentSet - 1).reduce((sum: number, set: any, index: number) => {
            return sum + ((index + 1) % 2 === 0 ? set.bScore || 0 : set.aScore || 0);
        }, currentSetData.aScore) || currentSetData.aScore;

    const teamBTotalScore =
        sets?.slice(0, currentSet - 1).reduce((sum: number, set: any, index: number) => {
            return sum + ((index + 1) % 2 === 0 ? set.aScore || 0 : set.bScore || 0);
        }, currentSetData.bScore) || currentSetData.bScore;

    // const generateSetItems = () => {
    //   const numSets = Number(noOfSets) || 1;
    //   const items = [];

    //   const set1Data = sets?.[0] || {};
    //   items.push({
    //     label: `Set 1`,
    //     value: 1,
    //     aScore: set1Data.aScore || 0,
    //     bScore: set1Data.bScore || 0,
    //   });

    //   if (set1Data.aScore > 0 || set1Data.bScore > 0) {
    //     const set2Data = sets?.[1] || {};
    //     items.push({
    //       label: `Set 2`,
    //       value: 2,
    //       aScore: set2Data.aScore || 0,
    //       bScore: set2Data.bScore || 0,
    //     });

    //     if ((numSets === 3 && set2Data.aScore > 0) || set2Data.bScore > 0) {
    //       const set1Winner = set1Data.aScore > set1Data.bScore ? "A" : "B";
    //       const set2Winner = set2Data.aScore > set2Data.bScore ? "A" : "B";

    //       if (set1Winner !== set2Winner) {
    //         const set3Data = sets?.[2] || {};
    //         items.push({
    //           label: `Set 3`,
    //           value: 3,
    //           aScore: set3Data.aScore || 0,
    //           bScore: set3Data.bScore || 0,
    //         });
    //       }
    //     }
    //   }
    //   return items;
    // };
    // useEffect(() => {
    //   console.log("Scoreboard received noOfSets update:", noOfSets);
    //   // console.log("Current sets state:", sets);
    //   // console.log("Current game state:", currentGameState);
    // }, [noOfSets, sets, currentGameState]);

    // const generateSetItems = () => {
    //   const numSets = (currentGameState).noOfSets || 1;
    //   console.log("eh", numSets)
    //   const items = [];

    //   if (currentGameState.isSingles) {
    //     for (let i = 1; i <= numSets; i++) {
    //       const setData = sets?.[i - 1] || {};
    //       items.push({
    //         label: `Set ${i}`,
    //         value: i,
    //         aScore: setData.aScore || 0,
    //         bScore: setData.bScore || 0,
    //       });
    //     }
    //     return items;
    //   }

    //   const set1Data = sets?.[0] || {};
    //   items.push({
    //     label: `Set 1`,
    //     value: 1,
    //     aScore: set1Data.aScore || 0,
    //     bScore: set1Data.bScore || 0,
    //   });

    //   if (set1Data.aScore > 0 || set1Data.bScore > 0) {
    //     const set2Data = sets?.[1] || {};
    //     items.push({
    //       label: `Set 2`,
    //       value: 2,
    //       aScore: set2Data.aScore || 0,
    //       bScore: set2Data.bScore || 0,
    //     });

    //     if ((numSets === 3 && set2Data.aScore > 0) || set2Data.bScore > 0) {
    //       const set1Winner = set1Data.aScore > set1Data.bScore ? "A" : "B";
    //       const set2Winner = set2Data.aScore > set2Data.bScore ? "A" : "B";

    //       if (set1Winner !== set2Winner) {
    //         const set3Data = sets?.[2] || {};
    //         items.push({
    //           label: `Set 3`,
    //           value: 3,
    //           aScore: set3Data.aScore || 0,
    //           bScore: set3Data.bScore || 0,
    //         });
    //       }
    //     }
    //   }
    //   return items;
    // };

    const generateSetItems = () => {
        const numSets = currentGameState.noOfSets || 1;
        const items = [];

        // For singles matches - always show all sets up to numSets
        if (currentGameState.isSingles) {
            for (let i = 1; i <= numSets; i++) {
                const setData = sets?.[i - 1] || {};
                items.push({
                    label: `Set ${i}`,
                    value: i,
                    aScore: setData.aScore || 0,
                    bScore: setData.bScore || 0,
                });
            }
            return items;
        }

        // For doubles matches
        const set1Data = sets?.[0] || {};
        items.push({
            label: `Set 1`,
            value: 1,
            aScore: set1Data.aScore || 0,
            bScore: set1Data.bScore || 0,
        });

        // Only show additional sets if they're within the current noOfSets limit
        if (numSets >= 2 && (set1Data.aScore > 0 || set1Data.bScore > 0)) {
            const set2Data = sets?.[1] || {};
            items.push({
                label: `Set 2`,
                value: 2,
                aScore: set2Data.aScore || 0,
                bScore: set2Data.bScore || 0,
            });

            // Only show Set 3 if we're in best-of-3 and sets 1 & 2 are split
            if (numSets === 3 && (set2Data.aScore > 0 || set2Data.bScore > 0)) {
                const set1Winner = set1Data.aScore > set1Data.bScore ? "A" : "B";
                const set2Winner = set2Data.aScore > set2Data.bScore ? "A" : "B";

                if (set1Winner !== set2Winner) {
                    const set3Data = sets?.[2] || {};
                    items.push({
                        label: `Set 3`,
                        value: 3,
                        aScore: set3Data.aScore || 0,
                        bScore: set3Data.bScore || 0,
                    });
                }
            }
        }

        return items;
    };

    // useEffect(() => {
    //   if (data?.fetchGame) {
    //     const gameData = data.fetchGame;
    //     const players = gameData.players || {};

    //     // Update local state with players from database
    //     updateState(gameIdString, {
    //       // players: {
    //       //   a1: players.A1 || "",
    //       //   a2: players.A2 || "",
    //       //   b1: players.B1 || "",
    //       //   b2: players.B2 || "",
    //       // },
    //       originalPlayers: {
    //         // Make sure to update originalPlayers too
    //         a1: players.A1 || "",
    //         a2: players.A2 || "",
    //         b1: players.B1 || "",
    //         b2: players.B2 || "",
    //       },
    //       plusTwo: gameData.plusTwo,
    //       plusTwoMax: gameData.plusTwoMax,
    //       plusTwoNoLimit: gameData.plusTwoNoLimit,
    //       max: gameData.max,
    //     });
    //   }
    // }, [data, gameIdString]);

    const handleServerSelection = (player: string) => {
        if (!currentGameState.isSingles) {
            const totalScore =
                currentGameState.teamAScore + currentGameState.teamBScore;
            const isFirstServe = totalScore === 0;

            // if (isFirstServe && !player.includes("2")) {
            //   alert("First serve must be from the right service court (A2/B2)");
            //   return;
            // }
        }

        setSelectedServer(gameIdString, player);
        setGamePhase(gameIdString, "receiver-selection");

        const newRoles = {
            a1: null,
            a2: null,
            b1: null,
            b2: null,
            [player]: "server",
        };
        setPlayerRoles(gameIdString, newRoles);

        const totalScore =
            currentGameState.teamAScore + currentGameState.teamBScore;
        const newServerPosition = totalScore % 2 === 0 ? "right" : "left";
        updateState(gameIdString, {
            serveCount: 0,
            serverPosition: newServerPosition,
        });
    };

    const { swapTeams } = useGame();

    const handleReceiverSelection = (player: string) => {
        setSelectedReceiver(gameIdString, player);
        setGamePhase(gameIdString, "playing");

        const newRoles = {
            a1: null,
            a2: null,
            b1: null,
            b2: null,
            [selectedServer!]: "server",
            [player]: "receiver",
        };
        setPlayerRoles(gameIdString, newRoles);
    };

    const handleSetChange = async (
        value: number | ((prev: number) => number)
    ) => {
        const newValue = typeof value === "function" ? value(currentSet) : value;

        // Only proceed if the new set number is different from current
        if (newValue !== currentSet) {
            await setCurrentSet(gameIdString, newValue);

            // If switching to a set that was in progress, make sure to maintain the game phase
            const targetSet = currentGameState.sets[newValue - 1];
            if (targetSet && targetSet.gamePhase === "playing") {
                setGamePhase(gameIdString, "playing");
            } else {
                // Show server selection modal for new sets
                setShowServerSelectionModal(true);
            }
        }
    };

    // const resetGame = async () => {
    //   try {
    //     const currentSet = currentGameState.currentSet;

    //     // 1. Reset to original players in both frontend and backend
    //     const originalPlayers = currentGameState.originalPlayers;

    //     // Update frontend state
    //     updateState(gameIdString, {
    //       sets: currentGameState.sets.map((set, index) =>
    //         index === currentGameState.currentSet - 1
    //           ? {
    //             ...set,
    //             lastTeamScored: null, // Ensure this is set to null
    //             aScore: 0,
    //             bScore: 0,
    //             currentRound: 0,
    //             currentServer: null,
    //             scoresheet: []
    //           }
    //           : set
    //       ),
    //       players: originalPlayers,
    //       swappedPlayers: {
    //         a1: false,
    //         a2: false,
    //         b1: false,
    //         b2: false,
    //       },
    //     });

    //     // Update backend database
    //     await updatePlayers({
    //       gameId: gameIdString,
    //       players: {
    //         A1: originalPlayers.a1,
    //         A2: originalPlayers.a2,
    //         B1: originalPlayers.b1,
    //         B2: originalPlayers.b2,
    //       },
    //     });

    //     // 2. Clear backend data - make sure to include lastTeamScored: null
    //     await updateGameSetResult(gameIdString, currentSet, {
    //       currentServer: null,
    //       aScore: 0,
    //       bScore: 0,
    //       lastTeamScored: null, // Explicitly set to null
    //       currentRound: 0,
    //       scoresheet: [],
    //       switchSide: false,
    //     });

    //     // 3. Reset other game states
    //     setSelectedServer(gameIdString, null);
    //     setSelectedReceiver(gameIdString, null);
    //     setPlayerRoles(gameIdString, {
    //       a1: null,
    //       a2: null,
    //       b1: null,
    //       b2: null,
    //     });

    //     setGamePhase(gameIdString, "server-selection");
    //     setGameStarted(gameIdString, false);

    //     updateState(gameIdString, {
    //       time: 0,
    //       teamAScore: 0,
    //       teamBScore: 0,
    //       serveCount: 0,
    //       lastScorer: null,
    //       serverPosition: "right",
    //       isRunning: false,
    //       gameStarted: false,
    //     });
    //   } catch (error) {
    //     console.error("Error in resetGame:", error);
    //   }
    // };

    const resetGame = async () => {
        try {
            console.log('[RESET] Starting reset for game:', gameIdString);

            const currentSetIndex = currentGameState.currentSet - 1;
            const originalPlayers = currentGameState.originalPlayers;

            console.log('[RESET] Current state before reset:', {
                lastTeamScored: currentGameState.sets[currentSetIndex]?.lastTeamScored,
                currentSet: currentGameState.currentSet,
                teamAScore: currentGameState.teamAScore,
                teamBScore: currentGameState.teamBScore
            });

            const updatedSets = currentGameState.sets.map((set: any, index: number) =>
                index === currentSetIndex
                    ? {
                        ...set,
                        aScore: 0,
                        bScore: 0,
                        currentRound: 0,
                        currentServer: null,
                        lastTeamScored: null,
                        switchSide: false,
                        scoresheet: []
                    }
                    : set
            );

            updateState(gameIdString, {
                sets: updatedSets,
                players: originalPlayers,
                swappedPlayers: { a1: false, a2: false, b1: false, b2: false },
                teamAScore: 0,
                teamBScore: 0,
                time: 0,
                isRunning: false,
                gameStarted: false,
                gamePhase: "server-selection",
                selectedServer: null,
                selectedReceiver: null,
                playerRoles: { a1: null, a2: null, b1: null, b2: null },
                serveCount: 0,
                lastScorer: null,
                serverPosition: "right",
            });

            console.log('[RESET] Frontend state updated with lastTeamScored: null');

            console.log('[RESET] Updating backend with lastTeamScored: null');
            await updateGameSetResult(gameIdString, currentGameState.currentSet, {
                currentServer: null,
                aScore: 0,
                bScore: 0,
                lastTeamScored: null,
                currentRound: 0,
                scoresheet: [],
                switchSide: false,
            });

            await updatePlayers({
                gameId: gameIdString,
                players: {
                    A1: originalPlayers.a1,
                    A2: originalPlayers.a2,
                    B1: originalPlayers.b1,
                    B2: originalPlayers.b2,
                },
            });

            console.log('[RESET] Reset completed successfully');

        } catch (error) {
            console.error('[RESET] Error in resetGame:', error);
        }
    };

    const handleStartPause = async () => {
        if (isRunning) {
            pauseTimer(gameIdString);
        } else {
            try {
                await startTimer(gameIdString);
                if (!gameStarted) {
                    setGameStarted(gameIdString, true);
                    setShowOnTV(gameIdString, true);
                }
            } catch (error) {
                Alert.alert("Error", "Failed to start game");
            }
        }
    };

    const endGame = () => {
        if (isRunning) {
            pauseTimer(gameIdString);
        } else {
            startTimer(gameIdString);
            if (!gameStarted) {
                setGameStarted(gameIdString, true);
                setShowOnTV(gameIdString, true);
            }
        }
    };

    const formatTime = (seconds: number) => {
        const hour = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hour.toString().padStart(2, "0")}:${mins
            .toString()
            .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const isLandscape = dimensions.width > dimensions.height;

    // HERE
    // OLD?
    //   const renderServerSelectionModal = () => {
    //   const isSingles = currentGameState.isSingles;

    //   // Helper function to log player info
    //   const logPlayerSelection = (playerKey: string, role: 'server' | 'receiver') => {
    //     const playerName = players[playerKey as keyof typeof players];
    //     console.log(`Selected ${role}: ${playerKey.toUpperCase()} - ${playerName}`);
    //   };

    //   return (
    //     <Modal
    //       visible={showServerSelectionModal}
    //       transparent={true}
    //       animationType="slide"
    //       onRequestClose={() => setShowServerSelectionModal(false)}
    //     >
    //       <View style={styles.modalContainer}>
    //         <View style={styles.serverSelectionModalContent}>
    //           <Text style={styles.modalTitle}>Select Server and Receiver</Text>

    //           {/* Server Selection */}
    //           <View style={styles.selectionSection}>
    //             <Text style={styles.sectionTitle}>Select Server:</Text>
    //             <View style={styles.teamsRowContainer}>
    //               {/* Team A */}
    //               <View style={styles.teamColumn}>
    //                 <Text style={styles.teamLabel}>Team A</Text>
    //                 {!isSingles ? (
    //                   <>
    //                     <TouchableOpacity
    //                       style={[
    //                         styles.playerSelectionButton,
    //                         tempSelectedServer === 'a2' && styles.selectedPlayerButton,
    //                         { backgroundColor: displayTeamAColor }
    //                       ]}
    //                       onPress={() => {
    //                         setTempSelectedServer('a2');
    //                         console.log(`A2 selected as potential server: ${players.a2}`);
    //                       }}
    //                     >
    //                       <Text style={styles.playerSelectionText}>A2: {players.a2}</Text>
    //                     </TouchableOpacity>
    //                     <TouchableOpacity
    //                       style={[
    //                         styles.playerSelectionButton,
    //                         tempSelectedServer === 'a1' && styles.selectedPlayerButton,
    //                         { backgroundColor: displayTeamAColor }
    //                       ]}
    //                       onPress={() => {
    //                         setTempSelectedServer('a1');
    //                         console.log(`A1 selected as potential server: ${players.a1}`);
    //                       }}
    //                     >
    //                       <Text style={styles.playerSelectionText}>A1: {players.a1}</Text>
    //                     </TouchableOpacity>
    //                   </>
    //                 ) : (
    //                   <TouchableOpacity
    //                     style={[
    //                       styles.playerSelectionButton,
    //                       tempSelectedServer === 'a1' && styles.selectedPlayerButton,
    //                       { backgroundColor: displayTeamAColor }
    //                     ]}
    //                     onPress={() => {
    //                       setTempSelectedServer('a1');
    //                       console.log(`A1 selected as potential server: ${players.a1}`);
    //                     }}
    //                   >
    //                     <Text style={styles.playerSelectionText}>A1: {players.a1}</Text>
    //                   </TouchableOpacity>
    //                 )}
    //               </View>

    //               {/* Team B */}
    //               <View style={styles.teamColumn}>
    //                 <Text style={styles.teamLabel}>Team B</Text>
    //                 {!isSingles ? (
    //                   <>
    //                     <TouchableOpacity
    //                       style={[
    //                         styles.playerSelectionButton,
    //                         tempSelectedServer === 'b1' && styles.selectedPlayerButton,
    //                         { backgroundColor: displayTeamBColor }
    //                       ]}
    //                       onPress={() => {
    //                         setTempSelectedServer('b1');
    //                         console.log(`B1 selected as potential server: ${players.b1}`);
    //                       }}
    //                     >
    //                       <Text style={styles.playerSelectionText}>B1: {players.b1}</Text>
    //                     </TouchableOpacity>
    //                     <TouchableOpacity
    //                       style={[
    //                         styles.playerSelectionButton,
    //                         tempSelectedServer === 'b2' && styles.selectedPlayerButton,
    //                         { backgroundColor: displayTeamBColor }
    //                       ]}
    //                       onPress={() => {
    //                         setTempSelectedServer('b2');
    //                         console.log(`B2 selected as potential server: ${players.b2}`);
    //                       }}
    //                     >
    //                       <Text style={styles.playerSelectionText}>B2: {players.b2}</Text>
    //                     </TouchableOpacity>
    //                   </>
    //                 ) : (
    //                   <TouchableOpacity
    //                     style={[
    //                       styles.playerSelectionButton,
    //                       tempSelectedServer === 'b1' && styles.selectedPlayerButton,
    //                       { backgroundColor: displayTeamBColor }
    //                     ]}
    //                     onPress={() => {
    //                       setTempSelectedServer('b1');
    //                       console.log(`B1 selected as potential server: ${players.b1}`);
    //                     }}
    //                   >
    //                     <Text style={styles.playerSelectionText}>B1: {players.b1}</Text>
    //                   </TouchableOpacity>
    //                 )}
    //               </View>
    //             </View>
    //           </View>

    //           {/* Receiver Selection (only shown after server is selected) */}
    //           {tempSelectedServer && (
    //             <View style={styles.selectionSection}>
    //               <Text style={styles.sectionTitle}>Select Receiver:</Text>
    //               <View style={styles.teamsRowContainer}>
    //                 {/* Team A */}
    //                 <View style={styles.teamColumn}>
    //                   <Text style={styles.teamLabel}>Team A</Text>
    //                   {!isSingles ? (
    //                     <>
    //                       <TouchableOpacity
    //                         style={[
    //                           styles.playerSelectionButton,
    //                           tempSelectedReceiver === 'a1' && styles.selectedPlayerButton,
    //                           {
    //                             backgroundColor: displayTeamAColor,
    //                             opacity: tempSelectedServer.startsWith('b') ? 1 : 0.5
    //                           }
    //                         ]}
    //                         onPress={() => {
    //                           if (tempSelectedServer.startsWith('b')) {
    //                             setTempSelectedReceiver('a1');
    //                             console.log(`A1 selected as potential receiver: ${players.a1}`);
    //                           }
    //                         }}
    //                         disabled={!tempSelectedServer.startsWith('b')}
    //                       >
    //                         <Text style={styles.playerSelectionText}>A1: {players.a1}</Text>
    //                       </TouchableOpacity>
    //                       <TouchableOpacity
    //                         style={[
    //                           styles.playerSelectionButton,
    //                           tempSelectedReceiver === 'a2' && styles.selectedPlayerButton,
    //                           {
    //                             backgroundColor: displayTeamAColor,
    //                             opacity: tempSelectedServer.startsWith('b') ? 1 : 0.5
    //                           }
    //                         ]}
    //                         onPress={() => {
    //                           if (tempSelectedServer.startsWith('b')) {
    //                             setTempSelectedReceiver('a2');
    //                             console.log(`A2 selected as potential receiver: ${players.a2}`);
    //                           }
    //                         }}
    //                         disabled={!tempSelectedServer.startsWith('b')}
    //                       >
    //                         <Text style={styles.playerSelectionText}>A2: {players.a2}</Text>
    //                       </TouchableOpacity>
    //                     </>
    //                   ) : (
    //                     <TouchableOpacity
    //                       style={[
    //                         styles.playerSelectionButton,
    //                         tempSelectedReceiver === 'a1' && styles.selectedPlayerButton,
    //                         {
    //                           backgroundColor: displayTeamAColor,
    //                           opacity: tempSelectedServer.startsWith('b') ? 1 : 0.5
    //                         }
    //                       ]}
    //                       onPress={() => {
    //                         if (tempSelectedServer.startsWith('b')) {
    //                           setTempSelectedReceiver('a1');
    //                           console.log(`A1 selected as potential receiver: ${players.a1}`);
    //                         }
    //                       }}
    //                       disabled={!tempSelectedServer.startsWith('b')}
    //                     >
    //                       <Text style={styles.playerSelectionText}>A1: {players.a1}</Text>
    //                     </TouchableOpacity>
    //                   )}
    //                 </View>

    //                 {/* Team B */}
    //                 <View style={styles.teamColumn}>
    //                   <Text style={styles.teamLabel}>Team B</Text>
    //                   {!isSingles ? (
    //                     <>
    //                       <TouchableOpacity
    //                         style={[
    //                           styles.playerSelectionButton,
    //                           tempSelectedReceiver === 'b1' && styles.selectedPlayerButton,
    //                           {
    //                             backgroundColor: displayTeamBColor,
    //                             opacity: tempSelectedServer.startsWith('a') ? 1 : 0.5
    //                           }
    //                         ]}
    //                         onPress={() => {
    //                           if (tempSelectedServer.startsWith('a')) {
    //                             setTempSelectedReceiver('b1');
    //                             console.log(`B1 selected as potential receiver: ${players.b1}`);
    //                           }
    //                         }}
    //                         disabled={!tempSelectedServer.startsWith('a')}
    //                       >
    //                         <Text style={styles.playerSelectionText}>B1: {players.b1}</Text>
    //                       </TouchableOpacity>
    //                       <TouchableOpacity
    //                         style={[
    //                           styles.playerSelectionButton,
    //                           tempSelectedReceiver === 'b2' && styles.selectedPlayerButton,
    //                           {
    //                             backgroundColor: displayTeamBColor,
    //                             opacity: tempSelectedServer.startsWith('a') ? 1 : 0.5
    //                           }
    //                         ]}
    //                         onPress={() => {
    //                           if (tempSelectedServer.startsWith('a')) {
    //                             setTempSelectedReceiver('b2');
    //                             console.log(`B2 selected as potential receiver: ${players.b2}`);
    //                           }
    //                         }}
    //                         disabled={!tempSelectedServer.startsWith('a')}
    //                       >
    //                         <Text style={styles.playerSelectionText}>B2: {players.b2}</Text>
    //                       </TouchableOpacity>
    //                     </>
    //                   ) : (
    //                     <TouchableOpacity
    //                       style={[
    //                         styles.playerSelectionButton,
    //                         tempSelectedReceiver === 'b1' && styles.selectedPlayerButton,
    //                         {
    //                           backgroundColor: displayTeamBColor,
    //                           opacity: tempSelectedServer.startsWith('a') ? 1 : 0.5
    //                         }
    //                       ]}
    //                       onPress={() => {
    //                         if (tempSelectedServer.startsWith('a')) {
    //                           setTempSelectedReceiver('b1');
    //                           console.log(`B1 selected as potential receiver: ${players.b1}`);
    //                         }
    //                       }}
    //                       disabled={!tempSelectedServer.startsWith('a')}
    //                     >
    //                       <Text style={styles.playerSelectionText}>B1: {players.b1}</Text>
    //                     </TouchableOpacity>
    //                   )}
    //                 </View>
    //               </View>
    //             </View>
    //           )}

    //           {/* Action Buttons */}
    //           <View style={styles.modalButtonsContainer}>
    //             <TouchableOpacity
    //               style={[styles.modalButton, styles.cancelButton]}
    //               onPress={() => {
    //                 setTempSelectedServer(null);
    //                 setTempSelectedReceiver(null);
    //                 setShowServerSelectionModal(false);
    //               }}
    //             >
    //               <Text style={styles.modalButtonText}>Cancel</Text>
    //             </TouchableOpacity>
    //             <TouchableOpacity
    //               style={[
    //                 styles.modalButton,
    //                 styles.confirmButton,
    //                 { opacity: tempSelectedServer && tempSelectedReceiver ? 1 : 0.5 }
    //               ]}
    //               onPress={() => {
    //                 if (tempSelectedServer && tempSelectedReceiver) {
    //                   // Log the final selections
    //                   logPlayerSelection(tempSelectedServer, 'server');
    //                   logPlayerSelection(tempSelectedReceiver, 'receiver');

    //                   setSelectedServer(gameIdString, tempSelectedServer);
    //                   setSelectedReceiver(gameIdString, tempSelectedReceiver);

    //                   const newRoles = {
    //                     a1: null,
    //                     a2: null,
    //                     b1: null,
    //                     b2: null,
    //                     [tempSelectedServer]: "server",
    //                     [tempSelectedReceiver]: "receiver",
    //                   };
    //                   setPlayerRoles(gameIdString, newRoles);

    //                   setGamePhase(gameIdString, "playing");
    //                   setGameStarted(gameIdString, true);
    //                   setShowOnTV(gameIdString, true);
    //                   startTimer(gameIdString);

    //                   setTempSelectedServer(null);
    //                   setTempSelectedReceiver(null);
    //                   setShowServerSelectionModal(false);
    //                 }
    //               }}
    //               disabled={!tempSelectedServer || !tempSelectedReceiver}
    //             >
    //               <Text style={styles.modalButtonText}>Start Game</Text>
    //             </TouchableOpacity>
    //           </View>
    //         </View>
    //       </View>
    //     </Modal>
    //   );
    // };
    // NEW
    const renderServerSelectionModal = () => {
        const isSingles = currentGameState.isSingles;

        const handleConfirmSelection = async () => {
            if (tempSelectedServer && tempSelectedReceiver) {
                try {
                    const serverKey = tempSelectedServer.toLowerCase();
                    const receiverKey = tempSelectedReceiver.toLowerCase();

                    const serverPlayer = players[serverKey as keyof typeof players];
                    const receiverPlayer = players[receiverKey as keyof typeof players];

                    console.log(
                        `Selected server: ${serverKey.toUpperCase()} - ${serverPlayer}`
                    );
                    console.log(
                        `Selected receiver: ${receiverKey.toUpperCase()} - ${receiverPlayer}`
                    );

                    // Final assignment without shuffling players
                    const finalServer = serverKey;
                    const finalReceiver = receiverKey;

                    setSelectedServer(gameIdString, finalServer);
                    setSelectedReceiver(gameIdString, finalReceiver);

                    const newRoles: Record<
                        "a1" | "a2" | "b1" | "b2",
                        "server" | "receiver" | null
                    > = {
                        a1: null,
                        a2: null,
                        b1: null,
                        b2: null,
                    };

                    newRoles[finalServer as keyof typeof newRoles] = "server";
                    newRoles[finalReceiver as keyof typeof newRoles] = "receiver";

                    setPlayerRoles(gameIdString, newRoles);

                    await updateGameSetResult(gameIdString, currentGameState.currentSet, {
                        currentServer: finalServer.toUpperCase() as "A1" | "A2" | "B1" | "B2",
                        currentReceiver: finalReceiver.toUpperCase() as "A1" | "A2" | "B1" | "B2",
                        firstServer: finalServer.toUpperCase() as "A1" | "A2" | "B1" | "B2",
                        firstReceiver: finalReceiver.toUpperCase() as "A1" | "A2" | "B1" | "B2",
                        aScore: 0,
                        bScore: 0,
                        lastTeamScored: null,
                        currentRound: 0,
                        scoresheet: [],
                    });

                    setGamePhase(gameIdString, "playing");
                    setGameStarted(gameIdString, true);
                    setShowOnTV(gameIdString, true);
                    startTimer(gameIdString);

                    setTempSelectedServer(null);
                    setTempSelectedReceiver(null);
                    setShowServerSelectionModal(false);
                } catch (error) {
                    console.error("Error updating player positions:", error);
                    Alert.alert("Error", "Failed to update player positions");
                }
            }
        };

        return (
            <Modal
                visible={showServerSelectionModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowServerSelectionModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.serverSelectionModalContent}>
                        <Text style={styles.modalTitle}>
                            {tempSelectedServer ? "Select Receiver" : "Select Server"}
                        </Text>

                        {!tempSelectedServer ? (
                            // Server Selection (first step)
                            <>
                                <Text
                                    style={[
                                        styles.sectionTitle,
                                        { textAlign: "center", marginBottom: 10 },
                                    ]}
                                >
                                    {isSingles
                                        ? "Selected player will be set as A1 (server)"
                                        : "Selected player will be moved to A2 (server) position"}
                                </Text>

                                <View style={styles.selectionSection}>
                                    <Text style={styles.sectionTitle}>Select Server:</Text>
                                    <View style={styles.teamsRowContainer}>
                                        {/* Team A */}
                                        <View style={styles.teamColumn}>
                                            <Text style={styles.teamLabel}>Team A</Text>
                                            {!isSingles ? (
                                                <>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.playerSelectionButton,
                                                            tempSelectedServer === "a1" &&
                                                            styles.selectedPlayerButton,
                                                            { backgroundColor: displayTeamAColor },
                                                        ]}
                                                        onPress={() => setTempSelectedServer("a1")}
                                                    >
                                                        <Text style={styles.playerSelectionText}>
                                                            A1: {players.a1}
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.playerSelectionButton,
                                                            tempSelectedServer === "a2" &&
                                                            styles.selectedPlayerButton,
                                                            { backgroundColor: displayTeamAColor },
                                                        ]}
                                                        onPress={() => setTempSelectedServer("a2")}
                                                    >
                                                        <Text style={styles.playerSelectionText}>
                                                            A2: {players.a2}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </>
                                            ) : (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.playerSelectionButton,
                                                        tempSelectedServer === "a1" &&
                                                        styles.selectedPlayerButton,
                                                        { backgroundColor: displayTeamAColor },
                                                    ]}
                                                    onPress={() => setTempSelectedServer("a1")}
                                                >
                                                    <Text style={styles.playerSelectionText}>
                                                        A1: {players.a1}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {/* Team B */}
                                        <View style={styles.teamColumn}>
                                            <Text style={styles.teamLabel}>Team B</Text>
                                            {!isSingles ? (
                                                <>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.playerSelectionButton,
                                                            tempSelectedServer === "b1" &&
                                                            styles.selectedPlayerButton,
                                                            { backgroundColor: displayTeamBColor },
                                                        ]}
                                                        onPress={() => setTempSelectedServer("b1")}
                                                    >
                                                        <Text style={styles.playerSelectionText}>
                                                            B1: {players.b1}
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.playerSelectionButton,
                                                            tempSelectedServer === "b2" &&
                                                            styles.selectedPlayerButton,
                                                            { backgroundColor: displayTeamBColor },
                                                        ]}
                                                        onPress={() => setTempSelectedServer("b2")}
                                                    >
                                                        <Text style={styles.playerSelectionText}>
                                                            B2: {players.b2}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </>
                                            ) : (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.playerSelectionButton,
                                                        tempSelectedServer === "b1" &&
                                                        styles.selectedPlayerButton,
                                                        { backgroundColor: displayTeamBColor },
                                                    ]}
                                                    onPress={() => setTempSelectedServer("b1")}
                                                >
                                                    <Text style={styles.playerSelectionText}>
                                                        B1: {players.b1}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                </View>

                                {/* Cancel Button (only shown in first step) */}
                                <View style={styles.modalButtonsContainer}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.cancelButton]}
                                        onPress={() => {
                                            setTempSelectedServer(null);
                                            setTempSelectedReceiver(null);
                                            setShowServerSelectionModal(false);
                                        }}
                                    >
                                        <Text style={styles.modalButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            // Receiver Selection (second step)
                            <>
                                <Text
                                    style={[
                                        styles.sectionTitle,
                                        { textAlign: "center", marginBottom: 10 },
                                    ]}
                                >
                                    {isSingles
                                        ? "Selected player will be set as the receiver"
                                        : "Selected player will be set as the receiver"}
                                </Text>

                                <View style={styles.selectionSection}>
                                    <Text style={styles.sectionTitle}>Select Receiver:</Text>
                                    <View style={styles.teamsRowContainer}>
                                        {/* Team A */}
                                        <View style={styles.teamColumn}>
                                            <Text style={styles.teamLabel}>Team A</Text>
                                            {!isSingles ? (
                                                <>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.playerSelectionButton,
                                                            tempSelectedReceiver === "a1" &&
                                                            styles.selectedPlayerButton,
                                                            {
                                                                backgroundColor: displayTeamAColor,
                                                                opacity: tempSelectedServer.startsWith("b")
                                                                    ? 1
                                                                    : 0.5,
                                                            },
                                                        ]}
                                                        onPress={() => {
                                                            if (tempSelectedServer.startsWith("b")) {
                                                                setTempSelectedReceiver("a1");
                                                            }
                                                        }}
                                                        disabled={!tempSelectedServer.startsWith("b")}
                                                    >
                                                        <Text style={styles.playerSelectionText}>
                                                            A1: {players.a1}
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.playerSelectionButton,
                                                            tempSelectedReceiver === "a2" &&
                                                            styles.selectedPlayerButton,
                                                            {
                                                                backgroundColor: displayTeamAColor,
                                                                opacity: tempSelectedServer.startsWith("b")
                                                                    ? 1
                                                                    : 0.5,
                                                            },
                                                        ]}
                                                        onPress={() => {
                                                            if (tempSelectedServer.startsWith("b")) {
                                                                setTempSelectedReceiver("a2");
                                                            }
                                                        }}
                                                        disabled={!tempSelectedServer.startsWith("b")}
                                                    >
                                                        <Text style={styles.playerSelectionText}>
                                                            A2: {players.a2}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </>
                                            ) : (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.playerSelectionButton,
                                                        tempSelectedReceiver === "a1" &&
                                                        styles.selectedPlayerButton,
                                                        {
                                                            backgroundColor: displayTeamAColor,
                                                            opacity: tempSelectedServer.startsWith("b")
                                                                ? 1
                                                                : 0.5,
                                                        },
                                                    ]}
                                                    onPress={() => {
                                                        if (tempSelectedServer.startsWith("b")) {
                                                            setTempSelectedReceiver("a1");
                                                        }
                                                    }}
                                                    disabled={!tempSelectedServer.startsWith("b")}
                                                >
                                                    <Text style={styles.playerSelectionText}>
                                                        A1: {players.a1}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {/* Team B */}
                                        <View style={styles.teamColumn}>
                                            <Text style={styles.teamLabel}>Team B</Text>
                                            {!isSingles ? (
                                                <>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.playerSelectionButton,
                                                            tempSelectedReceiver === "b1" &&
                                                            styles.selectedPlayerButton,
                                                            {
                                                                backgroundColor: displayTeamBColor,
                                                                opacity: tempSelectedServer.startsWith("a")
                                                                    ? 1
                                                                    : 0.5,
                                                            },
                                                        ]}
                                                        onPress={() => {
                                                            if (tempSelectedServer.startsWith("a")) {
                                                                setTempSelectedReceiver("b1");
                                                            }
                                                        }}
                                                        disabled={!tempSelectedServer.startsWith("a")}
                                                    >
                                                        <Text style={styles.playerSelectionText}>
                                                            B1: {players.b1}
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.playerSelectionButton,
                                                            tempSelectedReceiver === "b2" &&
                                                            styles.selectedPlayerButton,
                                                            {
                                                                backgroundColor: displayTeamBColor,
                                                                opacity: tempSelectedServer.startsWith("a")
                                                                    ? 1
                                                                    : 0.5,
                                                            },
                                                        ]}
                                                        onPress={() => {
                                                            if (tempSelectedServer.startsWith("a")) {
                                                                setTempSelectedReceiver("b2");
                                                            }
                                                        }}
                                                        disabled={!tempSelectedServer.startsWith("a")}
                                                    >
                                                        <Text style={styles.playerSelectionText}>
                                                            B2: {players.b2}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </>
                                            ) : (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.playerSelectionButton,
                                                        tempSelectedReceiver === "b1" &&
                                                        styles.selectedPlayerButton,
                                                        {
                                                            backgroundColor: displayTeamBColor,
                                                            opacity: tempSelectedServer.startsWith("a")
                                                                ? 1
                                                                : 0.5,
                                                        },
                                                    ]}
                                                    onPress={() => {
                                                        if (tempSelectedServer.startsWith("a")) {
                                                            setTempSelectedReceiver("b1");
                                                        }
                                                    }}
                                                    disabled={!tempSelectedServer.startsWith("a")}
                                                >
                                                    <Text style={styles.playerSelectionText}>
                                                        B1: {players.b1}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                </View>

                                {/* Action Buttons (shown in second step) */}
                                <View style={styles.modalButtonsContainer}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.backButton2]}
                                        onPress={() => {
                                            setTempSelectedReceiver(null);
                                            setTempSelectedServer(null);
                                        }}
                                    >
                                        <Text style={styles.modalButtonText}>Back</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.modalButton,
                                            styles.confirmButton,
                                            { opacity: tempSelectedReceiver ? 1 : 1 },
                                        ]}
                                        onPress={handleConfirmSelection}
                                        disabled={!tempSelectedReceiver}
                                    >
                                        <Text style={styles.modalButtonText}>Start Game</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        );
    };

    const renderCourtBackground = () => {
        const scoreLabelFontSize = Math.max(12, dimensions.height * 0.05);
        const scoreValueFontSize = Math.max(24, dimensions.height * 0.12);
        const trophySize = Math.max(20, dimensions.height * 0.07);

        const currentSetData = sets?.[currentSet - 1] || { aScore: 0, bScore: 0 };
        const isSwitched = currentSetData.switchSide || false;
        const maxScore = Number(params.maxScore) || 21;

        // Determine if the set is over and who won
        const aScore = currentSetData.aScore || 0;
        const bScore = currentSetData.bScore || 0;

        const numSets = Number(currentGameState?.noOfSets) || 1;
        const isOneSet = numSets === 1;
        const plusTwoEnabled = isOneSet ? true : (currentGameState?.plusTwo || false);
        const plusTwoNoLimitEnabled = isOneSet ? true : (currentGameState?.plusTwoNoLimit || false);
        const plusTwoMaxLimit = isOneSet ? 9999 : (currentGameState?.plusTwoMax || 30);

        const leadingScore = Math.max(aScore, bScore);
        const scoreDiff = Math.abs(aScore - bScore);

        let setOver = false;
        if (plusTwoNoLimitEnabled) {
            setOver = leadingScore >= maxScore && scoreDiff >= 2;
        } else if (plusTwoEnabled) {
            setOver = (leadingScore >= maxScore && scoreDiff >= 2) || leadingScore >= plusTwoMaxLimit;
        } else {
            setOver = leadingScore >= maxScore;
        }

        // Only show trophy if set is over AND scores aren't 0-0
        const shouldShowTrophy = setOver && (aScore > 0 || bScore > 0);

        // Determine winner only if we should show trophy
        let showTrophyLeft = false;
        let showTrophyRight = false;

        if (shouldShowTrophy) {
            const aWinsSet = aScore > bScore;
            const actualWinner = aWinsSet ? "A" : "B";

            if (!isSwitched) {
                // Normal case (not switched)
                showTrophyLeft = actualWinner === "A";
                showTrophyRight = actualWinner === "B";
            } else {
                // Switched case - flip the trophy positions
                showTrophyLeft = actualWinner === "B";
                showTrophyRight = actualWinner === "A";
            }
        }

        return (
            <View style={styles.courtContainer}>
                <View style={styles.courtOutline} />
                <View style={styles.rightLineclose} />
                <View style={styles.centerLine} />
                <View style={styles.rightLine} />
                <View style={styles.leftLine} />
                <View style={styles.leftLineclose} />
                <View style={styles.serviceLine} />
                <View style={styles.serviceLine} />
                <Text style={[styles.courtLabel, styles.topLeftLabel]}>L</Text>
                <Text style={[styles.courtLabel, styles.bottomLeftLabel]}>R</Text>
                <Text style={[styles.courtLabel, styles.topRightLabel]}>R</Text>
                <Text style={[styles.courtLabel, styles.bottomRightLabel]}>L</Text>
                <View style={styles.centerCircle}>
                    {gameStarted && (
                        // SCORE BUTTON
                        <View style={styles.scoreContainer}>
                            {/* Team A Score Box (now clickable) */}
                            <TouchableOpacity
                                style={[
                                    styles.scoreBoxA,
                                    {
                                        backgroundColor: isSwitched
                                            ? displayTeamBColor
                                            : displayTeamAColor,
                                        borderColor: "#fff",
                                        borderWidth: showTrophyLeft ? 4 : 2,
                                        opacity: setOver ? 0.7 : 1, // Dim when game is over
                                    },
                                ]}
                                onPress={() => {
                                    if (gamePhase === "playing" && !setOver) {
                                        // Only allow scoring when playing and game not over
                                        const scoringTeam = isSwitched ? "teamB" : "teamA";
                                        const currentScore = teamAScore;
                                        updateScore(gameIdString, scoringTeam, currentScore + 1);
                                    }
                                }}
                                disabled={gamePhase !== "playing" || setOver} // Disable when not playing or game over
                            >
                                <Text style={[styles.scoreLabel, { fontSize: scoreLabelFontSize }]}>
                                    {isSwitched ? displayTeamBName : displayTeamAName}
                                </Text>
                                <Text style={[styles.scoreValue, { fontSize: scoreValueFontSize }]}>
                                    {isSwitched ? displayTeamBScore : displayTeamAScore}
                                </Text>
                                {showTrophyLeft && (
                                    <FontAwesome
                                        name="trophy"
                                        size={trophySize}
                                        color="gold"
                                        style={styles.trophyIcon}
                                    />
                                )}
                                {/* Add server indicator if this team was serving when game ended */}
                                {setOver &&
                                    currentGameState.selectedServer?.startsWith(
                                        isSwitched ? "a" : "b"
                                    ) && (
                                        <MaterialCommunityIcons
                                            name="badminton"
                                            size={24}
                                            color="white"
                                            style={styles.serverIndicator}
                                        />
                                    )}
                            </TouchableOpacity>

                            {/* Team B Score Box */}
                            <TouchableOpacity
                                style={[
                                    styles.scoreBoxB,
                                    {
                                        backgroundColor: isSwitched
                                            ? displayTeamAColor
                                            : displayTeamBColor,
                                        borderColor: "#fff",
                                        borderWidth: showTrophyRight ? 4 : 2,
                                        opacity: setOver ? 0.7 : 1, // Dim when game is over
                                    },
                                ]}
                                onPress={() => {
                                    if (gamePhase === "playing" && !setOver) {
                                        // Only allow scoring when playing and game not over
                                        const scoringTeam = isSwitched ? "teamA" : "teamB";
                                        const currentScore = teamBScore;
                                        updateScore(gameIdString, scoringTeam, currentScore + 1);
                                    }
                                }}
                                disabled={gamePhase !== "playing" || setOver} // Disable when not playing or game over
                            >
                                <Text style={[styles.scoreLabel, { fontSize: scoreLabelFontSize }]}>
                                    {isSwitched ? displayTeamAName : displayTeamBName}
                                </Text>
                                <Text style={[styles.scoreValue, { fontSize: scoreValueFontSize }]}>
                                    {isSwitched ? displayTeamAScore : displayTeamBScore}
                                </Text>
                                {showTrophyRight && (
                                    <FontAwesome
                                        name="trophy"
                                        size={trophySize}
                                        color="gold"
                                        style={styles.trophyIcon}
                                    />
                                )}
                                {/* Add server indicator if this team was serving when game ended */}
                                {setOver &&
                                    currentGameState.selectedServer?.startsWith(
                                        isSwitched ? "a" : "b"
                                    ) && (
                                        <MaterialCommunityIcons
                                            name="badminton"
                                            size={24}
                                            color="white"
                                            style={styles.serverIndicator}
                                        />
                                    )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const renderPlayer = () => {
        const isSingles = currentGameState.isSingles;
        // console.log("isSingles", isSingles);
        const currentSetIndex = currentGameState.currentSet - 1;
        const currentSetData = currentGameState.sets[currentSetIndex] || {};
        const isSwitched = currentSetData.switchSide || false;
        const gameEnded = currentGameState.gamePhase === "finished";
        const winningScore = currentGameState.max;

        const currentAScore = currentSetData.currentAScore || 0;
        const currentBScore = currentSetData.currentBScore || 0;
        const isGameWon =
            currentGameState.teamAScore >= winningScore ||
            currentGameState.teamBScore >= winningScore;

        const playerSize = Math.min(180, (dimensions.height - 120) / 2);
        const playerFontSize = Math.max(12, Math.min(20, playerSize * 0.11));
        const playerRoleFontSize = Math.max(10, Math.min(14, playerSize * 0.08));

        const basePlayerStyle: ViewStyle = {
            position: "absolute",
            width: playerSize,
            height: playerSize,
            borderRadius: playerSize * 0.11,
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 2,
            borderColor: "#fff",
            transform: [{ rotate: "90deg" }],
            backgroundColor: "transparent",
        };

        const localPlayerButtonText = [styles.playerButtonText, { fontSize: playerFontSize }];
        const localPlayerButton2Text = [styles.playerButton2Text, { fontSize: playerFontSize }];
        const localRoleText = { fontWeight: "bold" as const, fontSize: playerRoleFontSize };

        if (isSingles) {
            // ==================== SINGLES RENDER LOGIC ====================
            const displayA1 = isSwitched
                ? currentGameState.originalPlayers.b1
                : currentGameState.originalPlayers.a1;
            const displayB1 = isSwitched
                ? currentGameState.originalPlayers.a1
                : currentGameState.originalPlayers.b1;

            // Positions
            const a1Position = isSwitched ? "B1" : "A1";
            const b1Position = isSwitched ? "A1" : "B1";

            // Role checks
            const isServer = (actualPos: string) => selectedServer === actualPos;
            const isReceiver = (actualPos: string) => selectedReceiver === actualPos;

            const getAVerticalPos = () => {
                const servingTeam = currentGameState.selectedServer?.[0]; // 'a' or 'b'
                const score = servingTeam === "a" ? teamAScore : teamBScore;
                return score % 2 === 0 ? "52.5%" : "11.3%"; // Bottom for even, Top for odd
            };

            const getBVerticalPos = () => {
                const servingTeam = currentGameState.selectedServer?.[0]; // 'a' or 'b'
                const score = servingTeam === "a" ? teamAScore : teamBScore;
                return score % 2 === 0 ? "11.3%" : "52.5%"; // Opposite of A
            };
            // Base style
            const baseStyle: ViewStyle = {
                position: "absolute",
                width: playerSize,
                height: playerSize,
                borderRadius: playerSize * 0.11,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 2,
                borderColor: "#fff",
                transform: [{ rotate: "90deg" }],
            };

            // Team A Box (Left Side)
            const a1Style: ViewStyle = {
                ...baseStyle,

                // backgroundColor: isSwitched ? displayTeamBColor : displayTeamAColor,
                backgroundColor: "#a6a6a6",
                left: "9%",
                top: getAVerticalPos(),
            };

            // Team B Box (Right Side)
            const b1Style: ViewStyle = {
                ...baseStyle,
                // backgroundColor: isSwitched ? displayTeamAColor : displayTeamBColor,
                backgroundColor: "#a6a6a6",
                right: "9%",
                top: getBVerticalPos(),
            };

            const teamAWins =
                (gameEnded || isGameWon) &&
                (currentGameState.teamAFinalScore > currentGameState.teamBFinalScore ||
                    (currentAScore >= winningScore && !isSwitched) ||
                    (currentBScore >= winningScore && isSwitched));

            const teamBWins =
                (gameEnded || isGameWon) &&
                (currentGameState.teamBFinalScore > currentGameState.teamAFinalScore ||
                    (currentBScore >= winningScore && !isSwitched) ||
                    (currentAScore >= winningScore && isSwitched));

            return (
                <>
                    {/* Team A Player (Left Side) */}
                    <TouchableOpacity
                        style={a1Style}
                        onPress={() => {
                            if (gamePhase === "server-selection") {
                                handleServerSelection("a1");
                            } else if (gamePhase === "receiver-selection") {
                                handleReceiverSelection("a1");
                            }
                        }}
                        disabled={gamePhase === "playing" || gamePhase === "finished"}
                    >
                        <Text style={localPlayerButtonText}>
                            {/* {a1Position}:  */}
                            {displayA1}
                        </Text>
                        {isServer("a1") && (
                            <Text style={localRoleText}>
                                {" "}
                                {isSwitched ? "Receiver" : "Server"}{" "}
                            </Text>
                        )}
                        {isReceiver("a1") && (
                            <Text style={localRoleText}>
                                {" "}
                                {isSwitched ? "Server" : "Receiver"}{" "}
                            </Text>
                        )}

                    </TouchableOpacity>

                    {/* Team B Player (Right Side) */}
                    <TouchableOpacity
                        style={b1Style}
                        onPress={() => {
                            if (gamePhase === "server-selection") {
                                handleServerSelection("b1");
                            } else if (gamePhase === "receiver-selection") {
                                handleReceiverSelection("b1");
                            }
                        }}
                        disabled={gamePhase === "playing" || gamePhase === "finished"}
                    >
                        <Text style={localPlayerButton2Text}>
                            {/* {b1Position}:  */}
                            {displayB1}
                        </Text>
                        {isServer("b1") && (
                            <Text style={localRoleText}>
                                {" "}
                                {isSwitched ? "Receiver" : "Server"}{" "}
                            </Text>
                        )}
                        {isReceiver("b1") && (
                            <Text style={localRoleText}>
                                {" "}
                                {isSwitched ? "Server" : "Receiver"}{" "}
                            </Text>
                        )}

                    </TouchableOpacity>
                </>
            );
        } else {
            // ==================== DOUBLES RENDER LOGIC ====================
            const currentSetIndex = currentGameState.currentSet - 1;
            const currentSetData = currentGameState.sets[currentSetIndex] || {};
            const isSwitched = currentSetData.switchSide || false;

            // Swapping states
            const swappedA1 = currentGameState.swappedPlayers?.a1 || false;
            const swappedA2 = currentGameState.swappedPlayers?.a2 || false;
            const swappedB1 = currentGameState.swappedPlayers?.b1 || false;
            const swappedB2 = currentGameState.swappedPlayers?.b2 || false;

            // Original players
            const originalA1 = currentGameState.originalPlayers.a1;
            const originalA2 = currentGameState.originalPlayers.a2;
            const originalB1 = currentGameState.originalPlayers.b1;
            const originalB2 = currentGameState.originalPlayers.b2;

            // Apply swapping - both visual and logical
            const teamAPlayer1 = swappedA1
                ? { name: originalA2, pos: "a2" }
                : { name: originalA1, pos: "a1" };
            const teamAPlayer2 = swappedA2
                ? { name: originalA1, pos: "a1" }
                : { name: originalA2, pos: "a2" };
            const teamBPlayer1 = swappedB1
                ? { name: originalB2, pos: "b2" }
                : { name: originalB1, pos: "b1" };
            const teamBPlayer2 = swappedB2
                ? { name: originalB1, pos: "b1" }
                : { name: originalB2, pos: "b2" };

            // Apply side switching
            const displayA1 = isSwitched ? teamBPlayer1.name : teamAPlayer1.name;
            const displayA2 = isSwitched ? teamBPlayer2.name : teamAPlayer2.name;
            const displayB1 = isSwitched ? teamAPlayer1.name : teamBPlayer1.name;
            const displayB2 = isSwitched ? teamAPlayer2.name : teamBPlayer2.name;

            // Actual positions considering both swapping and side switching
            const a1ActualPos = isSwitched ? teamBPlayer1.pos : teamAPlayer1.pos;
            const a2ActualPos = isSwitched ? teamBPlayer2.pos : teamAPlayer2.pos;
            const b1ActualPos = isSwitched ? teamAPlayer1.pos : teamBPlayer1.pos;
            const b2ActualPos = isSwitched ? teamAPlayer2.pos : teamBPlayer2.pos;

            // Role check functions
            const isServer = (actualPos: string) =>
                currentGameState.selectedServer != null &&
                currentGameState.selectedServer === actualPos;

            const isReceiver = (actualPos: string) =>
                currentGameState.selectedReceiver != null &&
                currentGameState.selectedReceiver === actualPos;

            // Switch HERE DARI I FIX ANG SA SWITCHING
            const getTeamAVerticalPos = (playerPos: string) => {
                if (gameEnded || isGameWon) {
                    return playerPos.endsWith("1") ? "52%" : "11%"; // Fixed positions for finished game
                }
                const servingTeam = currentGameState.selectedServer?.[0]; // 'a' or 'b'
                const score =
                    servingTeam === "a"
                        ? currentSetData.currentAScore
                        : currentSetData.currentBScore;
                const isEvenScore = score % 2 === 0;

                if (isSwitched) {
                    // Team B is on Team A's side
                    if (servingTeam === "b") {
                        // Team B is serving
                        if (currentGameState.selectedServer === playerPos) {
                            return isEvenScore ? "52%" : "11%"; // Server: bottom (right), top (left)
                        } else if (currentGameState.selectedReceiver === playerPos) {
                            return isEvenScore ? "11%" : "52%"; // Receiver: opposite of server
                        } else if (
                            playerPos === teamBPlayer1.pos ||
                            playerPos === teamBPlayer2.pos
                        ) {
                            return isEvenScore ? "11%" : "52%"; // Non-serving partner: opposite of server
                        }
                    } else {
                        // Team A is serving, Team B is receiving
                        if (currentGameState.selectedReceiver === playerPos) {
                            return isEvenScore ? "52%" : "11%"; // Receiver: bottom (right), top (left)
                        } else if (
                            playerPos === teamBPlayer1.pos ||
                            playerPos === teamBPlayer2.pos
                        ) {
                            return isEvenScore ? "11%" : "52%"; // Non-receiving partner: opposite of receiver
                        }
                    }
                } else {
                    // Team A is on Team A's side
                    if (servingTeam === "a") {
                        // Team A is serving
                        if (currentGameState.selectedServer === playerPos) {
                            return isEvenScore ? "52%" : "11%"; // Server: bottom (right), top (left)
                        } else if (currentGameState.selectedReceiver === playerPos) {
                            return isEvenScore ? "11%" : "52%"; // Receiver: opposite of server
                        } else if (
                            playerPos === teamAPlayer1.pos ||
                            playerPos === teamAPlayer2.pos
                        ) {
                            return isEvenScore ? "11%" : "52%"; // Non-serving partner: opposite of server
                        }
                        console.log(
                            "this is Serving Team A",
                            servingTeam,
                            currentGameState.selectedServer,
                            playerPos
                        );
                    } else {
                        // Team B is serving, Team A is receiving
                        if (currentGameState.selectedReceiver === playerPos) {
                            return isEvenScore ? "52%" : "11%"; // Receiver: bottom (right), top (left)
                        } else if (
                            playerPos === teamAPlayer1.pos ||
                            playerPos === teamAPlayer2.pos
                        ) {
                            return isEvenScore ? "11%" : "52%"; // Non-receiving partner: opposite of receiver
                        }
                    }
                }
                return "50%"; // Fallback
            };

            // Switch
            const getTeamBVerticalPos = (playerPos: string) => {
                if (gameEnded || isGameWon) {
                    return playerPos.endsWith("2") ? "52%" : "11%"; // Fixed positions for finished game
                }

                const servingTeam = currentGameState.selectedServer?.[0]; // 'a' or 'b'
                const score =
                    servingTeam === "a"
                        ? currentSetData.currentAScore
                        : currentSetData.currentBScore;
                const isEvenScore = score % 2 === 0;

                if (isSwitched) {
                    // Team A is on Team B's side
                    if (servingTeam === "a") {
                        // Team A is serving
                        if (currentGameState.selectedServer === playerPos) {
                            return isEvenScore ? "11%" : "52%"; // Server: top (right), bottom (left)
                        } else if (currentGameState.selectedReceiver === playerPos) {
                            return isEvenScore ? "52%" : "11%"; // Receiver: opposite of server
                        } else if (
                            playerPos === teamAPlayer1.pos ||
                            playerPos === teamAPlayer2.pos
                        ) {
                            return isEvenScore ? "52%" : "11%"; // Non-serving partner: opposite of server
                        }
                    } else {
                        // Team B is serving, Team A is receiving
                        if (currentGameState.selectedReceiver === playerPos) {
                            return isEvenScore ? "11%" : "52%"; // Receiver: top (right), bottom (left)
                        } else if (
                            playerPos === teamAPlayer1.pos ||
                            playerPos === teamAPlayer2.pos
                        ) {
                            return isEvenScore ? "52%" : "11%"; // Non-receiving partner: opposite of receiver
                        }
                    }
                } else {
                    // Team B is on Team B's side
                    if (servingTeam === "b") {
                        // Team B is serving
                        if (currentGameState.selectedServer === playerPos) {
                            return isEvenScore ? "11%" : "52%"; // Server: top (right), bottom (left)
                        } else if (currentGameState.selectedReceiver === playerPos) {
                            return isEvenScore ? "52%" : "11%"; // Receiver: opposite of server
                        } else if (
                            playerPos === teamBPlayer1.pos ||
                            playerPos === teamBPlayer2.pos
                        ) {
                            return isEvenScore ? "52%" : "11%"; // Non-serving partner: opposite of server
                        }
                    } else {
                        // Team A is serving, Team B is receiving here
                        if (currentGameState.selectedReceiver === playerPos) {
                            return isEvenScore ? "11%" : "52%"; // Receiver: top (right), bottom (left)
                        } else if (
                            playerPos === teamBPlayer1.pos ||
                            playerPos === teamBPlayer2.pos
                        ) {
                            return isEvenScore ? "52%" : "11%"; // Non-receiving partner: opposite of receiver
                        }
                    }
                }
                return "50%";
            };

            return (
                <>
                    {/* Player A1 */}
                    <TouchableOpacity
                        style={[
                            basePlayerStyle,
                            {
                                left: "9%", // Left side
                                top: getTeamAVerticalPos(a1ActualPos),
                                // backgroundColor: isSwitched
                                //   ? displayTeamBColor
                                //   : displayTeamAColor,
                                backgroundColor: "#a6a6a6"
                            },
                            isServer(a1ActualPos) && styles.selectedTeamAPlayer,
                            isReceiver(a1ActualPos) && styles.selectedTeamAPlayer,
                        ]}
                        onPress={() => {
                            if (gamePhase === "server-selection") {
                                handleServerSelection(a1ActualPos);
                            } else if (gamePhase === "receiver-selection") {
                                const serverTeam = currentGameState.selectedServer?.[0];
                                const shouldAllowSelection =
                                    (isSwitched && serverTeam === "a") ||
                                    (!isSwitched && serverTeam === "b");

                                if (shouldAllowSelection) {
                                    handleReceiverSelection(a1ActualPos);
                                }
                            }
                        }}
                        disabled={
                            gamePhase === "playing" ||
                            gamePhase === "finished" ||
                            (gamePhase === "receiver-selection" &&
                                ((isSwitched &&
                                    currentGameState.selectedServer?.startsWith("b")) ||
                                    (!isSwitched &&
                                        currentGameState.selectedServer?.startsWith("a"))))
                        }
                    >
                        <Text style={localPlayerButtonText}>{displayA1}</Text>
                        {(isServer(a1ActualPos) ||
                            (gamePhase === "finished" &&
                                currentSetData.selectedServer === a1ActualPos)) && (
                                <Text style={localRoleText}>
                                    {" "}
                                    {isSwitched ? "Receiver" : "Server"}{" "}
                                </Text>
                            )}
                        {(isReceiver(a1ActualPos) ||
                            (gamePhase === "finished" &&
                                currentSetData.selectedReceiver === a1ActualPos)) && (
                                <Text style={localRoleText}>
                                    {" "}
                                    {isSwitched ? "Server" : "Receiver"}{" "}
                                </Text>
                            )}
                    </TouchableOpacity>

                    {/* Player A2 */}
                    <TouchableOpacity
                        style={[
                            basePlayerStyle,
                            {
                                left: "9%", // Left side
                                top: getTeamAVerticalPos(a2ActualPos),
                                backgroundColor: "#a6a6a6"
                            },
                            isServer(a2ActualPos) && styles.selectedTeamAPlayer,
                            isReceiver(a2ActualPos) && styles.selectedTeamAPlayer,
                        ]}
                        onPress={() => {
                            if (gamePhase === "server-selection") {
                                handleServerSelection(a2ActualPos);
                            } else if (gamePhase === "receiver-selection") {
                                const serverTeam = currentGameState.selectedServer?.[0];
                                const shouldAllowSelection =
                                    (isSwitched && serverTeam === "a") ||
                                    (!isSwitched && serverTeam === "b");

                                if (shouldAllowSelection) {
                                    handleReceiverSelection(a2ActualPos);
                                }
                            }
                        }}
                        disabled={
                            gamePhase === "playing" ||
                            gamePhase === "finished" ||
                            (gamePhase === "receiver-selection" &&
                                ((isSwitched &&
                                    currentGameState.selectedServer?.startsWith("b")) ||
                                    (!isSwitched &&
                                        currentGameState.selectedServer?.startsWith("a"))))
                        }
                    >
                        <Text style={localPlayerButtonText}>{displayA2}</Text>
                        {(isServer(a2ActualPos) ||
                            (gamePhase === "finished" &&
                                currentSetData.selectedServer === a2ActualPos)) && (
                                <Text style={localRoleText}>
                                    {" "}
                                    {isSwitched ? "Receiver" : "Server"}{" "}
                                </Text>
                            )}
                        {(isReceiver(a2ActualPos) ||
                            (gamePhase === "finished" &&
                                currentSetData.selectedReceiver === a2ActualPos)) && (
                                <Text style={localRoleText}>
                                    {" "}
                                    {isSwitched ? "Server" : "Receiver"}{" "}
                                </Text>
                            )}
                    </TouchableOpacity>

                    {/* Player B1 */}
                    <TouchableOpacity
                        style={[
                            basePlayerStyle,
                            {
                                right: "9%", // Right side
                                top: getTeamBVerticalPos(b1ActualPos),
                                backgroundColor: "#a6a6a6"
                            },
                            isServer(b1ActualPos) && styles.selectedTeamBPlayer,
                            isReceiver(b1ActualPos) && styles.selectedTeamBPlayer,
                        ]}
                        onPress={() => {
                            if (gamePhase === "server-selection") {
                                handleServerSelection(b1ActualPos);
                            } else if (gamePhase === "receiver-selection") {
                                const serverTeam = currentGameState.selectedServer?.[0];
                                const shouldAllowSelection =
                                    (isSwitched && serverTeam === "b") ||
                                    (!isSwitched && serverTeam === "a");

                                if (shouldAllowSelection) {
                                    handleReceiverSelection(b1ActualPos);
                                }
                            }
                        }}
                        disabled={
                            gamePhase === "playing" ||
                            gamePhase === "finished" ||
                            (gamePhase === "receiver-selection" &&
                                ((isSwitched &&
                                    currentGameState.selectedServer?.startsWith("a")) ||
                                    (!isSwitched &&
                                        currentGameState.selectedServer?.startsWith("b"))))
                        }
                    >
                        <Text style={localPlayerButton2Text}>{displayB1}</Text>
                        {(isServer(b1ActualPos) ||
                            (gamePhase === "finished" &&
                                currentSetData.selectedServer === b1ActualPos)) && (
                                <Text style={localRoleText}>
                                    {" "}
                                    {isSwitched ? "Receiver" : "Server"}{" "}
                                </Text>
                            )}
                        {(isReceiver(b1ActualPos) ||
                            (gamePhase === "finished" &&
                                currentSetData.selectedReceiver === b1ActualPos)) && (
                                <Text style={localRoleText}>
                                    {" "}
                                    {isSwitched ? "Server" : "Receiver"}{" "}
                                </Text>
                            )}
                    </TouchableOpacity>

                    {/* Player B2 */}
                    <TouchableOpacity
                        style={[
                            basePlayerStyle,
                            {
                                right: "9%", // Right side
                                top: getTeamBVerticalPos(b2ActualPos),
                                backgroundColor: "#a6a6a6"
                            },
                            isServer(b2ActualPos) && styles.selectedTeamBPlayer,
                            isReceiver(b2ActualPos) && styles.selectedTeamBPlayer,
                        ]}
                        onPress={() => {
                            if (gamePhase === "server-selection") {
                                handleServerSelection(b2ActualPos);
                            } else if (gamePhase === "receiver-selection") {
                                const serverTeam = currentGameState.selectedServer?.[0];
                                const shouldAllowSelection =
                                    (isSwitched && serverTeam === "b") ||
                                    (!isSwitched && serverTeam === "a");

                                if (shouldAllowSelection) {
                                    handleReceiverSelection(b2ActualPos);
                                }
                            }
                        }}
                        disabled={
                            gamePhase === "playing" ||
                            gamePhase === "finished" ||
                            (gamePhase === "receiver-selection" &&
                                ((isSwitched &&
                                    currentGameState.selectedServer?.startsWith("a")) ||
                                    (!isSwitched &&
                                        currentGameState.selectedServer?.startsWith("b"))))
                        }
                    >
                        <Text style={localPlayerButton2Text}>{displayB2}</Text>
                        {(isServer(b2ActualPos) ||
                            (gamePhase === "finished" &&
                                currentSetData.selectedServer === b2ActualPos)) && (
                                <Text style={localRoleText}>
                                    {" "}
                                    {isSwitched ? "Receiver" : "Server"}{" "}
                                </Text>
                            )}
                        {(isReceiver(b2ActualPos) ||
                            (gamePhase === "finished" &&
                                currentSetData.selectedReceiver === b2ActualPos)) && (
                                <Text style={localRoleText}>
                                    {" "}
                                    {isSwitched ? "Server" : "Receiver"}{" "}
                                </Text>
                            )}
                    </TouchableOpacity>

                    {/* Team A Swap Button */}
                    <TouchableOpacity
                        style={[styles.swapButton, styles.teamASwapButton]}
                        onPress={isSwitched ? swapTeamBPlayers : swapTeamAPlayers}
                    >
                        <AntDesign name="swap" size={20} color="white" />
                    </TouchableOpacity>

                    {/* Team B Swap Button */}
                    <TouchableOpacity
                        style={[styles.swapButton, styles.teamBSwapButton]}
                        onPress={isSwitched ? swapTeamAPlayers : swapTeamBPlayers}
                    >
                        <AntDesign name="swap" size={20} color="white" />
                    </TouchableOpacity>
                </>
            );
        }
    };

    const scoreButton = () => {
        const currentSetIndex = currentGameState.currentSet - 1;
        const currentSetData = currentGameState.sets[currentSetIndex] || {};
        const isSwitched = currentSetData.switchSide || false;

        return (
            <View style={styles.scoreButtonsContainer}>
                {/* TIMER */}
                <View style={styles.timerContainer}>
                    <Text style={styles.setsText}>Best of {noOfSets}</Text>
                    <View style={styles.timerBackground}>
                        <Text style={styles.timerText}>{formatTime(time)}</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case "Score":
                return (
                    <View style={styles.scoreTabContainer}>
                        {renderCourtBackground()}
                        {currentGameState.gameStarted ? (
                            <>
                                {renderPlayer()}
                                {scoreButton()}
                            </>
                        ) : (
                            <TouchableOpacity
                                style={styles.startButton}
                                // onPress={() => { // HERE
                                //   handleStartPause();
                                //   setGameStarted(gameIdString, true);
                                // }}
                                onPress={() => {
                                    setShowServerSelectionModal(true);
                                }}
                            >
                                <Text style={styles.startButtonText}>START</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );
            // case "Scoresheet":
            //   return (
            //     // <View style={styles.tabContent}>
            //     //   <Text style={styles.tabText}>Scoresheet Content</Text>
            //     // </View>
            //     <Scoresheet 
            //     gameId={gameIdString}
            //     players={{
            //       A1: players.a1,
            //       A2: players.a2,
            //       B1: players.b1,
            //       B2: players.b2,
            //     }}
            //   />
            //   );
            case "Settings":
                return (
                    <SettingsTab
                        gameId={gameIdString}
                        resetGame={resetGame}
                        updateScore={updateScore}
                        currentSet={currentSet}
                        sets={sets || []}
                    />
                );
            // case "Details":
            //   return (
            //     <View style={styles.tabContent}>
            //       <Text style={styles.tabText}>Details Content</Text>
            //     </View>
            //   );
            default:
                return null;
        }
    };

    if (!fontsLoaded) {
        return (
            <View style={styles.tabContent}>
                <Text style={styles.tabText}>Loading...</Text>
            </View>
        );
    }

    const setItems = generateSetItems();
    const currentSetItem = setItems.find((item) => item.value === currentSet) || {
        aScore: 0,
        bScore: 0,
    };

    const calculateMatchScore = () => {
        if (!sets || sets.length === 0) return { teamAScore: 0, teamBScore: 0 };

        let teamAScore = 0;
        let teamBScore = 0;

        sets.forEach((set: any) => {
            teamAScore += set.aScore || 0;
            teamBScore += set.bScore || 0;
        });

        return { teamAScore, teamBScore };
    };

    const calculateSetsWon = () => {
        if (!sets || sets.length === 0) return { teamASets: 0, teamBSets: 0 };

        let teamASets = 0;
        let teamBSets = 0;

        sets.forEach((set: any) => {
            if (set.aScore > set.bScore) {
                teamASets++;
            } else if (set.bScore > set.aScore) {
                teamBSets++;
            }
        });

        return { teamASets, teamBSets };
    };

    const controlButtonPaddingHorizontal = dimensions.width < 750 ? 8 : Math.max(6, Math.min(16, dimensions.width * 0.015));
    const controlButtonPaddingVertical = dimensions.width < 750 ? 5 : Math.max(4, Math.min(8, dimensions.height * 0.018));
    const controlButtonFontSize = dimensions.width < 750 ? 10 : Math.max(9, Math.min(14, dimensions.height * 0.03));
    const controlIconSize = dimensions.width < 750 ? 12 : Math.max(11, Math.min(17, dimensions.height * 0.038));
    const headerHeight = Math.max(42, dimensions.height * 0.08);
    const setsDropdownWidth = dimensions.width < 750 ? 95 : Math.max(120, dimensions.width * 0.16);
    const setsDropdownHeight = Math.max(32, dimensions.height * 0.065);
    const buttonGap = dimensions.width < 750 ? 6 : 8;
    const scoreTextFontSize = dimensions.width < 750 ? 14 : 16;
    const switchSidesText = dimensions.width < 750 ? "SWITCH" : "SWITCH SIDES";

    return (
        <View
            style={[
                styles.container,
                { width: dimensions.width, height: dimensions.height },
            ]}
        >
            {/* Header with Back button and Tabs */}
            <View style={styles.header}>
                {/* Back button */}
                <Link href="/(tabs)/(games)" asChild>
                    <TouchableOpacity style={styles.backButton}>
                        <AntDesign name="arrow-left" size={24} color="white" />
                    </TouchableOpacity>
                </Link>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === "Score" && styles.activeTab]}
                        onPress={() => setActiveTab("Score")}
                    >
                        <Text style={styles.tabText}>Score</Text>
                    </TouchableOpacity>

                    {/* <TouchableOpacity
        style={[styles.tab, activeTab === "Scoresheet" && styles.activeTab]}
        onPress={() => setActiveTab("Scoresheet")}
      >
        <Text style={styles.tabText}>Scoresheet</Text>
      </TouchableOpacity> */}

                    <TouchableOpacity
                        style={[styles.tab, activeTab === "Settings" && styles.activeTab]}
                        onPress={() => setActiveTab("Settings")}
                    >
                        <Text style={styles.tabText}>Settings</Text>
                    </TouchableOpacity>

                    {/* <TouchableOpacity
        style={[styles.tab, activeTab === "Details" && styles.activeTab]}
        onPress={() => setActiveTab("Details")}
      >
        <Text style={styles.tabText}>Details</Text>
      </TouchableOpacity> */}
                </View>
            </View>

            <View style={[styles.headerContainer, { height: headerHeight }]}>
                {/* Left section - Dropdown and score */}
                <View style={styles.headerLeftSection}>
                    <DropDownPicker
                        open={setsDropdownOpen}
                        setOpen={setSetsDropdownOpen}
                        value={currentSet}
                        setValue={handleSetChange}
                        items={generateSetItems()}
                        placeholder="Select Set"
                        containerStyle={{ width: setsDropdownWidth, height: setsDropdownHeight }}
                        style={[styles.setsDropdown, { width: setsDropdownWidth, height: setsDropdownHeight, minHeight: setsDropdownHeight, paddingVertical: 0, paddingHorizontal: 6 }]}
                        dropDownContainerStyle={[styles.setsDropdownList, { width: setsDropdownWidth }]}
                        textStyle={[styles.setsDropdownText, { fontSize: Math.max(10, controlButtonFontSize + 1) }]}
                        listMode="SCROLLVIEW"
                        onChangeValue={(value) => {
                            if (value) {
                                handleSetChange(value);
                            }
                        }}
                    />

                    <Text style={[styles.scoreText, { fontSize: scoreTextFontSize }]}>
                        {(() => {
                            const { teamASets, teamBSets } = calculateSetsWon();
                            const currentSetData = sets?.[currentSet - 1] || {
                                aScore: 0,
                                bScore: 0,
                            };
                            const isSwitched = currentSetData.switchSide || false;

                            const displaySetA = currentSetData.aScore;
                            const displaySetB = currentSetData.bScore;

                            return (
                                <>
                                    {isSwitched
                                        ? `${teamBSets} - ${teamASets} `
                                        : `${teamASets} - ${teamBSets} `}
                                </>
                            );
                        })()}
                    </Text>
                </View>

                {/* Show and Hide */}
                <View style={[styles.headerRightSection, { gap: buttonGap }]}>
                    <TouchableOpacity
                        style={[
                            currentGameState.showOnTV
                                ? styles.controlButtonHide
                                : styles.controlButtonShow,
                            { paddingHorizontal: controlButtonPaddingHorizontal, paddingVertical: controlButtonPaddingVertical },
                        ]}
                        onPress={() => {
                            setShowOnTV(gameIdString, !currentGameState.showOnTV);
                        }}
                    >
                        {currentGameState.showOnTV ? (
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <MaterialCommunityIcons name="eye-off" size={controlIconSize} color="white" style={{ marginRight: 6 }} />
                                <Text style={[styles.controlButtonText, { fontSize: controlButtonFontSize }]}>HIDE</Text>
                            </View>
                        ) : (
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <MaterialCommunityIcons name="eye" size={controlIconSize} color="white" style={{ marginRight: 6 }} />
                                <Text style={[styles.controlButtonText, { fontSize: controlButtonFontSize }]}>SHOW</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.controlButton,
                            {
                                paddingHorizontal: controlButtonPaddingHorizontal,
                                paddingVertical: controlButtonPaddingVertical,
                                opacity:
                                    currentSetData.aScore > 0 || currentSetData.bScore > 0
                                        ? 0.5
                                        : 1,
                            },
                        ]}
                        onPress={() => {
                            swapTeams(gameIdString);
                        }}
                        disabled={currentSetData.aScore > 0 || currentSetData.bScore > 0}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Octicons name="arrow-switch" size={controlIconSize} style={{ marginRight: dimensions.width < 750 ? 4 : 8 }} color="white" />
                            <Text style={[styles.controlButtonText, { fontSize: controlButtonFontSize }]}>{switchSidesText}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.controlButton,
                            {
                                paddingHorizontal: controlButtonPaddingHorizontal,
                                paddingVertical: controlButtonPaddingVertical,
                                backgroundColor: "#2196F3",
                                opacity: canUndo(gameIdString) ? 1 : 0.5,
                            },
                        ]}
                        onPress={() => {
                            console.log('[FRONTEND] Current scores before undo:', {
                                teamAScore: currentGameState.teamAScore,
                                teamBScore: currentGameState.teamBScore,
                                currentSet: currentGameState.currentSet
                            });

                            undoAction(gameIdString);

                            // Add a slight delay to log after state update
                            setTimeout(() => {
                                console.log('[FRONTEND] Current scores after undo:', {
                                    teamAScore: gamesState[gameIdString]?.teamAScore,
                                    teamBScore: gamesState[gameIdString]?.teamBScore,
                                    currentSet: gamesState[gameIdString]?.currentSet
                                });
                            }, 100);
                        }}
                        disabled={!canUndo(gameIdString)}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <MaterialCommunityIcons name="undo" size={controlIconSize} style={{ marginRight: 6 }} color="white" />
                            <Text style={[styles.controlButtonText, { fontSize: controlButtonFontSize }]}>UNDO</Text>
                        </View>
                    </TouchableOpacity>

                    <Modal
                        visible={showFinishModal}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setShowFinishModal(false)}
                    >
                        <View
                            style={[
                                styles.modalContainer,
                                { backgroundColor: "rgba(0,0,0,0.7)" },
                            ]}
                        >
                            <View style={styles.confirmationModalContent}>
                                <Text style={styles.confirmationModalTitle}>
                                    Confirm Finish Game
                                </Text>
                                <Text style={styles.confirmationModalText}>
                                    Are you sure you want to finish this game?
                                </Text>
                                <View style={styles.confirmationModalButtons}>
                                    <TouchableOpacity
                                        style={[
                                            styles.confirmationModalButton,
                                            styles.cancelButton,
                                        ]}
                                        onPress={() => setShowFinishModal(false)}
                                    >
                                        <Text style={styles.confirmationModalButtonText}>
                                            CANCEL
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.confirmationModalButton,
                                            styles.confirmButton,
                                        ]}
                                        onPress={async () => {
                                            try {
                                                await finishGame(gameIdString, false);
                                                setGamePhase(gameIdString, "finished");
                                                setShowFinishModal(false);
                                            } catch (error) {
                                                Alert.alert("Error", "Failed to finish game");
                                                setShowFinishModal(false);
                                            }
                                        }}
                                    >
                                        <Text style={styles.confirmationModalButtonText}>
                                            CONFIRM
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                    <TouchableOpacity
                        style={[
                            styles.controlButton,
                            {
                                paddingHorizontal: controlButtonPaddingHorizontal,
                                paddingVertical: controlButtonPaddingVertical,
                                backgroundColor: "#f44336",
                            },
                        ]}
                        onPress={() => setShowFinishModal(true)}
                    >
                        <Text style={[styles.controlButtonText, { fontSize: controlButtonFontSize }]}>FINISH</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {renderTabContent()}
            {/* HERE */}
            {renderServerSelectionModal()}
        </View>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#1a1a1a",
        marginTop: -20,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 40,
        paddingHorizontal: 20,
        zIndex: 10,
    },
    backButton: {
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: 10,
        borderRadius: 5,
        marginRight: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    backButton2: {
        backgroundColor: "#f44336",
        padding: 10,
        borderRadius: 5,
        marginRight: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    tabsContainer: {
        flexDirection: "row",
        flex: 1,
        justifyContent: "space-around",
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: "rgba(255,255,255,0.2)",
    },
    tabText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    tabContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    maxScore: {
        color: "white",
        fontSize: 16,
        marginTop: 5,
    },
    setsText: {
        color: "white",
        fontSize: 16,
        textAlign: "center",
        marginBottom: 5,
    },
    scoreboard: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 40,
    },
    teamContainer: {
        alignItems: "center",
        flex: 1,
    },
    teamName: {
        color: "#fff",
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 10,
        textShadowColor: "rgba(0,0,0,0.8)",
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    teamScore: {
        color: "#fff",
        fontSize: 48,
        fontWeight: "bold",
        textShadowColor: "rgba(0,0,0,0.8)",
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    timerBox: {
        justifyContent: "center",
        alignItems: "center",
        width: 170,
    },
    timerContainer: {
        justifyContent: "center",
        alignItems: "center",
        width: 170,
    },
    timerBackground: {
        backgroundColor: "#333",
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        borderWidth: 2,
        borderColor: "yellow",
    },
    timerText: {
        color: "#ffeb3b",
        fontSize: 24,
        fontFamily: "Orbitron_700Bold",
        textAlign: "center",
        includeFontPadding: false,
        width: "100%",
        marginLeft: -1,
        textAlignVertical: "center",
    },
    startButton: {
        position: "absolute",
        top: "50%",
        alignSelf: "center",
        backgroundColor: "#fae716",
        width: 150,
        height: 150,
        borderRadius: 75,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 10,
        transform: [{ translateY: -75 }],
    },
    startButtonText: {
        color: "black",
        fontSize: 24,
        fontWeight: "bold",
    },
    scoreTabContainer: {
        flex: 1,
        backgroundColor: "#2a5c40",
    },
    courtContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    courtOutline: {
        position: "absolute",
        width: "98%",
        height: "97%",
        marginTop: 5,
        borderWidth: 2,
        borderColor: "#fff",
        borderRadius: 10,
    },
    centerLine: {
        position: "absolute",
        width: "98%",
        bottom: "8%",
        height: 2,
        backgroundColor: "#fff",
    },
    rightLine: {
        //kani
        position: "absolute",
        width: "30.3%",
        right: 10,
        height: 2,
        backgroundColor: "#fff",
    },
    rightLineclose: {
        position: "absolute",
        width: 2,
        right: 52,
        height: "97%",
        backgroundColor: "#fff",
        marginTop: 7,
    },
    leftLine: {
        position: "absolute",
        width: "30.3%",
        left: 10,
        height: 2,
        backgroundColor: "#fff",
    },
    leftLineclose: {
        position: "absolute",
        width: 2,
        left: 52,
        height: "97%",
        backgroundColor: "#fff",
        marginTop: 7,
    },
    serviceLine: {
        position: "absolute",
        width: "98%",
        height: 2,
        backgroundColor: "#fff",
        top: "9%",
    },
    centerCircle: {
        //Center sa court
        position: "absolute",
        width: "38%",
        height: "97%",
        borderWidth: 2,
        borderColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 5,
    },
    scoreContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "90%",
        height: "80%",
    },
    scoreBoxA: {
        width: "47%",
        height: "75%",
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#fff",
    },
    scoreBoxB: {
        width: "47%",
        height: "75%",
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#fff",
    },
    scoreLabel: {
        fontSize: 30,
        fontWeight: "bold",
    },
    scoreValue: {
        fontSize: 65,
        fontWeight: "bold",
    },
    scoreButtonsContainer: {
        position: "absolute",
        flexDirection: "row",
        alignItems: "center",
        width: "80%",
        bottom: "4%",
        alignSelf: "center",
        justifyContent: "center",
        gap: 14,
    },
    scoreButtonA: {
        width: 140,
        height: 100,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#fff",
    },
    scoreButtonAText: {
        color: "#000",
        fontSize: 20,
        fontWeight: "bold",
    },
    scoreButtonB: {
        width: 140,
        height: 100,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#fff",
    },
    scoreButtonBText: {
        color: "#000",
        fontSize: 20,
        fontWeight: "bold",
    },
    playerButton: {
        position: "absolute",
        width: 120,
        height: 80,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
    },
    playerA1Singles: {
        top: "63%",
        left: "10%",
        backgroundColor: "#ffc067",
    },
    playerB1Singles: {
        top: "21%",
        right: "10%",
        backgroundColor: "#a8dcab",
    },
    playerA1Doubles: {
        top: "10%",
        left: "10%",
        backgroundColor: "#ffc067",
    },
    playerA2Doubles: {
        bottom: "10%",
        left: "10%",
        backgroundColor: "#ffc067",
    },
    playerB1Doubles: {
        bottom: "10%",
        right: "10%",
        backgroundColor: "#a8dcab",
    },
    playerB2Doubles: {
        top: "10%",
        right: "10%",
        backgroundColor: "#a8dcab",
    },
    playerButton2: {
        position: "absolute",
        width: 120,
        height: 80,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
    },
    playerButtonText: {
        color: "#000",
        fontSize: 20,
        fontWeight: "bold",
    },
    playerButton2Text: {
        color: "#000",
        fontSize: 20,
        fontWeight: "bold",
    },
    playerA1: {
        top: "20%",
        left: "9%",
        backgroundColor: "#ffc067",
    },
    playerA2: {
        bottom: "20%",
        left: "9%",
        backgroundColor: "#ffc067",
    },
    playerB1: {
        bottom: "20%",
        right: "9%",
        backgroundColor: "#a8dcab",
    },
    playerB2: {
        top: "20%",
        right: "9%",
        backgroundColor: "#a8dcab",
    },
    roleIcon: {
        position: "absolute",
        bottom: 5,
        right: 5,
    },
    selectionPrompt: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: [{ translateX: -100 }, { translateY: -20 }],
        backgroundColor: "#000",
        padding: 10,
        borderRadius: 10,
        width: 200,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        borderWidth: 2,
        borderColor: "yellow",
    },
    promptText: {
        color: "yellow",
        fontSize: 18,
        fontWeight: "bold",
    },
    selectedTeamAPlayer: {
        backgroundColor: "#a6a6a6",
        borderWidth: 2,
        borderColor: "#fff",
    },
    selectedTeamBPlayer: {
        backgroundColor: "#a6a6a6",
        borderWidth: 2,
        borderColor: "#fff",
    },
    swapButton: {
        position: "absolute",
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
    },
    teamASwapButton: {
        left: "13%",
        top: "50%",
        transform: [{ translateY: -20 }],
        backgroundColor: "#4CAF50",
    },
    teamBSwapButton: {
        right: "13%",
        top: "50%",
        transform: [{ translateY: -20 }],
        backgroundColor: "#4CAF50",
    },
    setsDropdown: {
        backgroundColor: "#333",
        borderColor: "yellow",
        borderWidth: 2,
        borderRadius: 10,
    },
    setsDropdownList: {
        backgroundColor: "#333",
        borderColor: "yellow",
        borderWidth: 2,
    },
    setsDropdownText: {
        color: "#ffeb3b",
        fontSize: 16,
        textAlign: "center",
    },
    setsDropdownContainer: {
        top: 2,
        alignSelf: "center",
        width: 150,
    },
    controlDropdown: {
        backgroundColor: "#333",
        borderColor: "#666",
        borderWidth: 1,
        borderRadius: 5,
    },
    controlDropdownList: {
        backgroundColor: "#333",
        borderColor: "#666",
    },
    controlDropdownText: {
        color: "white",
        fontSize: 14,
    },
    controlButton: {
        backgroundColor: "#4CAF50",
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 5,
        justifyContent: "center",
        alignItems: "center",
    },
    controlButtonText: {
        color: "white",
        fontWeight: "bold",
    },
    trophyIcon: {
        position: "absolute",
        top: 10,
        right: 10,
    },
    headerContainer: {
        backgroundColor: "white",
        width: "100%",
        height: "8%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 10,
    },
    headerLeftSection: {
        flexDirection: "row",
        alignItems: "center",
        gap: 15,
    },
    headerRightSection: {
        flexDirection: "row",
        gap: 8,
    },
    scoreText: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
    // Lines
    courtLabel: {
        position: "absolute",
        color: "white",
        fontSize: 26,
        fontWeight: "bold",
    },
    topLeftLabel: {
        top: "26%",
        left: "2.5%",
    },
    bottomLeftLabel: {
        bottom: "23%",
        left: "2.5%",
    },
    topRightLabel: {
        top: "26%",
        right: "2.5%",
    },
    bottomRightLabel: {
        bottom: "23%",
        right: "2.5%",
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.7)",
    },
    controlButtonShow: {
        backgroundColor: "#4CAF50",
        paddingVertical: 8,
        borderRadius: 5,
        justifyContent: "center",
        alignItems: "center",
    },
    controlButtonHide: {
        backgroundColor: "#f54c2a",
        paddingVertical: 8,
        borderRadius: 5,
        justifyContent: "center",
        alignItems: "center",
    },
    confirmationModalContent: {
        backgroundColor: "#333",
        padding: 20,
        borderRadius: 10,
        width: "50%",
        alignItems: "center",
    },
    confirmationModalTitle: {
        color: "white",
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 15,
    },
    confirmationModalText: {
        color: "white",
        fontSize: 16,
        marginBottom: 20,
        textAlign: "center",
    },
    confirmationModalButtons: {
        flexDirection: "row",
        justifyContent: "space-evenly",
        width: "100%",
    },
    confirmationModalButton: {
        padding: 12,
        borderRadius: 5,
        width: "38%",
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: "#757575",
    },
    confirmButton: {
        // backgroundColor: "#f44336",
        backgroundColor: "#4CAF50",
    },
    confirmationModalButtonText: {
        color: "white",
        fontWeight: "bold",
    },
    serverSelectionModalContent: {
        backgroundColor: "#333",
        padding: 20,
        borderRadius: 10,
        width: "80%",
        maxHeight: "80%",
        paddingBottom: 30,
    },
    modalTitle: {
        color: "white",
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "center",
    },
    selectionSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        color: "white",
        fontSize: 16,
        marginBottom: 10,
    },
    playerSelectionContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: 10,
    },
    playerSelectionButton: {
        padding: 15,
        borderRadius: 5,
        marginBottom: 8,
        marginHorizontal: 5,
        minWidth: 120,
        alignItems: "center",
    },
    selectedPlayerButton: {
        borderWidth: 3,
        borderColor: "white",
    },
    playerSelectionText: {
        color: "black",
        fontWeight: "bold",
    },
    modalButtonsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 2,
    },
    modalButton: {
        padding: 15,
        borderRadius: 5,
        width: "40%",
        alignItems: "center",
    },
    modalButtonText: {
        color: "white",
        fontWeight: "bold",
    },
    teamsRowContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
    },
    teamColumn: {
        flex: 1,
        alignItems: "center",
        paddingHorizontal: 10,
    },
    teamLabel: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 8,
        color: "white",
    },
    serverIndicator: {
        position: "absolute",
        bottom: 10,
        right: 10,
    },
});
