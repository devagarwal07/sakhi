import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    Image, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { deleteAccount } from '../../src/api/endpoints';
import SakhiModal from '../../src/components/SakhiModal';
import LogoutBottomSheet from '../../src/components/LogoutBottomSheet';
import Svg, { Path } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const [modal, setModal] = useState(null);
    const [showLogoutSheet, setShowLogoutSheet] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleLogout = async () => {
        await logout();
        setShowLogoutSheet(false);
        router.replace('/(auth)/login');
    };

    const performDeleteAccount = async () => {
        if (isDeleting) return;
        setIsDeleting(true);
        try {
            await deleteAccount();
            await logout();
            router.replace('/(auth)/login');
        } catch (err) {
            const message = err?.response?.data?.error?.message || 'Unable to delete your account right now. Please try again.';
            setModal({
                icon: '⚠️',
                title: 'Delete Failed',
                message,
                buttons: [
                    { text: 'OK', style: 'primary', onPress: () => setModal(null) },
                ],
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const confirmDeleteAccount = () => {
        if (isDeleting) return;
        setModal({
            icon: '🗑️',
            title: 'Delete Account',
            message: 'This will permanently delete your account and all related data. This action cannot be undone.',
            buttons: [
                { text: 'Cancel', style: 'cancel', onPress: () => setModal(null) },
                { text: 'Delete', style: 'destructive', onPress: () => { setModal(null); performDeleteAccount(); } },
            ],
        });
    };

    const SettingRow = ({ icon, label, onPress, isLast = false }) => (
        <View style={styles.settingRowContainer}>
            <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
                <View style={styles.settingIconBg}>
                    {typeof icon === 'string' ? (
                        <Text style={styles.settingIcon}>{icon}</Text>
                    ) : (
                        icon
                    )}
                </View>
                <Text style={styles.settingLabel}>{label}</Text>
                <Feather name="chevron-right" size={22} color="#CCC3D8" />
            </TouchableOpacity>
            {!isLast && <View style={styles.divider} />}
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                
                {/* Header App Bar */}
                <View style={styles.header}>
                    <View style={styles.iconBtn} /* Empty spacer for balance */ />
                    <Text style={styles.headerTitle}>Settings</Text>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => setModal({
                        icon: 'ⓘ',
                        title: 'Options',
                        message: 'Choose an option',
                        buttons: [
                            { text: 'Edit Profile', onPress: () => { setModal(null); router.push('/edit-profile'); } },
                            { text: 'Change Phone', onPress: () => { setModal(null); router.push('/change-phone'); } },
                            { text: 'Cancel', style: 'cancel', onPress: () => setModal(null) },
                        ]
                    })}>
                        <Feather name="more-vertical" size={24} color="#BEA3D8" />
                    </TouchableOpacity>
                </View>

                {/* Main Scrollable Content */}
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Profile Hero Card */}
                    <View style={styles.heroCard}>
                        <View style={styles.avatarImg}>
                            <Text style={styles.avatarInitial}>
                                {user?.name ? user.name[0].toUpperCase() : 'P'}
                            </Text>
                        </View>
                        
                        <View style={styles.heroInfo}>
                            <View style={styles.heroNameRow}>
                                <Text style={styles.heroName}>{user?.name || 'Sakhi User'}</Text>
                                {user?.name && (
                                    <View style={styles.verifiedBadge}>
                                        <Feather name="check" size={10} color="#059669" />
                                        <Text style={styles.verifiedText}>VERIFIED</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.heroPhone}>{user?.phone || ''}</Text>
                            <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/edit-profile')}>
                                <Text style={styles.editText}>Edit Profile</Text>
                                <Feather name="chevron-right" size={14} color="#BEA3D8" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* My Account Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeading}>MY ACCOUNT</Text>
                        <View style={styles.cardGroup}>
                            <SettingRow 
                                icon={
                                    <Svg width="14" height="18" viewBox="0 0 14 18" fill="none">
                                        <Path d="M0 18V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H12C12.55 0 13.0208 0.195833 13.4125 0.5875C13.8042 0.979167 14 1.45 14 2V18L7 15L0 18ZM2 14.95L7 12.8L12 14.95V2H2V14.95ZM2 2H12H7H2Z" fill="#BEA3D8"/>
                                    </Svg>
                                } 
                                label="Saved Places" 
                                onPress={() => router.push('/saved-places')} 
                            />
                            <SettingRow 
                                icon={
                                    <Svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                        <Path d="M9 18C6.7 18 4.69583 17.2375 2.9875 15.7125C1.27917 14.1875 0.3 12.2833 0.05 10H2.1C2.33333 11.7333 3.10417 13.1667 4.4125 14.3C5.72083 15.4333 7.25 16 9 16C10.95 16 12.6042 15.3208 13.9625 13.9625C15.3208 12.6042 16 10.95 16 9C16 7.05 15.3208 5.39583 13.9625 4.0375C12.6042 2.67917 10.95 2 9 2C7.85 2 6.775 2.26667 5.775 2.8C4.775 3.33333 3.93333 4.06667 3.25 5H6V7H0V1H2V3.35C2.85 2.28333 3.8875 1.45833 5.1125 0.875C6.3375 0.291667 7.63333 0 9 0C10.25 0 11.4208 0.2375 12.5125 0.7125C13.6042 1.1875 14.5542 1.82917 15.3625 2.6375C16.1708 3.44583 16.8125 4.39583 17.2875 5.4875C17.7625 6.57917 18 7.75 18 9C18 10.25 17.7625 11.4208 17.2875 12.5125C16.8125 13.6042 16.1708 14.5542 15.3625 15.3625C14.5542 16.1708 13.6042 16.8125 12.5125 17.2875C11.4208 17.7625 10.25 18 9 18ZM11.8 13.2L8 9.4V4H10V8.6L13.2 11.8L11.8 13.2Z" fill="#BEA3D8"/>
                                    </Svg>
                                } 
                                label="Ride History" 
                                onPress={() => router.push({ pathname: '/ride-history', params: { fromSettings: 'true' } })} 
                            />
                            <SettingRow 
                                icon={
                                    <Svg width="20" height="22" viewBox="0 0 20 22" fill="none">
                                        <Path d="M2 22V20H18V22H2ZM2 2V0H18V2H2ZM10 12C10.8333 12 11.5417 11.7083 12.125 11.125C12.7083 10.5417 13 9.83333 13 9C13 8.16667 12.7083 7.45833 12.125 6.875C11.5417 6.29167 10.8333 6 10 6C9.16667 6 8.45833 6.29167 7.875 6.875C7.29167 7.45833 7 8.16667 7 9C7 9.83333 7.29167 10.5417 7.875 11.125C8.45833 11.7083 9.16667 12 10 12ZM2 19C1.45 19 0.979167 18.8042 0.5875 18.4125C0.195833 18.0208 0 17.55 0 17V5C0 4.45 0.195833 3.97917 0.5875 3.5875C0.979167 3.19583 1.45 3 2 3H18C18.55 3 19.0208 3.19583 19.4125 3.5875C19.8042 3.97917 20 4.45 20 5V17C20 17.55 19.8042 18.0208 19.4125 18.4125C19.0208 18.8042 18.55 19 18 19H2ZM3.75 17C4.5 16.0667 5.40833 15.3333 6.475 14.8C7.54167 14.2667 8.71667 14 10 14C11.2833 14 12.4583 14.2667 13.525 14.8C14.5917 15.3333 15.5 16.0667 16.25 17H18V5H2V17H3.75ZM6.7 17H13.3C12.8167 16.6667 12.2958 16.4167 11.7375 16.25C11.1792 16.0833 10.6 16 10 16C9.4 16 8.82083 16.0833 8.2625 16.25C7.70417 16.4167 7.18333 16.6667 6.7 17ZM10 10C9.71667 10 9.47917 9.90417 9.2875 9.7125C9.09583 9.52083 9 9.28333 9 9C9 8.71667 9.09583 8.47917 9.2875 8.2875C9.47917 8.09583 9.71667 8 10 8C10.2833 8 10.5208 8.09583 10.7125 8.2875C10.9042 8.47917 11 8.71667 11 9C11 9.28333 10.9042 9.52083 10.7125 9.7125C10.5208 9.90417 10.2833 10 10 10Z" fill="#BEA3D8"/>
                                    </Svg>
                                } 
                                label="Emergency Contacts" 
                                onPress={() => router.push('/emergency-contacts')} 
                            />
                            <SettingRow 
                                icon={
                                    <Svg width="22" height="16" viewBox="0 0 22 16" fill="none">
                                        <Path d="M13 9C12.1667 9 11.4583 8.70833 10.875 8.125C10.2917 7.54167 10 6.83333 10 6C10 5.16667 10.2917 4.45833 10.875 3.875C11.4583 3.29167 12.1667 3 13 3C13.8333 3 14.5417 3.29167 15.125 3.875C15.7083 4.45833 16 5.16667 16 6C16 6.83333 15.7083 7.54167 15.125 8.125C14.5417 8.70833 13.8333 9 13 9ZM6 12C5.45 12 4.97917 11.8042 4.5875 11.4125C4.19583 11.0208 4 10.55 4 10V2C4 1.45 4.19583 0.979167 4.5875 0.5875C4.97917 0.195833 5.45 0 6 0H20C20.55 0 21.0208 0.195833 21.4125 0.5875C21.8042 0.979167 22 1.45 22 2V10C22 10.55 21.8042 11.0208 21.4125 11.4125C21.0208 11.8042 20.55 12 20 12H6ZM8 10H18C18 9.45 18.1958 8.97917 18.5875 8.5875C18.9792 8.19583 19.45 8 20 8V4C19.45 4 18.9792 3.80417 18.5875 3.4125C18.1958 3.02083 18 2.55 18 2H8C8 2.55 7.80417 3.02083 7.4125 3.4125C7.02083 3.80417 6.55 4 6 4V8C6.55 8 7.02083 8.19583 7.4125 8.5875C7.80417 8.97917 8 9.45 8 10ZM19 16H2C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14V3H2V14H19V16ZM6 10V2V10Z" fill="#BEA3D8"/>
                                    </Svg>
                                } 
                                label="Payment Methods" 
                                onPress={() => router.push('/payment')} 
                            />
                            <SettingRow 
                                icon={<Feather name="gift" size={18} color="#BEA3D8" />}
                                label="Referrals & Rewards" 
                                onPress={() => router.push('/referrals')} 
                                isLast 
                            />
                        </View>
                    </View>

                    {/* Safety Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeading}>SAFETY</Text>
                        <View style={styles.cardGroup}>
                            <SettingRow 
                                icon={
                                    <Svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                        <Path d="M6.9 18V12.05L1.75 15.025L0 12L5.15 9L0 6.025L1.75 3L6.9 5.975V0H10.4V5.975L15.55 3L17.3 6.025L12.15 9L17.3 12L15.55 15.025L10.4 12.05V18H6.9Z" fill="#BEA3D8"/>
                                    </Svg>
                                } 
                                label="SOS Settings" 
                                onPress={() => router.push('/sos-settings')} 
                            />
                            <SettingRow 
                                icon={
                                    <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <Path d="M10.95 19.9V17.9C11.65 17.8 12.3292 17.6083 12.9875 17.325C13.6458 17.0417 14.2667 16.6833 14.85 16.25L16.3 17.7C15.5167 18.3167 14.675 18.8125 13.775 19.1875C12.875 19.5625 11.9333 19.8 10.95 19.9ZM17.7 16.25L16.3 14.85C16.7333 14.3 17.0833 13.6958 17.35 13.0375C17.6167 12.3792 17.8 11.6833 17.9 10.95H19.95C19.8167 11.9833 19.5625 12.9458 19.1875 13.8375C18.8125 14.7292 18.3167 15.5333 17.7 16.25ZM17.9 8.95C17.8 8.2 17.6167 7.49583 17.35 6.8375C17.0833 6.17917 16.7333 5.58333 16.3 5.05L17.7 3.65C18.3333 4.38333 18.8458 5.2 19.2375 6.1C19.6292 7 19.8667 7.95 19.95 8.95H17.9ZM8.95 19.9C6.4 19.6 4.27083 18.5083 2.5625 16.625C0.854167 14.7417 0 12.5167 0 9.95C0 7.36667 0.854167 5.13333 2.5625 3.25C4.27083 1.36667 6.4 0.283333 8.95 0V2C6.95 2.28333 5.29167 3.175 3.975 4.675C2.65833 6.175 2 7.93333 2 9.95C2 11.9667 2.65833 13.7208 3.975 15.2125C5.29167 16.7042 6.95 17.6 8.95 17.9V19.9ZM14.9 3.65C14.3 3.2 13.6667 2.83333 13 2.55C12.3333 2.26667 11.65 2.08333 10.95 2V0C11.9333 0.0833333 12.875 0.3125 13.775 0.6875C14.675 1.0625 15.5167 1.56667 16.3 2.2L14.9 3.65ZM9.975 14.95C9.00833 14.1333 8.1 13.2583 7.25 12.325C6.4 11.3917 5.975 10.3 5.975 9.05C5.975 7.91667 6.3625 6.95 7.1375 6.15C7.9125 5.35 8.85833 4.95 9.975 4.95C11.0917 4.95 12.0375 5.35 12.8125 6.15C13.5875 6.95 13.975 7.91667 13.975 9.05C13.975 10.3 13.55 11.3917 12.7 12.325C11.85 13.2583 10.9417 14.1333 9.975 14.95ZM9.975 9.95C10.275 9.95 10.5292 9.84583 10.7375 9.6375C10.9458 9.42917 11.05 9.175 11.05 8.875C11.05 8.59167 10.9458 8.34167 10.7375 8.125C10.5292 7.90833 10.275 7.8 9.975 7.8C9.675 7.8 9.42083 7.90833 9.2125 8.125C9.00417 8.34167 8.9 8.59167 8.9 8.875C8.9 9.175 9.00417 9.42917 9.2125 9.6375C9.42083 9.84583 9.675 9.95 9.975 9.95Z" fill="#BEA3D8"/>
                                    </Svg>
                                } 
                                label="Live Trip Sharing" 
                                onPress={() => setModal({
                                icon: '🎯',
                                title: 'Live Trip Sharing',
                                message: 'Share your real-time location with trusted contacts during every ride. Enable from emergency contacts settings.',
                                buttons: [
                                    { text: 'Go to Emergency Contacts', style: 'primary', onPress: () => { setModal(null); router.push('/emergency-contacts'); } },
                                    { text: 'OK', style: 'cancel', onPress: () => setModal(null) }
                                ]
                            })} isLast />
                        </View>
                    </View>

                    {/* App Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeading}>APP</Text>
                        <View style={styles.cardGroup}>
                            <SettingRow 
                                icon={
                                    <Svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                                        <Path d="M0 17V15H2V8C2 6.61667 2.41667 5.3875 3.25 4.3125C4.08333 3.2375 5.16667 2.53333 6.5 2.2V1.5C6.5 1.08333 6.64583 0.729167 6.9375 0.4375C7.22917 0.145833 7.58333 0 8 0C8.41667 0 8.77083 0.145833 9.0625 0.4375C9.35417 0.729167 9.5 1.08333 9.5 1.5V2.2C10.8333 2.53333 11.9167 3.2375 12.75 4.3125C13.5833 5.3875 14 6.61667 14 8V15H16V17H0ZM8 20C7.45 20 6.97917 19.8042 6.5875 19.4125C6.19583 19.0208 6 18.55 6 18H10C10 18.55 9.80417 19.0208 9.4125 19.4125C9.02083 19.8042 8.55 20 8 20ZM4 15H12V8C12 6.9 11.6083 5.95833 10.825 5.175C10.0417 4.39167 9.1 4 8 4C6.9 4 5.95833 4.39167 5.175 5.175C4.39167 5.95833 4 6.9 4 8V15Z" fill="#BEA3D8"/>
                                    </Svg>
                                } 
                                label="Notifications" 
                                onPress={() => router.push('/notifications')} 
                            />
                            <SettingRow 
                                icon={
                                    <Svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                        <Path d="M9 15C9.35 15 9.64583 14.8792 9.8875 14.6375C10.1292 14.3958 10.25 14.1 10.25 13.75C10.25 13.4 10.1292 13.1042 9.8875 12.8625C9.64583 12.6208 9.35 12.5 9 12.5C8.65 12.5 8.35417 12.6208 8.1125 12.8625C7.87083 13.1042 7.75 13.4 7.75 13.75C7.75 14.1 7.87083 14.3958 8.1125 14.6375C8.35417 14.8792 8.65 15 9 15ZM8.1 11.15H9.95C9.95 10.55 10.0167 10.1083 10.15 9.825C10.2833 9.54167 10.5667 9.18333 11 8.75C11.5833 8.16667 11.9958 7.67917 12.2375 7.2875C12.4792 6.89583 12.6 6.45 12.6 5.95C12.6 5.06667 12.3 4.35417 11.7 3.8125C11.1 3.27083 10.2917 3 9.275 3C8.35833 3 7.57917 3.225 6.9375 3.675C6.29583 4.125 5.85 4.75 5.6 5.55L7.25 6.2C7.36667 5.75 7.6 5.3875 7.95 5.1125C8.3 4.8375 8.70833 4.7 9.175 4.7C9.625 4.7 10 4.82083 10.3 5.0625C10.6 5.30417 10.75 5.625 10.75 6.025C10.75 6.30833 10.6583 6.60833 10.475 6.925C10.2917 7.24167 9.98333 7.59167 9.55 7.975C9 8.45833 8.62083 8.92083 8.4125 9.3625C8.20417 9.80417 8.1 10.4 8.1 11.15ZM2 18C1.45 18 0.979167 17.8042 0.5875 17.4125C0.195833 17.0208 0 16.55 0 16V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H16C16.55 0 17.0208 0.195833 17.4125 0.5875C17.8042 0.979167 18 1.45 18 2V16C18 16.55 17.8042 17.0208 17.4125 17.4125C17.0208 17.8042 16.55 18 16 18H2ZM2 16H16V2H2V16ZM2 2V16V2Z" fill="#BEA3D8"/>
                                    </Svg>
                                } 
                                label="Help & Support" 
                                onPress={() => router.push('/help-support')} 
                            />
                            <SettingRow 
                                icon={
                                    <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <Path d="M9 15H11V9H9V15ZM10 7C10.2833 7 10.5208 6.90417 10.7125 6.7125C10.9042 6.52083 11 6.28333 11 6C11 5.71667 10.9042 5.47917 10.7125 5.2875C10.5208 5.09583 10.2833 5 10 5C9.71667 5 9.47917 5.09583 9.2875 5.2875C9.09583 5.47917 9 5.71667 9 6C9 6.28333 9.09583 6.52083 9.2875 6.7125C9.47917 6.90417 9.71667 7 10 7ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20ZM10 18C12.2333 18 14.125 17.225 15.675 15.675C17.225 14.125 18 12.2333 18 10C18 7.76667 17.225 5.875 15.675 4.325C14.125 2.775 12.2333 2 10 2C7.76667 2 5.875 2.775 4.325 4.325C2.775 5.875 2 7.76667 2 10C2 12.2333 2.775 14.125 4.325 15.675C5.875 17.225 7.76667 18 10 18Z" fill="#BEA3D8"/>
                                    </Svg>
                                } 
                                label="About Sakhi" 
                                onPress={() => router.push('/about')} 
                            />
                            <SettingRow 
                                icon={
                                    <Svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                                        <Path d="M8 20C5.68333 19.4167 3.77083 18.0875 2.2625 16.0125C0.754167 13.9375 0 11.6333 0 9.1V3L8 0L16 3V9.1C16 10.5167 15.7583 11.8792 15.275 13.1875C14.7917 14.4958 14.1 15.65 13.2 16.65L10 13.45C9.7 13.6333 9.37917 13.7708 9.0375 13.8625C8.69583 13.9542 8.35 14 8 14C6.9 14 5.95833 13.6083 5.175 12.825C4.39167 12.0417 4 11.1 4 10C4 8.9 4.39167 7.95833 5.175 7.175C5.95833 6.39167 6.9 6 8 6C9.1 6 10.0417 6.39167 10.825 7.175C11.6083 7.95833 12 8.9 12 10C12 10.3667 11.9542 10.7208 11.8625 11.0625C11.7708 11.4042 11.6333 11.7333 11.45 12.05L12.95 13.55C13.2833 12.8667 13.5417 12.15 13.725 11.4C13.9083 10.65 14 9.88333 14 9.1V4.375L8 2.125L2 4.375V9.1C2 11.1167 2.56667 12.95 3.7 14.6C4.83333 16.25 6.26667 17.35 8 17.9C8.43333 17.7667 8.84583 17.5958 9.2375 17.3875C9.62917 17.1792 10.0167 16.9333 10.4 16.65L11.8 18.05C11.25 18.5 10.6542 18.8917 10.0125 19.225C9.37083 19.5583 8.7 19.8167 8 20ZM8 12C8.55 12 9.02083 11.8042 9.4125 11.4125C9.80417 11.0208 10 10.55 10 10C10 9.45 9.80417 8.97917 9.4125 8.5875C9.02083 8.19583 8.55 8 8 8C7.45 8 6.97917 8.19583 6.5875 8.5875C6.19583 8.97917 6 9.45 6 10C6 10.55 6.19583 11.0208 6.5875 11.4125C6.97917 11.8042 7.45 12 8 12Z" fill="#BEA3D8"/>
                                    </Svg>
                                } 
                                label="Terms & Privacy" 
                                onPress={() => router.push('/terms')} 
                                isLast 
                            />
                        </View>
                    </View>

                    {/* Delete Account Button */}
                    <TouchableOpacity 
                        style={[styles.logoutCard, isDeleting && styles.logoutCardDisabled, { marginBottom: 16 }]} 
                        onPress={confirmDeleteAccount}
                        disabled={isDeleting}
                        activeOpacity={0.8}
                    >
                        <View style={styles.logoutIconBg}>
                            <Feather name="trash-2" size={18} color="#BA1A1A" />
                        </View>
                        <Text style={styles.logoutText}>
                            {isDeleting ? 'Deleting Account...' : 'Delete Account'}
                        </Text>
                    </TouchableOpacity>

                    {/* Logout Button */}
                    <TouchableOpacity style={styles.logoutCard} onPress={() => setShowLogoutSheet(true)} activeOpacity={0.8}>
                        <View style={styles.logoutIconBg}>
                            <Svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <Path d="M2 18C1.45 18 0.979167 17.8042 0.5875 17.4125C0.195833 17.0208 0 16.55 0 16V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H9V2H2V16H9V18H2ZM13 14L11.625 12.55L14.175 10H6V8H14.175L11.625 5.45L13 4L18 9L13 14Z" fill="#BA1A1A"/>
                            </Svg>
                        </View>
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>

                </ScrollView>
            </View>

            <SakhiModal config={modal} onClose={() => setModal(null)} />
            <LogoutBottomSheet 
                visible={showLogoutSheet} 
                onClose={() => setShowLogoutSheet(false)} 
                onLogout={handleLogout} 
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F5F0FF',
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: '#F5F0FF',
        zIndex: 10,
    },
    iconBtn: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerIcon: {
        fontSize: 24,
        color: '#BEA3D8',
        fontWeight: '500',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E1B2E',
        letterSpacing: -0.5,
    },
    headerDots: {
        fontSize: 24,
        color: '#BEA3D8',
        fontWeight: '800',
    },

    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 100,
        gap: 24,
    },

    /* Hero Card */
    heroCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        gap: 16,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 6,
    },
    avatarImg: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#BEA3D8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    heroInfo: {
        flex: 1,
        gap: 4,
    },
    heroNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    heroName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E1B2E',
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ECFDF5',
        gap: 4,
    },
    verifiedCheck: {
        fontSize: 10,
        color: '#059669',
        fontWeight: 'bold',
    },
    verifiedText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#059669',
        letterSpacing: 0.5,
    },
    heroPhone: {
        fontSize: 14,
        color: '#1E1B2E',
        opacity: 0.8,
        marginBottom: 2,
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    editText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#BEA3D8',
    },
    editArrow: {
        fontSize: 14,
        color: '#BEA3D8',
        fontWeight: 'bold',
    },

    /* Sections */
    section: {
        gap: 12,
    },
    sectionHeading: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1E1B2E',
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        paddingHorizontal: 4,
    },
    cardGroup: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 24,
        elevation: 3,
        overflow: 'hidden',
    },
    
    /* Rows */
    settingRowContainer: {
        width: '100%',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    settingIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F0FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingIcon: {
        fontSize: 18,
    },
    settingLabel: {
        flex: 1,
        fontSize: 16,
        color: '#1E1B2E',
    },
    chevron: {
        fontSize: 22,
        color: '#CCC3D8',
        paddingBottom: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#F5F0FF',
    },

    /* Logout Block */
    logoutCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        gap: 16,
        shadowColor: 'rgba(186, 26, 26, 1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 4,
        marginTop: 8,
    },
    logoutCardDisabled: {
        opacity: 0.6,
    },
    logoutIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 218, 214, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoutIcon: {
        fontSize: 18,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#BA1A1A',
    },
});
