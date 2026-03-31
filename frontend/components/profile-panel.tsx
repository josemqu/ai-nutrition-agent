"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Settings2, Droplets, Target, Zap, ChevronDown, ChevronUp, Activity, RotateCcw } from "lucide-react";

import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProfilePanelProps {
  profile: UserProfile;
  onProfileChange: (profile: UserProfile) => void;
  currentBg: string;
}

/** A numeric input that allows free-form typing and persists on every valid keystroke */
function ProfileInput({
  value,
  fallback,
  onChange,
}: {
  value: number;
  fallback: number;
  onChange: (v: number) => void;
}) {
  const [raw, setRaw] = useState(String(value));

  // Sync when external profile value changes (e.g. on load from localStorage)
  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setRaw(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed) && parsed > 0) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed <= 0) {
      // Reset display to current valid value
      setRaw(String(value || fallback));
      onChange(value || fallback);
    }
  };

  return (
    <Input
      type="number"
      value={raw}
      onChange={handleChange}
      onBlur={handleBlur}
      className="h-7 text-xs text-center bg-background/30"
    />
  );
}

export function ProfilePanel({
  profile,
  onProfileChange,
  currentBg,
}: ProfilePanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const bgNum = parseFloat(currentBg) || 0;

  const bgStatus =
    bgNum === 0 ? null : bgNum < 70 ? "low" : bgNum > 180 ? "high" : "ok";

  const bgColor = {
    low: "text-glucose-low border-glucose-low/30 bg-glucose-low/10",
    ok: "text-glucose-ok border-glucose-ok/30 bg-glucose-ok/10",
    high: "text-glucose-high border-glucose-high/30 bg-glucose-high/10",
  };

  const bgLabel = { low: "Hipoglucemia", ok: "En objetivo", high: "Hiperglucemia" };

  return (
    <Card className="border-border/40 bg-card/60 backdrop-blur-md shadow-sm">
      <CardHeader className="pb-1.5 pt-2.5 px-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-1.5">
              <Settings2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <CardTitle className="text-xs font-semibold">Mi perfil</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>

      {/* Always render CardContent so server/client HTML always match.
          Use CSS to hide when collapsed instead of conditional rendering. */}
      <CardContent
        className="space-y-3 px-3 pb-3"
        style={collapsed ? { display: "none" } : undefined}
      >
        {/* Glucemia actual */}
        <div className="space-y-1.5 flex flex-col items-center py-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[9px] font-bold text-primary tracking-wider uppercase">Live Sync</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center" suppressHydrationWarning>
            <span
              suppressHydrationWarning
              className={cn(
                "text-2xl font-bold tracking-tighter tabular-nums",
                bgStatus === "low" ? "text-glucose-low" : bgStatus === "high" ? "text-glucose-high" : "text-foreground"
              )}
            >
              {currentBg || "--"}
              <span className="text-xs ml-1 font-medium text-muted-foreground">mg/dL</span>
            </span>
            
            <span suppressHydrationWarning className={cn(
              "text-[10px] mt-0.5 font-medium",
              bgStatus
                ? cn("px-2 py-0.5 rounded-md border", bgColor[bgStatus])
                : "text-muted-foreground/50"
            )}>
              {bgStatus ? bgLabel[bgStatus] : "Esperando medición..."}
            </span>
          </div>
        </div>

        <Separator className="opacity-20" />

        {/* Ratios de insulina */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">
            Ratios de insulina
          </p>

          <div className="grid grid-cols-2 gap-x-2 gap-y-2">
            {/* ICR */}
            <div className="space-y-0.5">
              <label className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <Zap className="h-2.5 w-2.5" />
                ICR (g/U)
              </label>
              <ProfileInput
                value={profile.icr}
                fallback={10}
                onChange={(v) => onProfileChange({ ...profile, icr: v })}
              />
            </div>

            {/* ISF */}
            <div className="space-y-0.5">
              <label className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <Droplets className="h-2.5 w-2.5" />
                ISF (mg/U)
              </label>
              <ProfileInput
                value={profile.isf}
                fallback={50}
                onChange={(v) => onProfileChange({ ...profile, isf: v })}
              />
            </div>

            {/* Target BG */}
            <div className="space-y-0.5">
              <label className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <Target className="h-2.5 w-2.5" />
                Meta (mg)
              </label>
              <ProfileInput
                value={profile.targetBg}
                fallback={100}
                onChange={(v) => onProfileChange({ ...profile, targetBg: v })}
              />
            </div>

            {/* Threshold */}
            <div className="space-y-0.5">
              <label className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <Activity className="h-2.5 w-2.5" />
                Umbral (mg)
              </label>
              <ProfileInput
                value={profile.correctionThreshold ?? profile.targetBg}
                fallback={profile.targetBg}
                onChange={(v) => onProfileChange({ ...profile, correctionThreshold: v })}
              />
            </div>

            {/* Rounding */}
            <div className="space-y-0.5 col-span-2">
              <label className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <RotateCcw className="h-2.5 w-2.5" />
                Redondeo (Unidades)
              </label>
              <select
                value={profile.rounding ?? 0.1}
                onChange={(e) =>
                  onProfileChange({ ...profile, rounding: parseFloat(e.target.value) })
                }
                className="flex h-7 w-full rounded-md border border-input bg-background/30 px-2 py-1 text-[10px] focus:outline-none"
              >
                <option value={0.1}>Preciso (0.1 U)</option>
                <option value={0.5}>Medias (0.5 U)</option>
                <option value={1.0}>Enteras (1.0 U)</option>
              </select>
            </div>

            {/* Model Selection */}
            <div className="space-y-0.5 col-span-2 mt-1" suppressHydrationWarning>
              <label className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <Settings2 className="h-2.5 w-2.5" />
                Modelo de IA (Textos)
              </label>
              <select
                suppressHydrationWarning
                value={profile.model || "llama-3.1-8b-instant"}
                onChange={(e) =>
                  onProfileChange({ ...profile, model: e.target.value })
                }
                className="flex h-7 w-full rounded-md border border-input bg-background/30 px-2 py-1 text-[10px] focus:outline-none"
              >
                <option value="llama-3.1-8b-instant" suppressHydrationWarning>Llama 3.1 8B (Más Rápido/Liviano)</option>
                <option value="openai/gpt-oss-20b" suppressHydrationWarning>GPT OSS 20B (Equilibrado/Eficiente)</option>
                <option value="qwen/qwen3-32b" suppressHydrationWarning>Qwen3 32B (Eficiente/Alternativo)</option>
                <option value="llama-3.3-70b-versatile" suppressHydrationWarning>Llama 3.3 70B (Más Inteligente)</option>
                <option value="openai/gpt-oss-120b" suppressHydrationWarning>GPT OSS 120B (Extremo/Insano)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="rounded-md bg-muted/30 p-2 border border-border/20">
          <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 mb-1">Guía rápida</p>
          <div className="grid grid-cols-1 gap-0.5 text-[9px] text-muted-foreground/90 leading-tight">
            <p>• <span className="font-medium text-primary/80">ICR:</span> Gramos HC cubiertos por 1U</p>
            <p>• <span className="font-medium text-primary/80">ISF:</span> mg/dL que baja 1U</p>
            <p>• <span className="font-medium text-primary/80">Meta/Umbral:</span> Objetivo y inicio corr.</p>
          </div>
        </div>
      </CardContent>

    </Card>
  );
}
