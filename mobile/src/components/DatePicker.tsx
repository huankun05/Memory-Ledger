import React, { useState, useEffect, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

interface DatePickerProps {
  visible: boolean;
  value: string;
  title?: string;
  maxDate?: string;
  minDate?: string;
  onChange?: (date: string) => void;
  onConfirm: (date: string) => void;
  onClose: () => void;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PADDING_OFFSET = Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT;

interface PickerColumnProps {
  data: number[];
  initialIndex: number;
  renderLabel: (item: number) => string;
  onValueChange: (value: number) => void;
  width: number;
  textColor: string;
  selectedColor: string;
  variantBg: string;
}

export interface PickerColumnRef {
  getCurrentValue: () => number;
}

const PickerColumn = forwardRef<PickerColumnRef, PickerColumnProps>(function PickerColumn({
  data,
  initialIndex,
  renderLabel,
  onValueChange,
  width,
  textColor,
  selectedColor,
  variantBg,
}, ref) {
  const scrollViewRef = useRef<ScrollView>(null);
  const selectedIndexRef = useRef(initialIndex);
  const ignoreScrollRef = useRef(false);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  useImperativeHandle(ref, () => ({
    getCurrentValue: () => data[selectedIndexRef.current],
  }), [data]);

  useEffect(() => {
    selectedIndexRef.current = initialIndex;
    setSelectedIndex(initialIndex);
  }, [initialIndex]);

  const updateSelectedIndex = useCallback((index: number) => {
    if (index !== selectedIndexRef.current) {
      selectedIndexRef.current = index;
      setSelectedIndex(index);
      onValueChange(data[index]);
    }
  }, [data, onValueChange]);

  const scrollToIndex = useCallback((index: number, animated: boolean) => {
    const clampedIndex = Math.max(0, Math.min(data.length - 1, index));
    ignoreScrollRef.current = animated;
    updateSelectedIndex(clampedIndex);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: clampedIndex * ITEM_HEIGHT,
        animated,
      });
    }
    if (animated) {
      setTimeout(() => {
        ignoreScrollRef.current = false;
      }, 300);
    }
  }, [data, updateSelectedIndex]);

  const handleMomentumScrollEnd = useCallback((event: any) => {
    if (ignoreScrollRef.current) {
      ignoreScrollRef.current = false;
      return;
    }

    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(data.length - 1, index));
    
    updateSelectedIndex(clampedIndex);
  }, [data, updateSelectedIndex]);

  const handleScroll = useCallback((event: any) => {
    if (ignoreScrollRef.current) return;

    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(data.length - 1, index));
    
    if (clampedIndex !== selectedIndexRef.current) {
      selectedIndexRef.current = clampedIndex;
      setSelectedIndex(clampedIndex);
    }
  }, []);

  const handleItemPress = useCallback((index: number) => {
    scrollToIndex(index, true);
  }, [scrollToIndex]);

  return (
    <View style={[styles.pickerColumn, { width, height: PICKER_HEIGHT }]}>
      <View
        style={[
          styles.pickerIndicator,
          { backgroundColor: variantBg },
        ]}
        pointerEvents="none"
      />
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: PADDING_OFFSET }}
        contentOffset={{ x: 0, y: initialIndex * ITEM_HEIGHT }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumScrollEnd}
      >
        {data.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.pickerItem, { width }]}
              onPress={() => handleItemPress(index)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pickerItemText,
                  { color: isSelected ? selectedColor : textColor },
                  isSelected && styles.pickerItemSelected,
                ]}
              >
                {renderLabel(item)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

const PickerColumnMemo = React.memo(PickerColumn);

export default function DatePicker({ visible, value, title, maxDate, minDate, onChange, onConfirm, onClose }: DatePickerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { i18n } = useTranslation();
  const language = i18n.language;
  const { width: screenWidth } = useWindowDimensions();

  const yearRef = useRef<PickerColumnRef>(null);
  const monthRef = useRef<PickerColumnRef>(null);
  const dayRef = useRef<PickerColumnRef>(null);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [selectedDay, setSelectedDay] = useState(1);
  const [pickerKey, setPickerKey] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const maxYear = useMemo(() => {
    if (maxDate) {
      return Math.min(currentYear, parseInt(maxDate.split('-')[0]));
    }
    return currentYear + 10;
  }, [maxDate, currentYear]);

  const minYear = useMemo(() => {
    if (minDate) {
      return parseInt(minDate.split('-')[0]);
    }
    return currentYear - 20;
  }, [minDate, currentYear]);

  const years = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i),
    [maxYear, minYear]
  );
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  const monthNames = useMemo(() => {
    return language === 'zh'
      ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }, [language]);

  const yearIndex = useMemo(() => years.indexOf(selectedYear), [years, selectedYear]);
  const dayIndex = useMemo(() => Math.min(selectedDay - 1, daysInMonth - 1), [selectedDay, daysInMonth]);

  const showToastMsg = useCallback((msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }, []);

  useEffect(() => {
    if (visible) {
      const parts = (value || new Date().toISOString().split('T')[0]).split('-');
      const year = parseInt(parts[0]) || currentYear;
      const month = parseInt(parts[1]) - 1 || 0;
      const day = parseInt(parts[2]) || 1;
      
      setSelectedYear(year);
      setSelectedMonth(month);
      setSelectedDay(day);
      setPickerKey(k => k + 1);
    }
  }, [visible, value, currentYear]);

  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year);
    const newDaysInMonth = new Date(year, selectedMonth + 1, 0).getDate();
    if (selectedDay > newDaysInMonth) {
      setSelectedDay(newDaysInMonth);
    }
    if (onChange) {
      const m = String(selectedMonth + 1).padStart(2, '0');
      const d = String(Math.min(selectedDay, newDaysInMonth)).padStart(2, '0');
      onChange(`${year}-${m}-${d}`);
    }
  }, [selectedMonth, selectedDay, onChange]);

  const handleMonthChange = useCallback((month: number) => {
    setSelectedMonth(month);
    const newDaysInMonth = new Date(selectedYear, month + 1, 0).getDate();
    if (selectedDay > newDaysInMonth) {
      setSelectedDay(newDaysInMonth);
    }
    if (onChange) {
      const y = selectedYear;
      const m = String(month + 1).padStart(2, '0');
      const d = String(Math.min(selectedDay, newDaysInMonth)).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
    }
  }, [selectedYear, selectedDay, onChange]);

  const handleDayChange = useCallback((day: number) => {
    setSelectedDay(day);
    if (onChange) {
      const y = selectedYear;
      const m = String(selectedMonth + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
    }
  }, [selectedYear, selectedMonth, onChange]);

  const handleConfirm = useCallback(() => {
    const year = yearRef.current?.getCurrentValue() ?? selectedYear;
    const month = monthRef.current?.getCurrentValue() ?? selectedMonth;
    const day = dayRef.current?.getCurrentValue() ?? selectedDay;

    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;

    if (maxDate && dateStr > maxDate) {
      showToastMsg(t('datePicker.cannotExceedMax') + maxDate);
      return;
    }
    if (minDate && dateStr < minDate) {
      showToastMsg(t('datePicker.cannotBelowMin') + minDate);
      return;
    }

    onConfirm(dateStr);
  }, [selectedYear, selectedMonth, selectedDay, maxDate, minDate, onConfirm, showToastMsg, t]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[styles.pickerContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <X size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.pickerTitle, { color: colors.text }]}>
            {title || t('itemDetail.purchaseDate')}
          </Text>
          <TouchableOpacity onPress={handleConfirm} style={styles.headerBtn}>
            <Check size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.pickerContent}>
          <PickerColumnMemo
            ref={yearRef}
            key={`y-${pickerKey}`}
            data={years}
            initialIndex={yearIndex}
            renderLabel={(y) => String(y)}
            onValueChange={handleYearChange}
            width={screenWidth * 0.3}
            textColor={colors.textTertiary}
            selectedColor={colors.primary}
            variantBg={colors.surfaceVariant}
          />
          <PickerColumnMemo
            ref={monthRef}
            key={`m-${pickerKey}`}
            data={months}
            initialIndex={selectedMonth}
            renderLabel={(m) => monthNames[m]}
            onValueChange={handleMonthChange}
            width={screenWidth * 0.35}
            textColor={colors.textTertiary}
            selectedColor={colors.primary}
            variantBg={colors.surfaceVariant}
          />
          <PickerColumnMemo
            ref={dayRef}
            key={`d-${pickerKey}-${daysInMonth}`}
            data={days}
            initialIndex={dayIndex}
            renderLabel={(d) => String(d)}
            onValueChange={handleDayChange}
            width={screenWidth * 0.25}
            textColor={colors.textTertiary}
            selectedColor={colors.primary}
            variantBg={colors.surfaceVariant}
          />
        </View>

        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
          onPress={handleConfirm}
        >
          <Check size={18} color={colors.onPrimary} />
          <Text style={[styles.confirmBtnText, { color: colors.onPrimary }]}>
            {t('common.confirm')}
          </Text>
        </TouchableOpacity>

        {showToast && (
          <View style={[styles.toast, { backgroundColor: colors.text }]}>
            <Text style={[styles.toastText, { color: colors.surface }]}>
              {toastMsg}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  pickerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: PICKER_HEIGHT,
    paddingHorizontal: 12,
  },
  pickerColumn: {
    overflow: 'hidden',
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemText: {
    fontSize: 18,
  },
  pickerItemSelected: {
    fontWeight: '600',
  },
  pickerIndicator: {
    position: 'absolute',
    top: PADDING_OFFSET,
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    borderRadius: 8,
    zIndex: -1,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
