"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { NutritionCard } from "@/components/nutrition-card";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessage;
}

// Simple markdown-to-JSX for bold (**text**) and line breaks
function renderContent(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    // Bold
    const parts = line.split(/\*\*(.*?)\*\*/g);
    const rendered = parts.map((part, j) =>
      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
    );
    return (
      <span key={i}>
        {rendered}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="typing-dot h-2 w-2 rounded-full bg-primary/60 inline-block" />
      <span className="typing-dot h-2 w-2 rounded-full bg-primary/60 inline-block" />
      <span className="typing-dot h-2 w-2 rounded-full bg-primary/60 inline-block" />
    </div>
  );
}

export function ChatMessageItem({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  const timeStr = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(message.timestamp));

  return (
    <div
      className={cn(
        "flex gap-3 animate-fade-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0 mt-1">
        <AvatarFallback
          className={cn(
            "text-xs",
            isUser
              ? "bg-secondary text-secondary-foreground"
              : "bg-primary/15 text-primary"
          )}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Message bubble + cards */}
      <div
        className={cn(
          "flex flex-col gap-2 max-w-[80%] xl:max-w-[70%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm overflow-hidden",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-card border border-border/50 text-foreground rounded-bl-sm"
          )}
        >
          {message.image && (
            <div className="mb-3 rounded-lg overflow-hidden border border-border/20 bg-background/20">
              <img
                src={message.image}
                alt="Uploaded food"
                className="max-h-64 w-full object-cover"
              />
            </div>
          )}
          {message.isLoading ? (
            <TypingIndicator />
          ) : (
            <div className="whitespace-pre-wrap">
              {renderContent(message.content)}
            </div>
          )}
        </div>

        {/* Nutrition + Insulin card (assistant only) */}
        {!isUser && (message.nutrition || message.insulin) && (
          <div className="w-full max-w-sm">
            <NutritionCard nutrition={message.nutrition} insulin={message.insulin} />
          </div>
        )}

        {/* Footer (Timestamp + Usage) */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground/60" suppressHydrationWarning>{timeStr}</span>
          {!isUser && message.usage && message.usage.total_tokens > 0 && (
            <span 
              className="text-[10px] text-muted-foreground/50 font-mono bg-muted/40 px-1.5 py-0.5 rounded cursor-help transition-colors hover:bg-muted/60" 
              title={`Prompt: ${message.usage.prompt_tokens} | Completion: ${message.usage.completion_tokens}`}
            >
              ⚡ {message.usage.total_tokens} tkns
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
