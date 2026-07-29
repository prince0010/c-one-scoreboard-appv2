import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { Link, router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    Animated,
    Easing,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { z } from "zod";

const EVENT_OPTIONS = gql`
  query FetchEvents {
    fetchEvents {
      _id
      name
      eventType
      gender
    }
  }
`;

const COURTS_OPTION = gql`
  query FetchCourts {
    fetchCourts {
      _id
      name
    }
  }
`;

const CREATE_GAME = gql`
  mutation CreateGame(
    $event: ID!
    $court: ID!
    $max: Int!
    $noOfSets: Int!
    $plusTwo: Boolean
    $plusTwoMax: Int
    $plusTwoNoLimit: Boolean
    $players: PlayersInput!
    $sets: [SetInput!]!
    $status: Status
    $start: DateTime!
    $end: DateTime
    $showOnTV: Boolean
  ) {
    createGame(
      input: {
        event: $event
        court: $court
        max: $max
        noOfSets: $noOfSets
        plusTwo: $plusTwo
        plusTwoMax: $plusTwoMax
        plusTwoNoLimit: $plusTwoNoLimit
        players: $players
        sets: $sets
        status: $status
        start: $start
        end: $end
        showOnTV: $showOnTV
      }
    ) {
      _id
      max
      noOfSets
      plusTwo
      plusTwoMax
      plusTwoNoLimit
      players {
        A1
        A2
        B1
        B2
      }
      status
      start
      end
      showOnTV
      createdAt
      updatedAt
      event {
        _id
      }
      court {
        _id
      }
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
        scoresheet {
          aSwitch
          bSwitch
          currentAScore
          currentBScore
          scoredAt
          scorer
          nextServe
          toServe
        }
      }
    }
  }
`;
const FETCH_TOURNAMENTS = gql`
  query FetchTournaments {
    fetchTournaments {
      _id
      name
      start
      end
      isActive
      createdAt
      updatedAt
    }
  }
`;

interface Event {
    _id: string;
    name: string;
    eventType: "SINGLES" | "DOUBLES";
    gender: "MALE" | "FEMALE" | "MIXED";
}

interface FetchEventsData {
    fetchEvents: Event[];
}

interface Court {
    _id: string;
    name: string;
}

interface FetchCourtsData {
    fetchCourts: Court[];
}

interface Tournament {
    _id: string;
    name: string;
    start: string;
    end?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface FetchTournamentsData {
    fetchTournaments: Tournament[];
}

interface CreateGameData {
    createGame: {
        _id: string;
        max: number;
        noOfSets: number;
        plusTwo?: boolean | null;
        plusTwoMax?: number | null;
        plusTwoNoLimit?: boolean | null;
        players: {
            A1: string;
            A2?: string | null;
            B1: string;
            B2?: string | null;
        };
        status?: string | null;
        start: string;
        end?: string | null;
        showOnTV?: boolean | null;
        createdAt: string;
        updatedAt: string;
        event: {
            _id: string;
        };
        court: {
            _id: string;
        };
        sets?: {
            aScore: number;
            bScore: number;
            currentRound: number;
            currentServer?: string | null;
            currentReceiver?: string | null;
            firstServer?: string | null;
            firstReceiver?: string | null;
            lastTeamScored?: string | null;
            switchSide?: boolean | null;
            scoresheet?: {
                aSwitch: boolean;
                bSwitch: boolean;
                currentAScore: number;
                currentBScore: number;
                scoredAt?: string | null;
                scorer?: string | null;
                nextServe?: string | null;
                toServe?: string | null;
            }[] | null;
        }[] | null;
    };
}

interface EventDropdownItem {
    label: string;
    value: string;
    eventType: "SINGLES" | "DOUBLES";
    gender: "MALE" | "FEMALE" | "MIXED";
}

export default function NewGameModal() {
    const PlayersSchema = z
        .object({
            A1: z.string().min(1, "Player A1 is required"),
            A2: z.string().optional(),
            B1: z.string().min(1, "Player B1 is required"),
            B2: z.string().optional(),
        })
        .superRefine((data, ctx) => {
            const eventType = selectedEventType;
            if (eventType === "DOUBLES") {
                if (!data.A2) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Player A2 is required for Doubles",
                        path: ["A2"],
                    });
                }
                if (!data.B2) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Player B2 is required for Doubles",
                        path: ["B2"],
                    });
                }
            }
        });

    const GameSchema = z.object({
        event: z.string().min(1, "Event is required"),
        court: z.string().min(1, "Court is required"),
        gameNo: z.string().optional(),
        groupNo: z.string().optional(),
        max: z.number().min(1, "Winning score must be at least 1"),
        noOfSets: z.number().min(1, "Number of sets is required"),
        plusTwo: z.boolean(),
        timeSlot: z.date().optional(),
        plusTwoMax: z.number().optional(),
        plusTwoNoLimit: z.boolean(),
        players: PlayersSchema,
        status: z.enum([
            "PENDING",
            "PLAYING",
            "COMPLETED",
            "WALKOVER",
            "DISQUALIFIED",
        ]),
        start: z.date(),
        end: z.date().optional(),
        showOnTV: z.boolean(),
    });

    const [court, setCourt] = useState("");
    const [eventOpen, setEventOpen] = useState(false);
    const [event, setEvent] = useState<string | null>(null);
    const [formatOpen, setFormatOpen] = useState(false);
    const [winningFormat, setWinningFormat] = useState("21");
    const [finalMaxScore, setFinalMaxScore] = useState("30");
    const [plusTwoRule, setPlusTwoRule] = useState(false);
    // const [noLimit, setNoLimit] = useState(false);
    const [courtId, setCourtId] = useState<string | null>(null);
    const [eventItems, setEventItems] = useState<EventDropdownItem[]>([]);
    const [formatOption, setFormatOption] = useState<string | null>(null);
    const [courtOption, setCourtOption] = useState<string | null>(null);

    const [createGame, { loading: createGameLoading, error: createGameError }] =
        useMutation<CreateGameData, any>(CREATE_GAME);
    const [activeTournamentId, setActiveTournamentId] = useState<string | null>(
        null
    );
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [timeSlot, setTimeSlot] = useState(new Date());
    const [selectedEventType, setSelectedEventType] = useState<
        "SINGLES" | "DOUBLES"
    >("SINGLES");
    const [animations] = useState({
        A1: new Animated.Value(0),
        A2: new Animated.Value(0),
        B1: new Animated.Value(0),
        B2: new Animated.Value(0),
    });

    const animateLabel = (field: keyof typeof animations, toValue: number) => {
        Animated.timing(animations[field], {
            toValue,
            duration: 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
        }).start();
    };

    const {
        data: courtData,
        loading: courtLoading,
        error: courtError,
    } = useQuery<FetchCourtsData>(COURTS_OPTION);
    const {
        data: eventData,
        loading: eventLoading,
        error: eventError,
    } = useQuery<FetchEventsData>(EVENT_OPTIONS, {
        // pollInterval: 1000,
        fetchPolicy: "cache-and-network",
    });

    //   Game
    const {
        control: gameControl,
        handleSubmit: gameHandleSubmit,
        setValue: setGameValue,
        watch: gameWatch,
        formState: { errors: gameErrors },
    } = useForm<z.infer<typeof GameSchema>>({
        resolver: zodResolver(GameSchema),
        defaultValues: {
            event: undefined,
            court: undefined,
            gameNo: "",
            groupNo: "",
            max: 21,
            noOfSets: 3,
            plusTwo: false,
            plusTwoMax: 30,
            plusTwoNoLimit: false,
            timeSlot: undefined,
            players: {
                A1: "",
                A2: "",
                B1: "",
                B2: "",
            },
            status: "PENDING",
            start: new Date(),
            end: undefined,
            showOnTV: false,
        },
    });
    const selectedEvent = gameWatch("event");
    const plusTwo = gameWatch("plusTwo");
    const noLimit = gameWatch("plusTwoNoLimit");
    // const [plusTwoRule, setPlusTwoRule] = useState(gameWatch("plusTwo"));

    useEffect(() => {
        if (selectedEvent) {
            const selectedEventData = eventData?.fetchEvents.find(
                (e: any) => e._id === selectedEvent
            );
            if (selectedEventData) {
                const isOpenEvent = selectedEventData.name.includes("Open");

                if (isOpenEvent) {
                    // Open event settings
                    setGameValue("noOfSets", 3);
                    setGameValue("max", 21);
                    setGameValue("plusTwo", true);
                    setGameValue("plusTwoMax", 30);
                    setGameValue("plusTwoNoLimit", false);
                    setFinalMaxScore("30");
                    setPlusTwoRule(true);
                } else {
                    // Non-open event settings
                    setGameValue("noOfSets", 1);
                    setGameValue("max", 31);
                    setGameValue("plusTwo", false);
                    setGameValue("plusTwoMax", 30); // Still set but won't be used
                    setGameValue("plusTwoNoLimit", false);
                    setFinalMaxScore("30");
                    setPlusTwoRule(false);
                }
            }
        }
    }, [selectedEvent]);

    useEffect(() => {
        if (selectedEvent) {
            const event = eventData?.fetchEvents.find(
                (c: any) => c._id === selectedEvent
            );
            if (event) {
                setSelectedEventType(event.eventType);
            }
        }
    }, [selectedEvent]);

    useEffect(() => {
        setGameValue("plusTwo", plusTwoRule);
    }, [plusTwoRule]);

    useEffect(() => {
        const getCourt = async () => {
            const storedCourtId = await AsyncStorage.getItem("selectedCourt");
            setCourtId(storedCourtId);
            if (storedCourtId) {
                setGameValue("court", storedCourtId);
            }
        };
        getCourt();
    }, []);

    const { data: tournamentsData } = useQuery<FetchTournamentsData>(FETCH_TOURNAMENTS);
    useEffect(() => {
        if (tournamentsData?.fetchTournaments) {
            const activeTournament = tournamentsData.fetchTournaments.find(
                (tourn: any) => tourn.isActive
            );
            if (activeTournament) {
                setActiveTournamentId(activeTournament._id);
            }
        }
    }, [tournamentsData]);

    const NO_SETS = [
        {
            label: "Best of 1",
            value: 1,
        },
        {
            label: "Best of 3",
            value: 3,
        },
    ];

    const [players, setPlayers] = useState({ A1: "", A2: "", B1: "", B2: "" });
    useEffect(() => {
        if (eventData?.fetchEvents) {
            const formattedEvents: EventDropdownItem[] = eventData.fetchEvents.map(
                (event: any) => ({
                    label: `${event.name} ${event.eventType === "SINGLES" ? "(Singles)" : " "
                        }`,
                    //    label: `${event.name} ${event.gender === 'MALE' ? 'Men\'s' :
                    // event.gender === 'FEMALE' ? 'Women\'s' : 'Mixed'} ${event.eventType.toLowerCase()}`,
                    value: event._id,
                    eventType: event.eventType,
                    gender: event.gender,
                })
            );
            setEventItems(formattedEvents);
        }
    }, [eventData]);

    useEffect(() => {
        const getCourtLabel = async () => {
            try {
                const storedValue = await AsyncStorage.getItem("selectedCourt");
                if (storedValue && courtData?.fetchCourts) {
                    const match = courtData.fetchCourts.find(
                        (c: any) => c._id === storedValue
                    );
                    if (match) setCourt(match.name);
                }
            } catch (err) {
                console.error("Error retrieving court label:", err);
            }
        };
        if (courtData?.fetchCourts) {
            getCourtLabel();
        }
    }, [courtData]);

    if (eventLoading) {
        return (
            <View style={styles.container}>
                <Text style={{ color: "white" }}>Loading...</Text>
            </View>
        );
    }

    const onSubmit = async (data: z.infer<typeof GameSchema>) => {
        try {
            if (!courtId) {
                alert("Court Not Selected!");
                return;
            }

            const defaultSet = {
                aScore: 0,
                bScore: 0,
                currentRound: 1,
                lastTeamScored: null,
                scoresheet: {
                    aSwitch: false,
                    bSwitch: false,
                    currentAScore: 0,
                    currentBScore: 0,
                    scoredAt: null,
                    scorer: null,
                    nextServe: null,
                    toServe: null,
                },
            };

            const sets = Array(data.noOfSets).fill(defaultSet);

            const players = {
                A1: data.players.A1,
                A2: data.players.A2 || null,
                B1: data.players.B1,
                B2: data.players.B2 || null,
            };

            const variables = {
                event: data.event,
                court: courtId,
                max: data.max,
                noOfSets: data.noOfSets,
                plusTwo: data.plusTwo,
                plusTwoNoLimit: data.plusTwoNoLimit,
                plusTwoMax: data.plusTwo
                    ? data.plusTwoNoLimit
                        ? 9999
                        : Number(finalMaxScore)
                    : 30,
                players,
                sets,
                status: data.status ?? "PENDING",
                start: data.start.toISOString(),
                end: data.end ? data.end.toISOString() : null,
                timeSlot: data.timeSlot ? data.timeSlot.toISOString() : null,
                showOnTV: data.showOnTV,
            };

            // console.log("Final mutation variables:", variables)
            // console.log("Final mutation players:", players)
            const result = await createGame({ variables });
            console.log("Mutation Resultsssssssssss:", result);
            if (!result.data) {
                alert("Failed to Create Game: No data returned.");
                return;
            }
            router.replace({
                pathname: "../../scoreboard",
                params: {
                    gameId: result.data.createGame._id,
                    teamAName: `${data.players.A1}${data.players.A2 ? `/${data.players.A2}` : ""
                        }`,
                    teamBName: `${data.players.B1}${data.players.B2 ? `/${data.players.B2}` : ""
                        }`,
                    maxScore: data.max,
                    noOfSets: data.noOfSets,
                    plusTwo: data.plusTwo.toString(),
                    plusTwoMax: data.plusTwo
                        ? noLimit
                            ? 9999
                            : Number(finalMaxScore)
                        : 30,
                    noLimit: data.plusTwoNoLimit.toString(),
                },
            });
        } catch (error: any) {
            console.error("Full error details:", JSON.stringify(error, null, 2));
            if (error.networkError) {
                console.error("Network error:", error.networkError);
            }
            if (error.graphQLErrors) {
                error.graphQLErrors.forEach((err: any) => {
                    console.error("GraphQL error:", err.message);
                    console.error("Path:", err.path);
                    console.error("Extensions:", err.extensions);
                });
            }
            alert(`Failed to Create Game: ${error.message}`);
        }
    };

    return (
        <View style={styles.container}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "padding"}
                style={styles.keyboardAvoidingContainer}
                keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
            >
                <View style={styles.modalContent}>
                    <View style={styles.headerRow}>
                        <Text style={styles.modalTitle}>Create New Game</Text>
                        <Link href="../" asChild>
                            <TouchableOpacity style={styles.closeButton}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </Link>
                    </View>

                    <View style={styles.settingsSummary}>
                        <Text style={styles.summaryText}>
                            Game Settings:{" "}
                            {selectedEvent
                                ? eventData?.fetchEvents
                                    .find((e: any) => e._id === selectedEvent)
                                    ?.name.includes("Open")
                                    ? "Best of 3 sets, Win by 2 points after 20 (max 30)"
                                    : "Best of 1 set, First to 31 wins"
                                : "Select an event to see settings"}
                        </Text>
                    </View>

                    {activeTournamentId ? (
                        <View style={styles.activeTournamentContainer}>
                            <Text style={styles.activeTournamentText}>
                                Active Tournament:{" "}
                                {tournamentsData?.fetchTournaments.find(
                                    (tour: any) => tour._id === activeTournamentId
                                )?.name || "Unknown"}{" "}
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.warningText}>
                            No active Tournament found. Please create or active a tournament
                            first.
                        </Text>
                    )}
                    <ScrollView
                        contentContainerStyle={[
                            styles.scrollContainer,
                            eventOpen && { paddingBottom: 150 },
                        ]}
                        keyboardShouldPersistTaps="always"
                        keyboardDismissMode="none"
                    >
                        {/* Court */}
                        <Text style={styles.labelText}>Court</Text>
                        <TextInput
                            style={styles.textInputDisabled}
                            value={court}
                            editable={false}
                        />

                        {/* Event */}
                        <View style={styles.dropdownWrapper}>
                            <Text style={styles.dropdownLabel}>Event</Text>
                            <Controller
                                control={gameControl}
                                name="event"
                                render={({ field: { onChange, value } }) => (
                                    <DropDownPicker
                                        open={eventOpen}
                                        setOpen={setEventOpen}
                                        value={value}
                                        setValue={(val) => {
                                            onChange(typeof val === "function" ? val(value) : val);
                                            // Update selected event type when event changes
                                            const selected = eventItems.find(
                                                (item: any) => item.value === val
                                            );
                                            if (selected) {
                                                setSelectedEventType(selected.eventType);
                                            }
                                        }}
                                        items={eventItems}
                                        placeholder="Select Event"
                                        // dropDownDirection="TOP"
                                        style={[
                                            styles.dropdown,
                                            gameErrors.event && styles.errorInput,
                                        ]}
                                        dropDownContainerStyle={[
                                            styles.dropdownContainer,
                                            eventOpen && { paddingBottom: 10 },
                                            { maxHeight: 510 },
                                        ]}
                                        textStyle={styles.pickerText}
                                        onOpen={() => setFormatOpen(false)}
                                        modalProps={{ animationType: "slide" }}
                                        modalContentContainerStyle={styles.modalContentContainer}
                                        listMode="SCROLLVIEW"
                                    // listMode="MODAL"
                                    />
                                )}
                            />
                            {gameErrors.event && (
                                <Text style={styles.errorText}>{gameErrors.event.message}</Text>
                            )}
                        </View>

                        {/* No. Of Sets */}
                        <View style={styles.dropdownWrapperBelow}>
                            <Text style={styles.dropdownLabel}>No. Of Sets</Text>
                            <Controller
                                control={gameControl}
                                name="noOfSets"
                                render={({ field: { onChange, value } }) => (
                                    <DropDownPicker
                                        open={formatOpen}
                                        setOpen={setFormatOpen}
                                        value={value}
                                        // onChangeValue={(val) => onChange(val)} // alternate if we will change the setValue to this onChange
                                        setValue={(val) =>
                                            onChange(typeof val === "function" ? val(value) : val)
                                        }
                                        items={NO_SETS}
                                        style={[
                                            styles.dropdown,
                                            gameErrors.noOfSets && styles.errorInput,
                                        ]}
                                        dropDownContainerStyle={styles.dropdownContainer}
                                        textStyle={styles.pickerText}
                                        onOpen={() => setEventOpen(false)}
                                        modalProps={{ animationType: "slide" }}
                                        modalContentContainerStyle={styles.modalContentContainer}
                                        listMode="SCROLLVIEW"
                                    />
                                )}
                            />
                            {gameErrors.noOfSets && (
                                <Text style={styles.errorText}>
                                    {gameErrors.noOfSets.message}
                                </Text>
                            )}
                        </View>

                        {/* Winning Score */}
                        {/* <Controller
            control={gameControl}
            name="max"
            render={({
              field: { onChange, onBlur, value },
              fieldState: { error },
            }) => (
              <>
                <Text style={styles.labelText}>Winning Score</Text>
                <TextInput
                  style={[styles.textInput, error && styles.errorInput]}
                  placeholder="Enter Winning Score"
                  keyboardType="numeric"
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(Number(text))}
                  value={value.toString()}
                />
                {error && <Text style={styles.errorText}>{error.message}</Text>}
              </>
            )}
          /> */}

                        {/* IMPORTANT TimeSlot for sorting  */}

                        {/*TimeSlot for sorting  */}
                        {/* <View style={{ marginBottom: 16 }}>
            <Text style={styles.labelText}>Time Slot</Text>
            <Controller
              control={gameControl}
              name="timeSlot"
              render={({ field: { onChange, value } }) => (
                <TimePicker
                  initialTime={value ? format(value, "hh:mm a") : "12:00 PM"}
                  onChange={(time) => {
                    try {
                      const timeMatch = time.match(/(\d+):(\d+) (AM|PM)/i);
                      if (!timeMatch) {
                        console.warn("Invalid time format");
                        return;
                      }

                      const [hours, minutes, period] = timeMatch.slice(1);
                      let hour = parseInt(hours, 10);
                      const minute = parseInt(minutes, 10);

                      if (period.toUpperCase() === "PM" && hour !== 12) {
                        hour += 12;
                      } else if (period.toUpperCase() === "AM" && hour === 12) {
                        hour = 0;
                      }

                      const newDate = value ? new Date(value) : new Date();
                      newDate.setHours(hour);
                      newDate.setMinutes(minute);
                      newDate.setSeconds(0);
                      newDate.setMilliseconds(0);

                      onChange(newDate);
                    } catch (error) {
                      console.error("Error parsing time:", error);
                    }
                  }}
                />
              )}
            />
          </View> */}
                        {/* Plus Two Rule */}
                        <View style={styles.checkboxContainer}>
                            {/* <Controller
              control={gameControl}
              name="plusTwo"
              render={({ field: { onChange, value } }) => (
                <View style={styles.checkboxContainer}>
                  <BouncyCheckbox
                    isChecked={value}
                    onPress={() => onChange(!value)}
                    fillColor="black"
                    size={25}
                    iconStyle={{ borderColor: "black" }}
                    text="Plus Two Rule?"
                    textStyle={{
                      fontSize: 18,
                      color: "#333",
                      textDecorationLine: "none",
                    }}
                    textContainerStyle={{ marginLeft: 10 }}
                    style={{ marginBottom: 7 }}
                  />
                </View>
              )}
            /> */}

                            {/* {plusTwo && (
              <View style={styles.checkboxContainer}>
                <Controller
                  control={gameControl}
                  name="plusTwoNoLimit"
                  render={({ field: { onChange, value } }) => (
                    <BouncyCheckbox
                      isChecked={value}
                      onPress={() => onChange(!value)}
                      fillColor="black"
                      size={25}
                      iconStyle={{ borderColor: "black" }}
                      text="No Limit"
                      textStyle={{
                        fontSize: 18,
                        color: "#333",
                        textDecorationLine: "none",
                      }}
                      textContainerStyle={{ marginLeft: 10 }}
                    />
                  )}
                />
              </View>
            )} */}

                            {/* {plusTwo && !noLimit && (
              <View>
                <Text style={styles.labelText}>Final Max Score</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter Final Max Score"
                  keyboardType="numeric"
                  value={finalMaxScore}
                  onChangeText={setFinalMaxScore}
                />
                <Text>
                  <Text style={styles.textRed}>* </Text>
                  <Text style={styles.fontBold}>PLUS TWO: </Text>
                  <Text style={styles.fontItalic}>
                    If the score is 20-20, a side must win by two clear points
                    to win the game.
                  </Text>
                </Text>
              </View>
            )} */}

                            {/* {plusTwo && noLimit && (
              <Text
                style={{
                  marginTop: 1,
                  marginBottom: 10,
                  fontSize: 14,
                  color: "#333",
                }}
              >
                <Text style={styles.textRed}>* </Text>
                <Text style={styles.fontBold}>PLUS TWO: </Text>
                <Text style={styles.fontItalic}>
                  If the score is 20-20, a side must win by two clear points to
                  win the game. If it reaches 9998-9998, the first to get their
                  9999 points wins.
                </Text>
              </Text>
            )} */}

                            {selectedEvent && (
                                <View>
                                    <Text style={styles.labelTextPlayers}>Players</Text>

                                    {/* Player A1 - Always shown */}
                                    <View style={styles.inputContainer}>
                                        <Animated.Text
                                            style={[
                                                styles.floatingLabel,
                                                {
                                                    transform: [
                                                        {
                                                            translateY: animations.A1.interpolate({
                                                                inputRange: [0, 1],
                                                                outputRange: [10, -26],
                                                            }),
                                                        },
                                                        {
                                                            translateX: animations.A1.interpolate({
                                                                inputRange: [0, 1],
                                                                outputRange: [12, 0],
                                                            }),
                                                        },
                                                    ],
                                                    fontSize: animations.A1.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [16, 14],
                                                    }),
                                                    color: animations.A1.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: ["#8c8c8c", "#333"],
                                                    }),
                                                },
                                            ]}
                                        >
                                            Player 1 (Team A)
                                        </Animated.Text>
                                        <Controller
                                            control={gameControl}
                                            name="players.A1"
                                            render={({
                                                field: { onChange, onBlur, value },
                                                fieldState: { error },
                                            }) => (
                                                <>
                                                    <TextInput
                                                        style={[styles.textInput, error && styles.errorInput]}
                                                        onBlur={() => {
                                                            onBlur();
                                                            if (!value) animateLabel("A1", 0);
                                                        }}
                                                        onFocus={() => animateLabel("A1", 1)}
                                                        onChangeText={(text) => {
                                                            onChange(text);
                                                            if (text) animateLabel("A1", 1);
                                                        }}
                                                        value={value}
                                                    />
                                                    {error && (
                                                        <Text style={styles.errorText}>{error.message}</Text>
                                                    )}
                                                </>
                                            )}
                                        />
                                    </View>

                                    {/* Player A2 - Only shown for DOUBLES */}
                                    {selectedEventType === "DOUBLES" && (
                                        <View style={styles.inputContainer}>
                                            <Animated.Text
                                                style={[
                                                    styles.floatingLabel,
                                                    {
                                                        transform: [
                                                            {
                                                                translateY: animations.A2.interpolate({
                                                                    inputRange: [0, 1],
                                                                    outputRange: [10, -26],
                                                                }),
                                                            },
                                                            {
                                                                translateX: animations.A2.interpolate({
                                                                    inputRange: [0, 1],
                                                                    outputRange: [12, 0],
                                                                }),
                                                            },
                                                        ],
                                                        fontSize: animations.A2.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [16, 14],
                                                        }),
                                                        color: animations.A2.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: ["#8c8c8c", "#333"],
                                                        }),
                                                    },
                                                ]}
                                            >
                                                Player 2 (Team A)
                                            </Animated.Text>
                                            <Controller
                                                control={gameControl}
                                                name="players.A2"
                                                render={({
                                                    field: { onChange, onBlur, value },
                                                    fieldState: { error },
                                                }) => (
                                                    <>
                                                        <TextInput
                                                            style={[
                                                                styles.textInput,
                                                                error && styles.errorInput,
                                                            ]}
                                                            onBlur={() => {
                                                                onBlur();
                                                                if (!value) animateLabel("A2", 0);
                                                            }}
                                                            onFocus={() => animateLabel("A2", 1)}
                                                            onChangeText={(text) => {
                                                                onChange(text);
                                                                if (text) animateLabel("A2", 1);
                                                            }}
                                                            value={value}
                                                        />
                                                        {error && (
                                                            <Text style={styles.errorText}>
                                                                {error.message}
                                                            </Text>
                                                        )}
                                                    </>
                                                )}
                                            />
                                        </View>
                                    )}

                                    {/* Player B1 - Always shown */}
                                    <View style={styles.inputContainer}>
                                        <Animated.Text
                                            style={[
                                                styles.floatingLabel,
                                                {
                                                    transform: [
                                                        {
                                                            translateY: animations.B1.interpolate({
                                                                inputRange: [0, 1],
                                                                outputRange: [10, -26],
                                                            }),
                                                        },
                                                        {
                                                            translateX: animations.B1.interpolate({
                                                                inputRange: [0, 1],
                                                                outputRange: [12, 0],
                                                            }),
                                                        },
                                                    ],
                                                    fontSize: animations.B1.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [16, 14],
                                                    }),
                                                    color: animations.B1.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: ["#8c8c8c", "#333"],
                                                    }),
                                                },
                                            ]}
                                        >
                                            Player 1 (Team B)
                                        </Animated.Text>
                                        <Controller
                                            control={gameControl}
                                            name="players.B1"
                                            render={({
                                                field: { onChange, onBlur, value },
                                                fieldState: { error },
                                            }) => (
                                                <>
                                                    <TextInput
                                                        style={[styles.textInput, error && styles.errorInput]}
                                                        onBlur={() => {
                                                            onBlur();
                                                            if (!value) animateLabel("B1", 0);
                                                        }}
                                                        onFocus={() => animateLabel("B1", 1)}
                                                        onChangeText={(text) => {
                                                            onChange(text);
                                                            if (text) animateLabel("B1", 1);
                                                        }}
                                                        value={value}
                                                    />
                                                    {error && (
                                                        <Text style={styles.errorText}>{error.message}</Text>
                                                    )}
                                                </>
                                            )}
                                        />
                                    </View>

                                    {/* Player B2 - Only shown for DOUBLES */}
                                    {selectedEventType === "DOUBLES" && (
                                        <View style={styles.inputContainer}>
                                            <Animated.Text
                                                style={[
                                                    styles.floatingLabel,
                                                    {
                                                        transform: [
                                                            {
                                                                translateY: animations.B2.interpolate({
                                                                    inputRange: [0, 1],
                                                                    outputRange: [10, -26],
                                                                }),
                                                            },
                                                            {
                                                                translateX: animations.B2.interpolate({
                                                                    inputRange: [0, 1],
                                                                    outputRange: [12, 0],
                                                                }),
                                                            },
                                                        ],
                                                        fontSize: animations.B2.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [16, 14],
                                                        }),
                                                        color: animations.B2.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: ["#8c8c8c", "#333"],
                                                        }),
                                                    },
                                                ]}
                                            >
                                                Player 2 (Team B)
                                            </Animated.Text>
                                            <Controller
                                                control={gameControl}
                                                name="players.B2"
                                                render={({
                                                    field: { onChange, onBlur, value },
                                                    fieldState: { error },
                                                }) => (
                                                    <>
                                                        <TextInput
                                                            style={[
                                                                styles.textInput,
                                                                error && styles.errorInput,
                                                            ]}
                                                            onBlur={() => {
                                                                onBlur();
                                                                if (!value) animateLabel("B2", 0);
                                                            }}
                                                            onFocus={() => animateLabel("B2", 1)}
                                                            onChangeText={(text) => {
                                                                onChange(text);
                                                                if (text) animateLabel("B2", 1);
                                                            }}
                                                            value={value}
                                                        />
                                                        {error && (
                                                            <Text style={styles.errorText}>
                                                                {error.message}
                                                            </Text>
                                                        )}
                                                    </>
                                                )}
                                            />
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    </ScrollView>
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={gameHandleSubmit(onSubmit, (errors) => {
                            console.log("Form validation errors:", errors);
                        })}
                        disabled={createGameLoading}
                    >
                        <Text style={styles.submitButtonText}>
                            {createGameLoading ? "Submitting..." : "Submit"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: "flex-start",
        width: "100%",
        paddingVertical: 20,
    },
    modalContent: {
        width: "96%",
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 20,
        alignSelf: "center",
        height: "100%",
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        fontFamily: "serif",
    },
    activeTournamentContainer: {
        backgroundColor: "#e8f5e9",
        padding: 10,
        borderRadius: 8,
        // marginBottom: 14,
    },
    activeTournamentText: {
        color: "#2e7d32",
        fontWeight: "bold",
    },
    warningText: {
        color: "#d32f2f",
        marginBottom: 16,
        textAlign: "center",
    },
    closeButton: {
        backgroundColor: "#ff4444",
        padding: 2,
        borderRadius: 5,
    },
    closeButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    labelText: {
        fontFamily: "serif",
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 4,
    },
    labelTextPlayers: {
        fontFamily: "serif",
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 29,
    },
    dropdownLabel: {
        fontFamily: "serif",
        fontSize: 20,
        marginBottom: 4,
        fontWeight: "bold",
        color: "#333",
    },
    dropdownWrapper: {
        marginBottom: 16,
    },
    errorInput: {
        borderColor: "red",
    },
    inputContainer: {
        marginBottom: 24,
        position: "relative",
    },
    floatingLabel: {
        position: "absolute",
        left: 0,
        // backgroundColor: '#fff',
        paddingHorizontal: 1,
        zIndex: 1,
    },

    errorText: {
        color: "red",
        fontSize: 12,
        marginTop: 4,
        marginBottom: 10,
    },
    dropdownWrapperBelow: {
        marginBottom: 16,
        zIndex: 1000,
    },
    fontItalic: {
        fontFamily: "serif",
        fontStyle: "italic",
    },
    fontBold: {
        fontWeight: "bold",
    },
    playerInputContainer: {
        marginBottom: 14,
        zIndex: 1,
    },
    textInputDisabled: {
        backgroundColor: "#f0f0f0",
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: "#8c8c8c",
        marginBottom: 18,
    },
    textRed: {
        color: "red",
        fontWeight: "bold",
    },
    // textInput: {
    //   backgroundColor: '#f0f0f0',
    //   borderColor: '#ccc',
    //   borderWidth: 1,
    //   borderRadius: 8,
    //   paddingHorizontal: 12,
    //   paddingVertical: 14,
    //   fontSize: 16,
    //   color: 'black',
    //   marginTop: 8,
    // },
    textInput: {
        backgroundColor: "#f0f0f0",
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: "black",
        marginBottom: 5,
    },
    dropdown: {
        backgroundColor: "#f0f0f0",
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    dropdownContainer: {
        backgroundColor: "#fff",
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 8,
        marginTop: 4,
    },
    modalContentContainer: {
        backgroundColor: "#fff",
        paddingHorizontal: 15,
        borderRadius: 8,
    },
    pickerText: {
        fontSize: 16,
        color: "#333",
    },
    checkboxContainer: {
        marginBottom: 10,
    },
    submitButton: {
        marginTop: 20,
        backgroundColor: "#FDE904",
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    submitButtonText: {
        color: "black",
        fontSize: 16,
        fontWeight: "bold",
    },
    datePickerContainer: {
        backgroundColor: "#f0f0f0",
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
    },
    settingsSummary: {
        backgroundColor: "#f0f0f0",
        padding: 10,
        borderRadius: 8,
        marginBottom: 16,
    },
    summaryText: {
        color: "#333",
        fontSize: 16,
    },
    keyboardAvoidingContainer: {
        width: "96%",
        height: "90%", // Prevent modal from stretching too much
    },
});
