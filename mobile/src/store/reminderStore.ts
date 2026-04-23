import { create } from 'zustand';
import { api } from '../services/api';
import type { Reminder, RepeatType } from '../types';

interface ReminderState {
  reminders: Reminder[];
  isLoading: boolean;
  fetchReminders: () => Promise<void>;
  createReminder: (
    messageText: string,
    alarmAt: Date,
    repeatType: RepeatType,
    deviceToken: string | null,
  ) => Promise<void>;
  toggleReminder: (id: string, isActive: boolean) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],
  isLoading: false,

  fetchReminders: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<Reminder[]>('/api/reminders');
      set({ reminders: data });
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? err?.message ?? 'Network error';
      throw new Error(msg);
    } finally {
      set({ isLoading: false });
    }
  },

  createReminder: async (messageText, alarmAt, repeatType, deviceToken) => {
    const { data } = await api.post<Reminder>('/api/reminders', {
      message_text: messageText,
      alarm_at: alarmAt.toISOString(),
      repeat_type: repeatType,
      device_token: deviceToken,
    });
    set((state) => ({ reminders: [data, ...state.reminders] }));
  },

  toggleReminder: async (id, isActive) => {
    const { data } = await api.patch<Reminder>(`/api/reminders/${id}`, { is_active: isActive });
    set((state) => ({
      reminders: state.reminders.map((r) => (r.id === id ? data : r)),
    }));
  },

  deleteReminder: async (id) => {
    await api.delete(`/api/reminders/${id}`);
    set((state) => ({ reminders: state.reminders.filter((r) => r.id !== id) }));
  },
}));
