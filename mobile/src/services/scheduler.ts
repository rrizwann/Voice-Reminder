import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { RepeatType } from '../types';

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function ensureAlarmChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alarms', {
      name: 'Voice Alarms',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }
}

// Returns notification identifiers created (1 for once/daily, up to 5 for weekdays, 2 for weekends)
export async function scheduleAlarm(
  reminderId: string,
  message: string,
  alarmAt: Date,
  repeatType: RepeatType,
): Promise<string[]> {
  await cancelAlarm(reminderId);

  const content: Notifications.NotificationContentInput = {
    title: 'Voice Reminder',
    body: message,
    data: { reminderId, message },
    sound: 'default',
  };

  const ids: string[] = [];

  if (repeatType === 'once') {
    const id = await Notifications.scheduleNotificationAsync({
      identifier: `${reminderId}_0`,
      content,
      trigger: { date: alarmAt, channelId: 'alarms' } as any,
    });
    ids.push(id);
  } else if (repeatType === 'daily') {
    const id = await Notifications.scheduleNotificationAsync({
      identifier: `${reminderId}_0`,
      content,
      trigger: {
        hour: alarmAt.getHours(),
        minute: alarmAt.getMinutes(),
        repeats: true,
        channelId: 'alarms',
      } as any,
    });
    ids.push(id);
  } else if (repeatType === 'weekdays') {
    // Mon(2) Tue(3) Wed(4) Thu(5) Fri(6) — expo weekday: 1=Sun
    for (const weekday of [2, 3, 4, 5, 6]) {
      const id = await Notifications.scheduleNotificationAsync({
        identifier: `${reminderId}_${weekday}`,
        content,
        trigger: {
          weekday,
          hour: alarmAt.getHours(),
          minute: alarmAt.getMinutes(),
          repeats: true,
          channelId: 'alarms',
        } as any,
      });
      ids.push(id);
    }
  } else {
    // weekends: Sat(7), Sun(1)
    for (const weekday of [7, 1]) {
      const id = await Notifications.scheduleNotificationAsync({
        identifier: `${reminderId}_${weekday}`,
        content,
        trigger: {
          weekday,
          hour: alarmAt.getHours(),
          minute: alarmAt.getMinutes(),
          repeats: true,
          channelId: 'alarms',
        } as any,
      });
      ids.push(id);
    }
  }

  return ids;
}

export async function cancelAlarm(reminderId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith(`${reminderId}_`)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
    }
  }
}
