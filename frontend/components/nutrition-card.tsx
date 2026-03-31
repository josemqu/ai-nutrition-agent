"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Wheat,
  Syringe,
  TrendingUp,
  Flame,
  Beef,
  Droplets,
  AlertTriangle,
} from "lucide-react";
import type { NutritionData, InsulinCalculation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NutritionCardProps {
  nutrition?: NutritionData;
  insulin?: InsulinCalculation;
}

function GlycemicBadge({ gi }: { gi: number | null | undefined }) {
  if (gi === null || gi === undefined) return null;
  const level = gi < 55 ? "low" : gi < 70 ? "medium" : "high";
  const config = {
    low: { label: "IG Bajo", class: "bg-glucose-ok/15 text-glucose-ok border-glucose-ok/30" },
    medium: { label: "IG Medio", class: "bg-glucose-high/15 text-glucose-high border-glucose-high/30" },
    high: { label: "IG Alto", class: "bg-glucose-low/15 text-glucose-low border-glucose-low/30" },
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        config[level].class
      )}
    >
      <TrendingUp className="h-3 w-3" />
      {config[level].label} ({gi})
    </span>
  );
}

function StatRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg px-3 py-2",
        highlight ? "bg-primary/8 border border-primary/15" : "bg-muted/30"
      )}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          highlight ? "text-primary" : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function NutritionCard({ nutrition, insulin }: NutritionCardProps) {
  if (!nutrition && !insulin) return null;

  const totalDoseRounded = insulin
    ? Math.round(insulin.totalDose * 2) / 2 // Round to nearest 0.5 units
    : null;

  return (
    <Card className="border-border/40 bg-card/70 backdrop-blur-sm shadow-sm animate-fade-up">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Análisis Nutricional
          </span>
          {nutrition?.glycemicIndex !== undefined && (
            <GlycemicBadge gi={nutrition.glycemicIndex} />
          )}
        </div>

        {nutrition?.servingDescription && (
          <p className="text-xs text-muted-foreground truncate">
            📍 {nutrition.servingDescription}
          </p>
        )}

        {/* Nutrition stats */}
        {nutrition && (
          <div className="space-y-1.5">
            <StatRow
              icon={<Wheat className="h-3.5 w-3.5" />}
              label="Carbohidratos"
              value={`${nutrition.carbs}g`}
              highlight
            />
            {nutrition.protein !== undefined && (
              <StatRow
                icon={<Beef className="h-3.5 w-3.5" />}
                label="Proteínas"
                value={`${nutrition.protein}g`}
              />
            )}
            {nutrition.fat !== undefined && (
              <StatRow
                icon={<Droplets className="h-3.5 w-3.5" />}
                label="Grasas"
                value={`${nutrition.fat}g`}
              />
            )}
            {nutrition.calories !== undefined && (
              <StatRow
                icon={<Flame className="h-3.5 w-3.5" />}
                label="Calorías"
                value={`${nutrition.calories} kcal`}
              />
            )}
            {nutrition.glycemicLoad !== null && nutrition.glycemicLoad !== undefined && (
              <StatRow
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                label="Carga glucémica"
                value={`${nutrition.glycemicLoad}`}
              />
            )}
          </div>
        )}

        {/* Insulin section */}
        {insulin && (
          <>
            <Separator className="opacity-30" />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Syringe className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Dosis calculada
                </span>
              </div>

              {/* Main dose display */}
              <div className="rounded-xl bg-primary/8 border border-primary/20 p-4 text-center">
                <p className="text-4xl font-bold tabular-nums text-primary">
                  {insulin.totalDose}
                </p>
                <p className="text-sm text-muted-foreground mt-1">unidades de insulina rápida</p>
                {totalDoseRounded !== insulin.totalDose && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    Redondeado: {totalDoseRounded} U
                  </Badge>
                )}
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/30 p-2.5 text-center">
                  <p className="text-xs text-muted-foreground">Por comida</p>
                  <p className="text-lg font-bold tabular-nums">
                    {insulin.foodDose}U
                  </p>
                </div>
                <div className="rounded-lg bg-muted/30 p-2.5 text-center">
                  <p className="text-xs text-muted-foreground">Corrección</p>
                  <p className="text-lg font-bold tabular-nums">
                    {insulin.correctionDose}U
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Medical disclaimer */}
        <div className="flex items-start gap-2 rounded-lg bg-destructive/8 border border-destructive/20 p-2.5">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Estimación orientativa. Consulta siempre con tu médico o educador en diabetes antes de ajustar tu dosis.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
