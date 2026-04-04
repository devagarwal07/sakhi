/**
 * SakhiDateRangePicker
 * A modal calendar that lets the user pick a start and end date.
 * Fully matches the Sakhi purple/lavender design theme.
 *
 * Usage:
 *   const [range, setRange] = useState({ start: null, end: null });
 *   const [show, setShow]  = useState(false);
 *
 *   <SakhiDateRangePicker
 *     visible={show}
 *     onClose={() => setShow(false)}
 *     onApply={(start, end) => { setRange({ start, end }); setShow(false); }}
 *     initialStart={range.start}
 *     initialEnd={range.end}
 *   />
 *
 * onApply receives two Date objects (start, end) or (date, date) for single day.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Animated, Dimensions, Platform,
} from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Design Tokens ────────────────────────────────────────────────────────────
const PURPLE      = '#BEA3D8';
const DEEP        = '#BEA3D8';
const VIOLET      = '#BEA3D8';
const DARK        = '#1E1B2E';
const MUTED       = '#6B7280';
const WHITE       = '#FFFFFF';
const BG          = '#F5F0FF';
const RANGE_BG    = 'rgba(190, 163, 216, 0.15)';
const SELECTED_BG = '#BEA3D8';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS_HEADER = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sameDay(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

function isBetween(date, start, end) {
  if (!start || !end) return false;
  const d = date.getTime();
  const s = start.getTime();
  const e = end.getTime();
  return d > s && d < e;
}

function startOfDay(d) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

function formatShort(date) {
  if (!date) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Quick Range Presets ─────────────────────────────────────────────────────
function getPresets() {
  const today = startOfDay(new Date());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const last7Start = new Date(today); last7Start.setDate(today.getDate() - 6);
  const last30Start = new Date(today); last30Start.setDate(today.getDate() - 29);

  return [
    { label: 'Today',       start: today,         end: today         },
    { label: 'Yesterday',   start: yesterday,      end: yesterday     },
    { label: 'This Week',   start: startOfWeek,    end: today         },
    { label: 'This Month',  start: startOfMonth,   end: today         },
    { label: 'Last 7 Days', start: last7Start,     end: today         },
    { label: 'Last 30 Days',start: last30Start,    end: today         },
  ];
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────
function CalendarGrid({ year, month, startDate, endDate, onDayPress }) {
  const totalDays    = getDaysInMonth(year, month);
  const firstWeekday = getFirstDayOfWeek(year, month);
  const today        = startOfDay(new Date());

  const cells = [];
  // blank cells before first day
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  // pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View style={cg.grid}>
      {rows.map((row, ri) => (
        <View key={ri} style={cg.row}>
          {row.map((day, ci) => {
            if (!day) return <View key={ci} style={cg.cell} />;

            const date     = startOfDay(new Date(year, month, day));
            const isStart  = sameDay(date, startDate);
            const isEnd    = sameDay(date, endDate);
            const inRange  = isBetween(date, startDate, endDate);
            const isToday  = sameDay(date, today);
            const isFuture = date > today;

            // range background: full for mid, half for edges
            let cellBg = 'transparent';
            if (inRange) cellBg = RANGE_BG;

            const isStartEdge  = isStart && endDate;
            const isEndEdge    = isEnd   && startDate;

            return (
              <View key={ci} style={[cg.cell, { backgroundColor: cellBg }]}>
                {/* Half-bg for start edge (right half only) */}
                {isStartEdge && !sameDay(startDate, endDate) && (
                  <View style={[cg.halfBg, cg.halfRight]} />
                )}
                {/* Half-bg for end edge (left half only) */}
                {isEndEdge && !sameDay(startDate, endDate) && (
                  <View style={[cg.halfBg, cg.halfLeft]} />
                )}

                <TouchableOpacity
                  style={[
                    cg.dayBtn,
                    (isStart || isEnd) && cg.dayBtnSelected,
                    isToday && !isStart && !isEnd && cg.dayBtnToday,
                  ]}
                  onPress={() => !isFuture && onDayPress(date)}
                  activeOpacity={isFuture ? 1 : 0.75}
                  disabled={isFuture}
                >
                  <Text style={[
                    cg.dayText,
                    (isStart || isEnd) && cg.dayTextSelected,
                    isToday && !isStart && !isEnd && cg.dayTextToday,
                    isFuture && cg.dayTextFuture,
                    inRange   && cg.dayTextInRange,
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
const cg = StyleSheet.create({
  grid: { gap: 0 },
  row:  { flexDirection: 'row' },
  cell: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  halfBg:    { position: 'absolute', top: 0, bottom: 0, width: '50%', backgroundColor: RANGE_BG },
  halfRight: { right: 0 },
  halfLeft:  { left: 0 },
  dayBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  dayBtnSelected: { backgroundColor: SELECTED_BG },
  dayBtnToday:    { borderWidth: 1.5, borderColor: PURPLE },
  dayText:         { fontSize: 13, fontWeight: '500', color: DARK },
  dayTextSelected: { color: WHITE, fontWeight: '700' },
  dayTextToday:    { color: DEEP, fontWeight: '700' },
  dayTextFuture:   { color: '#CCC3D8' },
  dayTextInRange:  { color: DEEP, fontWeight: '600' },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SakhiDateRangePicker({
  visible,
  onClose,
  onApply,
  initialStart = null,
  initialEnd   = null,
}) {
  const slideAnim = React.useRef(new Animated.Value(400)).current;

  const today = startOfDay(new Date());
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [startDate, setStartDate] = useState(initialStart ? startOfDay(initialStart) : null);
  const [endDate,   setEndDate]   = useState(initialEnd   ? startOfDay(initialEnd)   : null);

  // Reset to today's month when opened
  useEffect(() => {
    if (visible) {
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
      setStartDate(initialStart ? startOfDay(initialStart) : null);
      setEndDate(initialEnd     ? startOfDay(initialEnd)   : null);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
    } else {
      slideAnim.setValue(400);
    }
  }, [visible]);

  const handleDayPress = useCallback((date) => {
    if (!startDate || (startDate && endDate)) {
      // Fresh selection — set start only
      setStartDate(date);
      setEndDate(null);
    } else {
      // Have start, no end — set end (swap if before start)
      if (date < startDate) {
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
    }
  }, [startDate, endDate]);

  const handlePreset = ({ start, end }) => {
    setStartDate(start);
    setEndDate(end);
    setViewYear(start.getFullYear());
    setViewMonth(start.getMonth());
  };

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const goToNextMonth = () => {
    const nextDate = new Date(viewYear, viewMonth + 1, 1);
    if (nextDate > today) return; // don't go past current month
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const canGoNext = () => {
    const next = new Date(viewYear, viewMonth + 1, 1);
    return next <= today;
  };

  const handleApply = () => {
    if (!startDate) return;
    onApply(startDate, endDate ?? startDate);
  };

  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const presets = getPresets();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={[sp.backdrop, { opacity: visible ? 1 : 0 }]}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <View style={sp.sheetWrap} pointerEvents="box-none">
        <Animated.View style={[sp.sheet, { transform: [{ translateY: slideAnim }] }]}>

          {/* ── Handle & Header ── */}
          <View style={sp.handle} />
          <View style={sp.header}>
            <Text style={sp.headerTitle}>Select Date Range</Text>
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={sp.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          {/* ── Presets horizontal scroll ── */}
          <View style={sp.presetsWrap}>
            {presets.map((p) => {
              const active = sameDay(startDate, p.start) && sameDay(endDate, p.end);
              return (
                <TouchableOpacity
                  key={p.label}
                  style={[sp.preset, active && sp.presetActive]}
                  onPress={() => handlePreset(p)}
                  activeOpacity={0.8}
                >
                  <Text style={[sp.presetText, active && sp.presetTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Selected Range Display ── */}
          <View style={sp.rangeRow}>
            <View style={[sp.rangeBox, startDate && sp.rangeBoxActive]}>
              <Text style={sp.rangeLabel}>FROM</Text>
              <Text style={[sp.rangeValue, !startDate && sp.rangeValueEmpty]}>
                {startDate ? formatShort(startDate) : 'Select'}
              </Text>
            </View>
            <View style={sp.rangeDivider}>
              <Text style={sp.rangeDividerArrow}>→</Text>
            </View>
            <View style={[sp.rangeBox, endDate && sp.rangeBoxActive]}>
              <Text style={sp.rangeLabel}>TO</Text>
              <Text style={[sp.rangeValue, !endDate && sp.rangeValueEmpty]}>
                {endDate ? formatShort(endDate) : 'Select'}
              </Text>
            </View>
          </View>

          {/* ── Month Navigator ── */}
          <View style={sp.monthNav}>
            <TouchableOpacity style={sp.monthNavBtn} onPress={goToPrevMonth} activeOpacity={0.7}>
              <Text style={sp.monthNavArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={sp.monthNavTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity
              style={[sp.monthNavBtn, !canGoNext() && sp.monthNavBtnDisabled]}
              onPress={goToNextMonth}
              activeOpacity={canGoNext() ? 0.7 : 1}
              disabled={!canGoNext()}
            >
              <Text style={[sp.monthNavArrow, !canGoNext() && sp.monthNavArrowDisabled]}>›</Text>
            </TouchableOpacity>
          </View>

          {/* ── Day-of-week header ── */}
          <View style={sp.daysHeader}>
            {DAYS_HEADER.map((d) => (
              <View key={d} style={sp.dayHeaderCell}>
                <Text style={sp.dayHeaderText}>{d}</Text>
              </View>
            ))}
          </View>

          {/* ── Calendar Grid ── */}
          <CalendarGrid
            year={viewYear}
            month={viewMonth}
            startDate={startDate}
            endDate={endDate}
            onDayPress={handleDayPress}
          />

          {/* ── Apply Button ── */}
          <TouchableOpacity
            style={[sp.applyBtn, !startDate && sp.applyBtnDisabled]}
            onPress={handleApply}
            activeOpacity={0.85}
            disabled={!startDate}
          >
            <Text style={sp.applyBtnText}>
              {startDate && endDate && !sameDay(startDate, endDate)
                ? `Apply  •  ${formatShort(startDate)} – ${formatShort(endDate)}`
                : startDate
                ? `Apply  •  ${formatShort(startDate)}`
                : 'Select a date'}
            </Text>
          </TouchableOpacity>

        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const sp = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 26, 37, 0.5)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 42 : 28,
    paddingTop: 12,
    shadowColor: 'rgba(124, 58, 237, 1)',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 24,
  },

  // ── Handle ──
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#DDD7EA',
    alignSelf: 'center', marginBottom: 20,
  },

  // ── Header ──
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: DARK, letterSpacing: -0.4 },
  clearText:   { fontSize: 14, fontWeight: '600', color: PURPLE },

  // ── Presets ──
  presetsWrap: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, marginBottom: 20,
  },
  preset: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: BG,
    borderWidth: 1, borderColor: 'rgba(190,163,216,0.2)',
  },
  presetActive:     { backgroundColor: PURPLE, borderColor: PURPLE },
  presetText:       { fontSize: 13, fontWeight: '600', color: MUTED },
  presetTextActive: { color: WHITE },

  // ── Range Row ──
  rangeRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 20,
  },
  rangeBox: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: BG, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(190,163,216,0.15)',
    alignItems: 'center',
  },
  rangeBoxActive:  { borderColor: PURPLE, backgroundColor: 'rgba(190,163,216,0.08)' },
  rangeLabel:      { fontSize: 9, fontWeight: '800', color: MUTED, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  rangeValue:      { fontSize: 14, fontWeight: '700', color: DARK },
  rangeValueEmpty: { color: '#C0B8CC', fontWeight: '500' },
  rangeDivider:    { alignItems: 'center', justifyContent: 'center' },
  rangeDividerArrow: { fontSize: 18, color: PURPLE, fontWeight: '300' },

  // ── Month Nav ──
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthNavBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  monthNavBtnDisabled: { opacity: 0.35 },
  monthNavArrow:         { fontSize: 22, color: DEEP, fontWeight: '300', lineHeight: 28 },
  monthNavArrowDisabled: { color: MUTED },
  monthNavTitle: { fontSize: 15, fontWeight: '700', color: DARK, letterSpacing: -0.3 },

  // ── Days header ──
  daysHeader:    { flexDirection: 'row', marginBottom: 4 },
  dayHeaderCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  dayHeaderText: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.2 },

  // ── Apply ──
  applyBtn: {
    marginTop: 18,
    height: 56, borderRadius: 14,
    backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: DEEP,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16,
    elevation: 6,
  },
  applyBtnDisabled: { backgroundColor: '#DDD7EA', shadowOpacity: 0 },
  applyBtnText: { fontSize: 15, fontWeight: '700', color: WHITE, letterSpacing: 0.2 },
});
