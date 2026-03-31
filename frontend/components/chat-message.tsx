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
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-card border border-border/50 text-foreground rounded-bl-sm"
          )}
        >
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

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground/60 px-1">{timeStr}</span>
      </div>
    </div>
  );
}
