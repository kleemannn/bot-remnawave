'use client';

import axios from 'axios';
import { useUserStore } from '@/store/useUserStore';
import {
  AuthResponse,
  CreateSubscriptionPayload,
  CreateSubscriptionResponse,
  DashboardPayload,
  DealerProfile,
  PaginatedResponse,
  SubscriptionDetail,
  SubscriptionListItem,
} from './types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') || '';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
});

api.interceptors.request.use((config) => {
  const token = useUserStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ??
      error?.message ??
      'Не удалось выполнить запрос.';

    return Promise.reject(new Error(Array.isArray(message) ? message.join(', ') : message));
  },
);

export async function authenticateMiniApp(initData: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/webapp/auth', {
    initData,
  });
  return data;
}

export async function getDashboard(): Promise<DashboardPayload> {
  const { data } = await api.get<DashboardPayload>('/webapp/dashboard');
  return data;
}

export async function getProfile(): Promise<DealerProfile> {
  const { data } = await api.get<DealerProfile>('/webapp/profile');
  return data;
}

export async function getSubscriptions(page = 1): Promise<PaginatedResponse<SubscriptionListItem>> {
  const { data } = await api.get<PaginatedResponse<SubscriptionListItem>>('/webapp/subscriptions', {
    params: { page },
  });
  return data;
}

export async function getSubscription(id: string): Promise<SubscriptionDetail> {
  const { data } = await api.get<SubscriptionDetail>(`/webapp/subscriptions/${id}`);
  return data;
}

export async function createSubscription(
  payload: CreateSubscriptionPayload,
): Promise<CreateSubscriptionResponse> {
  const { data } = await api.post<CreateSubscriptionResponse>('/webapp/subscriptions', payload);
  return data;
}

export async function pauseSubscription(id: string): Promise<void> {
  await api.post(`/webapp/subscriptions/${id}/pause`);
}

export async function resumeSubscription(id: string): Promise<void> {
  await api.post(`/webapp/subscriptions/${id}/resume`);
}

export async function deleteSubscription(id: string): Promise<void> {
  await api.delete(`/webapp/subscriptions/${id}`);
}
