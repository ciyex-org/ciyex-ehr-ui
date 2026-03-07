"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions {
  /** Debounce delay in ms (default 2000) */
  debounceMs?: number;
  /** Callback to persist form data — should return a promise */
  onSave: (data: Record<string, any>) => Promise<void>;
  /** Whether auto-save is enabled */
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
  onChange: (key: string, value: any) => void;
  status: AutoSaveStatus;
  lastSaved: Date | null;
  isDirty: boolean;
  saveNow: () => Promise<void>;
}

export function useAutoSave({ debounceMs = 2000, onSave, enabled = true }: UseAutoSaveOptions): UseAutoSaveReturn {
  const [formData, setFormDataState] = useState<Record<string, any>>({});
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const formDataRef = useRef(formData);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const setFormData = useCallback((data: Record<string, any>) => {
    formDataRef.current = data;
    setFormDataState(data);
  }, []);

  const doSave = useCallback(async () => {
    if (savingRef.current) {
      // Mark that a re-save is needed after current save completes
      pendingSaveRef.current = true;
      return;
    }
    const data = formDataRef.current;
    if (!data || Object.keys(data).length === 0) return;

    savingRef.current = true;
    pendingSaveRef.current = false;
    setStatus("saving");
    try {
      await onSaveRef.current(data);
      setStatus("saved");
      setLastSaved(new Date());
      setIsDirty(false);
      // Reset to idle after 3s
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 3000);
    } catch (err) {
      console.error("Auto-save error:", err);
      setStatus("error");
      setTimeout(() => setStatus((s) => (s === "error" ? "idle" : s)), 5000);
    } finally {
      savingRef.current = false;
      // If changes were made during save, re-save with latest data
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        doSave();
      }
    }
  }, []);

  const scheduleSave = useCallback(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(doSave, debounceMs);
  }, [enabled, debounceMs, doSave]);

  const onChange = useCallback(
    (key: string, value: any) => {
      setFormDataState((prev) => {
        const next = { ...prev, [key]: value };
        formDataRef.current = next;
        return next;
      });
      setIsDirty(true);
      scheduleSave();
    },
    [scheduleSave]
  );

  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await doSave();
  }, [doSave]);

  // Warn on unload if dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { formData, setFormData, onChange, status, lastSaved, isDirty, saveNow };
}
