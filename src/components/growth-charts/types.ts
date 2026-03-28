/* ── Growth Charts types ── */

export interface GrowthMeasurement {
  id: number;
  patientId: number;
  patientName?: string;
  measurementDate: string;
  ageMonths: number;
  gender: "male" | "female";
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  headCircCm?: number;
  weightPercentile?: number;
  heightPercentile?: number;
  bmiPercentile?: number;
  headCircPercentile?: number;
  chartStandard: "WHO" | "CDC";
  encounterId?: number;
  measuredBy?: string;
  notes?: string;
  createdAt?: string;
}

export type ChartMetric = "weight" | "height" | "bmi" | "headCirc";

export interface PercentileLine {
  label: string;
  percentile: number;
  data: { ageMonths: number; value: number }[];
  color: string;
  dashed?: boolean;
}

export const METRIC_LABELS: Record<ChartMetric, string> = {
  weight: "Weight-for-Age",
  height: "Length/Stature-for-Age",
  bmi: "BMI-for-Age",
  headCirc: "Head Circumference-for-Age",
};

export const METRIC_UNITS: Record<ChartMetric, string> = {
  weight: "kg",
  height: "cm",
  bmi: "kg/m²",
  headCirc: "cm",
};

/* WHO percentile reference curves (simplified — key percentile lines) */
export const PERCENTILE_LINES = [3, 5, 10, 25, 50, 75, 90, 95, 97];
export const PERCENTILE_COLORS: Record<number, string> = {
  3: "#ef4444",
  5: "#f97316",
  10: "#eab308",
  25: "#84cc16",
  50: "#22c55e",
  75: "#84cc16",
  90: "#eab308",
  95: "#f97316",
  97: "#ef4444",
};
