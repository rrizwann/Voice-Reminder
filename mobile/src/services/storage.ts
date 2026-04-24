import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Reminder } from '../types';

const REMINDERS_KEY = '@voice_reminders';

export async function loadReminders(): Promise<Reminder[]> {
  const raw = await AsyncStorage.getItem(REMINDERS_KEY);
  return raw ? (JSON.parse(raw) as Reminder[]) : [];
}

export async function saveReminders(reminders: Reminder[]): Promise<void> {
  await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
}
