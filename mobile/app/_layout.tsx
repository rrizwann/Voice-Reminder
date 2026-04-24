import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { ensureAlarmChannel, requestNotificationPermissions } from '../src/services/scheduler';
import { useReminderStore } from '../src/store/reminderStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const router = useRouter();
  const { fetchReminders, setActiveAlarm, reminders } = useReminderStore();

  useEffect(() => {
    requestNotificationPermissions();
    ensureAlarmChannel();
    fetchReminders().catch(() => {});
  }, []);

  // Foreground: notification arrives while app is open → trigger alarm modal
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as { reminderId?: string; message?: string };
      if (!data?.reminderId) return;
      const reminder = useReminderStore.getState().reminders.find((r) => r.id === data.reminderId);
      if (reminder) {
        setActiveAlarm(reminder);
      }
    });
    return () => sub.remove();
  }, []);

  // Background/killed: user taps notification → open app + trigger alarm modal
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { reminderId?: string };
      if (!data?.reminderId) return;
      router.replace('/(app)/home');
      // Slight delay to let the screen mount before showing modal
      setTimeout(() => {
        const reminder = useReminderStore.getState().reminders.find(
          (r) => r.id === data.reminderId,
        );
        if (reminder) {
          useReminderStore.getState().setActiveAlarm(reminder);
        }
      }, 500);
    });
    return () => sub.remove();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" />
    </Stack>
  );
}
