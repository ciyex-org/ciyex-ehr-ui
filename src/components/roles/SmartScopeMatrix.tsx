"use client";

import React from "react";
import { SMART_SCOPE_RESOURCES } from "./types";

interface Props {
  selected: string[];
  onChange: (scopes: string[]) => void;
  readOnly?: boolean;
}

/** Builds the SMART scope string: SCOPE_user/{ResourceType}.{read|write} */
const scopeKey = (resourceType: string, action: "read" | "write") =>
  `SCOPE_user/${resourceType}.${action}`;

export default function SmartScopeMatrix({ selected, onChange, readOnly }: Props) {
  const has = (rt: string, action: "read" | "write") =>
    selected.includes(scopeKey(rt, action));

  const toggle = (rt: string, action: "read" | "write") => {
    if (readOnly) return;
    const key = scopeKey(rt, action);
    if (selected.includes(key)) {
      onChange(selected.filter((s) => s !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  const toggleGroupAll = (resources: { type: string }[], action: "read" | "write") => {
    if (readOnly) return;
    const keys = resources.map((r) => scopeKey(r.type, action));
    const allOn = keys.every((k) => selected.includes(k));
    if (allOn) {
      onChange(selected.filter((s) => !keys.includes(s)));
    } else {
      onChange(Array.from(new Set([...selected, ...keys])));
    }
  };

  const toggleAll = () => {
    if (readOnly) return;
    const allKeys = SMART_SCOPE_RESOURCES.flatMap((g) =>
      g.resources.flatMap((r) => [scopeKey(r.type, "read"), scopeKey(r.type, "write")])
    );
    const allOn = allKeys.every((k) => selected.includes(k));
    if (allOn) {
      onChange(selected.filter((s) => !allKeys.includes(s)));
    } else {
      onChange(Array.from(new Set([...selected, ...allKeys])));
    }
  };

  const allKeys = SMART_SCOPE_RESOURCES.flatMap((g) =>
    g.resources.flatMap((r) => [scopeKey(r.type, "read"), scopeKey(r.type, "write")])
  );
  const allOn = allKeys.every((k) => selected.includes(k));
  const someOn = allKeys.some((k) => selected.includes(k));

  return (
    <div className="space-y-3">
      {/* Select all */}
      <div className="flex items-center gap-2 pb-1">
        <input
          type="checkbox"
          checked={allOn}
          ref={(el) => { if (el) el.indeterminate = someOn && !allOn; }}
          onChange={toggleAll}
          disabled={readOnly}
          className="w-4 h-4 rounded border-slate-300"
        />
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Select All FHIR Scopes</span>
      </div>

      {SMART_SCOPE_RESOURCES.map((group) => {
        const grpReadKeys = group.resources.map((r) => scopeKey(r.type, "read"));
        const grpWriteKeys = group.resources.map((r) => scopeKey(r.type, "write"));
        const allRead = grpReadKeys.every((k) => selected.includes(k));
        const allWrite = grpWriteKeys.every((k) => selected.includes(k));
        const someRead = grpReadKeys.some((k) => selected.includes(k));
        const someWrite = grpWriteKeys.some((k) => selected.includes(k));

        return (
          <div key={group.group} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Group header with column-level toggles */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-800 px-3 py-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">
                {group.group}
              </span>
              <div className="flex items-center gap-6 mr-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allRead}
                    ref={(el) => { if (el) el.indeterminate = someRead && !allRead; }}
                    onChange={() => toggleGroupAll(group.resources, "read")}
                    disabled={readOnly}
                    className="w-3.5 h-3.5 rounded border-slate-300"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Read</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allWrite}
                    ref={(el) => { if (el) el.indeterminate = someWrite && !allWrite; }}
                    onChange={() => toggleGroupAll(group.resources, "write")}
                    disabled={readOnly}
                    className="w-3.5 h-3.5 rounded border-slate-300"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Write</span>
                </label>
              </div>
            </div>

            {/* Resource rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {group.resources.map((r) => (
                <div key={r.type} className="flex items-center px-3 py-1.5">
                  <span className="text-xs text-slate-600 dark:text-slate-400 flex-1">{r.label}</span>
                  <div className="flex items-center gap-6 mr-1">
                    <div className="w-[42px] flex justify-center">
                      <input
                        type="checkbox"
                        checked={has(r.type, "read")}
                        onChange={() => toggle(r.type, "read")}
                        disabled={readOnly}
                        className="w-3.5 h-3.5 rounded border-slate-300"
                      />
                    </div>
                    <div className="w-[42px] flex justify-center">
                      <input
                        type="checkbox"
                        checked={has(r.type, "write")}
                        onChange={() => toggle(r.type, "write")}
                        disabled={readOnly}
                        className="w-3.5 h-3.5 rounded border-slate-300"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
