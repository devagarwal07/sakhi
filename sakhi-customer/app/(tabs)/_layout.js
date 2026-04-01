import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

function TabIcon({ emoji, label, focused }) {
    return (
        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
            <Text style={[styles.emoji, { color: focused ? '#BEA3D8' : '#6B7280' }]}>{emoji}</Text>
        </View>
    );
}

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: '#BEA3D8',
                tabBarInactiveTintColor: '#6B7280',
                tabBarLabelStyle: styles.tabLabel,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'HOME',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="subscriptions"
                options={{
                    title: 'ACTIVITY',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
                }}
            />
                        <Tabs.Screen
                name="ride-history"
                options={{ href: null }}
            />
            <Tabs.Screen
                name="safety"
                options={{
                    title: 'SAFETY',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="🛡️" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'PROFILE',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 95,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderTopWidth: 0,
        paddingTop: 12,
        paddingBottom: 20,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: -16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 12,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        lineHeight: 15,
    },
    iconWrap: {
        width: 56,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
    },
    iconWrapActive: {
        backgroundColor: '#F5F0FF',
    },
    emoji: { fontSize: 20 },
});
