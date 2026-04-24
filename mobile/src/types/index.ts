export type RepeatType = 'once' | 'daily' | 'weekdays' | 'weekends';

export interface Reminder {
  id: string;
  message_text: string;
  alarm_at: string; // ISO string
  repeat_type: RepeatType;
  is_active: boolean;
  notification_ids: string[];
  created_at: string;
}
