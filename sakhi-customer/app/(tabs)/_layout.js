import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

function TabIcon({ emoji, icon, focused }) {
    return (
        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
            {icon ? icon : <Text style={[styles.emoji, { color: focused ? '#BEA3D8' : '#6B7280' }]}>{emoji}</Text>}
        </View>
    );
}

export default function TabsLayout() {
    const insets = useSafeAreaInsets();
    const tabBarPaddingBottom = Math.max(insets.bottom, 20);
    const tabBarHeight = 95 - 20 + tabBarPaddingBottom;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: [
                    styles.tabBar,
                    { paddingBottom: tabBarPaddingBottom, height: tabBarHeight },
                ],
                tabBarActiveTintColor: '#BEA3D8',
                tabBarInactiveTintColor: '#6B7280',
                tabBarLabelStyle: styles.tabLabel,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'HOME',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            icon={
                                <Svg width="16" height="18" viewBox="0 0 16 18" fill="none">
                                    <Path
                                        d="M2 16H5V10H11V16H14V7L8 2.5L2 7V16ZM0 18V6L8 0L16 6V18H9V12H7V18H0Z"
                                        fill={focused ? "#BEA3D8" : "#6B7280"}
                                    />
                                </Svg>
                            }
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="activity"
                options={{
                    title: 'ACTIVITY',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            icon={
                                <Svg width="22" height="20" viewBox="0 0 18 16" fill="none">
                                    <Path
                                        d="M3 14V15C3 15.2833 2.90417 15.5208 2.7125 15.7125C2.52083 15.9042 2.28333 16 2 16H1C0.716667 16 0.479167 15.9042 0.2875 15.7125C0.0958333 15.5208 0 15.2833 0 15V7L2.1 1C2.2 0.7 2.37917 0.458333 2.6375 0.275C2.89583 0.0916667 3.18333 0 3.5 0H14.5C14.8167 0 15.1042 0.0916667 15.3625 0.275C15.6208 0.458333 15.8 0.7 15.9 1L18 7V15C18 15.2833 17.9042 15.5208 17.7125 15.7125C17.5208 15.9042 17.2833 16 17 16H16C15.7167 16 15.4792 15.9042 15.2875 15.7125C15.0958 15.5208 15 15.2833 15 15V14H3ZM2.8 5H15.2L14.15 2H3.85L2.8 5ZM2 7V12V7ZM4.5 11C4.91667 11 5.27083 10.8542 5.5625 10.5625C5.85417 10.2708 6 9.91667 6 9.5C6 9.08333 5.85417 8.72917 5.5625 8.4375C5.27083 8.14583 4.91667 8 4.5 8C4.08333 8 3.72917 8.14583 3.4375 8.4375C3.14583 8.72917 3 9.08333 3 9.5C3 9.91667 3.14583 10.2708 3.4375 10.5625C3.72917 10.8542 4.08333 11 4.5 11ZM13.5 11C13.9167 11 14.2708 10.8542 14.5625 10.5625C14.8542 10.2708 15 9.91667 15 9.5C15 9.08333 14.8542 8.72917 14.5625 8.4375C14.2708 8.14583 13.9167 8 13.5 8C13.0833 8 12.7292 8.14583 12.4375 8.4375C12.1458 8.72917 12 9.08333 12 9.5C12 9.91667 12.1458 10.2708 12.4375 10.5625C12.7292 10.8542 13.0833 11 13.5 11ZM2 12H16V7H2V12Z"
                                        fill={focused ? "#BEA3D8" : "#6B7280"}
                                    />
                                </Svg>
                            }
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="subscriptions"
                options={{ href: null }}
            />
            <Tabs.Screen
                name="safety"
                options={{
                    title: 'SAFETY',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            icon={
                                <Svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                                    <Path
                                        d="M8 14C9.7 12.4667 10.7917 11.3875 11.275 10.7625C11.7583 10.1375 12 9.51667 12 8.9C12 8.3 11.7833 7.78333 11.35 7.35C10.9167 6.91667 10.4 6.7 9.8 6.7C9.45 6.7 9.1125 6.77083 8.7875 6.9125C8.4625 7.05417 8.2 7.25 8 7.5C7.8 7.25 7.54167 7.05417 7.225 6.9125C6.90833 6.77083 6.56667 6.7 6.2 6.7C5.6 6.7 5.08333 6.91667 4.65 7.35C4.21667 7.78333 4 8.3 4 8.9C4 9.21667 4.04167 9.50833 4.125 9.775C4.20833 10.0417 4.39167 10.3542 4.675 10.7125C4.95833 11.0708 5.3625 11.5083 5.8875 12.025C6.4125 12.5417 7.11667 13.2 8 14ZM8 20C5.68333 19.4167 3.77083 18.0875 2.2625 16.0125C0.754167 13.9375 0 11.6333 0 9.1V3L8 0L16 3V9.1C16 11.6333 15.2458 13.9375 13.7375 16.0125C12.2292 18.0875 10.3167 19.4167 8 20ZM8 17.9C9.73333 17.35 11.1667 16.25 12.3 14.6C13.4333 12.95 14 11.1167 14 9.1V4.375L8 2.125L2 4.375V9.1C2 11.1167 2.56667 12.95 3.7 14.6C4.83333 16.25 6.26667 17.35 8 17.9Z"
                                        fill={focused ? "#BEA3D8" : "#6B7280"}
                                    />
                                </Svg>
                            }
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'PROFILE',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            icon={
                                <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <Path
                                        d="M8 8C6.9 8 5.95833 7.60833 5.175 6.825C4.39167 6.04167 4 5.1 4 4C4 2.9 4.39167 1.95833 5.175 1.175C5.95833 0.391667 6.9 0 8 0C9.1 0 10.0417 0.391667 10.825 1.175C11.6083 1.95833 12 2.9 12 4C12 5.1 11.6083 6.04167 10.825 6.825C10.0417 7.60833 9.1 8 8 8ZM0 16V13.2C0 12.6333 0.145833 12.1125 0.4375 11.6375C0.729167 11.1625 1.11667 10.8 1.6 10.55C2.63333 10.0333 3.68333 9.64583 4.75 9.3875C5.81667 9.12917 6.9 9 8 9C9.1 9 10.1833 9.12917 11.25 9.3875C12.3167 9.64583 13.3667 10.0333 14.4 10.55C14.8833 10.8 15.2708 11.1625 15.5625 11.6375C15.8542 12.1125 16 12.6333 16 13.2V16H0ZM2 14H14V13.2C14 13.0167 13.9542 12.85 13.8625 12.7C13.7708 12.55 13.65 12.4333 13.5 12.35C12.6 11.9 11.6917 11.5625 10.775 11.3375C9.85833 11.1125 8.93333 11 8 11C7.06667 11 6.14167 11.1125 5.225 11.3375C4.30833 11.5625 3.4 11.9 2.5 12.35C2.35 12.4333 2.22917 12.55 2.1375 12.7C2.04583 12.85 2 13.0167 2 13.2V14ZM8 6C8.55 6 9.02083 5.80417 9.4125 5.4125C9.80417 5.02083 10 4.55 10 4C10 3.45 9.80417 2.97917 9.4125 2.5875C9.02083 2.19583 8.55 2 8 2C7.45 2 6.97917 2.19583 6.5875 2.5875C6.19583 2.97917 6 3.45 6 4C6 4.55 6.19583 5.02083 6.5875 5.4125C6.97917 5.80417 7.45 6 8 6Z"
                                        fill={focused ? "#BEA3D8" : "#6B7280"}
                                    />
                                </Svg>
                            }
                        />
                    ),
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
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderTopWidth: 0,
        paddingTop: 12,
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
