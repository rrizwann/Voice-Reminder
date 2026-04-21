export type RepeatType = 'once' | 'daily' | 'weekdays' | 'weekends';

export interface User {
  id: string;
  name: string;
  email: string;
  timezone: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  message_text: string;
  audio_url: string | null;
  alarm_at: string;
  repeat_type: RepeatType;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
