import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, ScrollView, Platform, Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRide } from '../src/context/RideContext';
import SakhiModal from '../src/components/SakhiModal';
import { format, addDays } from 'date-fns';
import { ANDROID_STATUS_BAR_HEIGHT } from '../src/utils/androidUtils';

const { width } = Dimensions.get('window');

export default function SubscriptionRideScreen() {
    const router = useRouter();
    const { ride, updateSubscription } = useRide();
    const sub = { days: [], ...ride.subscription };
    const [modal, setModal] = useState(null);
    const [activePicker, setActivePicker] = useState(null); // 'date', 'morningTime', 'returnTime'

    const toggleDay = (day) => {
        const currentDays = sub.days || [];
        if (currentDays.includes(day)) {
            updateSubscription({ days: currentDays.filter(d => d !== day) });
        } else {
            updateSubscription({ days: [...currentDays, day] });
        }
    };

    const parseTimeStr = (t) => {
        if (!t) return 0;
        const [time, period] = t.split(' ');
        if (!time || !period) return 0;
        let [h, m] = time.split(':').map(Number);
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return h * 60 + m;
    };

    const handleContinue = () => {
        if (!ride?.pickup?.address) {
            return setModal({ icon: '⚠️', title: 'Missing Field', message: 'Please select a pickup location.', buttons: [{ text: 'OK', onPress: () => setModal(null) }] });
        }
        if (!ride?.dropoff?.address) {
            return setModal({ icon: '⚠️', title: 'Missing Field', message: 'Please select a drop-off location.', buttons: [{ text: 'OK', onPress: () => setModal(null) }] });
        }
        
        const days = sub.days || [];
        if (days.length === 0) {
            return setModal({ icon: '⚠️', title: 'Select Days', message: 'Please select at least one day for your subscription.', buttons: [{text: 'OK', onPress: () => setModal(null)}] });
        }
        if (!sub.startDate) {
            return setModal({ icon: '⚠️', title: 'Start Date Required', message: 'Please select when your subscription begins.', buttons: [{text: 'OK', onPress: () => setModal(null)}] });
        }
        if (!sub.morningTime) {
            return setModal({ icon: '⚠️', title: 'Morning Time Required', message: 'Please select your morning pickup time.', buttons: [{text: 'OK', onPress: () => setModal(null)}] });
        }

        if (sub.isTwoWay) {
            if (!sub.returnTime) {
                return setModal({ icon: '⚠️', title: 'Return Time Required', message: 'Please select a return pickup time.', buttons: [{text: 'OK', onPress: () => setModal(null)}] });
            }
            
            const mTimeMins = parseTimeStr(sub.morningTime);
            const rTimeMins = parseTimeStr(sub.returnTime);
            
            if (mTimeMins === rTimeMins) {
                return setModal({ 
                    icon: '⚠️', 
                    title: 'Invalid Timings', 
                    message: 'Morning and Return pickup times cannot be exactly identical.', 
                    buttons: [{text: 'Select Again', onPress: () => setModal(null)}] 
                });
            }
        }

        router.push('/subscription-plans');
    };

    const daysList = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Generate next 14 days for Date Picker
    const dateOptions = Array.from({ length: 14 }).map((_, i) => {
        const d = addDays(new Date(), i);
        return format(d, 'MMM dd, yyyy');
    });

    // Generate times by 30 min increments
    const timeOptions = [];
    for (let h = 0; h < 24; h++) {
        const hh = h % 12 === 0 ? 12 : h % 12;
        const ampm = h < 12 ? 'AM' : 'PM';
        timeOptions.push(`${hh}:00 ${ampm}`);
        timeOptions.push(`${hh}:30 ${ampm}`);
    }

    return (
        <View style={styles.container}>
            {/* Top Navigation Bar */}
            <View style={styles.topNav}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>

                <View style={styles.headerTitles}>
                    <Text style={styles.title}>Book a Subscription Ride</Text>
                    <Text style={styles.subtitle}>Set up your recurring daily rides</Text>
                </View>
                {/* Spacer to balance layout */}
                <View style={{ width: 32 }} />
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Address Selection Card */}
                <View style={styles.addressCard}>
                    {/* Pickup */}
                    <TouchableOpacity style={styles.addressRow} onPress={() => router.push('/location-search?returnRoute=/subscription-ride')} activeOpacity={0.8}>
                        <View style={styles.timelineCol}>
                            <View style={styles.dotGreen} />
                            <View style={styles.verticalDivider} />
                        </View>
                        <View style={styles.addressContentBorder}>
                            <Text style={styles.addressLabel}>PICKUP LOCATION</Text>
                            <Text style={styles.addressValue} numberOfLines={1}>{ride?.pickup?.address || 'Tap to select Pickup'}</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Dropoff */}
                    <TouchableOpacity style={styles.addressRow} onPress={() => router.push('/location-search?returnRoute=/subscription-ride')} activeOpacity={0.8}>
                        <View style={styles.timelineCol}>
                            <View style={styles.pinPurple}>
                                <View style={styles.pinHole} />
                            </View>
                        </View>
                        <View style={styles.addressContent}>
                            <Text style={styles.addressLabel}>DROP LOCATION</Text>
                            <Text style={styles.addressValue} numberOfLines={1}>{ride?.dropoff?.address || 'Tap to select Drop-off'}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Configuration Rows */}
                <View style={styles.configContainer}>
                    {/* Start Date */}
                    <View style={styles.configRow}>
                        <View style={styles.configTextCol}>
                            <Text style={styles.configTitle}>Start Date</Text>
                            <Text style={styles.configSub}>Subscription begins from</Text>
                        </View>
                        <TouchableOpacity style={styles.pillBtn} onPress={() => setActivePicker('date')} activeOpacity={0.7}>
                            <Text style={styles.pillIcon}>📅</Text>
                            <Text style={styles.pillValue}>{sub.startDate || 'Select Date'}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Morning Pickup */}
                    <View style={styles.configRow}>
                        <View style={styles.configTextCol}>
                            <Text style={styles.configTitle}>Morning Pickup Time</Text>
                            <Text style={styles.configSub}>Daily departure time</Text>
                        </View>
                        <TouchableOpacity style={styles.pillBtn} onPress={() => setActivePicker('morningTime')} activeOpacity={0.7}>
                            <Text style={styles.pillIcon}>🕒</Text>
                            <Text style={styles.pillValue}>{sub.morningTime || 'Select Time'}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Return Ride Toggle */}
                    <View style={styles.configRow}>
                        <View style={styles.configTextCol}>
                            <Text style={styles.configTitle}>Add Return Ride?</Text>
                            <Text style={styles.configSub}>Set a return pickup time</Text>
                        </View>
                        <TouchableOpacity 
                            style={[styles.checkbox, sub.isTwoWay && styles.checkboxActive]}
                            onPress={() => updateSubscription({ isTwoWay: !sub.isTwoWay })}
                        >
                            {sub.isTwoWay && <Text style={styles.checkboxTick}>✓</Text>}
                        </TouchableOpacity>
                    </View>

                    {/* Return Pickup Time */}
                    {sub.isTwoWay && (
                        <View style={styles.configRow}>
                            <View style={styles.configTextCol}>
                                <Text style={styles.configTitle}>Return Pickup Time</Text>
                                <Text style={styles.configSub}>Office to Home departure</Text>
                            </View>
                            <TouchableOpacity style={styles.pillBtn} onPress={() => setActivePicker('returnTime')} activeOpacity={0.7}>
                                <Text style={styles.pillIcon}>🕒</Text>
                                <Text style={styles.pillValue}>{sub.returnTime || 'Select Time'}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Days of Week */}
                    <View style={styles.daysSection}>
                        <View style={styles.configTextCol}>
                            <Text style={styles.configTitle}>Days of Week</Text>
                            <Text style={styles.configSub}>Choose your recurring ride days</Text>
                        </View>
                        <View style={styles.daysRow}>
                            {daysList.map((day) => {
                                const isActive = (sub.days || []).includes(day);
                                return (
                                    <TouchableOpacity 
                                        key={day}
                                        style={[styles.dayBubble, isActive ? styles.dayActive : styles.dayInactive]}
                                        onPress={() => toggleDay(day)}
                                    >
                                        <Text style={[styles.dayText, isActive ? styles.dayTextActive : styles.dayTextInactive]}>
                                            {day}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>

                {/* Bottom Padding for Footer */}
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Footer Action Button */}
            <View style={styles.footerOverlay}>
                <TouchableOpacity style={styles.submitBtn} onPress={handleContinue} activeOpacity={0.8}>
                    <Text style={styles.submitText}>Continue to Plan Selection</Text>
                </TouchableOpacity>
            </View>

            {/* Custom Picker Modal (JS only, no native rebuild needed) */}
            <Modal visible={!!activePicker} transparent animationType="slide">
                <View style={styles.pickerOverlay}>
                    <TouchableOpacity style={styles.pickerBackdrop} onPress={() => setActivePicker(null)} />
                    <View style={styles.pickerContent}>
                        <ScrollView style={styles.pickerScroll} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                            <Text style={styles.pickerTitle}>
                                {activePicker === 'date' ? 'Select Start Date' : 'Select Time'}
                            </Text>
                            
                            {activePicker === 'date' ? (
                            <CustomCalendar 
                                selectedDateStr={sub.startDate}
                                onSelectDate={(d) => {
                                    updateSubscription({ startDate: d });
                                    setActivePicker(null);
                                }}
                            />
                        ) : (
                            <CustomTimePicker 
                                initialTimeStr={activePicker === 'morningTime' ? sub.morningTime : sub.returnTime}
                                onSelectTime={(t) => {
                                    if (activePicker === 'morningTime') updateSubscription({ morningTime: t });
                                    if (activePicker === 'returnTime') updateSubscription({ returnTime: t });
                                    setActivePicker(null);
                                }}
                            />
                        )}

                        <TouchableOpacity style={styles.pickerCloseBtn} onPress={() => setActivePicker(null)}>
                            <Text style={styles.pickerCloseText}>Cancel</Text>
                        </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <SakhiModal config={modal} onClose={() => setModal(null)} />
        </View>
    );
}

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

const CustomCalendar = ({ onSelectDate, selectedDateStr }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    while (days.length % 7 !== 0) days.push(null);

    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const monthNamesShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    const handlePrev = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNext = () => setCurrentDate(new Date(year, month + 1, 1));

    return (
        <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={handlePrev} style={styles.calNavBtn}><Text style={styles.calNav}>{'<'}</Text></TouchableOpacity>
                <Text style={styles.calMonth}>{monthNames[month]} {year}</Text>
                <TouchableOpacity onPress={handleNext} style={styles.calNavBtn}><Text style={styles.calNav}>{'>'}</Text></TouchableOpacity>
            </View>
            <View style={styles.calWeekdays}>
                {['S','M','T','W','T','F','S'].map((d, i) => <Text key={i} style={styles.calWeekday}>{d}</Text>)}
            </View>
            <View style={styles.calGrid}>
                {days.map((day, idx) => {
                    if (!day) return <View key={idx} style={styles.calDayBox} />;
                    
                    const isPast = new Date(year, month, day) < new Date(new Date().setHours(0,0,0,0));
                    const formatStr = `${monthNamesShort[month]} ${String(day).padStart(2,'0')}, ${year}`;
                    const isSelected = selectedDateStr === formatStr;

                    return (
                        <TouchableOpacity 
                            key={idx} 
                            style={styles.calDayBox}
                            disabled={isPast}
                            activeOpacity={0.7}
                            onPress={() => onSelectDate(formatStr)}
                        >
                            <View style={[styles.calDayCircle, isSelected && styles.calDayCircleActive]}>
                                <Text style={[
                                    styles.calDayText, 
                                    isPast && styles.calDayTextPast,
                                    isSelected && styles.calDayTextActive
                                ]}>{day}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const WheelPicker = ({ items, selectedValue, onValueChange, itemHeight = 44 }) => {
    const scrollRef = useRef(null);

    useEffect(() => {
        const idx = items.indexOf(selectedValue);
        if (idx !== -1 && scrollRef.current) {
            setTimeout(() => {
                scrollRef.current?.scrollTo({ y: idx * itemHeight, animated: false });
            }, 100);
        }
    }, [items, selectedValue, itemHeight]);

    return (
        <View style={{ height: itemHeight * 5, width: 70, overflow: 'hidden' }}>
            <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={itemHeight}
                decelerationRate="fast"
                onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.y / itemHeight);
                    if (items[idx] !== undefined && items[idx] !== selectedValue) {
                        onValueChange(items[idx]);
                    }
                }}
                contentContainerStyle={{ paddingVertical: itemHeight * 2 }}
            >
                {items.map((item, idx) => {
                    const isSelected = item === selectedValue;
                    return (
                        <View key={idx} style={{ height: itemHeight, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ 
                                fontSize: isSelected ? 22 : 16, 
                                fontWeight: isSelected ? '700' : '400',
                                color: isSelected ? '#1E1B2E' : '#BEA3D8'
                            }}>{item}</Text>
                        </View>
                    );
                })}
            </ScrollView>
            {/* Selection Bounding Box */}
            <View style={styles.wheelOverlay} pointerEvents="none" />
        </View>
    );
};

const CustomTimePicker = ({ initialTimeStr, onSelectTime }) => {
    let initHr = 8, initMin = '00', initMer = 'AM';
    if (initialTimeStr) {
        const parts = initialTimeStr.split(' ');
        if (parts.length === 2) {
            initMer = parts[1];
            const tParts = parts[0].split(':');
            if (tParts.length === 2) {
                initHr = parseInt(tParts[0], 10);
                initMin = tParts[1].padStart(2, '0');
            }
        }
    }

    const [hour, setHour] = useState(initHr);
    const [min, setMin] = useState(initMin);
    const [mer, setMer] = useState(initMer);

    const hours = [1,2,3,4,5,6,7,8,9,10,11,12];
    const minsStrArray = Array.from({length: 60}).map((_, i) => String(i).padStart(2,'0'));

    return (
        <View style={styles.timeContainer}>
            <Text style={styles.timeSectionLabel}>Scroll UP/DOWN to select</Text>
            
            <View style={styles.wheelContainer}>
                <WheelPicker items={hours} selectedValue={hour} onValueChange={setHour} />
                <Text style={styles.wheelColon}>:</Text>
                <WheelPicker items={minsStrArray} selectedValue={min} onValueChange={setMin} />
                <View style={{ width: 16 }} />
                <WheelPicker items={['AM', 'PM']} selectedValue={mer} onValueChange={setMer} />
            </View>

            <TouchableOpacity style={styles.timeConfirmBtn} onPress={() => onSelectTime(`${hour}:${min} ${mer}`)}>
                <Text style={styles.timeConfirmText}>Set Time ({hour}:{min} {mer})</Text>
            </TouchableOpacity>
        </View>
    );
};

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
    container: { flex: 1, backgroundColor: '#F5F0FF' },

    // Top Navigation
    topNav: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: Platform.OS === 'ios' ? 118 : ANDROID_STATUS_BAR_HEIGHT + 56,
        paddingTop: Platform.OS === 'ios' ? 44 : ANDROID_STATUS_BAR_HEIGHT + 8,
        paddingHorizontal: 24,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: 'rgba(245, 240, 255, 0.8)',
        zIndex: 10,
    },
    backBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    backIcon: { fontSize: 24, color: '#1E1B2E', fontWeight: '500' },
    headerTitles: { alignItems: 'center' },
    title: { fontSize: 16, fontWeight: '600', color: '#1E1B2E', letterSpacing: -0.4 },
    subtitle: { fontSize: 12, fontWeight: '500', color: '#6B7280' },

    scrollContent: {
        paddingTop: Platform.OS === 'ios' ? 140 : ANDROID_STATUS_BAR_HEIGHT + 72,
        paddingHorizontal: 24,
        paddingBottom: 40,
    },

    // Address Card
    addressCard: {
        backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, marginBottom: 32,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 6,
    },
    addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
    timelineCol: { alignItems: 'center', paddingTop: 4, width: 14 },
    dotGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981' },
    verticalDivider: { width: 1, height: 32, backgroundColor: '#94A3B8', opacity: 0.3, marginVertical: 4 }, // Simplified gradient line
    pinPurple: { 
        width: 13.33, height: 16.67, backgroundColor: '#BEA3D8',
        borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
        alignItems: 'center', paddingTop: 3
    },
    pinHole: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' },
    
    addressContentBorder: { flex: 1, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E0EF', marginBottom: 12 },
    addressContent: { flex: 1, paddingBottom: 0 },
    
    addressLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
    addressValue: { fontSize: 14, fontWeight: '500', color: '#1E1B2E' },

    // Config Rows
    configContainer: { gap: 32 },
    configRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    configTextCol: { gap: 0 },
    configTitle: { fontSize: 14, fontWeight: '600', color: '#1E1B2E', marginBottom: 2 },
    configSub: { fontSize: 12, fontWeight: '400', color: '#1E1B2E' },
    
    pillBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 9999,
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2,
    },
    pillIcon: { fontSize: 14, color: '#BEA3D8' },
    pillValue: { fontSize: 13, fontWeight: '600', color: '#1E1B2E', width: 90, textAlign: 'center' },

    checkbox: {
        width: 18, height: 18, borderWidth: 1, borderColor: '#CCC3D8', borderRadius: 4,
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'
    },
    checkboxActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
    checkboxTick: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },

    // Days Section
    daysSection: { gap: 16 },
    daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
    dayBubble: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center'
    },
    dayActive: { backgroundColor: '#BEA3D8' },
    dayInactive: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CCC3D8' },
    dayText: { fontSize: 12, fontWeight: '700' },
    dayTextActive: { color: '#FFFFFF' },
    dayTextInactive: { color: '#94A3B8' },

    // Footer overlay
    footerOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 104, padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 24,
        backgroundColor: 'rgba(245, 240, 255, 0.95)', // approximation for gradient
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.4)',
    },
    submitBtn: {
        width: '100%', height: 56, backgroundColor: '#BEA3D8', borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: 'rgba(124, 58, 237, 1)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 32, elevation: 8,
    },
    submitText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

    // Custom Picker Modal
    pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    pickerBackdrop: { ...StyleSheet.absoluteFillObject },
    pickerContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 24, maxHeight: '85%' },
    pickerTitle: { fontSize: 18, fontWeight: '700', color: '#1E1B2E', marginBottom: 12, textAlign: 'center' },
    pickerScroll: { flexGrow: 0 },
    pickerItemRow: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F5F0FF', alignItems: 'center' },
    pickerItemText: { fontSize: 16, fontWeight: '500', color: '#1E1B2E' },
    pickerCloseBtn: { marginTop: 12, backgroundColor: '#F5F0FF', padding: 14, borderRadius: 12, alignItems: 'center' },
    pickerCloseText: { fontSize: 16, fontWeight: '600', color: '#BEA3D8' },

    // Custom Calendar Styles
    calendarContainer: { width: '100%', marginBottom: 16 },
    calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 16 },
    calNavBtn: { padding: 8 },
    calNav: { fontSize: 18, color: '#BEA3D8', fontWeight: 'bold' },
    calMonth: { fontSize: 16, fontWeight: '700', color: '#1E1B2E' },
    calWeekdays: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F5F0FF', paddingBottom: 8, marginBottom: 8 },
    calWeekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#94A3B8' },
    calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calDayBox: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
    calDayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    calDayCircleActive: { backgroundColor: '#BEA3D8' },
    calDayText: { fontSize: 14, fontWeight: '500', color: '#1E1B2E' },
    calDayTextPast: { color: '#CCC' },
    calDayTextActive: { color: '#FFF', fontWeight: 'bold' },

    // Custom Time Picker Styles
    timeContainer: { width: '100%', alignItems: 'center' },
    timeSectionLabel: { fontSize: 13, fontWeight: '700', color: '#BEA3D8', textTransform: 'uppercase', marginBottom: 24, textAlign: 'center' },
    wheelContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 32 },
    wheelColon: { fontSize: 24, fontWeight: '800', color: '#1E1B2E', paddingBottom: 4 },
    wheelOverlay: { position: 'absolute', top: 88, height: 44, width: '100%', borderTopWidth: 2, borderBottomWidth: 2, borderColor: '#F5F0FF', borderRadius: 8, backgroundColor: 'rgba(190, 163, 216, 0.1)' },
    
    timeConfirmBtn: { backgroundColor: '#BEA3D8', borderRadius: 12, height: 56, width: '100%', alignItems: 'center', justifyContent: 'center' },
    timeConfirmText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

});
