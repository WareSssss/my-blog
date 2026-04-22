import { apiGet } from './http';

export type ChatSession = {
  id: string;
  clientId: string | null;
  model: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    messages: number;
  };
};

export type ChatMessage = {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: any;
  createdAt: string;
};

export function createChatSession(data: { clientId?: string; model: string; title?: string }) {
  return fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/public/chat/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then((res) => res.json() as Promise<ChatSession>);
}

export function getChatSessions(clientId: string) {
  return apiGet<ChatSession[]>(`/api/public/chat/sessions?clientId=${encodeURIComponent(clientId)}`);
}

export function getChatMessages(sessionId: string) {
  return apiGet<ChatMessage[]>(`/api/public/chat/sessions/${sessionId}/messages`);
}

export function sendChatMessage(sessionId: string, content: string) {
  return fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/public/chat/sessions/${sessionId}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  }).then((res) => res.json() as Promise<{ content: string; usage?: any }>);
}

export async function* sendChatMessageStream(sessionId: string, content: string) {
  const url = `${import.meta.env.VITE_API_BASE_URL || ''}/api/public/chat/sessions/${sessionId}/stream?content=${encodeURIComponent(content)}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('流式请求失败');
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) return;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    // SSE 格式通常是 data: {"content":"xxx"}\n\n
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const jsonStr = line.replace('data: ', '');
          const data = JSON.parse(jsonStr);
          if (data.content) {
            yield data.content;
          }
        } catch (e) {
          // 忽略非 JSON 行
        }
      }
    }
  }
}
