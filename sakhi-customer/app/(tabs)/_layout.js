import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../src/utils/theme';

function TabIcon({ emoji, focused }) {
    return (
        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
            <Text style={styles.emoji}>{emoji}</Text>
        </View>
    );
}

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: Colors.primaryContainer,
                tabBarInactiveTintColor: Colors.outline,
                tabBarLabelStyle: styles.tabLabel,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="subscriptions"
                options={{
                    title: 'Subscriptions',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="🔄" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="ride-history"
                options={{
                    title: 'History',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: Colors.surfaceContainerLowest,
        borderTopColor: Colors.outlineVariant,
        borderTopWidth: 1,
        height: 72,
        paddingBottom: 12,
        paddingTop: 8,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    iconWrap: {
        width: 40,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },
    iconWrapActive: {
        backgroundColor: Colors.primaryFixed,
    },
    emoji: { fontSize: 18 },
});
