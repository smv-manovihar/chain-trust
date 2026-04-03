import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 50000, // 50s default timeout (Reliability FIX-003)
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
  resolve: (value?: any) => void;
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

// Centralized refresh function to prevent multiple simultaneous calls
export const refreshToken = async (): Promise<string | null> => {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  try {
    const response = await axios.post<RefreshResponse>(
      `${API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    const newToken = response.data.accessToken;

    // Cookies handle the token storage

    isRefreshing = false;
    processQueue(null, newToken);
    return newToken;
  } catch (error) {
    isRefreshing = false;
    processQueue(error, null);
    throw error;
  }
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't intercept if the refresh itself failed
      if (originalRequest.url === '/auth/refresh' || originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const newToken = await refreshToken();
        
        // If we are using standard axios headers for token, update them here
        // But here we rely on cookies mostly, or tokenStore for other clients.
        
        return client(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    // Handle cancelled requests (AbortController)
    if (axios.isCancel(error)) {
      const abortError = new Error('Request canceled');
      abortError.name = 'AbortError';
      return Promise.reject(abortError);
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
