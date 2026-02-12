import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional: Add interceptors for response handling (e.g., global error handling)
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // enhanced error handling
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    const newError = new Error(message);
    (newError as any).status = error.response?.status;
    (newError as any).code = error.response?.data?.code;
    return Promise.reject(newError);
  }
);

export default client;
