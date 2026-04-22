import heroImg from "../../assets/hero.png";
import { Send, User, Bot, Loader2, Plus, MessageSquare, Copy, Check } from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { getAiConfig, type PublicAiConfig } from "../../services/api/public";
import {
  createChatSession,
  getChatSessions,
  getChatMessages,
  sendChatMessageStream,
  type ChatSession,
  type ChatMessage,
} from "../../services/api/chat";
import clsx from "clsx";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";

function CodeBlock({ children, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  const handleCopy = () => {
    const text = codeRef.current?.innerText || "";
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 p-1.5 rounded-lg bg-slate-800/50 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700/50"
        title="复制代码"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre ref={codeRef} {...props}>
        {children}
      </pre>
    </div>
  );
}

// 简单获取或生成本地设备 ID
function getClientId() {
  let id = localStorage.getItem("blog_client_id");
  if (!id) {
    id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem("blog_client_id", id);
  }
  return id;
}

export function AiPage() {
  const [aiConfig, setAiConfig] = useState<PublicAiConfig | null>(null);
  const clientId = useMemo(() => getClientId(), []);

  // 状态管理
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [model, setModel] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // 配置与模型列表
  const models = useMemo(
    () => (aiConfig?.models?.length ? aiConfig.models : [{ id: "qwen-plus", label: "通义千问-Plus" }]),
    [aiConfig]
  );
  const quickPrompts = useMemo(
    () =>
      aiConfig?.quickPrompts?.length
        ? aiConfig.quickPrompts
        : ["介绍一下你自己", "你有哪些技能栈", "推荐最火的博客"],
    [aiConfig]
  );

  // 初始化加载
  useEffect(() => {
    getAiConfig().then(setAiConfig).catch(console.error);
    getChatSessions(clientId).then((data) => {
      setSessions(data);
      if (data.length > 0) {
        // 优先从 localStorage 恢复上一次的会话 ID
        const lastSessionId = localStorage.getItem("last_chat_session_id");
        const found = data.find(s => s.id === lastSessionId);
        
        if (found) {
          setCurrentSessionId(found.id);
          setModel(found.model);
        } else {
          setCurrentSessionId(data[0].id);
          setModel(data[0].model);
        }
      }
    }).catch(console.error);
  }, [clientId]);

  // 加载消息
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem("last_chat_session_id", currentSessionId);
      getChatMessages(currentSessionId).then(setMessages).catch(console.error);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  // 自动滚动
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 发送消息
  const handleSend = async (content: string = text) => {
    if (!content.trim() || loading) return;

    let sessionId = currentSessionId;
    setLoading(true);

    try {
      // 1. 如果没有会话，先创建一个
      if (!sessionId) {
        const newSession = await createChatSession({
          clientId,
          model: model || models[0].id,
          title: content.substring(0, 15),
        });
        sessionId = newSession.id;
        setCurrentSessionId(sessionId);
        setSessions([newSession, ...sessions]);
      }

      // 2. 乐观更新本地 UI
      const userMsg: ChatMessage = {
        id: "temp-" + Date.now(),
        sessionId: sessionId,
        role: "user",
        content: content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setText("");

      // 3. 调用流式 API
      const assistantId = "ai-" + Date.now();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        sessionId: sessionId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      const stream = sendChatMessageStream(sessionId, content);
      for await (const chunk of stream) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: msg.content + chunk } : msg
          )
        );
      }
    } catch (error) {
      console.error("发送失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setText("");
    if (models.length > 0) setModel(models[0].id);
  };

  const selectedModel = useMemo(() => {
    if (model && models.some((m) => m.id === model)) return model;
    return models[0]?.id ?? "";
  }, [model, models]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-5xl mx-auto">
      <div className="mb-4 text-center">
        <div className="bg-gradient-to-r from-fuchsia-600 to-blue-600 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
          {aiConfig?.title ?? "扶桑 AI"}
        </div>
        <div className="mt-1 text-xs text-slate-500">{aiConfig?.subtitle ?? "基于知识库和博客的智能问答"}</div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* 侧边栏：历史会话 */}
        <div className="hidden md:flex flex-col w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
          <button
            onClick={startNewChat}
            className="flex items-center justify-center gap-2 w-full py-2 mb-4 rounded-xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            开启新对话
          </button>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setCurrentSessionId(s.id)}
                className={clsx(
                  "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left text-sm transition-all",
                  currentSessionId === s.id
                    ? "bg-blue-50 text-blue-700 font-medium shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <MessageSquare className="h-4 w-4 shrink-0 opacity-60" />
                <span className="truncate">{s.title || "新对话"}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 主聊天区 */}
        <div className="flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
          {/* 消息展示区 */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar"
          >
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-10">
                <img src={heroImg} alt="avatar" className="h-16 w-16 rounded-full object-cover shadow-md" />
                <div className="mt-4 text-lg font-semibold text-slate-900">你好，我是扶桑 AI</div>
                <div className="mt-1 text-sm text-slate-500">你可以问我关于技术、博客或任何你想了解的问题</div>
                <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-md">
                  {quickPrompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => handleSend(p)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={clsx(
                    "flex gap-4",
                    m.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={clsx(
                    "h-9 w-9 shrink-0 rounded-full flex items-center justify-center shadow-sm",
                    m.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                  )}>
                    {m.role === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                  </div>
                  <div className={clsx(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "user" 
                      ? "bg-blue-600 text-white rounded-tr-none shadow-blue-200" 
                      : "bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100 markdown-content"
                  )}>
                    {m.role === "user" ? (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    ) : (
                      <div className="markdown">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            pre: CodeBlock
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex gap-4">
                <div className="h-9 w-9 shrink-0 rounded-full bg-slate-100 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-slate-400" />
                </div>
                <div className="bg-slate-50 rounded-2xl rounded-tl-none px-4 py-3 border border-slate-100">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                </div>
              </div>
            )}
          </div>

          {/* 输入框区域 */}
          <div className="border-t border-slate-100 px-4 py-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <select
                className="hidden sm:block h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-blue-500 outline-none"
                value={selectedModel}
                onChange={(e) => setModel(e.target.value)}
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>

              <div className="relative flex-1">
                <input
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-4 pr-12 text-sm text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="有什么可以帮到您的？"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={loading || !text.trim()}
                  className="absolute right-1.5 top-1.5 h-8 w-8 inline-flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
