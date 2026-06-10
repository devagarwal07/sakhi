import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, ActivityIndicator, Alert, Dimensions, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import client from '../../api/client';
import ScreenHeader, { HEADER_HEIGHT } from '../../components/ScreenHeader';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_W } = Dimensions.get('window');

// No mock data — rides and schedule are fetched from API

export default function SubscriptionRidesOverviewScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [optedIn, setOptedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState([]);
  const [upcomingWeek, setUpcomingWeek] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [minutesUntilNext, setMinutesUntilNext] = useState(0);

  // ── Fetch subscription schedule from API ────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get('/drivers/subscription/schedule');
        if (Array.isArray(data?.todayRides)) setRides(data.todayRides);
        if (Array.isArray(data?.upcomingWeek)) setUpcomingWeek(data.upcomingWeek);
        if (typeof data?.optedIn === 'boolean') setOptedIn(data.optedIn);
        if (typeof data?.isLocked === 'boolean') setIsLocked(data.isLocked);
        if (typeof data?.minutesUntilNext === 'number') setMinutesUntilNext(data.minutesUntilNext);
      } catch {
        setRides([]);
        setUpcomingWeek([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleOptToggle = async (val) => {
    const prev = optedIn;
    setOptedIn(val); // optimistic update
    try {
      await client.patch('/drivers/subscription/opt-in', { opted_in: val });
    } catch {
      setOptedIn(prev); // rollback on failure
    }
  };

  return (
    <View style={styles.root}>
      {/* Background Aesthetic Blur Elements */}
      <View style={styles.blurTopRight} />
      <View style={styles.blurBottomLeft} />

      {/* ── Header ── */}
      <ScreenHeader title={t('subscription.ridesTitle')} onBack={() => navigation.goBack()} />

      {/* Main Content Area */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, {}]}
        showsVerticalScrollIndicator={false}
      >

        {/* Opt-In Section */}
        <View style={styles.optInCard}>
          <View style={styles.optInRow1}>
            <Text style={styles.optInTitle}>{t('subscription.optIn')}</Text>
            <Switch
              value={optedIn}
              onValueChange={handleOptToggle}
              trackColor={{ false: '#CBD5E1', true: '#BEA3D8' }}
              thumbColor="#FFFFFF"
              style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
            />
          </View>
          <Text style={styles.optInSubText}>{t('subscription.priorityMatching')}</Text>
        </View>

        {/* Locked Banner Section */}
        {isLocked && (
          <View style={styles.lockedBannerCard}>
            <MaterialIcons name="lock" size={16} color="#EA580C" style={{ marginTop: 2 }} />
            <View style={styles.lockedBannerCol}>
              <Text style={styles.lockedTextTitle}>
                {t('subscription.lockedInMins', { minutes: minutesUntilNext })}
              </Text>
              <Text style={styles.lockedTextSub}>{t('subscription.onDemandPaused')}</Text>
            </View>
          </View>
        )}

        {/* Today's Schedule Section */}
        <Text style={styles.sectionTitle}>{t('subscription.todaysSchedule')}</Text>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#BEA3D8" />
          </View>
        ) : rides.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 14, color: '#64748B' }}>No rides scheduled for today</Text>
          </View>
        ) : null}

        {!loading && rides.length > 0 && (
        <View style={styles.rideList}>
          {rides.map((ride, idx) => {
            const rideTime = ride.created_at 
              ? new Date(ride.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
              : 'N/A';
            const pickup = (ride.pickup_address || 'Pickup').split(',')[0];
            const drop = (ride.drop_address || 'Drop').split(',')[0];
            const routeStr = `${pickup} → ${drop}`;

            return (
              <TouchableOpacity
                key={`ride_${ride.id || idx}`}
                style={[styles.rideCard, idx === 1 && { opacity: 0.9 }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('SubscriptionAssignmentDetails', { subscription: ride })}
              >
                <View style={styles.rideMarkerLine} />

                <View style={styles.rideCardInner}>
                  <View style={styles.rideCardTopRow}>
                    <Text style={styles.rideTime}>{rideTime}</Text>
                    <View style={styles.upcomingBadge}>
                      <Text style={styles.upcomingBadgeText}>{t('subscription.statusUpcoming')}</Text>
                    </View>
                  </View>

                  <View style={styles.rideCardDetails}>
                    <Text style={styles.rideRoute} numberOfLines={1}>{routeStr}</Text>
                    <Text style={styles.rideRider}>{t('subscription.riderLabel', { name: 'Customer' })}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        )}

        {/* Upcoming Week Section */}
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>{t('subscription.upcomingWeek')}</Text>

        <View style={styles.weekOverlay}>
          {upcomingWeek.length === 0 && !loading ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 14, color: '#64748B' }}>No upcoming rides this week</Text>
            </View>
          ) : upcomingWeek.map((day, idx) => {
            const dateObj = new Date(day.date);
            const monthStr = isNaN(dateObj) ? '' : dateObj.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
            const dateNum = isNaN(dateObj) ? '' : dateObj.getDate().toString();
            const dayTitle = isNaN(dateObj) ? day.label : dateObj.toLocaleDateString('en-IN', { weekday: 'long' });
            const ridesCount = day.rides ? day.rides.length : 0;

            return (
              <TouchableOpacity
                key={`week_${day.date}_${idx}`}
                style={[
                  styles.weekRowItem,
                  idx > 0 && { marginTop: 8 },
                  ridesCount === 0 && { opacity: 0.6 }
                ]}
                onPress={() => {
                  if (ridesCount > 0) navigation.navigate('WeeklyCalendarView', { day });
                }}
                activeOpacity={ridesCount > 0 ? 0.7 : 1}
              >
                <View style={styles.weekDateBadge}>
                  <Text style={styles.weekMonthText}>{monthStr}</Text>
                  <Text style={styles.weekDateText}>{dateNum}</Text>
                </View>

                <View style={styles.weekInfoCol}>
                  <Text style={styles.weekDayTitle}>{dayTitle}</Text>
                  <Text style={styles.weekRidesCount}>
                    {t('subscription.subscriptionRidesCount', { count: ridesCount })}
                  </Text>
                </View>

                {ridesCount > 0 && <Feather name="chevron-right" size={16} color="#94A3B8" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F0FF',
    position: 'relative',
  },

  // -- Aesthetic Background Blurs --
  blurTopRight: {
    position: 'absolute',
    width: 256,
    height: 256,
    right: -96,
    top: -96,
    backgroundColor: 'rgba(190, 163, 216, 0.1)',
    borderRadius: 128,
  },
  blurBottomLeft: {
    position: 'absolute',
    width: 256,
    height: 256,
    left: -96,
    bottom: -96,
    backgroundColor: 'rgba(103, 75, 181, 0.1)',
    borderRadius: 128,
  },

  // -- MAIN CONTENT --
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Opt-In Section
  optInCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 4,
  },
  optInRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  optInTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 16,
    color: '#1E1B2E',
  },
  optInSubText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 14,
    color: '#64748B',
  },

  // Locked Banner
  lockedBannerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 247, 237, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(254, 215, 170, 0.5)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  lockedBannerCol: {
    flex: 1,
    gap: 2,
  },
  lockedTextTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    color: '#C2410C',
  },
  lockedTextSub: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 12,
    color: 'rgba(234, 88, 12, 0.8)',
  },

  // Section Headers
  sectionTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    color: '#64748B',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 16,
    opacity: 0.8,
  },

  // Ride Item Cards
  rideList: {
    gap: 16,
    marginBottom: 24,
  },
  rideCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 4,
    height: 128,
    overflow: 'hidden',
  },
  rideMarkerLine: {
    width: 6,
    height: '100%',
    backgroundColor: '#BEA3D8',
  },
  rideCardInner: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 12,
  },
  rideCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rideTime: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    color: '#BEA3D8',
  },
  upcomingBadge: {
    backgroundColor: '#E8DDFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  upcomingBadgeText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    color: '#3F1E8C',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rideCardDetails: {
    gap: 4,
  },
  rideRoute: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#1E1B2E',
  },
  rideRider: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 14,
    color: '#64748B',
  },

  // Weekly Override View
  weekOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 16,
    padding: 8,
  },
  weekRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  weekDateBadge: {
    width: 40,
    height: 40,
    backgroundColor: '#EDE9FA',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekMonthText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    color: '#BEA3D8',
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  weekDateText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    color: '#1E1B2E',
  },
  weekInfoCol: {
    flex: 1,
  },
  weekDayTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 16,
    color: '#1E1B2E',
  },
  weekRidesCount: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    color: '#64748B',
  },
});
