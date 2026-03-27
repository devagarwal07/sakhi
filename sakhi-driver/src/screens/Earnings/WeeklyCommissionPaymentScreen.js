/**
 * WeeklyCommissionPaymentScreen
 * Identical flow to DailyCommission but for the weekly fee.
 * Reuses the same layout with different labels.
 */
import React from 'react';
import DailyCommissionPaymentScreen from './DailyCommissionPaymentScreen';

export default function WeeklyCommissionPaymentScreen({ navigation, route }) {
  // Pass through props with period = 'weekly'
  return (
    <DailyCommissionPaymentScreen
      navigation={navigation}
      route={{ ...route, params: { ...(route.params ?? {}), period: 'weekly' } }}
    />
  );
}
