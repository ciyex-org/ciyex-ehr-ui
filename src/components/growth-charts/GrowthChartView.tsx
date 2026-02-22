"use client";

import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import {
  GrowthMeasurement,
  ChartMetric,
  METRIC_LABELS,
  METRIC_UNITS,
  PERCENTILE_LINES,
  PERCENTILE_COLORS,
} from "./types";

interface Props {
  measurements: GrowthMeasurement[];
  metric: ChartMetric;
  gender: "male" | "female";
}

/* ── Simplified WHO/CDC reference data generator ── */
function getPercentileData(metric: ChartMetric, gender: "male" | "female", percentile: number): { ageMonths: number; value: number }[] {
  const data: { ageMonths: number; value: number }[] = [];
  const isMale = gender === "male";

  for (let age = 0; age <= 240; age += 3) {
    let base = 0;
    switch (metric) {
      case "weight":
        base = isMale
          ? 3.3 + age * 0.25 - age * age * 0.0003
          : 3.2 + age * 0.23 - age * age * 0.00028;
        break;
      case "height":
        base = isMale
          ? 50 + age * 0.9 - age * age * 0.0015
          : 49 + age * 0.88 - age * age * 0.0014;
        break;
      case "bmi":
        base = isMale
          ? 13 + age * 0.03 + (age > 60 ? (age - 60) * 0.02 : 0)
          : 12.8 + age * 0.028 + (age > 60 ? (age - 60) * 0.018 : 0);
        break;
      case "headCirc":
        base = isMale
          ? 35 + age * 0.3 - age * age * 0.001
          : 34 + age * 0.28 - age * age * 0.00095;
        break;
    }

    const pFactor = (percentile - 50) / 50;
    const spread = metric === "weight" ? base * 0.15 : base * 0.08;
    const value = Math.max(0, base + pFactor * spread);
    data.push({ ageMonths: age, value: Math.round(value * 10) / 10 });
  }

  return data;
}

export default function GrowthChartView({ measurements, metric, gender }: Props) {
  const chartData = useMemo(() => {
    /* Build unified chart data: ageMonths + patient value + percentile bands */
    const ageSet = new Set<number>();

    /* Gather all age points from percentile curves */
    for (let age = 0; age <= 240; age += 3) ageSet.add(age);
    /* Add patient measurement ages */
    measurements.forEach((m) => ageSet.add(Math.round(m.ageMonths)));

    const ages = Array.from(ageSet).sort((a, b) => a - b);

    return ages.map((age) => {
      const point: Record<string, number | undefined> = { ageMonths: age };

      /* Add percentile reference lines */
      for (const p of PERCENTILE_LINES) {
        const refData = getPercentileData(metric, gender, p);
        const match = refData.find((d) => d.ageMonths === age);
        if (match) point[`p${p}`] = match.value;
      }

      /* Add patient data point */
      const meas = measurements.find((m) => Math.round(m.ageMonths) === age);
      if (meas) {
        switch (metric) {
          case "weight": point.patient = meas.weightKg; break;
          case "height": point.patient = meas.heightCm; break;
          case "bmi": point.patient = meas.bmi; break;
          case "headCirc": point.patient = meas.headCircCm; break;
        }
      }

      return point;
    });
  }, [measurements, metric, gender]);

  const maxAge = Math.max(
    ...measurements.map((m) => m.ageMonths),
    24, /* minimum 2 years visible */
  );

  return (
    <div className="w-full h-[420px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="ageMonths"
            type="number"
            domain={[0, Math.min(maxAge + 12, 240)]}
            tickFormatter={(v: number) => v < 24 ? `${v}m` : `${Math.round(v / 12)}y`}
            label={{ value: "Age", position: "bottom", offset: 0, fontSize: 12 }}
            stroke="#94a3b8"
            fontSize={11}
          />
          <YAxis
            label={{ value: METRIC_UNITS[metric], angle: -90, position: "insideLeft", offset: 5, fontSize: 12 }}
            stroke="#94a3b8"
            fontSize={11}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
            formatter={(value: number, name: string) => {
              if (name === "patient") return [`${value} ${METRIC_UNITS[metric]}`, "Patient"];
              const pMatch = name.match(/p(\d+)/);
              if (pMatch) return [`${value} ${METRIC_UNITS[metric]}`, `${pMatch[1]}th %ile`];
              return [value, name];
            }}
            labelFormatter={(age: number) => `Age: ${age < 24 ? `${age} months` : `${(age / 12).toFixed(1)} years`}`}
          />

          {/* Percentile reference lines (shaded bands) */}
          {PERCENTILE_LINES.map((p) => (
            <Line
              key={`p${p}`}
              type="monotone"
              dataKey={`p${p}`}
              stroke={PERCENTILE_COLORS[p]}
              strokeWidth={p === 50 ? 2 : 1}
              strokeDasharray={p === 50 ? undefined : "4 4"}
              dot={false}
              opacity={0.6}
              connectNulls
            />
          ))}

          {/* Patient data */}
          <Line
            type="monotone"
            dataKey="patient"
            stroke="#2563eb"
            strokeWidth={3}
            dot={{ r: 5, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 7, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
