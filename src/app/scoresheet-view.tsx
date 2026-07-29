import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { AntDesign } from "@expo/vector-icons";
import format from "date-fns/format";
import * as NavigationBar from "expo-navigation-bar";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const FETCH_SCORESHEET_GAME = gql`
  query FetchGameScoresheet($id: ID!) {
    fetchGame(_id: $id) {
      _id
      createdAt
      max
      noOfSets
      players {
        A1
        A2
        B1
        B2
      }
      event {
        name
      }
      court {
        name
      }
      sets {
        aScore
        bScore
        firstServer
        firstReceiver
        scoresheet {
          currentAScore
          currentBScore
          scorer
          nextServe
          toServe
        }
      }
    }
  }
`;

interface FetchGameScoresheetData {
    fetchGame: {
        _id: string;
        createdAt: string;
        max: number;
        noOfSets: number;
        players: {
            A1: string;
            A2: string;
            B1: string;
            B2: string;
        };
        event?: { name: string };
        court?: { name: string };
        sets: Array<{
            aScore: number;
            bScore: number;
            firstServer?: string | null;
            firstReceiver?: string | null;
            scoresheet: Array<{
                currentAScore: number;
                currentBScore: number;
                scorer: string | null;
                nextServe: string | null;
                toServe?: string | null;
            }>;
        }>;
    };
}

export default function ScoresheetViewScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const gameId = params.gameId as string;

    const { data, loading, error } = useQuery<FetchGameScoresheetData>(FETCH_SCORESHEET_GAME, {
        variables: { id: gameId },
        skip: !gameId,
    });

    useEffect(() => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        NavigationBar.setVisibilityAsync("hidden");
        return () => {
            ScreenOrientation.unlockAsync();
            NavigationBar.setVisibilityAsync("visible");
        };
    }, []);

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
            </View>
        );
    }

    if (error || !data?.fetchGame) {
        if (error) console.error("GraphQL Error:", error);
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Error loading scoresheet</Text>
                <Text>{error?.message}</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const game = data.fetchGame;
    const players = game.players || {};
    const sets = game.sets || [];
    const eventName = game.event?.name || "Unknown Event";
    const courtName = game.court?.name || "Unknown Court";
    let dateStr = "-";
    if (game.createdAt) {
        const timestamp = Number(game.createdAt);
        const dateObj = isNaN(timestamp) ? new Date(game.createdAt) : new Date(timestamp);
        if (!isNaN(dateObj.getTime())) {
            dateStr = format(dateObj, "yyyy-MM-dd");
        }
    }

    const setIndices = Array.from({ length: game.noOfSets || 3 }, (_, i) => i);

    const renderTeamRows = (scoresheet: any[], isTeamA: boolean, firstServer: string, firstReceiver: string, isSingles: boolean) => {
        const maxBoxes = Math.max(30, scoresheet.length + 1);
        const p1Boxes = Array(maxBoxes).fill("");
        const p2Boxes = Array(maxBoxes).fill("");

        // Column 0 is the starting 0 for S and R
        if (isTeamA) {
            if (firstServer === "a1" || firstReceiver === "a1") p1Boxes[0] = "0";
            if (!isSingles && (firstServer === "a2" || firstReceiver === "a2")) p2Boxes[0] = "0";
        } else {
            if (firstServer === "b1" || firstReceiver === "b1") p1Boxes[0] = "0";
            if (!isSingles && (firstServer === "b2" || firstReceiver === "b2")) p2Boxes[0] = "0";
        }

        scoresheet.forEach((round, idx) => {
            const scorer = round.scorer?.toLowerCase();
            const colIdx = idx + 1; // Shift by 1 because col 0 is for the initial 0s

            if (isTeamA) {
                if (scorer === "a1") {
                    p1Boxes[colIdx] = round.currentAScore;
                } else if (scorer === "a2") {
                    p2Boxes[colIdx] = round.currentAScore;
                } else if (scorer?.startsWith("a")) {
                    p1Boxes[colIdx] = round.currentAScore;
                }
            } else {
                if (scorer === "b1") {
                    p1Boxes[colIdx] = round.currentBScore;
                } else if (scorer === "b2") {
                    p2Boxes[colIdx] = round.currentBScore;
                } else if (scorer?.startsWith("b")) {
                    p1Boxes[colIdx] = round.currentBScore;
                }
            }
        });

        return (
            <View>
                <View style={styles.gridRow}>
                    {p1Boxes.map((val, idx) => (
                        <View key={`p1-${idx}`} style={styles.gridBoxSmall}>
                            <Text style={styles.gridBoxText}>{val}</Text>
                        </View>
                    ))}
                </View>
                {!isSingles && (
                    <View style={styles.gridRow}>
                        {p2Boxes.map((val, idx) => (
                            <View key={`p2-${idx}`} style={styles.gridBoxSmall}>
                                <Text style={styles.gridBoxText}>{val}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    const renderSetBlock = (set: any, setIndex: number) => {
        const scoresheet = set?.scoresheet || [];
        const isSingles = !players.A2 && !players.B2;

        // Determine first server and receiver from the first rally
        // Fallback to "a1" if historical data is missing so the UI still displays S and R.
        const firstServer = set?.firstServer?.toLowerCase() || scoresheet[0]?.toServe?.toLowerCase() || scoresheet[0]?.nextServe?.toLowerCase() || (set ? "a1" : "");
        let firstReceiver = set?.firstReceiver?.toLowerCase() || scoresheet[0]?.receiver?.toLowerCase() || "";

        if (!firstReceiver) {
            if (firstServer.startsWith("a")) firstReceiver = "b1";
            else if (firstServer.startsWith("b")) firstReceiver = "a1";
        }

        const getSRText = (playerKey: string) => {
            if (firstServer === playerKey) return "S";
            if (firstReceiver === playerKey) return "R";
            return "";
        };

        return (
            <View key={setIndex} style={styles.setBlock}>
                <View style={styles.setBlockHeader}>
                    <Text style={styles.setBlockHeaderText}>SET {setIndex + 1}</Text>
                </View>

                {/* Team A Row */}
                <View style={styles.teamRow}>
                    <View style={styles.playerColumn}>
                        <View style={[styles.playerCell, isSingles && { borderBottomWidth: 0 }]}>
                            <Text style={styles.playerText}>{players.A1}</Text>
                            <Text style={styles.srText}>{getSRText("a1")}</Text>
                        </View>
                        {!isSingles && (
                            <View style={styles.playerCell}>
                                <Text style={styles.playerText}>{players.A2 || ""}</Text>
                                <Text style={styles.srText}>{getSRText("a2")}</Text>
                            </View>
                        )}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gridScroll}>
                        {renderTeamRows(scoresheet, true, firstServer, firstReceiver, isSingles)}
                    </ScrollView>
                </View>

                {/* Team B Row */}
                <View style={styles.teamRow}>
                    <View style={styles.playerColumn}>
                        <View style={[styles.playerCell, isSingles && { borderBottomWidth: 0 }]}>
                            <Text style={styles.playerText}>{players.B1}</Text>
                            <Text style={styles.srText}>{getSRText("b1")}</Text>
                        </View>
                        {!isSingles && (
                            <View style={styles.playerCell}>
                                <Text style={styles.playerText}>{players.B2 || ""}</Text>
                                <Text style={styles.srText}>{getSRText("b2")}</Text>
                            </View>
                        )}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gridScroll}>
                        {renderTeamRows(scoresheet, false, firstServer, firstReceiver, isSingles)}
                    </ScrollView>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar hidden />
            {/* Top Navigation */}
            <View style={styles.navHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.navBackButton}>
                    <AntDesign name="left" size={24} color="black" />
                    <Text style={styles.navBackText}>Back</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.mainScroll}>
                <View style={styles.paper}>
                    {/* Scoresheet Header */}
                    <Text style={styles.mainTitle}>Badminton Scoresheet</Text>

                    <View style={styles.headerInfoContainer}>
                        {/* Left Info */}
                        <View style={styles.infoColumn}>
                            <View style={styles.infoRow}><Text style={styles.infoLabel}>Match No.</Text><Text style={styles.infoValue}>_</Text></View>
                            <View style={styles.infoRow}><Text style={styles.infoLabel}>Event</Text><Text style={styles.infoValue}>{eventName}</Text></View>
                            <View style={styles.infoRow}><Text style={styles.infoLabel}>Court No.</Text><Text style={styles.infoValue}>{courtName}</Text></View>
                            <View style={styles.infoRow}><Text style={styles.infoLabel}>Date</Text><Text style={styles.infoValue}>{dateStr}</Text></View>
                        </View>

                        {/* Center Score Summary */}
                        <View style={styles.scoreSummaryContainer}>
                            <Text style={styles.scoreSummaryTitle}>Score</Text>
                            <View style={styles.scoreSummaryTable}>
                                {setIndices.map((idx) => {
                                    const set = sets[idx];
                                    return (
                                        <View key={idx} style={styles.scoreSummaryRow}>
                                            <View style={styles.scoreSummaryCellNum}><Text style={styles.scoreSummaryText}>{idx + 1}</Text></View>
                                            <View style={styles.scoreSummaryCell}><Text style={styles.scoreSummaryText}>{set?.aScore ?? "-"}</Text></View>
                                            <View style={styles.scoreSummaryCell}><Text style={styles.scoreSummaryText}>{set?.bScore ?? "-"}</Text></View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Right Info */}
                        <View style={styles.infoColumn}>
                            <View style={styles.infoRow}><Text style={styles.infoLabel}>Umpire:</Text><Text style={styles.infoValueLine}></Text></View>
                            <View style={styles.infoRow}><Text style={styles.infoLabel}>Service Judge:</Text><Text style={styles.infoValueLine}></Text></View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Start:</Text><Text style={styles.infoValueLine}></Text>
                                <Text style={styles.infoLabel}>Finish:</Text><Text style={styles.infoValueLine}></Text>
                            </View>
                            <View style={styles.infoRow}><Text style={styles.infoLabel}>Duration:</Text><Text style={styles.infoValueLine}></Text></View>
                        </View>
                    </View>

                    {/* Grid Blocks */}
                    <View style={styles.gridContainer}>
                        {setIndices.map((idx) => renderSetBlock(sets[idx], idx))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },
    errorText: { color: "red", fontSize: 18, marginBottom: 20 },
    backButton: { backgroundColor: "#4CAF50", padding: 10, borderRadius: 5 },
    backButtonText: { color: "white", fontWeight: "bold" },
    container: { flex: 1, backgroundColor: "#e0e0e0" },
    navHeader: { flexDirection: "row", padding: 15, backgroundColor: "#fff", elevation: 2, alignItems: "center" },
    navBackButton: { flexDirection: "row", alignItems: "center" },
    navBackText: { fontSize: 16, marginLeft: 8, fontWeight: "bold" },
    mainScroll: { flex: 1 },
    paper: { backgroundColor: "#fff", margin: 20, padding: 30, borderRadius: 2, elevation: 5 },
    mainTitle: { fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
    headerInfoContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
    infoColumn: { flex: 1, justifyContent: "flex-end" },
    infoRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 5 },
    infoLabel: { fontSize: 12, marginRight: 5 },
    infoValue: { fontSize: 12, borderBottomWidth: 1, borderBottomColor: "#000", flex: 1 },
    infoValueLine: { flex: 1, borderBottomWidth: 1, borderBottomColor: "#000", marginHorizontal: 5 },
    scoreSummaryContainer: { flex: 1, alignItems: "center" },
    scoreSummaryTitle: { fontSize: 12, marginBottom: 5 },
    scoreSummaryTable: { borderWidth: 2, borderColor: "#000", width: 120 },
    scoreSummaryRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#000" },
    scoreSummaryCellNum: { width: 30, borderRightWidth: 1, borderColor: "#000", padding: 2, alignItems: "center" },
    scoreSummaryCell: { flex: 1, borderRightWidth: 1, borderColor: "#000", padding: 2, alignItems: "center" },
    scoreSummaryText: { fontSize: 12, fontWeight: "bold" },
    gridContainer: { borderWidth: 2, borderColor: "#000" },
    setBlock: { borderBottomWidth: 2, borderColor: "#000" },
    setBlockHeader: { backgroundColor: "#eee", padding: 2, borderBottomWidth: 1, borderColor: "#000" },
    setBlockHeaderText: { fontSize: 10, fontWeight: "bold", textAlign: "center" },
    teamRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#000", backgroundColor: "#fafafa" },
    playerColumn: { width: 150, borderRightWidth: 2, borderColor: "#000" },
    playerCell: { height: 30, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 5, borderBottomWidth: 1, borderColor: "#ccc" },
    playerText: { fontSize: 10, fontWeight: "bold" },
    srText: { fontSize: 10, fontWeight: "bold", color: "#666", marginRight: 5 },
    gridScroll: { flex: 1 },
    gridRow: { flexDirection: "row" },
    gridBoxSmall: { width: 30, height: 30, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#ccc", justifyContent: "center", alignItems: "center" },
    gridBoxText: { fontSize: 14, fontWeight: "bold", color: "#333" },
});
