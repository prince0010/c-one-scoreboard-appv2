import { Stack } from 'expo-router'
import { GestureResponseDistanceType } from 'react-native-screens'

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerTitle: "Settings", headerTitleAlign: "center" }} >
      <Stack.Screen name="index" />
      <Stack.Screen name="modal/index" options={{
        presentation: 'transparentModal',
        animation: 'fade',
        gestureEnabled: true,
        gestureDirection: 'vertical',
        animationDuration: 300,
        headerLeft: () => null,
      }} />
    </Stack>
  )
}
