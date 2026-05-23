import { useAuth } from "@/contexts/auth";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Dropdown } from "react-native-element-dropdown";

const COURTS_OPTION = gql`
  query FetchCourts {
    fetchCourts {
      _id
      name
    }
  }
`;

interface FetchCourtsData {
    fetchCourts: {
        _id: string;
        name: string;
    }[];
}

export default function LoginScreen() {
    const [selectedCourt, setSelectedCourt] = useState<string>("");
    const { signIn, session, isLoading } = useAuth();
    const currentYear = new Date().getUTCFullYear();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    const {
        data: courtsData,
        loading: courtsLoading,
        error: courtsError,
    } = useQuery<FetchCourtsData>(COURTS_OPTION, {
        fetchPolicy: "cache-and-network",
    });

    const handleLogin = async () => {
        if (!selectedCourt) {
            alert("Please Select a Court");
            return;
        }

        try {
            await AsyncStorage.setItem("selectedCourt", selectedCourt);
            await signIn(selectedCourt);
        } catch (error) {
            console.error("Error storing court:", error);
        }
    };

    useEffect(() => {
        if (session) {
            router.replace("/(tabs)/(games)")
        }
    }, [session])

    const courtOptions =
        courtsData?.fetchCourts?.map((court: any) => ({
            label: court.name,
            value: court._id,
        })) || [];

    if (isLoading || courtsLoading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size={100} color="#23cc3f" />
            </View>
        );
    }

    if (courtsError) {
        return (
            <View style={styles.loader}>
                <Text style={styles.errorText}>Error loading Court Data: {courtsError.message}</Text>
            </View>
        );
    }

    // Responsive design dimensions
    const isTablet = screenWidth > 600;
    const isLandscape = screenWidth > screenHeight;
    const contentWidth = isTablet ? 400 : screenWidth * 0.85;

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        { minHeight: screenHeight - (Platform.OS === 'android' ? 40 : 80) }
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.mainContainer}>
                        <View style={[styles.card, { width: contentWidth }]}>
                            <Image
                                source={require("../../../assets/images/logo.png")}
                                contentFit="contain"
                                style={[
                                    styles.logo,
                                    {
                                        width: isTablet ? 320 : "100%",
                                        height: isLandscape ? 130 : 190
                                    }
                                ]}
                                transition={500}
                            />

                            <Dropdown
                                style={[styles.dropdown, { width: "100%" }]}
                                containerStyle={{ marginTop: -1, borderRadius: 12 }}
                                data={courtOptions}
                                mode="default"
                                labelField="label"
                                valueField="value"
                                placeholder="Select Court"
                                onChange={(court: any) => setSelectedCourt(court.value)}
                                value={selectedCourt}
                            />

                            <Pressable
                                style={[styles.button, { width: "100%", backgroundColor: "#FDE904" }]}
                                onPress={handleLogin}
                            >
                                <Text style={styles.buttonText}>Login</Text>
                            </Pressable>
                        </View>
                    </View>

                    <Text style={styles.footer}>
                        © {currentYear} | C-ONE Development Team
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    loader: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: {
        color: "red",
        fontSize: 16,
        padding: 20,
        textAlign: "center",
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "space-between",
        paddingVertical: 20,
    },
    mainContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    card: {
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 10,
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        marginBottom: 25,
        textAlign: "center",
    },
    button: {
        backgroundColor: "#23cc3f",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    buttonText: {
        fontWeight: "bold",
        fontSize: 16,
        alignSelf: "center",
    },
    dropdown: {
        borderRadius: 12,
        backgroundColor: "#E6E6E6",
        paddingHorizontal: 15,
        paddingVertical: 14,
    },
    logo: {
        aspectRatio: 3,
        marginBottom: 15,
    },
    footer: {
        color: "gray",
        alignSelf: "center",
        marginTop: 20,
        fontSize: 12,
    },
});
