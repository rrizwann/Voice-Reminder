import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useRouter, useSegments } from 'expo-router';
import {
  addNotificationReceivedListener,
  handleAlarmPayload,
} from '../src/services/notifications';

export default function RootLayout() {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    initialize();
  }, []);

  // Handle incoming FCM alarm notifications while app is in foreground
  useEffect(() => {
    const sub = addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, string>;
      if (data?.type === 'alarm' && data?.audio_url) {
        handleAlarmPayload(data.audio_url);
      }
    });
    return () => sub.remove();
  }, []);

  // Auth gate: redirect to correct stack based on auth state
  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(app)/home');
    }
  }, [isAuthenticated, isLoading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}
