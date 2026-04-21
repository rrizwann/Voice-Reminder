import * as SecureStore from 'expo-secure-store';
import { api } from './api';
import type { TokenResponse } from '../types';

export async function register(
  name: string,
  email: string,
  password: string,
  timezone: string,
): Promise<void> {
  const { data } = await api.post<TokenResponse>('/api/auth/register', {
    name,
    email,
    password,
    timezone,
  });
  await SecureStore.setItemAsync('access_token', data.access_token);
}

export async function login(email: string, password: string): Promise<void> {
  const { data } = await api.post<TokenResponse>('/api/auth/login', {
    email,
    password,
  });
  await SecureStore.setItemAsync('access_token', data.access_token);
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync('access_token');
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync('access_token');
}
