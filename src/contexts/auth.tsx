import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import React, { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react'

type AuthContextType = {
  signIn: (court: string) => Promise<void>
  signOut: () => Promise<void>
  session: string | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export default function AuthContextProvider({ children }: PropsWithChildren) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}

function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const isNavigating = useRef(false)

  useEffect(() => {
    const loadSession = async () => {
      const userSession = await AsyncStorage.getItem('isAuthenticated')
      setSession(userSession)
      setIsLoading(false)
    }
    loadSession()
  }, [])

  const signIn = async (court: string) => {
    if (session || isNavigating.current) return
    isNavigating.current = true
    setIsLoading(true)
    try {
      await AsyncStorage.setItem('isAuthenticated', 'true')
      await AsyncStorage.setItem('selectedCourt', court)
      setSession('true')
      router.navigate('/(tabs)/(games)/')
    } finally {
      setIsLoading(false)
      isNavigating.current = false
    }
  }

  const signOut = async () => {
    try {
      // Clear any stored data
      await AsyncStorage.removeItem('selectedCourt');
      // Clear the session/user token
      setSession(null);
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ signIn, signOut, session, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
