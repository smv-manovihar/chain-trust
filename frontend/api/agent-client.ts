import axios from 'axios';
import client from './client';

import { tokenStore } from '@/lib/token-store';

const AGENT_API_BASE_URL = process.env.NEXT_PUBLIC_AGENT_API_BASE_URL || 'http://localhost:8000/api';

const agentClient = axios.create({
  baseURL: AGENT_API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add the Authorization header
agentClient.interceptors.request.use(
  (config) => {
    const token = tokenStore.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
agentClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Trigger a refresh call on the main client. 
        // Our client.ts interceptor will handle queuing and updating tokenStore.
        await client.post('/auth/refresh');
        
        // Pick up the new token from the shared store
        const newToken = tokenStore.getToken();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        
        return agentClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    const message = error.response?.data?.detail || error.response?.data?.message || error.message || 'Something went wrong';
    const newError = new Error(message);
    (newError as any).status = error.response?.status;
    return Promise.reject(newError);
  }
);

export default agentClient;
