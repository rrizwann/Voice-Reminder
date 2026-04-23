import { Stack } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';

function BackButton() {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
      <Text style={{ color: '#4F46E5', fontSize: 16, fontWeight: '600' }}>← Back</Text>
    </TouchableOpacity>
  );
}

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="home" options={{ headerShown: false }} />
      <Stack.Screen
        name="create"
        options={{
          title: 'New Reminder',
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          title: 'Edit Reminder',
          headerLeft: () => <BackButton />,
        }}
      />
    </Stack>
  );
}
