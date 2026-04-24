import { create } from 'zustand';
import * as Speech from 'expo-speech';
import { loadReminders, saveReminders } from '../services/storage';
import { scheduleAlarm, cancelAlarm } from '../services/scheduler';
import type { Reminder, RepeatType } from '../types';

const SNOOZE_MINUTES = 5;

interface ReminderState {
  reminders: Reminder[];
  isLoading: boolean;
  activeAlarm: Reminder | null;

  fetchReminders: () => Promise<void>;
  createReminder: (messageText: string, alarmAt: Date, repeatType: RepeatType) => Promise<void>;
  updateReminderDetails: (id: string, alarmAt: Date, repeatType: RepeatType) => Promise<void>;
  toggleReminder: (id: string, isActive: boolean) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  setActiveAlarm: (reminder: Reminder | null) => void;
  snoozeAlarm: () => Promise<void>;
  dismissAlarm: () => Promise<void>;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],
  isLoading: false,
  activeAlarm: null,

  fetchReminders: async () => {
    set({ isLoading: true });
    try {
      const all = await loadReminders();
      set({ reminders: all.filter((r) => r.is_active) });
    } finally {
      set({ isLoading: false });
    }
  },

  createReminder: async (messageText, alarmAt, repeatType) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const notification_ids = await scheduleAlarm(id, messageText, alarmAt, repeatType);
    const reminder: Reminder = {
      id,
      message_text: messageText,
      alarm_at: alarmAt.toISOString(),
      repeat_type: repeatType,
      is_active: true,
      notification_ids,
      created_at: new Date().toISOString(),
    };
    const all = await loadReminders();
    await saveReminders([reminder, ...all]);
    set((state) => ({ reminders: [reminder, ...state.reminders] }));
  },

  updateReminderDetails: async (id, alarmAt, repeatType) => {
    const all = await loadReminders();
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Reminder not found');

    const existing = all[idx];
    const notification_ids = await scheduleAlarm(id, existing.message_text, alarmAt, repeatType);
    const updated: Reminder = {
      ...existing,
      alarm_at: alarmAt.toISOString(),
      repeat_type: repeatType,
      notification_ids,
    };
    all[idx] = updated;
    await saveReminders(all);
    set((state) => ({
      reminders: state.reminders.map((r) => (r.id === id ? updated : r)),
    }));
  },

  toggleReminder: async (id, isActive) => {
    const all = await loadReminders();
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) return;

    if (!isActive) {
      await cancelAlarm(id);
    } else {
      const r = all[idx];
      const alarmAt = new Date(r.alarm_at);
      const notification_ids = await scheduleAlarm(id, r.message_text, alarmAt, r.repeat_type);
      all[idx] = { ...r, notification_ids };
    }
    all[idx] = { ...all[idx], is_active: isActive };
    await saveReminders(all);

    if (isActive) {
      set((state) => ({
        reminders: state.reminders.map((r) =>
          r.id === id ? { ...r, is_active: true } : r,
        ),
      }));
    } else {
      set((state) => ({ reminders: state.reminders.filter((r) => r.id !== id) }));
    }
  },

  deleteReminder: async (id) => {
    await cancelAlarm(id);
    const all = await loadReminders();
    await saveReminders(all.filter((r) => r.id !== id));
    set((state) => ({ reminders: state.reminders.filter((r) => r.id !== id) }));
  },

  setActiveAlarm: (reminder) => {
    set({ activeAlarm: reminder });
    if (reminder) {
      Speech.speak(reminder.message_text, { language: 'en-US', pitch: 1.0, rate: 0.9 });
    } else {
      Speech.stop();
    }
  },

  snoozeAlarm: async () => {
    const { activeAlarm, updateReminderDetails } = get();
    if (!activeAlarm) return;
    Speech.stop();
    set({ activeAlarm: null });
    const snoozeTime = new Date(Date.now() + SNOOZE_MINUTES * 60 * 1000);
    await updateReminderDetails(activeAlarm.id, snoozeTime, activeAlarm.repeat_type);
  },

  dismissAlarm: async () => {
    const { activeAlarm, toggleReminder } = get();
    if (!activeAlarm) return;
    Speech.stop();
    set({ activeAlarm: null });
    await toggleReminder(activeAlarm.id, false);
  },
}));
