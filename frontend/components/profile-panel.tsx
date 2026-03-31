"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

      {!collapsed && (
        <CardContent className="space-y-3 px-3 pb-3">
          {/* Glucemia actual */}
          <div className="space-y-1.5 flex flex-col items-center py-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[9px] font-bold text-primary tracking-wider uppercase">Live Sync</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <span className={cn(
                "text-2xl font-bold tracking-tighter tabular-nums",
                bgStatus === 'low' ? 'text-glucose-low' : bgStatus === 'high' ? 'text-glucose-high' : 'text-foreground'
              )}>
                {currentBg || "--"}
                <span className="text-xs ml-1 font-medium text-muted-foreground">mg/dL</span>
              </span>
              
              {bgStatus ? (
                <span className={cn(
                  "text-[10px] mt-0.5 font-medium px-2 py-0.5 rounded-md border",
                  bgColor[bgStatus]
                )}>
                  {bgLabel[bgStatus]}
                </span>
              ) : (
                <span className="text-[10px] mt-0.5 font-medium text-muted-foreground/50">Esperando medición...</span>
              )}
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
                <Input
                  type="number"
                  value={profile.icr}
                  onChange={(e) =>
                    onProfileChange({ ...profile, icr: parseFloat(e.target.value) || 10 })
                  }
                  className="h-7 text-xs text-center bg-background/30"
                />
              </div>

              {/* ISF */}
              <div className="space-y-0.5">
                <label className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <Droplets className="h-2.5 w-2.5" />
                  ISF (mg/U)
                </label>
                <Input
                  type="number"
                  value={profile.isf}
                  onChange={(e) =>
                    onProfileChange({ ...profile, isf: parseFloat(e.target.value) || 50 })
                  }
                  className="h-7 text-xs text-center bg-background/30"
                />
              </div>

              {/* Target BG */}
              <div className="space-y-0.5">
                <label className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <Target className="h-2.5 w-2.5" />
                  Meta (mg)
                </label>
                <Input
                  type="number"
                  value={profile.targetBg}
                  onChange={(e) =>
                    onProfileChange({ ...profile, targetBg: parseFloat(e.target.value) || 100 })
                  }
                  className="h-7 text-xs text-center bg-background/30"
                />
              </div>

              {/* Threshold */}
              <div className="space-y-0.5">
                <label className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <Activity className="h-2.5 w-2.5" />
                  Umbral (mg)
                </label>
                <Input
                  type="number"
                  value={profile.correctionThreshold || profile.targetBg}
                  onChange={(e) =>
                    onProfileChange({ ...profile, correctionThreshold: parseFloat(e.target.value) })
                  }
                  className="h-7 text-xs text-center bg-background/30"
                />
              </div>

              {/* Rounding */}
              <div className="space-y-0.5 col-span-2">
                <label className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <RotateCcw className="h-2.5 w-2.5" />
                  Redondeo (Unidades)
                </label>
                <select
                  value={profile.rounding || 0.1}
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
      )}
    </Card>
  );
}
