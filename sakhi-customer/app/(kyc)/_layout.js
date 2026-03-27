import { Stack } from 'expo-router';

export default function KycLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="intro" />
            <Stack.Screen name="aadhaar" />
            <Stack.Screen name="face" />
            <Stack.Screen name="pending" />
        </Stack>
    );
}
