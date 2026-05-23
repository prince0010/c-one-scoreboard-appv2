import { Link } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/contexts/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export default function SettingsPage() {
  const { signOut } = useAuth();
  //   const handleLogout = async () => {
  //     // Alert.alert("Logout", "Are you sure you want to logout?", [
  //     //   {
  //     //     text: "Cancel",
  //     //     style: "cancel",
  //     //   },
  //     //   {
  //     //     text: "Logout",
  //         onPress: async () => {
  //           try {
  //             await signOut();
  //             await AsyncStorage.clear();
  //             // Redirect to login screen after clearing everything
  //             setTimeout(() => router.replace("/(auth)/login"), 0);
  //           } catch (error) {
  //             console.error("Logout failed:", error);
  //             Alert.alert("Error", "Failed to logout. Please try again.");
  //           }
  //         },
  //     //   },
  //     // ]);

  //   };
  const handleLogout = async () => {
    try {
      await signOut();
      await AsyncStorage.clear();
      setTimeout(() => router.replace("/(auth)/login"), 0);
    } catch (error) {
      console.error("Logout failed:", error);
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <Link href="/(tabs)/(games)/modal" asChild>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Add Data's</Text>
          </TouchableOpacity>
        </Link>

        {/* Moved Logout Button Here */}
        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.button, styles.logoutButton]}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
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
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fae716",
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: "80%",
    justifyContent: "center",
  },
  logoutButton: {
    backgroundColor: "#ff4444",
  },
  buttonText: {
    color: "black",
    fontSize: 18,
    fontWeight: "bold",
  },
});
