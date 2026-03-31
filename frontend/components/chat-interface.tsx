"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChatMessageItem } from "@/components/chat-message";
import { ProfilePanel } from "@/components/profile-panel";
import {
  Send,
  Bot,
  RotateCcw,
  Activity,
} from "lucide-react";
import type { ChatMessage, UserProfile, ChatResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEFAULT_PROFILE: UserProfile = {
  icr: 10,
  isf: 50,
  targetBg: 100,
};

const QUICK_PROMPTS = [
  "🍝 ¿Cuántos CH tiene un plato de fideos con salsa bolognesa (200g pasta)?",
  "🍕 Pizza de muzzarella, 2 porciones medianas",
  "🥝 Una naranja mediana y un yogur entero",
  "🍚 Arroz con pollo, porción de 250g",
  "🥐 Medialunas: 3 unidades + café con leche",
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "¡Hola! Soy **NutriAgent DM1**, tu asistente nutricional especializado en Diabetes Tipo 1.\n\nPuedo ayudarte a:\n• Calcular los carbohidratos de cualquier alimento o receta\n• Estimar el índice glucémico\n• Calcular tu dosis de insulina rápida\n\nConfigurá tu perfil de insulina en el panel lateral y contame **¿qué vas a comer?**",
  timestamp: new Date(),
};

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [currentBg, setCurrentBg] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      const loadingMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setInput("");
      setIsLoading(true);

      // Build history (exclude welcome and loading)
      const history = messages
        .filter((m) => m.id !== "welcome" && !m.isLoading)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            profile,
            currentBg: currentBg ? parseFloat(currentBg) : undefined,
            history,
          }),
        });

        const data: ChatResponse = await res.json();

        const assistantMsg: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: data.error
            ? `Lo siento, hubo un error: ${data.error}`
            : data.content,
          timestamp: new Date(),
          nutrition: data.nutrition,
          insulin: data.insulin,
        };

        setMessages((prev) => {
          const filtered = prev.filter((m) => !m.isLoading);
          return [...filtered, assistantMsg];
        });
      } catch {
        setMessages((prev) => {
          const filtered = prev.filter((m) => !m.isLoading);
          return [
            ...filtered,
            {
              id: generateId(),
              role: "assistant",
              content:
                "No pude conectarme con el servidor. Verificá tu conexión e intentá de nuevo.",
              timestamp: new Date(),
            },
          ];
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, profile, currentBg]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleReset = () => {
    setMessages([WELCOME_MESSAGE]);
    setInput("");
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col gap-3 border-r border-border/40 bg-sidebar/50 backdrop-blur-sm transition-all duration-300 overflow-y-auto p-3 scrollbar-hide",
          sidebarOpen ? "w-72 xl:w-80" : "w-0 overflow-hidden p-0 border-0"
        )}
      >
        {sidebarOpen && (
          <>
            {/* Brand */}
            <div className="flex items-center gap-2.5 px-1 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">NutriAgent</p>
                <p className="text-xs text-muted-foreground mt-0.5">DM1 Assistant</p>
              </div>
            </div>

            <ProfilePanel
              profile={profile}
              onProfileChange={setProfile}
              currentBg={currentBg}
              onCurrentBgChange={setCurrentBg}
            />

            {/* Quick prompts */}
            <div className="space-y-2">
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Consultas rápidas
              </p>
              <div className="space-y-1.5">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    disabled={isLoading}
                    className={cn(
                      "w-full text-left text-xs rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors leading-relaxed",
                      isLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="mt-auto text-xs text-muted-foreground/70 hover:text-muted-foreground gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Nueva consulta
            </Button>
          </>
        )}
      </aside>

      {/* Main chat area */}
      <main className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b border-border/40 bg-background/80 backdrop-blur-sm px-4 h-14 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </Button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-none truncate">NutriAgent DM1</p>
              <p className="text-xs text-muted-foreground">
                {isLoading ? (
                  <span className="flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                    Analizando...
                  </span>
                ) : (
                  "Especialista en nutrición para DM1"
                )}
              </p>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-6 space-y-5 scrollbar-hide"
        >
          {messages.map((msg) => (
            <ChatMessageItem key={msg.id} message={msg} />
          ))}
        </div>

        {/* Input area */}
        <div className="border-t border-border/40 bg-background/80 backdrop-blur-sm p-4">
          {/* Info bar */}
          <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground/60">
            <span>
              ICR: {profile.icr}g/U · ISF: {profile.isf} mg/U · Meta: {profile.targetBg} mg/dL
              {currentBg && ` · Glucemia: ${currentBg} mg/dL`}
            </span>
            <span className="hidden sm:inline">Shift+Enter para nueva línea</span>
          </div>

          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describí tu comida o receta... (ej: 'Voy a comer milanesa con puré, porción grande')"
              className="min-h-[52px] max-h-32 resize-none text-sm flex-1 scrollbar-hide"
              disabled={isLoading}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              size="icon"
              className="h-[52px] w-12 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
