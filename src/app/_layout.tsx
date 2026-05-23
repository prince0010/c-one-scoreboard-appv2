import AuthContextProvider, { useAuth } from "@/contexts/auth";
import { GameProvider } from "@/contexts/GameContext";
import { createApolloClient } from "@/lib/apollo";
import { ApolloProvider } from "@apollo/client/react";
import { Slot } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

const client = createApolloClient();

function AuthGate() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <ApolloProvider client={client}>
      <AuthContextProvider>
        <GameProvider>
          <AuthGate />
        </GameProvider>
      </AuthContextProvider>
    </ApolloProvider>
  );
}
