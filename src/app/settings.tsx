import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
// import EditPlayersModal from "./components/EditPlayersModal";

const FETCH_GAME = gql`
  query FetchGame($gameId: ID!) {
    fetchGame(_id: $gameId) {
      _id
      players {
        A1
        A2
        B1
        B2
      }
      event {
        _id
        name
        eventType
        gender
      }
      court {
        name
        location
      }
      max
      plusTwo
      plusTwoMax
      noOfSets
    }
  }
`;

interface SettingsTabProps {
    gameId: string;
    resetGame: () => void;
    updateScore: (
        gameId: string,
        team: "teamA" | "teamB",
        newScore: number
    ) => void;
    currentSet: number;
    sets: Array<{
        aScore: number;
        bScore: number;
        scoresheet?: Array<{
            aSwitch?: boolean;
            bSwitch?: boolean;
            currentAScore?: number;
            currentBScore?: number;
            scoredAt?: Date;
            scorer?: string | null;
            nextServe?: string | null;
            toServe?: string | null;
        }>;
    }>;
}
const screenHeight = Dimensions.get("screen").height;
interface FetchGameData {
    fetchGame: {
        _id: string;
        players: {
            A1: string;
            A2: string;
            B1: string;
            B2: string;
        };
        event?: {
            _id: string;
            name: string;
            eventType: string;
            gender: string;
        };
        court?: {
            name: string;
            location: string;
        };
        max: number;
        plusTwo: boolean;
        plusTwoMax: number;
        noOfSets: number;
    };
}

export default function SettingsTab({
    gameId,
    resetGame,
    updateScore,
    currentSet,
    sets,
}: SettingsTabProps) {
    const { loading, error, data } = useQuery<FetchGameData>(FETCH_GAME, {
        variables: { gameId },
    });

    const [showEditModal, setShowEditModal] = useState(false);
    const [showForceWinModal, setShowForceWinModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const router = useRouter();

    const handleResetGame = () => {
        setShowResetModal(true);
    };

    const confirmReset = () => {
        resetGame();
        setShowResetModal(false);
    };

    const handleForceWinSet = () => {
        setShowForceWinModal(true);
    };

    const forceWinSet = (team: "teamA" | "teamB") => {
        const currentSetData = sets?.[currentSet - 1] || { aScore: 0, bScore: 0 };
        const maxScore = data?.fetchGame?.max || 21;
        const plusTwo = data?.fetchGame?.plusTwo || false;
        const plusTwoMax = data?.fetchGame?.plusTwoMax || 30;

        // Determine the winning score based on game settings
        const winningScore = plusTwo ? plusTwoMax : maxScore;

        // Update the score to force the win
        if (team === "teamA") {
            updateScore(gameId, "teamA", winningScore);
        } else {
            updateScore(gameId, "teamB", winningScore);
        }

        setShowForceWinModal(false);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error loading game data</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
        >
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>GAME ACTIONS</Text>
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.scoresheetButton]}
                        onPress={() => router.push({ pathname: '/scoresheet-view', params: { gameId } })}
                    >
                        <Text style={styles.buttonText}>SCORESHEET</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => setShowEditModal(true)}
                    >
                        <Text style={styles.buttonText}>EDIT</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.forceWinButton]}
                        onPress={handleForceWinSet}
                    >
                        <Text style={styles.buttonText}>FORCE WIN SET</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.resetButton]}
                        onPress={handleResetGame}
                    >
                        <Text style={styles.buttonText}>RESET</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* <EditPlayersModal
                visible={showEditModal}
                onClose={() => setShowEditModal(false)}
                gameId={gameId}
                initialPlayers={data?.fetchGame?.players}
                initialSettings={{
                    noOfSets: data?.fetchGame?.noOfSets,
                    max: data?.fetchGame?.max,
                    plusTwo: data?.fetchGame?.plusTwo,
                    plusTwoMax: data?.fetchGame?.plusTwoMax,
                    plusTwoNoLimit: false, // Add this if your backend supports it
                }}
                initialEvent={data?.fetchGame?.event?.name}
                eventOptions={[]} // Pass your actual event options if available
            // isSingles={true}
            /> */}

            <Modal
                visible={showForceWinModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowForceWinModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Force Win</Text>
                        <Text style={styles.modalMessage}>
                            This will force this set to be won by a team.
                        </Text>

                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowForceWinModal(false)}
                            >
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.teamAButton]}
                                onPress={() => forceWinSet("teamA")}
                            >
                                <Text style={styles.modalButtonText}>Team A</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.teamBButton]}
                                onPress={() => forceWinSet("teamB")}
                            >
                                <Text style={styles.modalButtonText}>Team B</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showResetModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowResetModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Confirm Reset</Text>
                        <Text style={styles.modalMessage}>
                            Are you sure you want to reset the game? All scores and progress
                            will be lost.
                        </Text>

                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowResetModal(false)}
                            >
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.resetButton]}
                                onPress={confirmReset}
                            >
                                <Text style={styles.modalButtonText}>Reset</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#1a1a1a",
    },
    contentContainer: {
        padding: 16,
    },
    section: {
        backgroundColor: "#333",
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        alignItems: "center",
        flex: 1,
    },
    sectionTitle: {
        color: "#4CAF50",
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 16,
    },
    buttonRow: {
        flexDirection: "row",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 16,
        marginTop: 10,
        width: "100%",
    },
    actionButton: {
        minWidth: "45%",
        borderRadius: 6,
        paddingVertical: 24,
        paddingHorizontal: 12,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    scoresheetButton: {
        backgroundColor: "#9C27B0",
    },
    editButton: {
        backgroundColor: "#4CAF50",
    },
    forceWinButton: {
        backgroundColor: "#2196F3",
    },
    resetButton: {
        backgroundColor: "#FF5722",
    },
    buttonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
        textAlign: "center",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1a1a1a",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1a1a1a",
    },
    errorText: {
        color: "red",
        fontSize: 16,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: "80%",
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 20,
        alignItems: "center",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
        color: "#333",
    },
    modalMessage: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
        marginBottom: 20,
    },
    modalButtonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        marginHorizontal: 6,
    },
    cancelButton: {
        backgroundColor: "#9e9e9e",
    },
    teamAButton: {
        backgroundColor: "#60be65",
    },
    teamBButton: {
        backgroundColor: "#ff9601",
    },
    modalButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
});
