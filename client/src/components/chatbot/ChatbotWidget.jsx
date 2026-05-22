import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, X, Send, Bot, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import axiosInstance from "@/api/httpClient";
import { renderMarkdownText } from "@/utils/renderMarkdownText";

const suggestedQuestions = [
  "Tôi muốn đặt lịch khám",
  "Chi phí niềng răng?",
  "Bác sĩ nào sáng thứ 2 có lịch?",
];

const initialMessages = [
  {
    id: "1",
    role: "assistant",
    content:
      "Xin chào! Tôi là trợ lý AI của DentaCare. Tôi có thể giúp bạn tìm hiểu dịch vụ nha khoa, kiểm tra lịch trống và giải đáp thắc mắc về chăm sóc răng miệng.",
  },
];

const streamStatusText = {
  retrieving: "AI đang tìm trong dữ liệu phòng khám...",
  checking_availability: "AI đang kiểm tra lịch trống...",
  generating: "AI đang soạn câu trả lời...",
};

const getApiUrl = (path) => `${axiosInstance.defaults.baseURL || ""}${path}`;

async function readChatStream(path, message, history = [], handlers = {}, signal, bookingContext = null, extraHeaders = {}) {
  const response = await fetch(getApiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    credentials: "include",
    body: JSON.stringify({ message, history, ...(bookingContext ? { bookingContext } : {}) }),
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

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [uiState, setUiState] = useState("retrieving");
  const [bookingContext, setBookingContext] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const activeRequestRef = useRef(null);
  const streamAbortRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  useEffect(() => () => {
    streamAbortRef.current?.abort();
  }, []);

  const updateAssistant = (assistantId, updater) => {
    setMessages((prev) => prev.map((item) => item.id === assistantId ? updater(item) : item));
  };

  const buildPublicHistory = () =>
    messages
      .filter((message) => ["user", "assistant"].includes(message.role) && message.content)
      .map((message) => ({ role: message.role, content: message.content }))
      .slice(-6);

  const handleSend = async (text, overrideBookingContext) => {
    const messageText = text || input.trim();
    if (!messageText || isTyping) return;
    const history = buildPublicHistory();
    const activeBookingContext = overrideBookingContext !== undefined ? overrideBookingContext : bookingContext;

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const assistantId = `${requestId}-assistant`;
    activeRequestRef.current = requestId;
    streamAbortRef.current?.abort();
    const controller = new AbortController();
    streamAbortRef.current = controller;

    setMessages((prev) => [
      ...prev,
      { id: `${requestId}-user`, role: "user", content: messageText },
      { id: assistantId, role: "assistant", content: "", sources: [], quickReplies: [] },
    ]);
    setInput("");
    setIsTyping(true);
    setUiState("retrieving");

    try {
      const token = localStorage.getItem("token");
      const streamPath = token ? "/chat/stream" : "/chat/public/stream";
      const fallbackPath = token ? "/chat" : "/chat/public";
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      let hasStreamToken = false;
      try {
        await readChatStream(streamPath, messageText, history, {
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
            // Reset booking context when server responds with no booking step
            if (!event.bookingAssist?.step) setBookingContext(null);
            updateAssistant(assistantId, (item) => {
              const currentContent = item.content || "";
              const finalAnswer = event.answer || "";
              const shouldUseFinalAnswer = !currentContent && finalAnswer;
              return {
                ...item,
                content: shouldUseFinalAnswer ? finalAnswer : currentContent,
                sources: event.sources || item.sources || [],
                quickReplies: event.quickReplies || [],
                bookingAssist: event.bookingAssist,
              };
            });
          },
        }, controller.signal, activeBookingContext, authHeaders);
      } catch (streamError) {
        if (hasStreamToken) {
          throw streamError;
        }
        const res = await axiosInstance.post(fallbackPath, { message: messageText, history, ...(activeBookingContext ? { bookingContext: activeBookingContext } : {}) });
        const data = res.data?.data || res.data || {};
        if (activeRequestRef.current !== requestId) return;
        if (!data.bookingAssist?.step) setBookingContext(null);
        updateAssistant(assistantId, (item) => ({
          ...item,
          content: data.answer || "Xin lỗi, tôi chưa nhận được phản hồi.",
          sources: data.sources || [],
          quickReplies: data.quickReplies || [],
          bookingAssist: data.bookingAssist,
        }));
      }
    } catch (err) {
      console.error("ChatbotWidget error:", err);
      if (activeRequestRef.current !== requestId) return;
      updateAssistant(assistantId, (item) => ({
        ...item,
        content: item.content || "Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại hoặc gọi hotline 028-1234-5678.",
      }));
    } finally {
      if (activeRequestRef.current === requestId) {
        setIsTyping(false);
        setUiState("retrieving");
        streamAbortRef.current = null;
      }
    }
  };

  const handleQuickReply = (reply) => {
    let nextBookingContext = bookingContext;
    if (reply.bookingData) {
      if (reply.bookingData.reset) {
        nextBookingContext = null;
        setBookingContext(null);
      } else {
        nextBookingContext = { ...(bookingContext || {}), ...reply.bookingData };
        setBookingContext(nextBookingContext);
      }
    }
    if (reply.url) {
      window.location.assign(reply.url);
    } else {
      handleSend(reply.value || reply.label, nextBookingContext);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed right-5 bottom-5 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/10 transition-all hover:scale-105 hover:shadow-xl sm:right-6 sm:bottom-6 sm:h-14 sm:w-14",
          isOpen && "hidden"
        )}
        aria-label="Mở chat"
      >
        <MessageCircle className="h-5 w-5 relative sm:h-6 sm:w-6" />
      </button>

      <div
        className={cn(
          "fixed right-4 bottom-4 z-[60] w-[calc(100vw-2rem)] transform transition-all duration-300 sm:right-6 sm:bottom-6 sm:w-[400px] sm:max-w-[calc(100vw-48px)]",
          isOpen
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-4 scale-95 opacity-0"
        )}
      >
        <Card className="flex h-[min(520px,calc(100dvh-2rem))] flex-col overflow-hidden rounded-2xl shadow-2xl">
          <CardHeader className="flex flex-row items-center gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
            <Avatar className="h-10 w-10 border-2 border-primary-foreground/20">
              <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
                <Bot className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-base font-semibold">Trợ lý AI DentaCare</CardTitle>
              <p className="text-xs text-primary-foreground/70">Sẵn sàng tư vấn và kiểm tra lịch</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0">
            <div className="h-full overflow-y-auto scroll-smooth" ref={scrollRef}>
              <div className="flex flex-col gap-4 p-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "border bg-card text-card-foreground shadow-sm"
                      )}
                    >
                      {message.content ? renderMarkdownText(message.content) : (
                        <span className="text-muted-foreground">{streamStatusText[uiState] || "AI đang xử lý..."}</span>
                      )}
                      {message.role === "assistant" && message.sources?.length > 0 && (
                        <div className="mt-3 flex max-w-full flex-wrap gap-1.5 overflow-hidden border-t border-border/60 pt-2">
                          {message.sources.slice(0, 3).map((source, index) => (
                            <Badge
                              key={`${source.knowledgeId || source.title || source.source}-${index}`}
                              variant="secondary"
                              className="min-w-0 max-w-full overflow-hidden text-[10px]"
                            >
                              <span className="block max-w-full truncate">
                                Nguồn: {source.title || source.source || source.category}
                              </span>
                            </Badge>
                          ))}
                        </div>
                      )}
                      {message.role === "assistant" && message.quickReplies?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-2">
                          {message.quickReplies.slice(0, 8).map((reply, index) => (
                            <button
                              key={`${reply.label}-${index}`}
                              onClick={() => handleQuickReply(reply)}
                              disabled={isTyping}
                              className="rounded-full border bg-background px-3 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                            >
                              {reply.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isTyping && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>{streamStatusText[uiState] || "AI đang xử lý..."}</span>
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        <span className="h-1.5 w-10 animate-pulse rounded-full bg-muted" />
                        <span className="h-1.5 w-7 animate-pulse rounded-full bg-muted" />
                        <span className="h-1.5 w-12 animate-pulse rounded-full bg-muted" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>

          {messages.length <= 2 && (
            <div className="border-t bg-muted/30 px-4 py-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Câu hỏi gợi ý:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    disabled={isTyping}
                    className="rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t p-3">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập tin nhắn..."
                className="flex-1"
                disabled={isTyping}
              />
              <Button size="icon" onClick={() => handleSend()} disabled={!input.trim() || isTyping}>
                {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
