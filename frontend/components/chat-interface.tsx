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
  correctionThreshold: 100,
  rounding: 0.1,
};

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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [currentBg, setCurrentBg] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load profile from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem("dm1-profile");
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setProfile({ ...DEFAULT_PROFILE, ...parsed });
      } catch (e) {
        console.warn("Could not parse saved profile", e);
      }
    }
  }, []);

  // Save profile to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("dm1-profile", JSON.stringify(profile));
  }, [profile]);

  // BG Auto-update every 60 seconds
  useEffect(() => {
    const fetchBg = async () => {
      try {
        const res = await fetch("/api/glucose");
        if (res.ok) {
          const data = await res.json();
          if (data.sgv) {
            setCurrentBg(data.sgv.toString());
          }
        }
      } catch (e) {
        console.error("Interval glucose fetch failed", e);
      }
    };

    fetchBg(); // Initial fetch
    const interval = setInterval(fetchBg, 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string, imageToUpload?: string | null) => {
      const trimmed = text.trim();
      const currentImage = imageToUpload || selectedImage;

      if (!trimmed && !currentImage) return;
      if (isLoading) return;

      setIsLoading(true);

      // ── Step 0: Auto-fetch latest glucose ──
      let latestBg = currentBg;
      try {
        const glucoseRes = await fetch("/api/glucose");
        if (glucoseRes.ok) {
          const glucoseData = await glucoseRes.json();
          if (glucoseData.sgv) {
            latestBg = glucoseData.sgv.toString();
            setCurrentBg(latestBg);
          }
        }
      } catch (e) {
        console.error("Auto-sync glucose failed, using last known value", e);
      }

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: trimmed,
        image: currentImage || undefined,
        timestamp: new Date(),
      };

      const assistantId = generateId();
      const loadingMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setInput("");
      setSelectedImage(null);

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
            currentBg: latestBg ? parseFloat(latestBg) : undefined,
            imageData: currentImage ? currentImage : undefined,
            history,
          }),
        });


        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          let descriptiveError = "Ocurrió un problema de conexión.";
          
          if (res.status === 429) {
            descriptiveError = "Has alcanzado el límite de mensajes permitidos o de capacidad de la IA. Por favor, espera un momento antes de continuar.";
          } else if (res.status === 401 || res.status === 403) {
            descriptiveError = "Error de autenticación con el proveedor de IA. Verifica las claves API.";
          } else if (errorData.details?.error?.message) {
            descriptiveError = errorData.details.error.message;
          } else if (errorData.error) {
            descriptiveError = errorData.error;
          }
          
          throw new Error(descriptiveError);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader available");

        const decoder = new TextDecoder();
        let assistantContent = "";
        let nutritionData: any = undefined;
        let insulinData: any = undefined;
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Save the partial last line

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            try {
              const parsed = JSON.parse(trimmedLine);
              let hasNewData = false;

              if (parsed.metadata) {
                nutritionData = parsed.metadata.nutrition;
                insulinData = parsed.metadata.insulin;
                hasNewData = true;
              }
              if (parsed.text) {
                assistantContent += parsed.text;
                hasNewData = true;
              }
              
              if (hasNewData) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { 
                          ...m, 
                          content: assistantContent, 
                          nutrition: nutritionData, 
                          insulin: insulinData,
                          isLoading: false // Stop typing indicator once we have content
                        }
                      : m
                  )
                );
              }
            } catch (e) {
              console.error("Error parsing stream line", e, trimmedLine);
            }
          }
        }
      } catch (error: any) {
        console.error("Streaming error:", error);
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== assistantId || (m.content !== "" && m.id === assistantId));
          // If we had NO content yet, replace the loading message with the error
          // If we had SOME content, append a new error message
          return [
            ...filtered.map(m => m.id === assistantId ? { ...m, isLoading: false } : m),
            {
              id: generateId(),
              role: "assistant",
              content: `⚠️ **Error**: ${error.message || "No pude conectarme con el servidor. Verificá tu conexión e intentá de nuevo."}`,
              timestamp: new Date(),
            },
          ];
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, profile, currentBg, selectedImage]
  );


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("La imagen es demasiado pesada (máximo 10MB)");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    setMessages([WELCOME_MESSAGE]);
    setInput("");
    setSelectedImage(null);
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
            />

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
        <div className="border-t border-border/40 bg-background/80 backdrop-blur-sm p-4 relative">
          {/* Image preview */}
          {selectedImage && (
            <div className="absolute bottom-[calc(100%+1rem)] left-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
              <div className="relative h-24 w-24 rounded-lg border border-border/80 shadow-md bg-card group overflow-hidden">
                <img
                  src={selectedImage}
                  alt="preview"
                  className="h-full w-full object-cover"
                />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="text-sm font-bold">×</span>
                </button>
              </div>
            </div>
          )}

          {/* Info bar */}
          <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground/60">
            <span>
              ICR: {profile.icr}g/U · ISF: {profile.isf} mg/U · Meta: {profile.targetBg} mg/dL
              {currentBg && ` · Glucemia: ${currentBg} mg/dL`}
            </span>
            <span className="hidden sm:inline">Shift+Enter para nueva línea</span>
          </div>

          <div className="flex gap-2 items-end">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={isLoading}
            />
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "h-[52px] w-12 shrink-0 border-border/40",
                selectedImage && "text-primary border-primary/40 bg-primary/5"
              )}
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
                <line x1="16" x2="22" y1="5" y2="5" />
                <line x1="19" x2="19" y1="2" y2="8" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </Button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedImage
                  ? "Describí esta imagen..."
                  : "Describí tu comida o receta... (ej: 'Voy a comer milanesa con puré, porción grande')"
              }
              className="min-h-[52px] max-h-32 resize-none text-sm flex-1 scrollbar-hide focus-visible:ring-primary/20"
              disabled={isLoading}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={isLoading || (!input.trim() && !selectedImage)}
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
