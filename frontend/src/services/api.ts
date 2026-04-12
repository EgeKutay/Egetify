import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ?? 'http://10.0.2.2:8080/api';

// 10.0.2.2 is the Android emulator's alias for the host machine (localhost)

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

/** Attach JWT to every request if one is stored */
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** On 401/403 wipe token and the caller handles redirect to Login */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      await SecureStore.deleteItemAsync('access_token');
    }
    return Promise.reject(error);
  },
);

export default api;
