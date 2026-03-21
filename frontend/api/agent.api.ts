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

export const agentApi = {
  // Session Management
  createSession: async () => {
    const response = await agentClient.post<{ session_id: string }>('/chat/session');
    return response.data;
  },

  listSessions: async () => {
    const response = await agentClient.get<ChatSession[]>('/chat/sessions');
    return response.data;
  },

  renameSession: async (sessionId: string, name: string) => {
    const response = await agentClient.put(`/chat/sessions/${sessionId}`, null, {
      params: { name },
    });
    return response.data;
  },

  deleteSession: async (sessionId: string) => {
    const response = await agentClient.delete(`/chat/sessions/${sessionId}`);
    return response.data;
  },

  // Message Management
  listMessages: async (sessionId: string) => {
    const response = await agentClient.get<AgentMessage[]>(`/chat/${sessionId}/messages`);
    return response.data;
  },

  sendChatMessage: async (sessionId: string, message: string, current_context?: any) => {
    const response = await agentClient.post(`/chat/${sessionId}/chat`, {
      message,
      current_context,
    });
    return response.data;
  },

  editChatMessage: async (sessionId: string, messageId: string, message: string, current_context?: any) => {
    const response = await agentClient.put(`/chat/${sessionId}/messages/${messageId}`, {
      message,
      current_context,
    });
    return response.data;
  },

  deleteChatMessage: async (sessionId: string, messageId: string) => {
    const response = await agentClient.delete(`/chat/${sessionId}/messages/${messageId}`);
    return response.data;
  },

  retryChatMessage: async (sessionId: string, messageId: string) => {
    const response = await agentClient.post<{ status: string, message_id: string }>(`/chat/${sessionId}/retry/${messageId}`);
    return response.data;
  },

  // SSE Stream URL
  getStreamUrl: (sessionId: string) => {
    const baseURL = agentClient.defaults.baseURL || 'http://localhost:8000/api';
    return `${baseURL}/chat/${sessionId}/stream`;
  },
};
