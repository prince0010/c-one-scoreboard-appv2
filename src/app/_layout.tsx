import { ApolloProvider } from '@apollo/client/react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { Slot } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import AuthContextProvider, { useAuth } from '@/contexts/auth';
import { createApolloClient } from '@/lib/apollo';

const client = createApolloClient();

function MainLayoutContent() {
  const colorScheme = useColorScheme();
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync("hidden");
      NavigationBar.setBehaviorAsync("overlay-swipe");
    }
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {!isLoading && (
        session ? <AppTabs /> : <Slot />
      )}
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <ApolloProvider client={client}>
      <AuthContextProvider>
        <MainLayoutContent />
      </AuthContextProvider>
    </ApolloProvider>
  );
}
