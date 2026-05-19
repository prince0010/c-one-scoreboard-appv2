import { useAuth } from "@/contexts/auth";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { AntDesign } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link, usePathname, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const FETCH_GAMES = gql`
  query FetchGames($courtId: ID) {
    fetchGames(courtId: $courtId) {
      _id
      max
      noOfSets
      plusTwoMax
      plusTwoNoLimit
      timeSlot
      status
      start
      end
      showOnTV
      createdAt
      updatedAt
      event {
        _id
        name
        eventType
        gender
        createdAt
        updatedAt
      }
      court {
        _id
        name
        location
        createdAt
        updatedAt
      }
      players {
        A1
        A2
        B1
        B2
      }
      sets {
        aScore
        bScore
        currentRound
        lastTeamScored
        scoresheet {
          aSwitch
          bSwitch
          currentAScore
          currentBScore
          scoredAt
          nextServe
          toServe
          scorer
        }
      }
    }
  }
`;
const HIDE_GAMES_FROM_TV = gql`
  mutation HideAllGamesFromTV($courtId: ID) {
    hideAllGamesFromTV(courtId: $courtId)
  }
`;

interface Game {
    _id: string;
    max: number;
    noOfSets: number;
    plusTwoMax: boolean;
    plusTwoNoLimit: boolean;
    timeSlot: string;
    status: string;
    start: string;
    end: string;
    showOnTV: boolean;
    createdAt: string;
    updatedAt: string;
    event?: {
        _id: string;
        name: string;
        eventType: string;
        gender: string;
    };
    court?: {
        _id: string;
        name: string;
        location: string;
    };
    players: {
        A1: string | null;
        A2: string | null;
        B1: string | null;
        B2: string | null;
    };
    sets: {
        aScore: number;
        bScore: number;
        currentRound: number;
        lastTeamScored: string | null;
    }[];
}

interface FetchGamesData {
    fetchGames: Game[];
}

export default function GamesScreen() {
    const { signOut, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
    const {
        data: gamesData,
        loading: gamesLoading,
        error: gamesError,
        refetch,
    } = useQuery<FetchGamesData>(FETCH_GAMES, {
        variables: { courtId: selectedCourtId },
        skip: !selectedCourtId,
        pollInterval: 1000,
        fetchPolicy: "cache-and-network",
    });
    const [hideGamesFromTV] = useMutation(HIDE_GAMES_FROM_TV, {
        variables: { courtId: selectedCourtId },
        onCompleted: () => {
            refetch();
        },
    });

    const handleHideGamesFromTV = () => {
        hideGamesFromTV();
    };

    useEffect(() => {
        async function lockOrientation() {
            await ScreenOrientation.lockAsync(
                ScreenOrientation.OrientationLock.PORTRAIT
            );
        }
        lockOrientation();

        return () => {
            ScreenOrientation.unlockAsync();
        };
    }, []);

    const renderTeamScores = (
        team: string,
        player1: string | null,
        player2: string | null,
        sets: any[],
        noOfSets: number
    ) => {
        if (!player1 && !player2) return null;

        // Calculate set wins for this team
        let teamSetWins = 0;
        for (let i = 0; i < Math.min(sets.length, noOfSets); i++) {
            const set = sets[i];
            if (
                (team === "A" && set.aScore > set.bScore) ||
                (team === "B" && set.bScore > set.aScore)
            ) {
                teamSetWins++;
            }
        }

        return (
            <View style={[styles.teamScoreContainer, styles.teamContainer]}>
                <Text style={styles.teamLabel}>{team} Team:</Text>

                <View style={styles.playersContainer}>
                    <View style={styles.playerNamesContainer}>
                        {/* {player1 && <Text style={[styles.playerName, styles.playerNameBackground1]}>{player1}</Text>}
            {player2 && <Text style={[styles.playerName, styles.playerNameBackground2]}>{player2}</Text>} */}
                        {player1 && (
                            <Text
                                style={[
                                    styles.playerName,
                                    team === "A" ? styles.teamAPlayerBackground : styles.teamBPlayerBackground
                                ]}
                            >
                                {player1}
                            </Text>
                        )}
                        {player2 && (
                            <Text
                                style={[
                                    styles.playerName,
                                    team === "A" ? styles.teamAPlayerBackground : styles.teamBPlayerBackground
                                ]}
                            >
                                {player2}
                            </Text>
                        )}
                    </View>

                    <View
                        style={[
                            styles.matchScoreContainer,
                            team === "A" ? styles.teamAMatchScore : styles.teamBMatchScore,
                        ]}
                    >
                        <Text style={styles.matchScoreLabel}>Match</Text>
                        <Text style={styles.matchScoreText}>{teamSetWins}</Text>
                    </View>

                    <View style={styles.setsContainer}>
                        {sets.slice(0, noOfSets).map((set, index) => (
                            <View
                                key={`${team}-set-${index}`}
                                style={[
                                    styles.setContainer,
                                    team === "A" ? styles.teamASet : styles.teamBSet,
                                ]}
                            >
                                <Text style={styles.setNumber}>Set {index + 1}</Text>
                                <Text style={styles.setScore}>
                                    {team === "A" ? set.aScore : set.bScore}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        );
    };

    const activeGames =
        gamesData?.fetchGames
            ?.filter((game: any) => game.status !== "COMPLETED")
            // Add sorting here - newest first
            ?.sort(
                (a: any, b: any) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ) || [];

    useEffect(() => {
        const getStoredCourt = async () => {
            const courtId = await AsyncStorage.getItem("selectedCourt");
            setSelectedCourtId(courtId);
        };
        getStoredCourt();
    }, []);

    const handleNewGame = () => {
        console.log("New Game Button Pressed");
    };

    if (isLoading || gamesLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!selectedCourtId) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" />
                <Text>Loading court information...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.topSection}>
                <View style={styles.buttonsRow}>
                    <Link href="/(tabs)/(games)/modal/index" asChild>
                        <TouchableOpacity
                            onPress={handleNewGame}
                            style={styles.newGameButton}
                        >
                            <AntDesign
                                name={"pluscircle" as any}
                                size={24}
                                color="black"
                                style={styles.icon}
                            />
                            <Text style={styles.newGameButtonText}>New Game</Text>
                        </TouchableOpacity>
                    </Link>
                    <View style={styles.buttonSeparator} />
                    <TouchableOpacity
                        onPress={handleHideGamesFromTV}
                        style={styles.hideButton}
                    >
                        <AntDesign name="eye" size={24} color="white" style={styles.icon} />
                        <Text style={styles.hideButtonText}>Hide from TV</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.gamesContainer}>
                    {activeGames.length === 0 ? (
                        <Text style={styles.noGamesText}>No active games</Text>
                    ) : (
                        activeGames.map((game: any) => (
                            <View key={game._id} style={styles.gameCard}>
                                <View style={styles.eventStatusRow}>
                                    {/* LEFT COLUMN */}
                                    <View style={styles.leftColumn}>
                                        <Text style={styles.categoryText}>
                                            {game.event?.name || "No Event"} -{" "}
                                            {game.court?.name || "No Court"}
                                        </Text>
                                        <Text style={styles.gameInfo}>
                                            Started: {new Date(game.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                        </Text>
                                    </View>

                                    {/* RIGHT COLUMN */}
                                    <View style={styles.rightColumn}>
                                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                                            <Text style={{ fontWeight: "600", textTransform: "uppercase" }}>Status: </Text>
                                            <Text
                                                style={[
                                                    {
                                                        backgroundColor:
                                                            game.status === "PENDING"
                                                                ? "#FF9800"
                                                                : game.status === "PLAYING"
                                                                    ? "#4CAF50"
                                                                    : "transparent",
                                                        color: "white",
                                                        paddingHorizontal: 8,
                                                        paddingVertical: 2,
                                                        borderRadius: 4,
                                                        fontWeight: "bold",
                                                    },
                                                ]}
                                            >
                                                {game.status}
                                            </Text>
                                        </View>
                                        <Text style={styles.statusText}>
                                            Time Slot: {new Date(game.timeSlot).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.setsText}>
                                    Best of {game.noOfSets} sets
                                </Text>

                                {/* Team A */}
                                {renderTeamScores(
                                    "A",
                                    game.players.A1,
                                    game.players.A2,
                                    game.sets,
                                    game.noOfSets
                                )}

                                {/* Team B */}
                                {renderTeamScores(
                                    "B",
                                    game.players.B1,
                                    game.players.B2,
                                    game.sets,
                                    game.noOfSets
                                )}

                                <TouchableOpacity
                                    style={styles.playButton}
                                    onPress={() =>
                                        router.push({
                                            pathname: "/scoreboard",
                                            params: {
                                                gameId: game._id,
                                                teamAName: `${game.players.A1}${game.players.A2 ? `/${game.players.A2}` : ""
                                                    }`,
                                                teamBName: `${game.players.B1}${game.players.B2 ? `/${game.players.B2}` : ""
                                                    }`,
                                                maxScore: game.max,
                                                noOfSets: game.noOfSets,
                                            },
                                        })
                                    }
                                >
                                    <Text style={styles.playButtonText}>PLAY</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        padding: 20,
    },
    topSection: {
        flex: 1,
        justifyContent: "flex-start",
        paddingTop: 10,
        alignItems: "center",
        width: "100%",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        color: "#333",
        textAlign: "center",
    },
    newGameButton: {
        backgroundColor: "#fae716",
        padding: 15,
        flex: 1,
        alignItems: "center",
        height: 75,
        justifyContent: "center",
    },
    newGameButtonText: {
        color: "black",
        fontSize: 16,
        fontWeight: "bold",
    },
    hideButton: {
        backgroundColor: "#ff4444",
        padding: 15,
        flex: 1,
        alignItems: "center",
        height: 75,
        justifyContent: "center",
    },
    buttonSeparator: {
        width: 1,
        backgroundColor: "#999",
    },
    hideButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    icon: {
        marginRight: 10,
    },
    gamesContainer: {
        width: "100%",
        marginTop: 10,
    },
    gameCard: {
        backgroundColor: "white",
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    categoryText: {
        fontSize: 16,
        fontWeight: "bold",
        flex: 1,
    },
    gameInfo: {
        fontSize: 14,
        color: "#666",
        marginBottom: 10,
    },
    setsText: {
        fontSize: 14,
        color: "#666",
        marginBottom: 10,
    },
    statusText: {
        fontSize: 14,
        fontWeight: "bold",
        // color: "#4CAF50",
        marginLeft: 10,
    },
    playButton: {
        backgroundColor: "#4CAF50",
        padding: 10,
        borderRadius: 5,
        marginTop: 10,
        alignItems: "center",
    },
    playButtonText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16,
    },
    noGamesText: {
        textAlign: "center",
        marginTop: 20,
        color: "#666",
    },
    teamScoreContainer: {
        padding: 2,
        borderRadius: 5,
        marginBottom: 10,
    },
    teamLabel: {
        fontWeight: "bold",
        fontSize: 16,
        marginLeft: 14,
        marginTop: 2
    },
    playersContainer: {
        flexDirection: "row",
        marginLeft: 50,
    },
    playerNamesContainer: {
        width: 120,
        justifyContent: "center",
        alignItems: "center",
    },
    playerName: {
        marginVertical: 4,
        fontSize: 14,
        fontWeight: "bold",
        textAlign: "center",
        color: "white",
        textTransform: "capitalize",
    },
    setsContainer: {
        flexDirection: "row",
        flex: 1,
        flexWrap: "wrap",
    },
    setContainer: {
        alignItems: "center",
        marginRight: 15,
        marginBottom: 8,
        minWidth: 60,
        borderRadius: 8,
        padding: 4,
    },
    setNumber: {
        fontSize: 12,
        color: "#666",
    },
    setScore: {
        fontWeight: "bold",
        fontSize: 16,
        marginTop: 2,
    },
    eventStatusRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 5,
    },
    matchScoreContainer: {
        alignItems: "center",
        marginRight: 15,
        padding: 5,
        marginBottom: 8,
        minWidth: 60,
        borderRadius: 12,
    },
    matchScoreLabel: {
        fontSize: 12,
        color: "white",
        fontWeight: "bold",
    },
    matchScoreText: {
        fontWeight: "bold",
        fontSize: 16,
        marginTop: 2,
        color: "white",
    },
    buttonsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        marginBottom: 10,
        backgroundColor: "#e0e0e0",
        borderRadius: 10,
        overflow: "hidden",
    },
    teamContainer: {
        backgroundColor: "#f9f9f9",
    },
    teamAMatchScore: {
        backgroundColor: "#FF9800",
    },
    teamASet: {
        backgroundColor: "#FFE0B2",
    },
    teamBMatchScore: {
        backgroundColor: "#4CAF50",
    },
    teamBSet: {
        backgroundColor: "#C8E6C9",
    },
    leftColumn: {
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 5,
        flex: 1
    },
    rightColumn: {
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 5,
    },
    teamAPlayerBackground: {
        backgroundColor: "#FF9800",
        padding: 3,
        width: "75%",
        borderRadius: 4,
    },
    teamBPlayerBackground: {
        backgroundColor: "#4CAF50",
        padding: 3,
        width: "75%",
        borderRadius: 4,
    },

});
