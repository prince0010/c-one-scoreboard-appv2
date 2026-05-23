
// import { Link } from "expo-router";
// import {
//     Alert,
//     ScrollView,
//     StyleSheet,
//     Text,
//     TextInput,
//     TouchableOpacity,
//     View,
//     Modal,
//     Platform,
//     Keyboard
// } from "react-native";
// import { BlurView } from "expo-blur";
// import React, { useEffect, useMemo, useState } from "react";
// import DropDownPicker from "react-native-dropdown-picker";
// import { Ionicons } from "@expo/vector-icons";
// import { gql, useMutation, useQuery } from "@apollo/client";
// import DateTimePicker from "@react-native-community/datetimepicker";
// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { Controller, useForm } from "react-hook-form";

// const EventSchema = z.object({
//     name: z.string().min(1, "Name is required"),
//     eventType: z.enum(["DOUBLES", "SINGLES"], {
//         errorMap: () => ({ message: "Event Type is required" }),
//     }),
//     gender: z.enum(["MALE", "FEMALE", "MIXED"]),
// });

// const TournamentSchema = z.object({
//     name: z.string().min(1, "Name is required"),
//     startDate: z.date(),
//     endDate: z.date(),
// });

// const CourtSchema = z.object({
//     name: z.string().min(1, "Name is Required"),
//     location: z.string().min(1, "Location is Required"),
// });

// const CREATE_COURT = gql`
//   mutation CreateCourt($name: String!, $location: String!) {
//     createCourt(input: { name: $name, location: $location }) {
//       _id
//       name
//       location
//     }
//   }
// `;

// const CREATE_TOURNAMENT = gql`
//   mutation CreateTournament(
//     $name: String!
//     $startDate: DateTime!
//     $endDate: DateTime!
//   ) {
//     createTournament(input: { name: $name, start: $startDate, end: $endDate }) {
//       _id
//       name
//       start
//       end
//     }
//   }
// `;

// const FETCH_TOURNAMENTS = gql`
// query FetchTournaments {
//     fetchTournaments {
//         _id
//         name
//         start
//         end
//         isActive
//         createdAt
//         updatedAt
//     }
// }
// `
// const CREATE_EVENT = gql`
//  mutation CreateEvent(
//     $name: String!
//     $eventType: EventType!
//     $gender: Gender!
//     $tournament: ID!
//   ) {
//     createEvent(
//       input: {
//         name: $name
//         eventType: $eventType
//         gender: $gender
//         tournament: $tournament
//       }
//     ) {
//       _id
//       name
//       eventType
//       gender
//     }
//   }
//     `
// const FETCH_CATEGORIES = gql`
// query FetchEvents {
//     fetchEvents {
//         _id
//         name
//         eventType
//         gender
//         createdAt
//         updatedAt
//         tournament {
//             _id
//             name
//         }
//     }
// }
// `

// export default function NewGameModal() {

//     const [activeTab, setActiveTab] = useState("Event")
//     const [datePickerVisible, setDatePickerVisible] = useState(false)
//     const [currentDateField, setCurrentDateField] = useState<"startDate" | "endDate">("startDate")
//     const [tempDate, setTempDate] = useState(new Date())
//     const [eventTypeOpen, setEventTypeOpen] = useState(false)
//     const [eventTypeValue, setEventTypeValue] = useState(null)
//     const [genderOpen, setGenderOpen] = useState(false)
//     const [genderValue, setGenderValue] = useState<string | null>(null)
//     const [showStartDatePicker, setShowStartDatePicker] = useState(false)
//     const [showEndDatePicker, setShowEndDatePicker] = useState(false)
//     const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null)

//     const event = useForm<z.infer<typeof EventSchema>>({
//         resolver: zodResolver(EventSchema),
//         defaultValues: {
//             name: "",
//             eventType: "SINGLES",
//             gender: undefined,
//         },
//     });

//     const {
//         control: tournamentControl,
//         handleSubmit: handleTournamentSubmit,
//         formState: { errors: torunamentErrors },
//         setValue: setTournamentValue,
//         reset: resetTournament,
//     } = useForm<z.infer<typeof TournamentSchema>>({
//         resolver: zodResolver(TournamentSchema),
//         defaultValues: {
//             name: "",
//             startDate: new Date(),
//             endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
//         },
//     });

//     const {
//         control: courtControl,
//         handleSubmit: handleCourtSubmit,
//         formState: { errors: courtErrors },
//         reset: resetCourt,
//     } = useForm<z.infer<typeof CourtSchema>>({
//         resolver: zodResolver(CourtSchema),
//         defaultValues: {
//             name: "",
//             location: "",
//         },
//     });

//     const [createCourt, { loading: courtLoading }] = useMutation(CREATE_COURT);
//     const [createTournament, { loading: tournamentLoading }] = useMutation(CREATE_TOURNAMENT, {
//         refetchQueries: [
//             {
//                 query: FETCH_TOURNAMENTS,
//             }
//         ]
//     })
//     const { data: tournamentsData } = useQuery(FETCH_TOURNAMENTS)

//     useEffect(() => {
//         if (tournamentsData?.fetchTournaments) {
//             const activeTournament = tournamentsData.fetchTournaments.find(
//                 (tourn: any) => tourn.isActive
//             )
//             if (activeTournament) {
//                 setActiveTournamentId(activeTournament._id)
//             }
//         }
//     }, [tournamentsData])
//     const { data: categoriesData } = useQuery(FETCH_CATEGORIES);
//     const [createEvent, { loading: eventLoading }] = useMutation(CREATE_EVENT, {
//         refetchQueries: [
//             {
//                 query: FETCH_CATEGORIES,
//             },
//         ]
//     })

//     const onSubmitTournament = async (data: z.infer<typeof TournamentSchema>) => {
//         try {
//             const result = await createTournament({
//                 variables: {
//                     name: data.name,
//                     startDate: data.startDate.toISOString(),
//                     endDate: data.endDate.toISOString(),
//                 },
//             })
//             setActiveTournamentId(result.data.createTournament._id)
//             resetTournament()
//             Alert.alert("Success", "Tournament created successfully!")
//         } catch (error) {
//             console.log("Error creating tournament:", error, data);
//             Alert.alert("Error", "Failed to create tournament. Please try again.")
//         }
//     }

//     const eventTypeItems = useMemo(() => {
//         const types = new Set<string>();
//         categoriesData?.fetchEvents?.forEach((event: any) => {
//             types.add(event.eventType);
//         });
//         return Array.from(types).map(type => ({
//             label: type.charAt(0) + type.slice(1).toLowerCase(),
//             value: type
//         }));
//     }, [categoriesData]);

//     const genderItems = useMemo(() => {
//         const genders = new Set<string>();
//         categoriesData?.fetchEvents?.forEach((event: any) => {
//             genders.add(event.gender);
//         });
//         return Array.from(genders).map(gender => ({
//             label: gender.charAt(0) + gender.slice(1).toLowerCase(),
//             value: gender
//         }));
//     }, [categoriesData]);

//     const onSubmitEvent = async (data: z.infer<typeof EventSchema>) => {
//         if (!activeTournamentId) {
//             Alert.alert("Error", "Please create or select a tournament first.")
//             return
//         }
//         try {
//             const result = await createEvent({
//                 variables: {
//                     name: data.name,
//                     eventType: data.eventType,
//                     gender: data.gender,
//                     tournament: activeTournamentId,
//                 },
//             })
//             // console.log("Event created successfully", result)
//             event.reset()
//             Alert.alert("Success", "Event created successfully!")
//         } catch (error) {
//             console.log("Error creating event:", error)
//             Alert.alert("Error", "Failed to create event. Please try again.")
//         }
//     }

//     const onSubmitCourt = async (data: z.infer<typeof CourtSchema>) => {
//         try {
//             await createCourt({
//                 variables: {
//                     name: data.name,
//                     location: data.location,
//                 },
//             })
//             resetCourt();
//             Alert.alert("Success", "Court created successfully!")
//         } catch (error) {
//             console.log("Error creating court:", error);
//             Alert.alert("Error", "Failed to create court. Please try again.")
//         }
//     }

//     return (
//         <View style={styles.container}>
//             <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
//             <ScrollView
//                 contentContainerStyle={styles.scrollContainer}
//                 keyboardShouldPersistTaps="handled"
//             >
//                 <View style={styles.modalContent}>
//                     <View style={styles.headerRow}>
//                         <Text style={styles.modalTitle}>Add Data's</Text>
//                         <Link href="../" asChild>
//                             <TouchableOpacity style={styles.closeButton}>
//                                 <Ionicons name="close" size={24} color="white" />
//                             </TouchableOpacity>
//                         </Link>
//                     </View>

//                     {/* Tabs */}
//                     <View style={styles.tabContainer}>
//                         <TouchableOpacity
//                             style={[
//                                 styles.tabButton,
//                                 activeTab === "Event" && styles.activeTab,
//                             ]}
//                             onPress={() => setActiveTab("Event")}
//                         >
//                             <Text
//                                 style={[
//                                     styles.tabText,
//                                     activeTab === "Event" && styles.activeTabText,
//                                 ]}
//                             >
//                                 Event
//                             </Text>
//                         </TouchableOpacity>

//                         <TouchableOpacity
//                             style={[
//                                 styles.tabButton,
//                                 activeTab === "Court" && styles.activeTab,
//                             ]}
//                             onPress={() => setActiveTab("Court")}
//                         >
//                             <Text
//                                 style={[
//                                     styles.tabText,
//                                     activeTab === "Court" && styles.activeTabText,
//                                 ]}
//                             >
//                                 Court
//                             </Text>
//                         </TouchableOpacity>

//                         <TouchableOpacity
//                             style={[
//                                 styles.tabButton,
//                                 activeTab === "Tournament" && styles.activeTab,
//                             ]}
//                             onPress={() => setActiveTab("Tournament")}
//                         >
//                             <Text
//                                 style={[
//                                     styles.tabText,
//                                     activeTab === "Tournament" && styles.activeTabText,
//                                 ]}
//                             >
//                                 Tournament
//                             </Text>
//                         </TouchableOpacity>
//                     </View>

//                     <View>
//                         {activeTab === "Event" && (
//                             <View style={styles.tabContent}>
//                                 <Text style={styles.labelText}>Event Content</Text>

//                                 {activeTournamentId ? (
//                                     <View style={styles.activeTournamentContainer}>
//                                         <Text style={styles.activeTournamentText}>
//                                             Active Tournament: {
//                                                 tournamentsData?.fetchTournaments.find(
//                                                     (tour: any) => tour._id === activeTournamentId
//                                                 )?.name || "Unknown"
//                                             } </Text>
//                                     </View>
//                                 ) : (
//                                     <Text style={styles.warningText}>
//                                         No active Tournament found. Please create or active a tournament first.
//                                     </Text>
//                                 )}

//                                 <Controller
//                                     control={event.control}
//                                     name="name"
//                                     render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
//                                         <View style={styles.inputContainer}>
//                                             <Text style={styles.inputLabel}>Event Name *</Text>
//                                             <TextInput
//                                                 style={[
//                                                     styles.textInput,
//                                                     error && styles.errorInput,
//                                                 ]}
//                                                 placeholder="Enter Event Name"
//                                                 onBlur={onBlur}
//                                                 onChangeText={onChange}
//                                                 value={value}
//                                             />
//                                             {error && (
//                                                 <Text style={styles.errorText}>{error.message}</Text>
//                                             )}
//                                         </View>
//                                     )}
//                                 />
//                                 <Controller
//                                     control={event.control}
//                                     name="eventType"
//                                     render={({ field: { onChange, value }, fieldState: { error } }) => (
//                                         <View style={styles.inputContainer}>
//                                             <Text style={styles.inputLabel}>Event Type *</Text>
//                                             <DropDownPicker
//                                                 open={eventTypeOpen}
//                                                 value={value}
//                                                 items={eventTypeItems}
//                                                 setOpen={setEventTypeOpen}
//                                                 setValue={(val) => onChange(typeof val === 'function' ? val(value) : val)}
//                                                 onChangeValue={onChange}
//                                                 placeholder="Select Event Type"
//                                                 containerStyle={{
//                                                     ...styles.dropdownWrapper,
//                                                     zIndex: eventTypeOpen ? 3000 : 1000,
//                                                     borderColor: error ? 'red' : '#ccc',
//                                                 }}
//                                                 style={[
//                                                     styles.dropdown,
//                                                     error && styles.errorInput,
//                                                 ]}
//                                                 dropDownContainerStyle={{
//                                                     ...styles.dropdownContainer,
//                                                     zIndex: eventTypeOpen ? 3000 : 1000,
//                                                 }}
//                                                 labelStyle={styles.pickerText}
//                                                 listMode="SCROLLVIEW"
//                                             />
//                                             {error && (
//                                                 <Text style={styles.errorText}>{error.message}</Text>
//                                             )}
//                                         </View>
//                                     )}
//                                 />
//                                 <Controller
//                                     control={event.control}
//                                     name="gender"
//                                     render={({ field: { onChange, value }, fieldState: { error } }) => (
//                                         <View style={styles.inputContainer}>
//                                             <Text style={styles.inputLabel}>Gender *</Text>
//                                             <DropDownPicker
//                                                 open={genderOpen}
//                                                 multiple={false}
//                                                 value={value}
//                                                 items={genderItems}
//                                                 setOpen={setGenderOpen}
//                                                 onChangeValue={onChange}
//                                                 setValue={(val) => onChange(typeof val === 'function' ? val(value) : val)}
//                                                 // setValue={(val) => onChange(typeof val === 'function' ? val(value) : val)}
//                                                 // onChangeValue={(newValue) => {
//                                                 //     if (newValue !== null && newValue !== undefined) {
//                                                 //         onChange(newValue);
//                                                 //     }
//                                                 // }}
//                                                 placeholder="Select Gender"
//                                                 containerStyle={{
//                                                     ...styles.dropdownWrapper,
//                                                     zIndex: genderOpen ? 2000 : 500,
//                                                     borderColor: error ? 'red' : '#ccc',
//                                                 }}
//                                                 style={[
//                                                     styles.dropdown,
//                                                     error && styles.errorInput,
//                                                 ]}
//                                                 dropDownContainerStyle={{
//                                                     ...styles.dropdownContainer,
//                                                     zIndex: genderOpen ? 2000 : 500,
//                                                 }}
//                                                 labelStyle={styles.pickerText}
//                                                 listMode="SCROLLVIEW"
//                                             />
//                                             {error && (
//                                                 <Text style={styles.errorText}>{error.message}</Text>
//                                             )}
//                                         </View>
//                                     )}
//                                 />
//                                 <TouchableOpacity
//                                     onPress={event.handleSubmit((data) => {
//                                         console.log("Submitting with data:", data);
//                                         onSubmitEvent(data).catch(error => {
//                                             console.error("Submission error:", error);
//                                         });
//                                     })}
//                                     style={styles.button}
//                                     disabled={eventLoading}
//                                 >
//                                     <Text style={styles.buttonText}>
//                                         {eventLoading ? "Creating..." : "Create Event"}
//                                     </Text>
//                                 </TouchableOpacity>
//                             </View>
//                         )}

//                         {activeTab === "Court" && (
//                             <View style={styles.tabContent}>
//                                 <Text style={styles.labelText}>Court Content</Text>
//                                 <Controller
//                                     control={courtControl}
//                                     name="name"
//                                     render={({ field: { onChange, onBlur, value } }) => (
//                                         <View style={styles.inputContainer}>
//                                             <Text style={styles.inputLabel}>Court Name *</Text>
//                                             <TextInput
//                                                 style={[
//                                                     styles.textInput,
//                                                     courtErrors.name && styles.errorInput,
//                                                 ]}
//                                                 placeholder="Enter Court Name"
//                                                 onBlur={onBlur}
//                                                 onChangeText={onChange}
//                                                 value={value}
//                                             />
//                                             {courtErrors.name && (
//                                                 <Text style={styles.errorText}>
//                                                     {courtErrors.name.message}
//                                                 </Text>
//                                             )}
//                                         </View>
//                                     )}
//                                 />

//                                 <Controller
//                                     control={courtControl}
//                                     name="location"
//                                     render={({ field: { onChange, onBlur, value } }) => (
//                                         <View style={styles.inputContainer}>
//                                             <Text style={styles.inputLabel}>Location *</Text>
//                                             <TextInput
//                                                 style={[
//                                                     styles.textInput,
//                                                     courtErrors.location && styles.errorInput,
//                                                 ]}
//                                                 placeholder="Enter Location"
//                                                 onBlur={onBlur}
//                                                 onChangeText={onChange}
//                                                 value={value}
//                                             />
//                                             {courtErrors.location && (
//                                                 <Text style={styles.errorText}>
//                                                     {courtErrors.location.message}
//                                                 </Text>
//                                             )}
//                                         </View>
//                                     )}
//                                 />

//                                 <TouchableOpacity
//                                     onPress={handleCourtSubmit(onSubmitCourt)}
//                                     style={styles.button}
//                                     disabled={courtLoading}
//                                 >
//                                     <Text style={styles.buttonText}>
//                                         {courtLoading ? "Creating..." : "Create Court"}
//                                     </Text>
//                                 </TouchableOpacity>
//                             </View>
//                         )}

//                         {activeTab === "Tournament" && (
//                             <View style={styles.tabContent}>
//                                 <Text style={styles.labelText}>Tournament Content</Text>
//                                 <Controller
//                                     control={tournamentControl}
//                                     name="name"
//                                     render={({ field: { onChange, onBlur, value } }) => (
//                                         <View style={styles.inputContainer}>
//                                             <Text style={styles.inputLabel}>Tournament Name *</Text>
//                                             <TextInput
//                                                 style={[
//                                                     styles.textInput,
//                                                     torunamentErrors.name && styles.errorInput,
//                                                 ]}
//                                                 placeholder="Enter Tournament Name"
//                                                 onBlur={onBlur}
//                                                 onChangeText={onChange}
//                                                 value={value}
//                                             />
//                                             {torunamentErrors.name && (
//                                                 <Text style={styles.errorText}>
//                                                     {torunamentErrors.name.message}
//                                                 </Text>
//                                             )}
//                                         </View>
//                                     )}
//                                 />

//                                 <View style={styles.inputContainer}>
//                                     <Text style={styles.inputLabel}>Start Date *</Text>
//                                     {Platform.OS === 'ios' ? (
//                                         <View style={styles.datePickerContainer}>
//                                             <DateTimePicker
//                                                 value={tournamentControl._formValues.startDate}
//                                                 mode="date"
//                                                 display="spinner"
//                                                 minimumDate={new Date()}
//                                                 onChange={(event, selectedDate) => {
//                                                     if (selectedDate) {
//                                                         setTournamentValue("startDate", selectedDate);
//                                                         const currentEndDate = tournamentControl._formValues.endDate;
//                                                         if (currentEndDate < selectedDate) {
//                                                             const newEndDate = new Date(selectedDate);
//                                                             newEndDate.setDate(newEndDate.getDate() + 1);
//                                                             setTournamentValue("endDate", newEndDate);
//                                                         }
//                                                     }
//                                                 }}
//                                                 style={styles.datePickerInline}
//                                             />
//                                         </View>
//                                     ) : (
//                                         <TouchableOpacity
//                                             style={styles.dateInput}
//                                             onPress={() => setShowStartDatePicker(true)}
//                                         >
//                                             <Text style={styles.dateText}>
//                                                 {tournamentControl._formValues.startDate.toLocaleDateString()}
//                                             </Text>
//                                             {showStartDatePicker && (
//                                                 <DateTimePicker
//                                                     value={tournamentControl._formValues.startDate}
//                                                     mode="date"
//                                                     display="spinner"
//                                                     minimumDate={new Date()}
//                                                     onChange={(event, selectedDate) => {
//                                                         setShowStartDatePicker(false);
//                                                         if (selectedDate) {
//                                                             setTournamentValue("startDate", selectedDate);
//                                                             // Auto-update end date if needed
//                                                             const currentEndDate = tournamentControl._formValues.endDate;
//                                                             if (currentEndDate < selectedDate) {
//                                                                 const newEndDate = new Date(selectedDate);
//                                                                 newEndDate.setDate(newEndDate.getDate() + 1);
//                                                                 setTournamentValue("endDate", newEndDate);
//                                                             }
//                                                         }
//                                                     }}
//                                                 />
//                                             )}
//                                         </TouchableOpacity>
//                                     )}
//                                 </View>

//                                 <View style={styles.inputContainer}>
//                                     <Text style={styles.inputLabel}>End Date *</Text>
//                                     {Platform.OS === 'ios' ? (
//                                         <View style={styles.datePickerContainer}>
//                                             <DateTimePicker
//                                                 value={tournamentControl._formValues.endDate}
//                                                 mode="date"
//                                                 display="spinner"
//                                                 minimumDate={tournamentControl._formValues.startDate}
//                                                 onChange={(event, selectedDate) => {
//                                                     if (selectedDate) {
//                                                         setTournamentValue("endDate", selectedDate);
//                                                     }
//                                                 }}
//                                                 style={styles.datePickerInline}
//                                             />
//                                         </View>
//                                     ) : (
//                                         <TouchableOpacity
//                                             style={styles.dateInput}
//                                             onPress={() => setShowEndDatePicker(true)}
//                                         >
//                                             <Text style={styles.dateText}>
//                                                 {tournamentControl._formValues.endDate.toLocaleDateString()}
//                                             </Text>
//                                             {showEndDatePicker && (
//                                                 <DateTimePicker
//                                                     value={tournamentControl._formValues.endDate}
//                                                     mode="date"
//                                                     display="spinner"
//                                                     minimumDate={tournamentControl._formValues.startDate}
//                                                     onChange={(event, selectedDate) => {
//                                                         setShowEndDatePicker(false);
//                                                         if (selectedDate) {
//                                                             setTournamentValue("endDate", selectedDate);
//                                                         }
//                                                     }}
//                                                 />
//                                             )}
//                                         </TouchableOpacity>
//                                     )}
//                                     {torunamentErrors.endDate && (
//                                         <Text style={styles.errorText}>
//                                             End date must be after start date
//                                         </Text>
//                                     )}
//                                     <TouchableOpacity
//                                         onPress={handleTournamentSubmit(onSubmitTournament)}
//                                         style={styles.button}
//                                         disabled={tournamentLoading}
//                                     >
//                                         <Text style={styles.buttonText}>
//                                             {tournamentLoading ? "Creating..." : "Create Tournament"}
//                                         </Text>
//                                     </TouchableOpacity>
//                                 </View>
//                             </View>
//                         )}
//                     </View>
//                 </View>
//             </ScrollView>

//             {/* Date Picker Modal */}
//             {/* <Modal
//                 visible={datePickerVisible}
//                 transparent={true}
//                 animationType="slide"
//                 onRequestClose={cancelDateSelection}
//             >
//                 <View style={styles.datePickerModalContainer}>
//                     <BlurView intensity={50} style={StyleSheet.absoluteFill} />
//                     <View style={styles.datePickerModalContent}>
//                         <DateTimePicker
//                             value={tempDate}
//                             mode="date"
//                             display={Platform.OS === 'ios' ? 'spinner' : 'spinner'}
//                             minimumDate={
//                                 currentDateField === 'endDate'
//                                     ? tournamentControl._formValues.startDate
//                                     : new Date()
//                             }
//                             onChange={handleDateChange}
//                             style={styles.datePicker}
//                         />
//                         <View style={styles.datePickerButtons}>
//                             <TouchableOpacity
//                                 style={[styles.datePickerButton, styles.cancelButton]}
//                                 onPress={cancelDateSelection}
//                             >
//                                 <Text style={styles.datePickerButtonText}>Cancel</Text>
//                             </TouchableOpacity>
//                             <TouchableOpacity
//                                 style={[styles.datePickerButton, styles.confirmButton]}
//                                 onPress={confirmDateSelection}
//                             >
//                                 <Text style={styles.datePickerButtonText}>Confirm</Text>
//                             </TouchableOpacity>
//                         </View>
//                     </View>
//                 </View>
//             </Modal> */}
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         justifyContent: "center",
//         alignItems: "center",
//         position: "relative",
//     },
//     scrollContainer: {
//         flexGrow: 1,
//         justifyContent: "center",
//         width: "100%",
//         paddingVertical: 20,
//     },
//     modalContent: {
//         maxWidth: "90%",
//         flexGrow: 1,
//         backgroundColor: "#fff",
//         borderRadius: 10,
//         padding: 20,
//         alignSelf: "center",
//     },
//     headerRow: {
//         flexDirection: "row",
//         alignItems: "center",
//         marginBottom: 20,
//         justifyContent: "space-between",
//     },
//     inputContainer: {
//         marginBottom: 10,
//     },
//     inputLabel: {
//         fontSize: 14,
//         marginBottom: 4,
//         color: "#333",
//         fontWeight: "500",
//     },
//     errorInput: {
//         borderColor: "red",
//     },
//     errorText: {
//         color: "red",
//         fontSize: 12,
//         marginTop: 4,
//     },
//     datePickerContainer: {
//         backgroundColor: '#f0f0f0',
//         borderRadius: 8,
//         padding: 10,
//         marginBottom: 14,
//     },
//     datePickerInline: {
//         width: '100%',
//     },
//     modalTitle: {
//         fontSize: 20,
//         fontWeight: "bold",
//         fontFamily: "serif",
//     },
//     closeButton: {
//         backgroundColor: "#ff4444",
//         padding: 2,
//         borderRadius: 5,
//     },
//     labelText: {
//         fontFamily: "serif",
//         fontSize: 20,
//         marginBottom: 10,
//         fontWeight: "bold",
//         color: "#333",
//     },
//     dropdownWrapper: {
//         marginBottom: 16,
//         position: "relative",
//     },
//     dropdown: {
//         backgroundColor: "#f0f0f0",
//         borderColor: "#ccc",
//         borderWidth: 1,
//         borderRadius: 8,
//         paddingHorizontal: 12,
//         paddingVertical: 10,
//     },
//     dropdownContainer: {
//         backgroundColor: "#fff",
//         borderColor: "#ccc",
//         borderWidth: 1,
//         borderRadius: 8,
//         marginTop: 4,
//         elevation: 10,
//     },
//     pickerText: {
//         fontSize: 16,
//         color: "#333",
//     },
//     activeTournamentContainer: {
//         backgroundColor: '#e8f5e9',
//         padding: 10,
//         borderRadius: 8,
//         marginBottom: 16,
//     },
//     activeTournamentText: {
//         color: '#2e7d32',
//         fontWeight: 'bold',
//     },
//     warningText: {
//         color: '#d32f2f',
//         marginBottom: 16,
//         textAlign: 'center',
//     },
//     textInput: {
//         backgroundColor: "#f0f0f0",
//         borderColor: "#ccc",
//         borderWidth: 1,
//         borderRadius: 8,
//         paddingHorizontal: 12,
//         paddingVertical: 10,
//         fontSize: 16,
//         color: "black",
//         marginBottom: 14,
//     },
//     dateInput: {
//         backgroundColor: "#f0f0f0",
//         borderColor: "#ccc",
//         borderWidth: 1,
//         borderRadius: 8,
//         paddingHorizontal: 12,
//         paddingVertical: 10,
//         marginBottom: 14,
//         justifyContent: "center",
//     },
//     dateText: {
//         fontSize: 16,
//         color: "black",
//     },
//     button: {
//         marginTop: 20,
//         backgroundColor: "#FDE904",
//         paddingVertical: 12,
//         borderRadius: 8,
//         alignItems: "center",
//     },
//     buttonText: {
//         color: "black",
//         fontSize: 16,
//         fontWeight: "bold",
//     },
//     tabContainer: {
//         flexDirection: "row",
//         justifyContent: "space-between",
//         marginBottom: 20,
//         borderBottomWidth: 1,
//         borderBottomColor: "#ddd",
//     },
//     tabButton: {
//         flex: 1,
//         paddingVertical: 12,
//         alignItems: "center",
//         borderBottomWidth: 2,
//         borderBottomColor: "transparent",
//     },
//     activeTab: {
//         borderBottomColor: "#FDE904",
//     },
//     tabText: {
//         fontSize: 16,
//         color: "#666",
//         fontWeight: "500",
//     },
//     activeTabText: {
//         color: "#000",
//         fontWeight: "bold",
//     },
//     tabContent: {
//         paddingVertical: 10,
//         minWidth: "100%",
//     },
//     // Date Picker Modal Styles
//     datePickerModalContainer: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//         backgroundColor: 'rgba(0,0,0,0.5)',
//     },
//     datePickerModalContent: {
//         width: '90%',
//         backgroundColor: 'white',
//         borderRadius: 10,
//         padding: 20,
//         maxHeight: Platform.OS === 'ios' ? 350 : 300,
//     },
//     datePicker: {
//         width: '100%',
//         height: Platform.OS === 'ios' ? 200 : undefined,
//     },
//     datePickerButtons: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         marginTop: 20,
//     },
//     datePickerButton: {
//         padding: 12,
//         borderRadius: 8,
//         minWidth: '45%',
//         alignItems: 'center',
//     },
//     cancelButton: {
//         backgroundColor: '#f0f0f0',
//     },
//     confirmButton: {
//         backgroundColor: '#FDE904',
//     },
//     datePickerButtonText: {
//         fontSize: 16,
//         fontWeight: 'bold',
//     },
// });