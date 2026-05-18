import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import axiosInstance from "@/api/httpClient";

const ChatContext = createContext();

const streamStatusText = {
  retrieving: "AI đang tìm trong dữ liệu phòng khám...",
  checking_availability: "AI đang kiểm tra lịch trống...",
  generating: "AI đang soạn câu trả lời...",
};

const getApiUrl = (path) => `${axiosInstance.defaults.baseURL || ""}${path}`;

async function readChatStream(path, message, handlers = {}, signal) {
  const token = localStorage.getItem("token");
  const response = await fetch(getApiUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ message }),
    signal,
  });
  if (!response.ok || !response.body) throw new Error("STREAM_UNAVAILABLE");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";
      events.forEach((eventText) => {
        const line = eventText.split("\n").find((item) => item.startsWith("data: "));
        if (!line) return;
        const event = JSON.parse(line.slice(6));
        if (event.type === "state") handlers.onState?.(event.uiState);
        if (event.type === "sources") handlers.onSources?.(event.sources || []);
        if (event.type === "token") handlers.onToken?.(event.token || "");
        if (event.type === "done") handlers.onDone?.(event);
        if (event.type === "error") throw new Error(event.message || "STREAM_ERROR");
      });
    }
  } finally {
    reader.releaseLock();
  }
}

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uiState, setUiState] = useState("retrieving");
  const activeRequestRef = useRef(null);
  const streamAbortRef = useRef(null);

  useEffect(() => () => {
    streamAbortRef.current?.abort();
  }, []);

  const updateAssistant = (assistantId, updater) => {
    setMessages((prev) => prev.map((item) => item.id === assistantId ? updater(item) : item));
  };

  const sendMessage = async (content) => {
    setIsLoading(true);
    setUiState("retrieving");
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const assistantId = `${requestId}-assistant`;
    activeRequestRef.current = requestId;
    streamAbortRef.current?.abort();
    const controller = new AbortController();
    streamAbortRef.current = controller;

    setMessages((prev) => [
      ...prev,
      { id: `${requestId}-user`, role: "user", content, sentAt: new Date() },
      { id: assistantId, role: "assistant", content: "", sources: [], quickReplies: [], sentAt: new Date() },
    ]);

    try {
      let hasStreamToken = false;
      try {
        await readChatStream("/chat/stream", content, {
          onState: (state) => {
            if (activeRequestRef.current === requestId) setUiState(state);
          },
          onSources: (sources) => {
            if (activeRequestRef.current !== requestId) return;
            updateAssistant(assistantId, (item) => ({ ...item, sources }));
          },
          onToken: (token) => {
            if (activeRequestRef.current !== requestId) return;
            if (token) hasStreamToken = true;
            updateAssistant(assistantId, (item) => ({ ...item, content: `${item.content || ""}${token}` }));
          },
          onDone: (event) => {
            if (activeRequestRef.current !== requestId) return;
            updateAssistant(assistantId, (item) => {
              const currentContent = item.content || "";
              const finalAnswer = event.answer || "";
              const shouldUseFinalAnswer = !currentContent && finalAnswer;
              return {
                ...item,
                content: shouldUseFinalAnswer ? finalAnswer : currentContent,
                sources: event.sources || [],
                quickReplies: event.quickReplies || [],
                bookingAssist: event.bookingAssist,
              };
            });
          },
        }, controller.signal);
      } catch (streamError) {
        if (hasStreamToken) {
          throw streamError;
        }
        const response = await axiosInstance.post("/chat", { message: content });
        const data = response.data.data || response.data || {};
        if (activeRequestRef.current !== requestId) return;
        updateAssistant(assistantId, (item) => ({
          ...item,
          content: data.answer || "Xin lỗi, tôi chưa nhận được phản hồi.",
          sources: data.sources || [],
          quickReplies: data.quickReplies || [],
          bookingAssist: data.bookingAssist,
        }));
      }
    } catch (error) {
      console.error("Chat error:", error);
      if (activeRequestRef.current !== requestId) return;
      updateAssistant(assistantId, (item) => ({
        ...item,
        content: item.content || "Xin lỗi, đã có lỗi xảy ra khi kết nối với trợ lý AI.",
      }));
    } finally {
      if (activeRequestRef.current === requestId) {
        setIsLoading(false);
        setUiState("retrieving");
        streamAbortRef.current = null;
      }
    }
  };

  const clearChat = () => setMessages([]);

  return (
    <ChatContext.Provider value={{ messages, isLoading, uiState, streamStatusText, sendMessage, clearChat }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
