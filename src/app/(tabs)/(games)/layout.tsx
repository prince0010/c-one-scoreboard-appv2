import { Stack } from 'expo-router'

export default function GamesLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }} >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="modal/index" options={{
                presentation: 'transparentModal',
                animation: 'fade',
                gestureEnabled: true,
                gestureDirection: 'vertical',
                animationDuration: 300,
            }} />
        </Stack>
    )
}
