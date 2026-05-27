import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    Platform, Linking
} from 'react-native';
import { useRouter } from 'expo-router';

import { Feather } from '@expo/vector-icons';

export default function AboutScreen() {
    const router = useRouter();


    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                
                {/* Header App Bar */}
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
                        <Feather name="arrow-left" size={24} color="#BEA3D8" />
                    </TouchableOpacity>
                        <Text style={styles.headerTitle}>About Sakhi</Text>
                    </View>
                    {/* Empty view for flex-between balance */}
                    <View style={styles.iconBtn} /> 
                </View>

                {/* Main Scrollable Content */}
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* App Logo & Version */}
                    <View style={styles.logoSection}>
                        <View style={styles.logoBlock}>
                            <View style={styles.logoGradientBox}>
                                <Feather name="shield" size={40} color="#FFFFFF" />
                            </View>
                        </View>
                        <Text style={styles.appName}>Sakhi</Text>
                        <Text style={styles.appVersion}>V1.0.2</Text>
                    </View>

                    {/* Mission Card */}
                    <View style={styles.missionCard}>
                        <Text style={styles.missionLabel}>OUR MISSION</Text>
                        <Text style={styles.missionText}>
                            "To make every journey safe,{'\n'}dignified, and empowering for{'\n'}women."
                        </Text>
                    </View>

                    {/* Features List */}
                    <View style={styles.featuresCard}>
                        {/* Feature 1 */}
                        <View style={styles.featureRow}>
                            <View style={styles.featureIconBox}>
                                <Feather name="calendar" size={16} color="#BEA3D8" />
                            </View>
                            <View style={styles.featureTextCol}>
                                <Text style={styles.featureTitle}>Founded in 2023</Text>
                                <Text style={styles.featureSub}>Born from a vision to revolutionize urban mobility for women.</Text>
                            </View>
                        </View>

                        {/* Feature 2 */}
                        <View style={styles.featureRow}>
                            <View style={styles.featureIconBox}>
                                <Feather name="heart" size={16} color="#BEA3D8" />
                            </View>
                            <View style={styles.featureTextCol}>
                                <Text style={styles.featureTitle}>Women-Only Platform</Text>
                                <Text style={styles.featureSub}>A dedicated safe space exclusive to women riders and drivers.</Text>
                            </View>
                        </View>

                        {/* Feature 3 */}
                        <View style={styles.featureRow}>
                            <View style={styles.featureIconBox}>
                                <Feather name="check-circle" size={16} color="#BEA3D8" />
                            </View>
                            <View style={styles.featureTextCol}>
                                <Text style={styles.featureTitle}>Verified Professionals</Text>
                                <Text style={styles.featureSub}>Multi-level background checks for every driver on our network.</Text>
                            </View>
                        </View>
                    </View>

                    {/* Social Share Icons */}
                    <View style={styles.socialRow}>
                        <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7} onPress={() => Linking.openURL('https://www.instagram.com/sakhi.women?igsh=emd5MHo2OXJ4bHE2')}>
                            <Feather name="instagram" size={18} color="#BEA3D8" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7} onPress={() => Linking.openURL('https://sakhiwomen.com')}>
                            <Feather name="globe" size={18} color="#BEA3D8" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7} onPress={() => Linking.openURL('mailto:support@sakhiwomen.com')}>
                            <Feather name="mail" size={18} color="#BEA3D8" />
                        </TouchableOpacity>
                    </View>

                    {/* Registered Office */}
                    <View style={styles.officeCard}>
                        <Text style={styles.officeLabel}>Registered Office</Text>
                        <Text style={styles.officeTradeName}>Sahi Mobility Solutions Private Limited</Text>
                        <Text style={styles.officeAddress}>
                            C/o Jitesh, Utsaav Park, Kkv Circle, Kalawad Road, Rajkot Sau Uni Area, Rajkot, Rajkot, Gujarat, India, 360005
                        </Text>
                        <View style={styles.officeContacts}>
                            <Text style={styles.officeContactItem}>Email: <Text style={styles.officeContactValue}>support@sakhiwomen.com</Text></Text>
                            <Text style={styles.officeContactItem}>Phone: <Text style={styles.officeContactValue}>+91 63619 33364</Text></Text>
                        </View>
                    </View>

                    {/* Legal Links */}
                    <View style={styles.legalSection}>
                        <TouchableOpacity style={styles.legalLink} activeOpacity={0.7} onPress={() => router.push('/terms')}>
                            <Text style={styles.legalLabel}>Terms of Service</Text>
                            <Feather name="chevron-right" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.legalLink} activeOpacity={0.7} onPress={() => router.push({ pathname: '/terms', params: { tab: 'privacy' } })}>
                            <Text style={styles.legalLabel}>Privacy Policy</Text>
                            <Feather name="chevron-right" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.legalLink} activeOpacity={0.7} onPress={() => router.push('/refund-policy')}>
                            <Text style={styles.legalLabel}>Refund Policy</Text>
                            <Feather name="chevron-right" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    {/* Rate Button */}
                    <TouchableOpacity style={styles.rateBtn} activeOpacity={0.7} onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.sakhi.rider')}>
                        <Feather name="star" size={20} color="#BEA3D8" />
                        <Text style={styles.rateText}>Rate Sakhi on Play Store</Text>
                    </TouchableOpacity>

                </ScrollView>
            </View>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        height: 64,
        backgroundColor: '#F5F0FF', 
        zIndex: 10
    },
    iconBtn: { 
        width: 32, 
        height: 32, 
        justifyContent: 'center', 
        alignItems: 'flex-start',
        backgroundColor: 'transparent'
    },
    headerIcon: { 
        fontSize: 24, 
        color: '#BEA3D8', 
        fontWeight: 'bold' 
    },
    headerTitle: { 
        fontSize: 20, 
        fontWeight: '700', 
        color: '#1E1B2E', 
        letterSpacing: -0.5,
        marginLeft: 16
    },
    safeArea: { flex: 1, backgroundColor: '#F5F0FF' },
    container: { flex: 1 },
    
    
    
    
    

    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 40,
        alignItems: 'center',
    },

    /* Logo Block */
    logoSection: { alignItems: 'center', marginBottom: 32, width: '100%' },
    logoBlock: {
        width: 96, height: 96,
        borderRadius: 24,
        backgroundColor: '#D8B4E2', // Fallback for gradient
        justifyContent: 'center', alignItems: 'center',
        shadowColor: 'rgba(190,163,216,1)', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 8,
        marginBottom: 12,
    },
    logoGradientBox: { width: '100%', height: '100%', borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    shieldIcon: { fontSize: 40, color: '#FFFFFF' },
    appName: { fontSize: 20, fontWeight: '800', color: '#1E1B2E', letterSpacing: -0.5 },
    appVersion: { fontSize: 12, fontWeight: '500', color: '#94A3B8', marginTop: 4, letterSpacing: 1.2, textTransform: 'uppercase' },

    /* Mission */
    missionCard: { width: '100%', backgroundColor: '#E8DDFF', borderRadius: 20, padding: 24, marginBottom: 24, shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.04, shadowRadius: 32, elevation: 2 },
    missionLabel: { fontSize: 14, fontWeight: '700', color: '#21005E', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 8 },
    missionText: { fontSize: 16, fontWeight: '500', color: '#6B7280', lineHeight: 26 },

    /* Features */
    featuresCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, gap: 24, marginBottom: 32, shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4 },
    featureRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
    featureIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EDE9FA', justifyContent: 'center', alignItems: 'center' },
    featureIcon: { fontSize: 16 },
    featureTextCol: { flex: 1, gap: 4 },
    featureTitle: { fontSize: 14, fontWeight: '700', color: '#1E1B2E', lineHeight: 20 },
    featureSub: { fontSize: 12, fontWeight: '400', color: '#94A3B8', lineHeight: 16 },

    /* Social Links */
    socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 32 },
    socialBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    socialIcon: { fontSize: 18 },

    officeCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        gap: 12,
        marginBottom: 24,
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 4
    },
    officeLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#BEA3D8',
        letterSpacing: 1.2,
        textTransform: 'uppercase'
    },
    officeTradeName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E1B2E',
        lineHeight: 22
    },
    officeAddress: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 20
    },
    officeContacts: {
        marginTop: 8,
        gap: 4
    },
    officeContactItem: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1E1B2E'
    },
    officeContactValue: {
        fontWeight: '400',
        color: '#6B7280'
    },

    /* Legal Links */
    legalSection: { width: '100%', gap: 4, marginBottom: 32 },
    legalLink: { width: '100%', height: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, backgroundColor: 'rgba(246, 241, 255, 0.5)', borderRadius: 12 },
    legalLabel: { fontSize: 14, fontWeight: '600', color: '#1E1B2E' },
    legalChevron: { fontSize: 18, color: '#94A3B8', fontWeight: '300' },

    /* Rate Button */
    rateBtn: { width: '100%', height: 60, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: '#BEA3D8', borderRadius: 16 },
    rateIcon: { fontSize: 20, color: '#BEA3D8' },
    rateText: { fontSize: 16, fontWeight: '700', color: '#BEA3D8' },

});
