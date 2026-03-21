export interface AgentSession {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CompositeToolThought {
  tool: string;
  message?: string;
  input?: Record<string, any>;
  result?: any;
  status: 'running' | 'completed' | 'failed';
  execution_time_ms?: number;
  tool_call_id?: string;
  run_id?: string;
}

export interface AgentMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  thoughts?: CompositeToolThought[];
  status: 'generating' | 'completed' | 'error';
  edited: boolean;
  created_at: string;
  updated_at: string;
}

export type AgentSSEEvent = {
  type: 'token' | 'tool_start' | 'tool_end' | 'done' | 'error' | 'name_updated' | 'messages_deleted' | 'partial_response';
  message_id?: string;
  [key: string]: any;
};
