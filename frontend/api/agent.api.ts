import agentClient from './agent-client';
import { AgentMessage } from '@/types/agent.types';

export interface ChatSession {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  thoughts?: any[];
  status: 'generating' | 'completed' | 'error';
  edited: boolean;
  created_at: string;
  updated_at: string;
}

// Cache promise for simultaneous requests
let listSessionsPromise: Promise<ChatSession[]> | null = null;

export const agentApi = {
  // Session Management
  createSession: async (message?: string, context?: any, signal?: AbortSignal) => {
    if (message) {
      const response = await agentClient.post<{
        status: string;
        session_id: string;
        user_message_id: string;
        message_id: string
      }>("/chat/session", { message, context }, { signal });
      return response.data;
    }
    const response = await agentClient.post<{ session_id: string }>("/chat/session", null, { signal });
    return response.data;
  },

  listSessions: async (search?: string, limit: number = 20, offset: number = 0, signal?: AbortSignal) => {
    // Only cache the full list (no search/offset)
    if (!search && offset === 0 && listSessionsPromise) return listSessionsPromise;

    const fetchSessions = async () => {
      const response = await agentClient.get<ChatSession[]>('/chat/sessions', {
        params: { search, limit, offset },
        signal,
      });
      return response.data;
    };

    if (!search && offset === 0) {
      listSessionsPromise = (async () => {
        try {
          return await fetchSessions();
        } finally {
          setTimeout(() => {
            listSessionsPromise = null;
          }, 1000);
        }
      })();
      return listSessionsPromise;
    }

    return fetchSessions();
  },

  renameSession: async (sessionId: string, name: string, signal?: AbortSignal) => {
    const response = await agentClient.put(`/chat/sessions/${sessionId}`, null, {
      params: { name },
      signal,
    });
    return response.data;
  },

  deleteSession: async (sessionId: string, signal?: AbortSignal) => {
    const response = await agentClient.delete(`/chat/sessions/${sessionId}`, { signal });
    return response.data;
  },

  // Message Management
  listMessages: async (sessionId: string, signal?: AbortSignal) => {
    const response = await agentClient.get<AgentMessage[]>(`/chat/${sessionId}/messages`, { signal });
    return response.data;
  },

  sendChatMessage: async (sessionId: string, message: string, context?: any, signal?: AbortSignal) => {
    const response = await agentClient.post(`/chat/${sessionId}/chat`, {
      message,
      context,
    }, { signal });
    return response.data;
  },

  editChatMessage: async (sessionId: string, messageId: string, message: string, context?: any, signal?: AbortSignal) => {
    const response = await agentClient.put(`/chat/${sessionId}/messages/${messageId}`, {
      message,
      context,
    }, { signal });
    return response.data;
  },

  deleteChatMessage: async (sessionId: string, messageId: string, signal?: AbortSignal) => {
    const response = await agentClient.delete(`/chat/${sessionId}/messages/${messageId}`, { signal });
    return response.data;
  },

  retryChatMessage: async (sessionId: string, messageId: string, context?: any, signal?: AbortSignal) => {
    const response = await agentClient.post<{ status: string, message_id: string }>(`/chat/${sessionId}/retry/${messageId}`, {
      context
    }, { signal });
    return response.data;
  },

  // SSE Stream URL
  getStreamUrl: (sessionId: string) => {
    const baseURL = agentClient.defaults.baseURL || 'http://localhost:8000/api';
    return `${baseURL}/chat/${sessionId}/stream`;
  },
};
