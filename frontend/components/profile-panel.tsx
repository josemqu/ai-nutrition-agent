"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Settings2, Droplets, Target, Zap, ChevronDown, ChevronUp } from "lucide-react";

import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProfilePanelProps {
  profile: UserProfile;
  onProfileChange: (profile: UserProfile) => void;
  currentBg: string;
  onCurrentBgChange: (bg: string) => void;
}

export function ProfilePanel({
  profile,
  onProfileChange,
  currentBg,
  onCurrentBgChange,
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
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-1.5">
              <Settings2 className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold">Mi perfil</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-4 px-4 pb-4">
          {/* Glucemia actual */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Droplets className="h-3.5 w-3.5" />
                Glucemia actual (mg/dL)
              </label>
            </div>

            <div className="relative">
              <Input
                type="number"
                placeholder="ej. 140"
                value={currentBg}
                onChange={(e) => onCurrentBgChange(e.target.value)}
                className="h-9 text-sm pr-20"
              />
              {bgStatus && (
                <span
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 text-xs px-1.5 py-0.5 rounded-full border font-medium",
                    bgColor[bgStatus]
                  )}
                >
                  {bgLabel[bgStatus]}
                </span>
              )}
            </div>
          </div>

          <Separator className="opacity-40" />

          {/* Ratios de insulina */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Ratios de insulina
            </p>

            <div className="grid grid-cols-3 gap-2">
              {/* ICR */}
              <div className="space-y-1">
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  ICR (g/U)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={profile.icr}
                  onChange={(e) =>
                    onProfileChange({ ...profile, icr: parseFloat(e.target.value) || 10 })
                  }
                  className="h-8 text-sm text-center"
                />
              </div>

              {/* ISF */}
              <div className="space-y-1">
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Droplets className="h-3 w-3" />
                  ISF (mg/U)
                </label>
                <Input
                  type="number"
                  min={10}
                  max={200}
                  value={profile.isf}
                  onChange={(e) =>
                    onProfileChange({ ...profile, isf: parseFloat(e.target.value) || 50 })
                  }
                  className="h-8 text-sm text-center"
                />
              </div>

              {/* Target BG */}
              <div className="space-y-1">
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Target className="h-3 w-3" />
                  Objetivo
                </label>
                <Input
                  type="number"
                  min={70}
                  max={200}
                  value={profile.targetBg}
                  onChange={(e) =>
                    onProfileChange({ ...profile, targetBg: parseFloat(e.target.value) || 100 })
                  }
                  className="h-8 text-sm text-center"
                />
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="rounded-lg bg-muted/40 p-2.5 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Leyenda</p>
            <div className="grid grid-cols-1 gap-0.5 text-xs text-muted-foreground/80">
              <span>ICR = gramos de CH por 1 unidad de insulina</span>
              <span>ISF = mg/dL que baja 1 unidad de insulina</span>
              <span>Objetivo = glucemia meta en mg/dL</span>
            </div>
          </div>

          {/* Quick reference badges */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs font-normal">
              1U = {profile.icr}g CH
            </Badge>
            <Badge variant="secondary" className="text-xs font-normal">
              1U ↓{profile.isf} mg/dL
            </Badge>
            <Badge variant="secondary" className="text-xs font-normal">
              Meta: {profile.targetBg} mg/dL
            </Badge>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
