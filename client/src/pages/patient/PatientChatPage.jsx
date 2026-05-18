import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Bot, User, Loader2, MessageSquare, Trash2, Sparkles, HeartPulse, ShieldCheck } from "lucide-react";
import axiosInstance from "@/api/httpClient";
import { renderMarkdownText } from "@/utils/renderMarkdownText";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const WELCOME_MESSAGE =
  "Xin chào! Tôi là trợ lý ảo của DentaCare. Tôi có thể giúp bạn tìm hiểu dịch vụ nha khoa, hướng dẫn đặt lịch hẹn hoặc giải đáp thắc mắc về chăm sóc răng miệng. Bạn cần tôi hỗ trợ gì?";

let msgCounter = 0;
const newMsg = (role, content, extra = {}) => ({ id: ++msgCounter, role, content, ...extra });

const suggestedQuestions = [
  "Làm thế nào để đặt lịch hẹn?",
  "Giá các dịch vụ là bao nhiêu?",
  "Giờ làm việc của phòng khám?",
  "Địa chỉ phòng khám ở đâu?",
  "Chăm sóc răng miệng đúng cách",
  "Khi nào nên đi khám răng định kỳ?",
];

const STORAGE_KEY = "dentacare_chat";

const loadPersistedChat = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const persistChat = (messages, sessionId) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, sessionId }));
  } catch {
    // localStorage quota exceeded — silently ignore
  }
};

export default function PatientChatPage() {
  const persisted = loadPersistedChat();
  const [messages, setMessages] = useState(() => {
    if (persisted?.messages?.length > 1) return persisted.messages;
    return [newMsg("assistant", WELCOME_MESSAGE)];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => persisted?.sessionId || null);
  const [clearingHistory, setClearingHistory] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    persistChat(messages, sessionId);
  }, [messages, sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (message) => {
    const messageToSend = message || input.trim();
    if (!messageToSend || loading) return;

    setInput("");
    setMessages((prev) => [...prev, newMsg("user", messageToSend)]);
    setLoading(true);

    try {
      const response = await axiosInstance.post("/chat", { message: messageToSend, sessionId });
      const resData = response.data.data || response.data;
      if (!sessionId && resData.sessionId) setSessionId(resData.sessionId);
      setMessages((prev) => [
        ...prev,
        newMsg("assistant", resData.answer || resData.response || "Xin lỗi, tôi chưa nhận được phản hồi phù hợp.", {
          sources: resData.sources || [],
        }),
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Không thể gửi tin nhắn");
      setMessages((prev) => [
        ...prev,
        newMsg("assistant", "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau."),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = async () => {
    setClearingHistory(true);
    try {
      await axiosInstance.delete("/chat/history");
      const welcome = [newMsg("assistant", WELCOME_MESSAGE)];
      setMessages(welcome);
      setSessionId(null);
      localStorage.removeItem(STORAGE_KEY);
      toast.success("Đã xóa lịch sử hội thoại");
    } catch (error) {
      console.error("Clear history error:", error);
      toast.error("Không thể xóa lịch sử, vui lòng thử lại sau");
    } finally {
      setClearingHistory(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,#f7fdfe_0%,#e9f8fb_48%,#ffffff_100%)] p-5 shadow-xl shadow-cyan-950/8 sm:p-6 lg:p-7">
        <div className="absolute right-0 top-0 h-32 w-32 translate-x-10 -translate-y-10 rounded-full bg-primary/12 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <Badge className="mb-4 rounded-full border-primary/15 bg-primary/10 px-4 py-1.5 text-primary hover:bg-primary/10">
              Tư vấn AI
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Trợ lý DentaCare luôn sẵn sàng hỗ trợ</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Hỏi nhanh về dịch vụ, lịch hẹn và kiến thức chăm sóc răng miệng trong một cuộc trò chuyện thân thiện, dễ theo dõi.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <HeroMetric icon={MessageSquare} label="Gợi ý" value={`${suggestedQuestions.length} chủ đề`} />
            <HeroMetric icon={ShieldCheck} label="Nguồn" value="DentaCare" />
            <HeroMetric icon={HeartPulse} label="Mục tiêu" value="Dễ hiểu" />
          </div>
        </div>
      </div>

      <div className="grid min-h-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="flex h-[calc(100vh-230px)] min-h-[520px] flex-col overflow-hidden rounded-[28px] border-white/80 bg-white/95 shadow-xl shadow-cyan-950/8 xl:h-[calc(100vh-190px)]">
          <CardHeader className="shrink-0 border-b bg-[linear-gradient(135deg,hsl(var(--primary)/0.10),#ffffff_72%)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Trợ lý DentaCare</CardTitle>
                  <CardDescription className="text-xs">Sẵn sàng hỗ trợ thông tin nha khoa</CardDescription>
                </div>
              </div>

              {messages.length > 1 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" disabled={clearingHistory}>
                      {clearingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Xóa lịch sử hội thoại?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Toàn bộ cuộc trò chuyện sẽ bị xóa vĩnh viễn. Bạn có chắc chắn muốn tiếp tục?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Xóa lịch sử
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardHeader>

          <CardContent className="min-h-0 flex-1 p-0">
            <div ref={scrollRef} className="h-full min-h-0 overflow-y-auto overscroll-contain p-4">
              <div className="space-y-3">
                {messages.map((message) => (
                  <ChatBubble key={message.id} message={message} />
                ))}

                {loading && (
                  <div className="flex gap-3">
                    <AvatarIcon role="assistant" />
                    <div className="rounded-2xl bg-muted px-4 py-3">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>

          <div className="shrink-0 border-t bg-white/95 p-4 backdrop-blur-sm">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập câu hỏi của bạn..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={loading}
                className="field-input h-11 flex-1"
              />
              <Button
                size="icon"
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="h-11 w-11 shrink-0 rounded-full"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Gợi ý câu hỏi
              </CardTitle>
              <CardDescription>Chọn nhanh một chủ đề để bắt đầu.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {suggestedQuestions.map((question) => (
                <button
                  key={question}
                  onClick={() => handleSend(question)}
                  disabled={loading}
                  className="interactive-row flex w-full items-center gap-3 px-4 py-2 text-left disabled:opacity-50"
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm leading-snug">{question}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <AvatarIcon role={message.role} />
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
          isUser ? "bg-primary text-primary-foreground shadow-primary/15" : "bg-primary/8 text-foreground"
        }`}
      >
        <div className="whitespace-pre-line break-words">{renderMarkdownText(message.content)}</div>
        {!isUser && message.sources?.length > 0 && <SourceBadges sources={message.sources} />}
      </div>
    </div>
  );
}

function SourceBadges({ sources = [] }) {
  return (
    <div className="mt-3 flex max-w-full flex-wrap gap-1.5 overflow-hidden border-t border-border/60 pt-2">
      {sources.slice(0, 3).map((source, index) => (
        <Badge
          key={`${source.knowledgeId || source.title || source.source}-${index}`}
          variant="secondary"
          className="min-w-0 max-w-full overflow-hidden text-[11px]"
        >
          <span className="block max-w-full truncate">
            Nguồn: {source.title || source.source || source.category}
          </span>
        </Badge>
      ))}
    </div>
  );
}

function AvatarIcon({ role }) {
  const isUser = role === "user";
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
      {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
    </div>
  );
}

function HeroMetric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-white/85 p-4 shadow-sm backdrop-blur">
      <Icon className="mb-3 h-5 w-5 text-primary" />
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-bold text-slate-950">{value}</p>
    </div>
  );
}
