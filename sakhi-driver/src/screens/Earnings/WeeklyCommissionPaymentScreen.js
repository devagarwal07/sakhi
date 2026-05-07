/**
 * WeeklyCommissionPaymentScreen
 * Identical flow to DailyCommission but for the weekly fee.
 * Reuses the same layout with different labels.
 */
import React from 'react';
import DailyCommissionPaymentScreen from './DailyCommissionPaymentScreen';
import { useTranslation } from 'react-i18next';

export default function WeeklyCommissionPaymentScreen({ navigation, route }) {
  const { t } = useTranslation();
  // Pass through props with period = 'weekly'
  return (
    <DailyCommissionPaymentScreen
      navigation={navigation}
      route={{ ...route, params: { ...(route.params ?? {}), period: 'weekly' } }}
    />
  );
}
