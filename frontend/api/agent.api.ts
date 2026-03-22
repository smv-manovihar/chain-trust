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
  createSession: async (signal?: AbortSignal) => {
    const response = await agentClient.post<{ session_id: string }>('/chat/session', null, { signal });
    return response.data;
  },

  listSessions: async (signal?: AbortSignal) => {
    if (listSessionsPromise) return listSessionsPromise;

    listSessionsPromise = (async () => {
      try {
        const response = await agentClient.get<ChatSession[]>('/chat/sessions', { signal });
        return response.data;
      } finally {
        setTimeout(() => {
          listSessionsPromise = null;
        }, 1000);
      }
    })();

    return listSessionsPromise;
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

  sendChatMessage: async (sessionId: string, message: string, current_context?: any, signal?: AbortSignal) => {
    const response = await agentClient.post(`/chat/${sessionId}/chat`, {
      message,
      current_context,
    }, { signal });
    return response.data;
  },

  editChatMessage: async (sessionId: string, messageId: string, message: string, current_context?: any, signal?: AbortSignal) => {
    const response = await agentClient.put(`/chat/${sessionId}/messages/${messageId}`, {
      message,
      current_context,
    }, { signal });
    return response.data;
  },

  deleteChatMessage: async (sessionId: string, messageId: string, signal?: AbortSignal) => {
    const response = await agentClient.delete(`/chat/${sessionId}/messages/${messageId}`, { signal });
    return response.data;
  },

  retryChatMessage: async (sessionId: string, messageId: string, signal?: AbortSignal) => {
    const response = await agentClient.post<{ status: string, message_id: string }>(`/chat/${sessionId}/retry/${messageId}`, {}, { signal });
    return response.data;
  },

  // SSE Stream URL
  getStreamUrl: (sessionId: string) => {
    const baseURL = agentClient.defaults.baseURL || 'http://localhost:8000/api';
    return `${baseURL}/chat/${sessionId}/stream`;
  },
};
