import { Stack } from 'expo-router';

export default function KycLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="face" />
        </Stack>
    );
}
