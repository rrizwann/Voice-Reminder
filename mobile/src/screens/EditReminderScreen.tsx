import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useReminderStore } from '../store/reminderStore';
import type { RepeatType } from '../types';

const REPEAT_OPTIONS: RepeatType[] = ['once', 'daily', 'weekdays', 'weekends'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}
function formatDate(d: Date) {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function formatTime(d: Date) {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${ampm}`;
}

function Stepper({ label, value, onDecrement, onIncrement }: {
  label: string; value: string; onDecrement: () => void; onIncrement: () => void;
}) {
  return (
    <View style={s.stepperRow}>
      <Text style={s.stepperLabel}>{label}</Text>
      <TouchableOpacity style={s.stepBtn} onPress={onDecrement}>
        <Text style={s.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={s.stepValue}>{value}</Text>
      <TouchableOpacity style={s.stepBtn} onPress={onIncrement}>
        <Text style={s.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function EditReminderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { reminders, toggleReminder } = useReminderStore();
  const updateReminder = useReminderStore((st) => st.toggleReminder);

  const reminder = reminders.find((r) => r.id === id);

  const [alarmAt, setAlarmAt] = useState(() =>
    reminder ? new Date(reminder.alarm_at) : new Date(),
  );
  const [repeatType, setRepeatType] = useState<RepeatType>(
    (reminder?.repeat_type as RepeatType) ?? 'once',
  );
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [draft, setDraft] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const { updateReminderDetails } = useReminderStore();

  if (!reminder) {
    return (
      <View style={s.center}>
        <Text>Reminder not found.</Text>
      </View>
    );
  }

  const openPicker = (mode: 'date' | 'time') => {
    setDraft(new Date(alarmAt));
    setPickerMode(mode);
    setShowPicker(true);
  };

  const confirmPicker = () => {
    setAlarmAt(new Date(draft));
    setShowPicker(false);
  };

  const adjustDate = (field: 'year' | 'month' | 'day', delta: number) => {
    setDraft((prev) => {
      const d = new Date(prev);
      if (field === 'year') d.setFullYear(d.getFullYear() + delta);
      if (field === 'month') d.setMonth(clamp(d.getMonth() + delta, 0, 11));
      if (field === 'day') {
        const maxDay = daysInMonth(d.getFullYear(), d.getMonth());
        d.setDate(clamp(d.getDate() + delta, 1, maxDay));
      }
      return d;
    });
  };

  const adjustTime = (field: 'hour' | 'minute', delta: number) => {
    setDraft((prev) => {
      const d = new Date(prev);
      if (field === 'hour') d.setHours((d.getHours() + delta + 24) % 24);
      if (field === 'minute') d.setMinutes((d.getMinutes() + delta + 60) % 60);
      return d;
    });
  };

  const handleSave = async () => {
    if (alarmAt <= new Date()) {
      Alert.alert('Error', 'Please set a future alarm time.');
      return;
    }
    setLoading(true);
    try {
      await updateReminderDetails(id, alarmAt, repeatType);
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail ?? err?.message ?? 'Update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.messagePreview} numberOfLines={3}>{reminder.message_text}</Text>

        <Text style={s.label}>Date</Text>
        <TouchableOpacity style={s.pickerBtn} onPress={() => openPicker('date')}>
          <Text style={s.pickerBtnText}>{formatDate(alarmAt)}</Text>
          <Text style={s.pickerIcon}>📅</Text>
        </TouchableOpacity>

        <Text style={s.label}>Time</Text>
        <TouchableOpacity style={s.pickerBtn} onPress={() => openPicker('time')}>
          <Text style={s.pickerBtnText}>{formatTime(alarmAt)}</Text>
          <Text style={s.pickerIcon}>⏰</Text>
        </TouchableOpacity>

        <Text style={s.label}>Repeat</Text>
        <View style={s.repeatRow}>
          {REPEAT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[s.repeatBtn, repeatType === opt && s.repeatBtnActive]}
              onPress={() => setRepeatType(opt)}
            >
              <Text style={[s.repeatBtnText, repeatType === opt && s.repeatBtnTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={s.cancelBtn}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showPicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{pickerMode === 'date' ? 'Select Date' : 'Select Time'}</Text>
            {pickerMode === 'date' ? (
              <>
                <Stepper label="Year" value={String(draft.getFullYear())}
                  onDecrement={() => adjustDate('year', -1)} onIncrement={() => adjustDate('year', 1)} />
                <Stepper label="Month" value={MONTHS[draft.getMonth()]}
                  onDecrement={() => adjustDate('month', -1)} onIncrement={() => adjustDate('month', 1)} />
                <Stepper label="Day" value={String(draft.getDate())}
                  onDecrement={() => adjustDate('day', -1)} onIncrement={() => adjustDate('day', 1)} />
              </>
            ) : (
              <>
                <Stepper label="Hour" value={String(draft.getHours()).padStart(2, '0')}
                  onDecrement={() => adjustTime('hour', -1)} onIncrement={() => adjustTime('hour', 1)} />
                <Stepper label="Minute" value={String(draft.getMinutes()).padStart(2, '0')}
                  onDecrement={() => adjustTime('minute', -5)} onIncrement={() => adjustTime('minute', 5)} />
              </>
            )}
            <TouchableOpacity style={s.modalDoneBtn} onPress={confirmPicker}>
              <Text style={s.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, padding: 24, backgroundColor: '#F8F9FF' },
  messagePreview: {
    fontSize: 16, color: '#374151', backgroundColor: '#EEF2FF',
    borderRadius: 12, padding: 14, marginBottom: 24, fontStyle: 'italic',
  },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  pickerBtn: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, padding: 14, marginBottom: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerBtnText: { fontSize: 16, color: '#111827' },
  pickerIcon: { fontSize: 18 },
  repeatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  repeatBtn: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff',
  },
  repeatBtnActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  repeatBtnText: { fontSize: 14, color: '#374151' },
  repeatBtnTextActive: { color: '#fff', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#4F46E5', borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 12,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', padding: 12 },
  cancelBtnText: { color: '#6B7280', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20, textAlign: 'center' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  stepperLabel: { fontSize: 15, color: '#374151', fontWeight: '600', width: 60 },
  stepBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center',
  },
  stepBtnText: { fontSize: 22, color: '#4F46E5', fontWeight: '700' },
  stepValue: { fontSize: 20, fontWeight: '700', color: '#111827', minWidth: 80, textAlign: 'center' },
  modalDoneBtn: {
    backgroundColor: '#4F46E5', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8,
  },
  modalDoneBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
