import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { api } from '../services/api';
import { useReminderStore } from '../store/reminderStore';
import { useAuthStore } from '../store/authStore';
import type { Reminder } from '../types';

const SNOOZE_MINUTES = 5;

export default function HomeScreen() {
  const router = useRouter();
  const { reminders, isLoading, fetchReminders, toggleReminder, deleteReminder, updateReminderDetails } =
    useReminderStore();
  const logout = useAuthStore((s) => s.logout);

  const [ringingId, setRingingId] = useState<string | null>(null);
  const [alarmReminder, setAlarmReminder] = useState<Reminder | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const stopSound = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
  }, []);

  const handleRing = useCallback(async (item: Reminder) => {
    setRingingId(item.id);
    try {
      const { data } = await api.post(`/api/reminders/${item.id}/ring`);
      const uri = FileSystem.cacheDirectory + 'alarm.mp3';
      await FileSystem.writeAsStringAsync(uri, data.audio_base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri });
      soundRef.current = sound;
      await sound.playAsync();
      setAlarmReminder(item);
      setRingingId(null);
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          soundRef.current = null;
        }
      });
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail ?? err?.message ?? 'Could not play alarm.');
      setRingingId(null);
    }
  }, []);

  const handleSnooze = useCallback(async () => {
    if (!alarmReminder) return;
    await stopSound();
    setAlarmReminder(null);
    const snoozeTime = new Date(Date.now() + SNOOZE_MINUTES * 60 * 1000);
    try {
      await updateReminderDetails(alarmReminder.id, snoozeTime, alarmReminder.repeat_type as any);
      await fetchReminders();
      Alert.alert('Snoozed', `Alarm will ring again in ${SNOOZE_MINUTES} minutes.`);
    } catch (err: any) {
      Alert.alert('Error', 'Could not snooze.');
    }
  }, [alarmReminder, stopSound, updateReminderDetails, fetchReminders]);

  const handleDismiss = useCallback(async () => {
    if (!alarmReminder) return;
    await stopSound();
    setAlarmReminder(null);
    try {
      await toggleReminder(alarmReminder.id, false);
      await fetchReminders();
    } catch (err: any) {
      Alert.alert('Error', 'Could not dismiss.');
    }
  }, [alarmReminder, stopSound, toggleReminder, fetchReminders]);

  useEffect(() => {
    fetchReminders().catch((err) =>
      Alert.alert('Could not load reminders', err.message),
    );
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert('Delete Reminder', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteReminder(id) },
      ]);
    },
    [deleteReminder],
  );

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace('/(auth)/login');
  }, [logout, router]);

  const renderItem = ({ item }: { item: Reminder }) => {
    const alarmDate = new Date(item.alarm_at);
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/edit?id=${item.id}`)}>
        <View style={styles.cardBody}>
          <Text style={styles.messageText} numberOfLines={2}>{item.message_text}</Text>
          <Text style={styles.alarmTime}>
            {alarmDate.toLocaleDateString()} {alarmDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.repeatBadge}>{item.repeat_type}</Text>
        </View>
        <View style={styles.cardActions}>
          <Switch
            value={item.is_active}
            onValueChange={(val) => toggleReminder(item.id, val)}
            trackColor={{ true: '#4F46E5' }}
          />
          <TouchableOpacity
            onPress={() => handleRing(item)}
            style={styles.ringBtn}
            disabled={ringingId === item.id}
          >
            {ringingId === item.id
              ? <ActivityIndicator size="small" color="#4F46E5" />
              : <Text style={styles.ringBtnText}>🔔</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Reminders</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchReminders} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No reminders yet. Tap + to add one.</Text>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(app)/create')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Alarm Modal */}
      <Modal visible={!!alarmReminder} transparent animationType="fade">
        <View style={styles.alarmOverlay}>
          <View style={styles.alarmCard}>
            <Text style={styles.alarmEmoji}>🔔</Text>
            <Text style={styles.alarmTitle}>Reminder</Text>
            <Text style={styles.alarmMessage}>{alarmReminder?.message_text}</Text>
            <Text style={styles.alarmTime2}>
              {alarmReminder ? new Date(alarmReminder.alarm_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>

            <TouchableOpacity style={styles.snoozeBtn} onPress={handleSnooze}>
              <Text style={styles.snoozeBtnText}>⏰  Snooze {SNOOZE_MINUTES} min</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
              <Text style={styles.dismissBtnText}>✓  Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  logoutText: { fontSize: 14, color: '#EF4444' },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardBody: { flex: 1, marginRight: 12 },
  messageText: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 6 },
  alarmTime: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  repeatBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardActions: { justifyContent: 'space-between', alignItems: 'flex-end' },
  ringBtn: { marginTop: 4, padding: 4, minWidth: 32, alignItems: 'center' },
  ringBtnText: { fontSize: 20 },
  deleteBtn: { marginTop: 8 },
  deleteBtnText: { fontSize: 13, color: '#EF4444' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: 16, marginTop: 60 },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { fontSize: 30, color: '#fff', lineHeight: 34 },
  // Alarm modal
  alarmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alarmCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  alarmEmoji: { fontSize: 56, marginBottom: 12 },
  alarmTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 12 },
  alarmMessage: {
    fontSize: 17,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  alarmTime2: { fontSize: 14, color: '#9CA3AF', marginBottom: 32 },
  snoozeBtn: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  snoozeBtnText: { color: '#4F46E5', fontSize: 17, fontWeight: '700' },
  dismissBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  dismissBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
