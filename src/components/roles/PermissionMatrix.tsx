"use client";

import React from "react";
import { PERMISSION_CATEGORIES } from "./types";

interface Props {
  selected: string[];
  onChange: (permissions: string[]) => void;
  readOnly?: boolean;
}

export default function PermissionMatrix({ selected, onChange, readOnly }: Props) {
  const toggle = (key: string) => {
    if (readOnly) return;
    if (selected.includes(key)) {
      onChange(selected.filter((p) => p !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  const toggleCategory = (permissions: { key: string }[]) => {
    if (readOnly) return;
    const keys = permissions.map((p) => p.key);
    const allSelected = keys.every((k) => selected.includes(k));
    if (allSelected) {
      onChange(selected.filter((p) => !keys.includes(p)));
    } else {
      const newSet = new Set([...selected, ...keys]);
      onChange(Array.from(newSet));
    }
  };

  return (
    <div className="space-y-3">
      {PERMISSION_CATEGORIES.map((cat) => {
        const allSelected = cat.permissions.every((p) => selected.includes(p.key));
        const someSelected = cat.permissions.some((p) => selected.includes(p.key));

        return (
          <div key={cat.category} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                onChange={() => toggleCategory(cat.permissions)}
                disabled={readOnly}
                className="w-4 h-4 rounded border-slate-300"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{cat.category}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 ml-6">
              {cat.permissions.map((p) => (
                <label key={p.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(p.key)}
                    onChange={() => toggle(p.key)}
                    disabled={readOnly}
                    className="w-3.5 h-3.5 rounded border-slate-300"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
