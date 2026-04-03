import axios from 'axios';
import { refreshToken } from './client';

const AGENT_API_BASE_URL = process.env.NEXT_PUBLIC_AGENT_API_BASE_URL || 'http://localhost:8000/api';

const agentClient = axios.create({
  baseURL: AGENT_API_BASE_URL,
  withCredentials: true,
  timeout: 10000, // 10s default timeout (Reliability FIX-003)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for token refresh
agentClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    // If 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Trigger a refresh call using the centralized logic.
        // This will update the cookies on the backend.
        await refreshToken();
        
        // Retry the original request (it will now have the updated cookie)
        
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
