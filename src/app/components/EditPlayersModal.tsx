import { useGame } from "@/contexts/GameContext";
import { gql, useMutation } from "@apollo/client";
import * as ScreenOrientation from "expo-screen-orientation";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BouncyCheckbox from "react-native-bouncy-checkbox";
import DropDownPicker from "react-native-dropdown-picker";

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

const UPDATE_GAME_SETTINGS = gql`
  mutation UpdateGameSettings(
    $gameId: ID!
    $noOfSets: Int
    $max: Int
    $plusTwo: Boolean
    $plusTwoMax: Int
    $plusTwoNoLimit: Boolean
  ) {
    updateGameSettings(
      gameId: $gameId
      noOfSets: $noOfSets
      max: $max
      plusTwo: $plusTwo
      plusTwoMax: $plusTwoMax
      plusTwoNoLimit: $plusTwoNoLimit
    ) {
      _id
      noOfSets
      max
      plusTwo
      plusTwoMax
      plusTwoNoLimit
    }
  }
`;

type Players = {
  a1: string;
  a2: string;
  b1: string;
  b2: string;
};

type EditPlayersModalProps = {
  visible: boolean;
  onClose: () => void;
  gameId: string;
  initialPlayers?: {
    A1?: string;
    A2?: string;
    B1?: string;
    B2?: string;
  };
  initialSettings?: {
    noOfSets?: number;
    max?: number;
    plusTwo?: boolean;
    plusTwoMax?: number;
    plusTwoNoLimit?: boolean;
  };
  initialEvent?: string;
  eventOptions?: Array<{ label: string; value: string }>;
  isSingles?: boolean;
};

export default function EditPlayersModal({
  visible,
  onClose,
  gameId,
  initialPlayers,
  initialSettings,
  initialEvent,
  eventOptions = [],
  isSingles = false,
}: EditPlayersModalProps) {
  // const { gamesState } = useGame();
  // const currentState = gamesState[gameId];
  const [updatePlayers] = useMutation(UPDATE_PLAYERS);
  const [updateGameSettings] = useMutation(UPDATE_GAME_SETTINGS);
  const { updatePlayerNames, updateState } = useGame();
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Player states
  const [previousNames, setPreviousNames] = useState<Players>({
    a1: initialPlayers?.A1 || "",
    a2: initialPlayers?.A2 || "",
    b1: initialPlayers?.B1 || "",
    b2: initialPlayers?.B2 || "",
  });
  const [players, setPlayers] = useState<Players>({
    a1: initialPlayers?.A1 || "",
    a2: initialPlayers?.A2 || "",
    b1: initialPlayers?.B1 || "",
    b2: initialPlayers?.B2 || "",
  });

  // Game settings states
  const [settings, setSettings] = useState({
    noOfSets: initialSettings?.noOfSets || 1,
    max: initialSettings?.max || 21,
    plusTwo: initialSettings?.plusTwo || false,
    plusTwoMax: initialSettings?.plusTwoMax || 30,
    plusTwoNoLimit: initialSettings?.plusTwoNoLimit || false,
  });

  // Event dropdown state
  const [eventOpen, setEventOpen] = useState(false);
  const [event, setEvent] = useState(initialEvent || "");

  // Dropdown options
  const noOfSetsOptions = [
    { label: "Best of 1", value: 1 },
    { label: "Best of 3", value: 3 },
  ];
  const [noOfSetsOpen, setNoOfSetsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  // Reset form when modal opens or initial values change

  useEffect(() => {
    const changeOrientation = async () => {
      if (visible) {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT
        );
      } else {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );
      }
    };
    changeOrientation();
  }, [visible]);

  const handlePlayerChange = (playerKey: keyof Players, value: string) => {
    setPlayers((prev) => ({
      ...prev,
      [playerKey]: value,
    }));
  };

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    setIsSaving(true);

    try {
      // Save previous names for success modal
      setPreviousNames({
        a1: initialPlayers?.A1 || "",
        a2: initialPlayers?.A2 || "",
        b1: initialPlayers?.B1 || "",
        b2: initialPlayers?.B2 || "",
      });

      // Update players if changed
      if (
        JSON.stringify(players) !==
        JSON.stringify({
          a1: initialPlayers?.A1 || "",
          a2: initialPlayers?.A2 || "",
          b1: initialPlayers?.B1 || "",
          b2: initialPlayers?.B2 || "",
        })
      ) {
        // Update backend first
        await updatePlayers({
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

        // Then update local context
        updatePlayerNames(
          gameId,
          {
            a1: players.a1,
            a2: players.a2,
            b1: players.b1,
            b2: players.b2,
          },
          {
            a1: players.a1,
            a2: players.a2,
            b1: players.b1,
            b2: players.b2,
          }
        );
      }

      // Always update game settings (including noOfSets)
      await updateGameSettings({
        variables: {
          gameId,
          noOfSets: settings.noOfSets,
          max: settings.max,
          plusTwo: settings.plusTwo,
          plusTwoMax: settings.plusTwoMax,
          plusTwoNoLimit: settings.plusTwoNoLimit,
        },
      });

      // Update local state with all settings
      updateState(gameId, {
        noOfSets: settings.noOfSets,
        max: settings.max,
        plusTwo: settings.plusTwo,
        plusTwoMax: settings.plusTwoMax,
        plusTwoNoLimit: settings.plusTwoNoLimit,
      });

      // Update event if changed
      if (initialEvent !== event) {
        // Add your event update logic here if needed
        console.log("Event updated to:", event);
      }

      // Show success and close modal
      setShowSuccessModal(true);
      onClose();
    } catch (error) {
      console.error("Failed to update:", error);
      Alert.alert(
        "Error",
        "Failed to update game information. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSaving(false);
    }
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent={false}
        animationType="slide"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 20}
        >
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Game Settings</Text>

            {/* Game Settings Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>GAME SETTINGS</Text>

              {/* Event Dropdown */}
              {eventOptions.length > 0 && (
                <View style={styles.dropdownContainer}>
                  <Text style={styles.inputLabel}>Event</Text>
                  <DropDownPicker
                    open={eventOpen}
                    setOpen={setEventOpen}
                    value={event}
                    setValue={setEvent}
                    items={eventOptions}
                    placeholder="Select Event"
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownList}
                    textStyle={styles.dropdownText}
                    onOpen={() => setNoOfSetsOpen(false)}
                  />
                </View>
              )}

              {/* No. of Sets Dropdown */}
              <View style={styles.dropdownWrapperBelow}>
                <Text style={styles.dropdownLabel}>No. Of Sets</Text>
                <DropDownPicker
                  open={noOfSetsOpen}
                  setOpen={setNoOfSetsOpen}
                  value={settings.noOfSets}
                  setValue={(val) => {
                    const newValue =
                      typeof val === "function" ? val(settings.noOfSets) : val;
                    handleSettingChange("noOfSets", newValue);
                  }}
                  items={noOfSetsOptions}
                  style={styles.dropdown}
                  dropDownContainerStyle={styles.dropdownContainer}
                  textStyle={styles.pickerText}
                  onOpen={() => setEventOpen(false)}
                  modalProps={{ animationType: "slide" }}
                  modalContentContainerStyle={styles.modalContentContainer}
                  listMode="SCROLLVIEW"
                />
              </View>

              {/* Winning Score */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Winning Score</Text>
                <TextInput
                  style={styles.input}
                  value={settings.max.toString()}
                  onChangeText={(text) =>
                    handleSettingChange("max", parseInt(text) || 0)
                  }
                  placeholder="Winning Score"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>

              {/* Plus Two Rule */}
              <View style={styles.checkboxContainer}>
                <BouncyCheckbox
                  isChecked={settings.plusTwo}
                  onPress={() =>
                    handleSettingChange("plusTwo", !settings.plusTwo)
                  }
                  fillColor="#4CAF50"
                  size={25}
                  text="Plus Two Rule"
                  textStyle={styles.checkboxText}
                />
              </View>

              {settings.plusTwo && (
                <>
                  {/* Plus Two Max Score */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Final Max Score</Text>
                    <TextInput
                      style={styles.input}
                      value={settings.plusTwoMax.toString()}
                      onChangeText={(text) =>
                        handleSettingChange("plusTwoMax", parseInt(text) || 0)
                      }
                      placeholder="Final Max Score"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      editable={!settings.plusTwoNoLimit}
                    />
                  </View>

                  {/* No Limit Checkbox */}
                  <View style={styles.checkboxContainer}>
                    <BouncyCheckbox
                      isChecked={settings.plusTwoNoLimit}
                      onPress={() =>
                        handleSettingChange(
                          "plusTwoNoLimit",
                          !settings.plusTwoNoLimit
                        )
                      }
                      fillColor="#4CAF50"
                      size={25}
                      text="No Limit"
                      textStyle={styles.checkboxText}
                    />
                  </View>
                </>
              )}
            </View>

            {/* Player Names Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PLAYER NAMES</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>TEAM A PLAYERS</Text>
                <TextInput
                  style={styles.input}
                  value={players.a1}
                  onChangeText={(text) => handlePlayerChange("a1", text)}
                  placeholder="Player A1"
                  placeholderTextColor="#999"
                />
                {!isSingles && (
                  <TextInput
                    style={styles.input}
                    value={players.a2}
                    onChangeText={(text) => handlePlayerChange("a2", text)}
                    placeholder="Player A2"
                    placeholderTextColor="#999"
                  />
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>TEAM B PLAYERS</Text>
                <TextInput
                  style={styles.input}
                  value={players.b1}
                  onChangeText={(text) => handlePlayerChange("b1", text)}
                  placeholder="Player B1"
                  placeholderTextColor="#999"
                />
                {!isSingles && (
                  <TextInput
                    style={styles.input}
                    value={players.b2}
                    onChangeText={(text) => handlePlayerChange("b2", text)}
                    placeholder="Player B2"
                    placeholderTextColor="#999"
                  />
                )}
              </View>
            </View>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.modalButtonText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>SAVE</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeSuccessModal}
      >
        <View style={styles.successModalContainer}>
          <View style={styles.successModalContent}>
            <Text style={styles.modalTitle}>Success!</Text>
            <Text style={styles.modalText}>
              Game information updated successfully
            </Text>

            <View style={styles.changesContainer}>
              <View style={styles.teamColumn}>
                <Text style={styles.teamTitle}>Team A</Text>
                <Text style={styles.changeText}>
                  A1: {previousNames.a1 || "Empty"} →{" "}
                  <Text style={{ color: "#3d9541" }}>
                    {players.a1 || "Empty"}
                  </Text>
                </Text>
                {!isSingles && (
                  <Text style={styles.changeText}>
                    A2: {previousNames.a2 || "Empty"} →{" "}
                    <Text style={{ color: "#3d9541" }}>
                      {players.a2 || "Empty"}
                    </Text>
                  </Text>
                )}
              </View>
              <View style={styles.teamColumn}>
                <Text style={styles.teamTitle}>Team B</Text>
                <Text style={styles.changeText}>
                  B1: {previousNames.b1 || "Empty"} →{" "}
                  <Text style={{ color: "#3d9541" }}>
                    {players.b1 || "Empty"}
                  </Text>
                </Text>
                {!isSingles && (
                  <Text style={styles.changeText}>
                    B2: {previousNames.b2 || "Empty"} →{" "}
                    <Text style={{ color: "#3d9541" }}>
                      {players.b2 || "Empty"}
                    </Text>
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.settingsChanges}>
              <Text style={styles.settingsChangeText}>
                Sets: Best of {settings.noOfSets}
              </Text>
              <Text style={styles.settingsChangeText}>
                Winning Score: {settings.max}
              </Text>
              {settings.plusTwo && (
                <Text style={styles.settingsChangeText}>
                  Plus Two Rule: Enabled
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={closeSuccessModal}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  modalContent: {
    padding: 20,
    paddingBottom: 50,
  },
  modalTitle: {
    color: "#4CAF50",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    paddingBottom: 16,
  },
  sectionTitle: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#444",
    color: "#fff",
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  dropdownList: {
    backgroundColor: "#444",
    borderColor: "#444",
  },
  dropdownText: {
    color: "#fff",
    fontSize: 16,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkboxText: {
    color: "#fff",
    fontSize: 16,
    textDecorationLine: "none",
    marginLeft: 8,
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    borderRadius: 5,
    padding: 12,
    alignItems: "center",
    minWidth: 120,
  },
  cancelButton: {
    backgroundColor: "#666",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  successModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  successModalContent: {
    backgroundColor: "#333",
    padding: 20,
    borderRadius: 10,
    width: "90%",
    maxWidth: 400,
  },
  modalText: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  changesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  teamColumn: {
    width: "48%",
  },
  teamTitle: {
    color: "#4CAF50",
    fontWeight: "bold",
    marginBottom: 8,
    fontSize: 16,
  },
  changeText: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 5,
  },
  inputContainer: {
    marginBottom: 16,
  },
  dropdownWrapperBelow: {
    marginBottom: 16,
    zIndex: 1000,
  },
  dropdownLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  dropdown: {
    backgroundColor: "#444",
    borderColor: "#444",
    borderRadius: 6,
  },
  dropdownContainer: {
    backgroundColor: "#444",
    borderColor: "#444",
  },
  pickerText: {
    color: "#fff",
    fontSize: 16,
  },
  modalContentContainer: {
    backgroundColor: "#444",
  },
  // Add these if you want error handling like in your commented example
  errorInput: {
    borderColor: "red",
    borderWidth: 1,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 4,
  },
  settingsChanges: {
    marginTop: 15,
    marginBottom: 20,
  },
  settingsChangeText: {
    fontSize: 14,
    marginBottom: 5,
    color: "#666",
    textAlign: "center",
  },
});

// Singles
// import React, { useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   TextInput,
//   StyleSheet,
//   TouchableOpacity,
//   ActivityIndicator,
//   ScrollView,
//   Modal,
//   KeyboardAvoidingView,
//   Platform,
//   Keyboard,
//   Alert,
// } from "react-native";
// import { useGame } from "../contexts/GameContext";
// import * as ScreenOrientation from "expo-screen-orientation";
// import { gql, useMutation } from "@apollo/client";
// import DropDownPicker from "react-native-dropdown-picker";
// import BouncyCheckbox from "react-native-bouncy-checkbox";

// const UPDATE_PLAYERS = gql`
//   mutation UpdatePlayers($gameId: ID!, $players: UpdatePlayersInput!) {
//     updatePlayers(gameId: $gameId, players: $players) {
//       _id
//       players {
//         A1
//         A2
//         B1
//         B2
//       }
//     }
//   }
// `;

// const UPDATE_GAME_SETTINGS = gql`
//   mutation UpdateGameSettings(
//     $gameId: ID!
//     $noOfSets: Int
//     $max: Int
//     $plusTwo: Boolean
//     $plusTwoMax: Int
//     $plusTwoNoLimit: Boolean
//   ) {
//     updateGameSettings(
//       gameId: $gameId
//       noOfSets: $noOfSets
//       max: $max
//       plusTwo: $plusTwo
//       plusTwoMax: $plusTwoMax
//       plusTwoNoLimit: $plusTwoNoLimit
//     ) {
//       _id
//       noOfSets
//       max
//       plusTwo
//       plusTwoMax
//       plusTwoNoLimit
//     }
//   }
// `;

// type Players = {
//   a1: string;
//   a2: string;
//   b1: string;
//   b2: string;
// };

// type EditPlayersModalProps = {
//   visible: boolean;
//   onClose: () => void;
//   gameId: string;
//   initialPlayers?: {
//     A1?: string;
//     A2?: string;
//     B1?: string;
//     B2?: string;
//   };
//   initialSettings?: {
//     noOfSets?: number;
//     max?: number;
//     plusTwo?: boolean;
//     plusTwoMax?: number;
//     plusTwoNoLimit?: boolean;
//   };
//   initialEvent?: string;
//   eventOptions?: Array<{ label: string; value: string }>;
//   isSingles?: boolean;
// };

// export default function EditPlayersModal({
//   visible,
//   onClose,
//   gameId,
//   initialPlayers,
//   initialSettings,
//   initialEvent,
//   eventOptions = [],
//   isSingles = false,
// }: EditPlayersModalProps) {
//   const [updatePlayers] = useMutation(UPDATE_PLAYERS);
//   const [updateGameSettings] = useMutation(UPDATE_GAME_SETTINGS);
//   const { updatePlayerNames, updateState } = useGame();
//   const [isSaving, setIsSaving] = useState(false);
//   const [showSuccessModal, setShowSuccessModal] = useState(false);

//   // Player states
//   const [previousNames, setPreviousNames] = useState<Players>({
//     a1: initialPlayers?.A1 || "",
//     a2: initialPlayers?.A2 || "",
//     b1: initialPlayers?.B1 || "",
//     b2: initialPlayers?.B2 || "",
//   });
//   const [players, setPlayers] = useState<Players>({
//     a1: initialPlayers?.A1 || "",
//     a2: initialPlayers?.A2 || "",
//     b1: initialPlayers?.B1 || "",
//     b2: initialPlayers?.B2 || "",
//   });

//   // Game settings states
//   const [settings, setSettings] = useState({
//     noOfSets: initialSettings?.noOfSets || 1,
//     max: initialSettings?.max || 21,
//     plusTwo: initialSettings?.plusTwo || false,
//     plusTwoMax: initialSettings?.plusTwoMax || 30,
//     plusTwoNoLimit: initialSettings?.plusTwoNoLimit || false,
//   });

//   // Event dropdown state
//   const [eventOpen, setEventOpen] = useState(false);
//   const [event, setEvent] = useState(initialEvent || "");

//   // Dropdown options
//   const noOfSetsOptions = [
//     { label: "Best of 1", value: 1 },
//     { label: "Best of 3", value: 3 },
//   ];
//   const [noOfSetsOpen, setNoOfSetsOpen] = useState(false);

//   useEffect(() => {
//     const changeOrientation = async () => {
//       if (visible) {
//         await ScreenOrientation.lockAsync(
//           ScreenOrientation.OrientationLock.PORTRAIT
//         );
//       } else {
//         await ScreenOrientation.lockAsync(
//           ScreenOrientation.OrientationLock.LANDSCAPE
//         );
//       }
//     };
//     changeOrientation();
//   }, [visible]);

//   const handlePlayerChange = (playerKey: keyof Players, value: string) => {
//     setPlayers((prev) => ({
//       ...prev,
//       [playerKey]: value,
//     }));
//   };

//   const handleSettingChange = (key: keyof typeof settings, value: any) => {
//     setSettings((prev) => ({
//       ...prev,
//       [key]: value,
//     }));
//   };

//   const handleSave = async () => {
//     Keyboard.dismiss();
//     setIsSaving(true);

//     try {
//       // Save previous names for success modal
//       setPreviousNames({
//         a1: initialPlayers?.A1 || "",
//         a2: initialPlayers?.A2 || "",
//         b1: initialPlayers?.B1 || "",
//         b2: initialPlayers?.B2 || "",
//       });

//       // Update players if changed
//       if (JSON.stringify(players) !== JSON.stringify(initialPlayers)) {
//         await updatePlayers({
//           variables: {
//             gameId,
//             players: {
//               A1: players.a1,
//               A2: players.a2,
//               B1: players.b1,
//               B2: players.b2,
//             },
//           },
//         });
//         await updatePlayerNames(gameId, players);
//       }

//       // Update game settings if changed
//       if (JSON.stringify(settings) !== JSON.stringify(initialSettings)) {
//         await updateGameSettings({
//           variables: {
//             gameId,
//             noOfSets: settings.noOfSets,
//             max: settings.max,
//             plusTwo: settings.plusTwo,
//             plusTwoMax: settings.plusTwoMax,
//             plusTwoNoLimit: settings.plusTwoNoLimit,
//           },
//         });

//         // Update local state
//         updateState(gameId, {
//           noOfSets: settings.noOfSets,
//           max: settings.max,
//           plusTwo: settings.plusTwo,
//           plusTwoMax: settings.plusTwoMax,
//           plusTwoNoLimit: settings.plusTwoNoLimit,
//         });
//       }

//       onClose();
//       setShowSuccessModal(true);
//     } catch (error) {
//       console.error("Failed to update:", error);
//       Alert.alert("Error", "Failed to update information");
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const closeSuccessModal = () => {
//     setShowSuccessModal(false);
//   };

//   return (
//     <>
//       <Modal
//         visible={visible}
//         transparent={false}
//         animationType="slide"
//         onRequestClose={onClose}
//       >
//         <KeyboardAvoidingView
//           behavior={Platform.OS === "ios" ? "padding" : "height"}
//           style={styles.modalContainer}
//           keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
//         >
//           <ScrollView contentContainerStyle={styles.modalContent}>
//             <Text style={styles.modalTitle}>Edit Game Settings</Text>

//             {/* Game Settings Section */}
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>GAME SETTINGS</Text>

//               {/* Event Dropdown */}
//               {eventOptions.length > 0 && (
//                 <View style={styles.dropdownContainer}>
//                   <Text style={styles.inputLabel}>Event</Text>
//                   <DropDownPicker
//                     open={eventOpen}
//                     setOpen={setEventOpen}
//                     value={event}
//                     setValue={setEvent}
//                     items={eventOptions}
//                     placeholder="Select Event"
//                     style={styles.dropdown}
//                     dropDownContainerStyle={styles.dropdownList}
//                     textStyle={styles.dropdownText}
//                     onOpen={() => setNoOfSetsOpen(false)}
//                   />
//                 </View>
//               )}

//               {/* No. of Sets Dropdown */}
//               <View style={styles.dropdownWrapperBelow}>
//                 <Text style={styles.dropdownLabel}>No. Of Sets</Text>
//                 <DropDownPicker
//                   open={noOfSetsOpen}
//                   setOpen={setNoOfSetsOpen}
//                   value={settings.noOfSets}
//                   setValue={(val) => {
//                     const newValue =
//                       typeof val === "function" ? val(settings.noOfSets) : val;
//                     handleSettingChange("noOfSets", newValue);
//                   }}
//                   items={noOfSetsOptions}
//                   style={styles.dropdown}
//                   dropDownContainerStyle={styles.dropdownContainer}
//                   textStyle={styles.pickerText}
//                   onOpen={() => setEventOpen(false)}
//                   modalProps={{ animationType: "slide" }}
//                   modalContentContainerStyle={styles.modalContentContainer}
//                   listMode="SCROLLVIEW"
//                 />
//               </View>

//               {/* Winning Score */}
//               <View style={styles.inputContainer}>
//                 <Text style={styles.inputLabel}>Winning Score</Text>
//                 <TextInput
//                   style={styles.input}
//                   value={settings.max.toString()}
//                   onChangeText={(text) =>
//                     handleSettingChange("max", parseInt(text) || 0)
//                   }
//                   placeholder="Winning Score"
//                   placeholderTextColor="#999"
//                   keyboardType="numeric"
//                 />
//               </View>

//               {/* Plus Two Rule */}
//               <View style={styles.checkboxContainer}>
//                 <BouncyCheckbox
//                   isChecked={settings.plusTwo}
//                   onPress={() =>
//                     handleSettingChange("plusTwo", !settings.plusTwo)
//                   }
//                   fillColor="#4CAF50"
//                   size={25}
//                   text="Plus Two Rule"
//                   textStyle={styles.checkboxText}
//                 />
//               </View>

//               {settings.plusTwo && (
//                 <>
//                   {/* Plus Two Max Score */}
//                   <View style={styles.inputContainer}>
//                     <Text style={styles.inputLabel}>Final Max Score</Text>
//                     <TextInput
//                       style={styles.input}
//                       value={settings.plusTwoMax.toString()}
//                       onChangeText={(text) =>
//                         handleSettingChange("plusTwoMax", parseInt(text) || 0)
//                       }
//                       placeholder="Final Max Score"
//                       placeholderTextColor="#999"
//                       keyboardType="numeric"
//                       editable={!settings.plusTwoNoLimit}
//                     />
//                   </View>

//                   {/* No Limit Checkbox */}
//                   <View style={styles.checkboxContainer}>
//                     <BouncyCheckbox
//                       isChecked={settings.plusTwoNoLimit}
//                       onPress={() =>
//                         handleSettingChange(
//                           "plusTwoNoLimit",
//                           !settings.plusTwoNoLimit
//                         )
//                       }
//                       fillColor="#4CAF50"
//                       size={25}
//                       text="No Limit"
//                       textStyle={styles.checkboxText}
//                     />
//                   </View>
//                 </>
//               )}
//             </View>

//             {/* Player Names Section */}
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>PLAYER NAMES</Text>

//               <View style={styles.inputGroup}>
//                 <Text style={styles.inputLabel}>TEAM A PLAYERS</Text>
//                 <TextInput
//                   style={styles.input}
//                   value={players.a1}
//                   onChangeText={(text) => handlePlayerChange("a1", text)}
//                   placeholder="Player A1"
//                   placeholderTextColor="#999"
//                 />
//                 {!isSingles && ( // Only show A2 input if not singles
//                   <TextInput
//                     style={styles.input}
//                     value={players.a2}
//                     onChangeText={(text) => handlePlayerChange("a2", text)}
//                     placeholder="Player A2"
//                     placeholderTextColor="#999"
//                   />
//                 )}
//               </View>

//               <View style={styles.inputGroup}>
//                 <Text style={styles.inputLabel}>TEAM B PLAYERS</Text>
//                 <TextInput
//                   style={styles.input}
//                   value={players.b1}
//                   onChangeText={(text) => handlePlayerChange("b1", text)}
//                   placeholder="Player B1"
//                   placeholderTextColor="#999"
//                 />
//                 {!isSingles && ( // Only show B2 input if not singles
//                   <TextInput
//                     style={styles.input}
//                     value={players.b2}
//                     onChangeText={(text) => handlePlayerChange("b2", text)}
//                     placeholder="Player B2"
//                     placeholderTextColor="#999"
//                   />
//                 )}
//               </View>
//             </View>

//             <View style={styles.modalButtonContainer}>
//               <TouchableOpacity
//                 style={[styles.modalButton, styles.cancelButton]}
//                 onPress={onClose}
//               >
//                 <Text style={styles.modalButtonText}>CANCEL</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[styles.modalButton, styles.saveButton]}
//                 onPress={handleSave}
//                 disabled={isSaving}
//               >
//                 {isSaving ? (
//                   <ActivityIndicator color="#fff" />
//                 ) : (
//                   <Text style={styles.modalButtonText}>SAVE</Text>
//                 )}
//               </TouchableOpacity>
//             </View>
//           </ScrollView>
//         </KeyboardAvoidingView>
//       </Modal>

//       {/* Success Modal - Update to conditionally show A2/B2 changes */}
//       <Modal
//         visible={showSuccessModal}
//         transparent={true}
//         animationType="fade"
//         onRequestClose={closeSuccessModal}
//       >
//         <View style={styles.successModalContainer}>
//           <View style={styles.successModalContent}>
//             <Text style={styles.modalTitle}>Success!</Text>
//             <Text style={styles.modalText}>
//               Game information updated successfully
//             </Text>

//             <View style={styles.changesContainer}>
//               <View style={styles.teamColumn}>
//                 <Text style={styles.teamTitle}>Team A</Text>
//                 <Text style={styles.changeText}>
//                   A1: {previousNames.a1 || "Empty"} →{" "}
//                   <Text style={{ color: "#3d9541" }}>
//                     {players.a1 || "Empty"}
//                   </Text>
//                 </Text>
//                 {!isSingles && ( // Only show A2 change if not singles
//                   <Text style={styles.changeText}>
//                     A2: {previousNames.a2 || "Empty"} →{" "}
//                     <Text style={{ color: "#3d9541" }}>
//                       {players.a2 || "Empty"}
//                     </Text>
//                   </Text>
//                 )}
//               </View>
//               <View style={styles.teamColumn}>
//                 <Text style={styles.teamTitle}>Team B</Text>
//                 <Text style={styles.changeText}>
//                   B1: {previousNames.b1 || "Empty"} →{" "}
//                   <Text style={{ color: "#3d9541" }}>
//                     {players.b1 || "Empty"}
//                   </Text>
//                 </Text>
//                 {!isSingles && ( // Only show B2 change if not singles
//                   <Text style={styles.changeText}>
//                     B2: {previousNames.b2 || "Empty"} →{" "}
//                     <Text style={{ color: "#3d9541" }}>
//                       {players.b2 || "Empty"}
//                     </Text>
//                   </Text>
//                 )}
//               </View>
//             </View>

//             <TouchableOpacity
//               style={styles.modalButton}
//               onPress={closeSuccessModal}
//             >
//               <Text style={styles.modalButtonText}>OK</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </>
//   );
// }

// const styles = StyleSheet.create({
//   modalContainer: {
//     flex: 1,
//     backgroundColor: "#1a1a1a",
//   },
//   modalContent: {
//     padding: 20,
//     paddingBottom: 50,
//   },
//   modalTitle: {
//     color: "#4CAF50",
//     fontSize: 20,
//     fontWeight: "bold",
//     marginBottom: 20,
//     textAlign: "center",
//   },
//   section: {
//     marginBottom: 24,
//     borderBottomWidth: 1,
//     borderBottomColor: "#444",
//     paddingBottom: 16,
//   },
//   sectionTitle: {
//     color: "#4CAF50",
//     fontSize: 16,
//     fontWeight: "bold",
//     marginBottom: 12,
//   },
//   inputGroup: {
//     marginBottom: 16,
//   },
//   inputLabel: {
//     color: "#fff",
//     fontSize: 14,
//     fontWeight: "bold",
//     marginBottom: 8,
//   },
//   input: {
//     backgroundColor: "#444",
//     color: "#fff",
//     borderRadius: 6,
//     padding: 12,
//     fontSize: 16,
//     marginBottom: 10,
//   },
//   dropdownList: {
//     backgroundColor: "#444",
//     borderColor: "#444",
//   },
//   dropdownText: {
//     color: "#fff",
//     fontSize: 16,
//   },
//   checkboxContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 12,
//   },
//   checkboxText: {
//     color: "#fff",
//     fontSize: 16,
//     textDecorationLine: "none",
//     marginLeft: 8,
//   },
//   modalButtonContainer: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginTop: 20,
//   },
//   modalButton: {
//     borderRadius: 5,
//     padding: 12,
//     alignItems: "center",
//     minWidth: 120,
//   },
//   cancelButton: {
//     backgroundColor: "#666",
//   },
//   saveButton: {
//     backgroundColor: "#4CAF50",
//   },
//   modalButtonText: {
//     color: "#fff",
//     fontWeight: "bold",
//   },
//   successModalContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "rgba(0,0,0,0.5)",
//   },
//   successModalContent: {
//     backgroundColor: "#333",
//     padding: 20,
//     borderRadius: 10,
//     width: "90%",
//     maxWidth: 400,
//   },
//   modalText: {
//     color: "#fff",
//     fontSize: 16,
//     marginBottom: 20,
//     textAlign: "center",
//   },
//   changesContainer: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginBottom: 20,
//   },
//   teamColumn: {
//     width: "48%",
//   },
//   teamTitle: {
//     color: "#4CAF50",
//     fontWeight: "bold",
//     marginBottom: 8,
//     fontSize: 16,
//   },
//   changeText: {
//     color: "#fff",
//     fontSize: 14,
//     marginBottom: 5,
//   },
//   inputContainer: {
//     marginBottom: 16,
//   },
//   dropdownWrapperBelow: {
//     marginBottom: 16,
//     zIndex: 1000,
//   },
//   dropdownLabel: {
//     color: "#fff",
//     fontSize: 14,
//     fontWeight: "bold",
//     marginBottom: 8,
//   },
//   dropdown: {
//     backgroundColor: "#444",
//     borderColor: "#444",
//     borderRadius: 6,
//   },
//   dropdownContainer: {
//     backgroundColor: "#444",
//     borderColor: "#444",
//   },
//   pickerText: {
//     color: "#fff",
//     fontSize: 16,
//   },
//   modalContentContainer: {
//     backgroundColor: "#444",
//   },
//   // Add these if you want error handling like in your commented example
//   errorInput: {
//     borderColor: "red",
//     borderWidth: 1,
//   },
//   errorText: {
//     color: "red",
//     fontSize: 12,
//     marginTop: 4,
//   },
// });
