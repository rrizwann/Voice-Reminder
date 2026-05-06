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
    const secondsUntilAlarm = Math.max(5, Math.floor((alarmAt.getTime() - Date.now()) / 1000));
    const id = await Notifications.scheduleNotificationAsync({
      identifier: `${reminderId}_0`,
      content,
      trigger: {
        type: 'timeInterval',
        seconds: secondsUntilAlarm,
        repeats: false,
        channelId: 'alarms',
      } as any,
    });
    ids.push(id);
  } else if (repeatType === 'daily') {
    const id = await Notifications.scheduleNotificationAsync({
      identifier: `${reminderId}_0`,
      content,
      trigger: {
        type: 'daily',
        hour: alarmAt.getHours(),
        minute: alarmAt.getMinutes(),
        channelId: 'alarms',
      } as any,
    });
    ids.push(id);
  } else if (repeatType === 'weekdays') {
    for (const weekday of [2, 3, 4, 5, 6]) {
      const id = await Notifications.scheduleNotificationAsync({
        identifier: `${reminderId}_${weekday}`,
        content,
        trigger: {
          type: 'weekly',
          weekday,
          hour: alarmAt.getHours(),
          minute: alarmAt.getMinutes(),
          channelId: 'alarms',
        } as any,
      });
      ids.push(id);
    }
  } else {
    for (const weekday of [7, 1]) {
      const id = await Notifications.scheduleNotificationAsync({
        identifier: `${reminderId}_${weekday}`,
        content,
        trigger: {
          type: 'weekly',
          weekday,
          hour: alarmAt.getHours(),
          minute: alarmAt.getMinutes(),
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
