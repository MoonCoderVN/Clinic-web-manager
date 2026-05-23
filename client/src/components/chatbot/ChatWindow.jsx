import React, { useState, useRef, useEffect } from "react";
import { useChat } from "../../context/ChatContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { Send, User, Bot, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { renderMarkdownText } from "../../utils/renderMarkdownText";

const suggestedQuestions = [
  "Làm thế nào để đặt lịch hẹn?",
  "Giá dịch vụ nha khoa là bao nhiêu?",
  "Bác sĩ Cường chiều thứ 7 còn lịch không?",
];

const ChatWindow = () => {
  const { messages, sendMessage, isLoading, uiState, streamStatusText } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-primary/5 flex items-center gap-2">
        <Bot className="text-primary h-6 w-6" />
        <div>
          <h3 className="font-bold">Trợ lý Nha khoa AI</h3>
          <p className="text-xs text-slate-500">Tư vấn và kiểm tra lịch 24/7</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <Bot className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-sm">Chào bạn! Tôi có thể hỗ trợ bạn về dịch vụ, lịch hẹn và chăm sóc răng miệng.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {suggestedQuestions.map((question) => (
                <Button key={question} type="button" variant="outline" size="sm" onClick={() => sendMessage(question)}>
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={msg.id || i} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              msg.role === "user" ? "bg-primary text-white" : "bg-white border text-slate-500")}>
              {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={cn("max-w-[80%] p-3 rounded-2xl text-sm shadow-sm",
              msg.role === "user" ? "bg-primary text-white rounded-tr-none" : "bg-white border rounded-tl-none")}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="break-words cursor-default">
                    {msg.content ? renderMarkdownText(msg.content) : (
                      <span className="text-slate-500">{streamStatusText?.[uiState] || "AI đang xử lý..."}</span>
                    )}
                  </div>
                </TooltipTrigger>
                {msg.role === "assistant" && msg.sources?.length > 0 && (
                  <TooltipContent side="top" className="bg-white border shadow-lg text-foreground p-2 max-w-xs flex flex-wrap gap-1.5">
                    {msg.sources.slice(0, 3).map((source, index) => (
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
                  </TooltipContent>
                )}
              </Tooltip>
              {msg.role === "assistant" && msg.quickReplies?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 border-t pt-2">
                  {msg.quickReplies.slice(0, 3).map((reply, index) => (
                    <Button
                      key={`${reply.label}-${index}`}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-full px-3 text-xs"
                      onClick={() => reply.url ? window.location.assign(reply.url) : sendMessage(reply.value || reply.label)}
                      disabled={isLoading}
                    >
                      {reply.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center">
              <Bot size={16} className="text-slate-500" />
            </div>
            <div className="bg-white border p-3 rounded-2xl rounded-tl-none shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                <span>{streamStatusText?.[uiState] || "AI đang xử lý..."}</span>
              </div>
              <div className="mt-2 flex gap-1.5">
                <span className="h-1.5 w-10 animate-pulse rounded-full bg-slate-200" />
                <span className="h-1.5 w-7 animate-pulse rounded-full bg-slate-200" />
                <span className="h-1.5 w-12 animate-pulse rounded-full bg-slate-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t bg-white flex gap-2">
        <Input
          placeholder="Nhập câu hỏi của bạn..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={!input.trim() || isLoading} size="icon">
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
};

export default ChatWindow;
