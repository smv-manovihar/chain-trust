import axios from 'axios';
import { tokenStore } from '@/lib/token-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface RefreshResponse {
  accessToken: string;
}

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't intercept if the refresh itself failed
      if (originalRequest.url === '/auth/refresh') {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request, wait for refresh to finish, then retry
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return client(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await client.post<RefreshResponse>('/auth/refresh');
        const newToken = response.data.accessToken;
        
        if (newToken) {
          tokenStore.setToken(newToken);
        }

        isRefreshing = false;
        processQueue(null);
        // Retry the original request
        return client(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError);
        // Refresh failed, user needs to relogin
        return Promise.reject(refreshError);
      }
    }

    // enhanced error handling for other errors
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    const newError = new Error(message);
    (newError as any).status = error.response?.status;
    (newError as any).code = error.response?.data?.code;
    return Promise.reject(newError);
  }
);

export default client;
