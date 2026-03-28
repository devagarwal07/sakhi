import React from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    SafeAreaView, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';

export default function PaymentMethodsScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                
                {/* Header App Bar */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.7}>
                        <Text style={styles.headerIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Payment Methods</Text>
                    <View style={styles.iconBtn} />
                </View>

                {/* Content Canvas */}
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Banner: Info */}
                    <View style={styles.infoBanner}>
                        <Text style={styles.infoIcon}>ⓘ</Text>
                        <Text style={styles.infoText}>Sakhi accepts Cash and UPI payments.</Text>
                    </View>

                    {/* Section: Saved UPI IDs */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>SAVED UPI IDS</Text>
                        
                        {/* UPI Card */}
                        <View style={styles.upiCard}>
                            <View style={styles.upiLeft}>
                                <View style={styles.upiIconBg}>
                                    <Text style={styles.upiIcon}>📱</Text>
                                </View>
                                <View style={styles.upiDetails}>
                                    <Text style={styles.upiID}>priya@okaxis</Text>
                                    <View style={styles.primaryBadge}>
                                        <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.actionBtns}>
                                <TouchableOpacity style={styles.actionBtn}>
                                    <Text style={styles.actionIcon}>✎</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn}>
                                    <Text style={styles.actionIcon}>🗑</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Add UPI Action */}
                        <TouchableOpacity style={styles.addUpiBtn} activeOpacity={0.7}>
                            <Text style={styles.addUpiIcon}>+</Text>
                            <Text style={styles.addUpiText}>Add UPI ID</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Section: Cash */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>CASH</Text>
                        
                        {/* Cash Card */}
                        <View style={styles.cashCard}>
                            <View style={styles.cashLeft}>
                                <View style={styles.cashIconBg}>
                                    <Text style={styles.cashIcon}>💵</Text>
                                </View>
                                <View style={styles.cashDetails}>
                                    <Text style={styles.cashTitle}>Cash — Pay Driver Directly</Text>
                                    <Text style={styles.cashSubtitle}>Default for on-demand rides</Text>
                                </View>
                            </View>
                            <View style={styles.checkIconWrapper}>
                                <Text style={styles.checkIcon}>✓</Text>
                            </View>
                        </View>
                    </View>

                    {/* Transaction History Link */}
                    <TouchableOpacity style={styles.historyBtn} activeOpacity={0.7}>
                        <View style={styles.historyLeft}>
                            <Text style={styles.historyIcon}>⏱</Text>
                            <Text style={styles.historyText}>Transaction History</Text>
                        </View>
                        <Text style={styles.chevron}>›</Text>
                    </TouchableOpacity>

                </ScrollView>

                {/* Footer: Security */}
                <View style={styles.footerWrap}>
                    <View style={styles.securityFooter}>
                        <Text style={styles.lockIcon}>🔒</Text>
                        <Text style={styles.securityText}>
                            ALL TRANSACTIONS SECURED BY 256-BIT{'\n'}ENCRYPTION
                        </Text>
                    </View>
                </View>

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F5F0FF' },
    container: { flex: 1 },
    
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        height: 64,
        backgroundColor: 'rgba(246, 241, 255, 0.9)',
        zIndex: 10,
        ...Platform.select({
            ios: { shadowColor: '#EDE9FE', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
            android: { elevation: 2 }
        })
    },
    iconBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'flex-start' },
    headerIcon: { fontSize: 24, color: '#BEA3D8', fontWeight: 'bold' },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#1E1B2E', letterSpacing: -0.45, position: 'absolute', left: 0, right: 0, textAlign: 'center', zIndex: -1 },

    scrollContent: {
        padding: 24,
        paddingBottom: 120, // Leave room for footer
        gap: 32,
    },

    /* Info Banner */
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
        backgroundColor: '#EDE9FE',
        borderRadius: 12,
    },
    infoIcon: { fontSize: 16, color: '#BEA3D8' },
    infoText: { fontSize: 14, color: '#4A4455', lineHeight: 20 },

    /* Global Section Settings */
    section: { gap: 16 },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: '#7B7487', letterSpacing: 1.2, textTransform: 'uppercase' },

    /* Saved UPI IDs */
    upiCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
    },
    upiLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    upiIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F6F1FF', justifyContent: 'center', alignItems: 'center' },
    upiIcon: { fontSize: 18, color: '#BEA3D8' },
    upiDetails: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    upiID: { fontSize: 16, fontWeight: '700', color: '#1E1B2E' },
    primaryBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
    primaryBadgeText: { fontSize: 10, fontWeight: '700', color: '#065F46', letterSpacing: -0.5, textTransform: 'uppercase' },
    
    actionBtns: { flexDirection: 'row', gap: 8 },
    actionBtn: { padding: 4 },
    actionIcon: { fontSize: 16, color: '#7B7487' },

    addUpiBtn: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        padding: 16, gap: 8,
        borderWidth: 2, borderColor: 'rgba(204, 195, 216, 0.4)', borderStyle: 'dashed',
        borderRadius: 12,
    },
    addUpiIcon: { fontSize: 20, color: '#BEA3D8', fontWeight: 'bold' },
    addUpiText: { fontSize: 16, fontWeight: '600', color: '#BEA3D8' },

    /* Cash Card */
    cashCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 2, borderColor: 'rgba(190, 163, 216, 0.2)',
        borderRadius: 12,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4,
    },
    cashLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    cashIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' },
    cashIcon: { fontSize: 20 },
    cashDetails: { gap: 2 },
    cashTitle: { fontSize: 16, fontWeight: '700', color: '#1E1B2E' },
    cashSubtitle: { fontSize: 12, color: '#7B7487' },
    checkIconWrapper: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#BEA3D8', justifyContent: 'center', alignItems: 'center' },
    checkIcon: { fontSize: 12, color: '#BEA3D8', fontWeight: 'bold' },

    /* Transaction History */
    historyBtn: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(246, 241, 255, 0.8)',
        borderRadius: 12,
    },
    historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    historyIcon: { fontSize: 18, color: '#7B7487' },
    historyText: { fontSize: 16, fontWeight: '600', color: '#1E1B2E' },
    chevron: { fontSize: 24, color: '#7B7487', paddingBottom: 2 },

    /* Footer */
    footerWrap: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 121,
        justifyContent: 'center', alignItems: 'center',
        paddingBottom: 24,
    },
    securityFooter: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    lockIcon: { fontSize: 10, color: '#7B7487', marginTop: 1 },
    securityText: {
        fontSize: 11, fontWeight: '500', color: '#7B7487',
        textAlign: 'center', letterSpacing: 0.55, textTransform: 'uppercase', lineHeight: 16,
    },
});
