// lib/types.ts

export type MessageRole = "user" | "assistant";

export interface UserProfile {
  icr: number;               // Insulin-to-Carb Ratio (g carbs per 1 unit)
  isf: number;               // Insulin Sensitivity Factor (mg/dL per 1 unit)
  targetBg: number;          // Target blood glucose in mg/dL
  correctionThreshold?: number; // BG at which to start correcting (if different from target)
  rounding?: number;         // Rounding increment (0.1, 0.5, 1.0)
}

export interface NutritionData {
  carbs: number;
  protein?: number;
  fat?: number;
  calories?: number;
  fiber?: number;
  glycemicIndex?: number | null;
  glycemicLoad?: number | null;
  servingDescription?: string;
}

export interface InsulinCalculation {
  foodDose: number;
  correctionDose: number;
  totalDose: number;
  totalCarbs: number;
  currentBg?: number;
  breakdown: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  nutrition?: NutritionData;
  insulin?: InsulinCalculation;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  image?: string; // base64 string
  isLoading?: boolean;
}

export interface ChatRequest {
  message: string;
  profile: UserProfile;
  currentBg?: number;
  imageData?: string; // base64 payload
  history: Array<{ role: MessageRole; content: string }>;
}

export interface ChatResponse {
  content: string;
  nutrition?: NutritionData;
  insulin?: InsulinCalculation;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  error?: string;
}
