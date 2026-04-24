import React, { useEffect, useCallback } from 'react';
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
  Modal,
} from 'react-native';
import * as Speech from 'expo-speech';
import { useRouter } from 'expo-router';
import { useReminderStore } from '../store/reminderStore';
import type { Reminder } from '../types';

const SNOOZE_MINUTES = 5;

export default function HomeScreen() {
  const router = useRouter();
  const {
    reminders,
    isLoading,
    fetchReminders,
    toggleReminder,
    deleteReminder,
    activeAlarm,
    setActiveAlarm,
    snoozeAlarm,
    dismissAlarm,
  } = useReminderStore();

  useEffect(() => {
    fetchReminders().catch(() => {});
  }, []);

  const handleRingNow = useCallback((item: Reminder) => {
    setActiveAlarm(item);
  }, [setActiveAlarm]);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert('Delete Reminder', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteReminder(id) },
      ]);
    },
    [deleteReminder],
  );

  const renderItem = ({ item }: { item: Reminder }) => {
    const alarmDate = new Date(item.alarm_at);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(app)/edit?id=${item.id}`)}
      >
        <View style={styles.cardBody}>
          <Text style={styles.messageText} numberOfLines={2}>{item.message_text}</Text>
          <Text style={styles.alarmTime}>
            {alarmDate.toLocaleDateString()}{' '}
            {alarmDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.repeatBadge}>{item.repeat_type}</Text>
        </View>
        <View style={styles.cardActions}>
          <Switch
            value={item.is_active}
            onValueChange={(val) => toggleReminder(item.id, val)}
            trackColor={{ true: '#4F46E5' }}
          />
          <TouchableOpacity onPress={() => handleRingNow(item)} style={styles.ringBtn}>
            <Text style={styles.ringBtnText}>🔔</Text>
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

      {/* Alarm modal — shown when Ring Now is tapped or notification triggers */}
      <Modal visible={!!activeAlarm} transparent animationType="fade">
        <View style={styles.alarmOverlay}>
          <View style={styles.alarmCard}>
            <Text style={styles.alarmEmoji}>🔔</Text>
            <Text style={styles.alarmTitle}>Reminder</Text>
            <Text style={styles.alarmMessage}>{activeAlarm?.message_text}</Text>
            <Text style={styles.alarmTime2}>
              {activeAlarm
                ? new Date(activeAlarm.alarm_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''}
            </Text>

            <TouchableOpacity style={styles.snoozeBtn} onPress={snoozeAlarm}>
              <Text style={styles.snoozeBtnText}>⏰  Snooze {SNOOZE_MINUTES} min</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dismissBtn} onPress={dismissAlarm}>
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
