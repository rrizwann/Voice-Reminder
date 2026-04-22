import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useReminderStore } from '../store/reminderStore';
import { registerForPushNotifications } from '../services/notifications';
import type { RepeatType } from '../types';

const REPEAT_OPTIONS: RepeatType[] = ['once', 'daily', 'weekdays', 'weekends'];

function buildAlarmDate(dateStr: string, timeStr: string): Date | null {
  const dateParts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeParts = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!dateParts || !timeParts) return null;
  const d = new Date(
    parseInt(dateParts[1]),
    parseInt(dateParts[2]) - 1,
    parseInt(dateParts[3]),
    parseInt(timeParts[1]),
    parseInt(timeParts[2]),
    0,
    0,
  );
  return isNaN(d.getTime()) ? null : d;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nowPlusFiveStr() {
  const d = new Date(Date.now() + 5 * 60 * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function CreateReminderScreen() {
  const router = useRouter();
  const createReminder = useReminderStore((s) => s.createReminder);

  const [messageText, setMessageText] = useState('');
  const [dateStr, setDateStr] = useState(todayStr);
  const [timeStr, setTimeStr] = useState(nowPlusFiveStr);
  const [repeatType, setRepeatType] = useState<RepeatType>('once');
  const [loading, setLoading] = useState(false);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);

  useEffect(() => {
    registerForPushNotifications().then(setDeviceToken);
  }, []);

  const handleCreate = async () => {
    if (!messageText.trim()) {
      Alert.alert('Error', 'Please enter a reminder message.');
      return;
    }
    const alarmAt = buildAlarmDate(dateStr, timeStr);
    if (!alarmAt) {
      Alert.alert('Error', 'Invalid date or time. Use YYYY-MM-DD and HH:MM format.');
      return;
    }
    if (alarmAt <= new Date()) {
      Alert.alert('Error', 'Please set a future alarm time.');
      return;
    }
    setLoading(true);
    try {
      await createReminder(messageText.trim(), alarmAt, repeatType, deviceToken);
      router.back();
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? 'Failed to create reminder.';
      Alert.alert('Error', detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>New Reminder</Text>

      <Text style={styles.label}>Message</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="e.g. Pick Rayyan to school at 12:00 PM"
        multiline
        numberOfLines={3}
        value={messageText}
        onChangeText={setMessageText}
      />

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        placeholder="2026-04-23"
        value={dateStr}
        onChangeText={setDateStr}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Time (HH:MM, 24-hour)</Text>
      <TextInput
        style={styles.input}
        placeholder="14:30"
        value={timeStr}
        onChangeText={setTimeStr}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Repeat</Text>
      <View style={styles.repeatRow}>
        {REPEAT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.repeatBtn, repeatType === opt && styles.repeatBtnActive]}
            onPress={() => setRepeatType(opt)}
          >
            <Text style={[styles.repeatBtnText, repeatType === opt && styles.repeatBtnTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.createBtnText}>Save Reminder</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#F8F9FF' },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
    marginTop: 8,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  repeatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  repeatBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  repeatBtnActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  repeatBtnText: { fontSize: 14, color: '#374151' },
  repeatBtnTextActive: { color: '#fff', fontWeight: '600' },
  createBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', padding: 12 },
  cancelBtnText: { color: '#6B7280', fontSize: 15 },
});
