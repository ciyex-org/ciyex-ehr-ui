"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useRef } from "react";
import { clearAuth, refreshAccessToken } from "@/utils/authUtils";

const API_BASE = getEnv("NEXT_PUBLIC_API_URL") || "";

function decodeJwt(token: string | null) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch (e) {
    return null;
  }
}

async function tryRefreshSession(): Promise<boolean> {
  try {
    const success = await refreshAccessToken();
    if (success) {
      console.log("Token refreshed successfully");
      sessionStorage.setItem("lastActivity", String(Date.now()));
      return true;
    } else {
      console.log("Token refresh failed");
      return false;
    }
  } catch (e) {
    console.error("Token refresh error:", e);
    return false;
  }
}

export default function SessionManager() {
  const timeoutId = useRef<number | null>(null);

  useEffect(() => {
    const orgId = typeof window !== "undefined" ? localStorage.getItem("orgId") || "default" : "default";
    const getExpiryMinutes = () => {
      try {
        const v = localStorage.getItem(`tokenExpiryMinutes_${orgId}`) || localStorage.getItem("tokenExpiryMinutes");
        const n = v ? Number(v) : NaN;
        return Number.isFinite(n) && n > 0 ? n : 5;
      } catch {
        return 5;
      }
    };

    let idleMs = getExpiryMinutes() * 60 * 1000;

    const resetTimer = async () => {
      // on user activity, update timestamp
      try {
        sessionStorage.setItem("lastActivity", String(Date.now()));
      } catch {}

      // Only refresh token if it's near JWT expiry, not based on UI timeout
      const token = localStorage.getItem("token") || localStorage.getItem("authToken") || sessionStorage.getItem("token");
      const payload = decodeJwt(token);
      const nowSec = Math.floor(Date.now() / 1000);
      const nearJwtExpiry = payload && payload.exp && payload.exp - nowSec < 120; // 2 minutes before JWT expires
      if (nearJwtExpiry) {
        console.log("JWT near expiry, attempting refresh...");
        await tryRefreshSession();
      }

      if (timeoutId.current) {
        window.clearTimeout(timeoutId.current);
      }
      timeoutId.current = window.setTimeout(onIdle, idleMs);
    };

    const onIdle = async () => {
      // double-check inactivity
      try {
        const last = Number(sessionStorage.getItem("lastActivity") || 0);
        const elapsed = Date.now() - (last || 0);
        if (elapsed < idleMs) {
          // activity happened, don't sign out
          if (timeoutId.current) {
            window.clearTimeout(timeoutId.current);
          }
          timeoutId.current = window.setTimeout(onIdle, idleMs - elapsed);
          return;
        }
      } catch {}

      // UI timeout reached - sign out user (respect UI setting)
      console.log(`Session timeout reached (${getExpiryMinutes()} minutes), signing out...`);
      try {
        clearAuth();
      } catch {}
      try {
        window.location.href = "/signin";
      } catch {}
    };

    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    activityEvents.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    window.addEventListener("visibilitychange", resetTimer);

    // initialize
    resetTimer();

    // watch for changes to tokenExpiryMinutes in localStorage
    const onStorage = (e: StorageEvent) => {
      if (e.key === `tokenExpiryMinutes_${orgId}` || e.key === "tokenExpiryMinutes") {
        idleMs = getExpiryMinutes() * 60 * 1000;
        if (timeoutId.current) window.clearTimeout(timeoutId.current);
        timeoutId.current = window.setTimeout(onIdle, idleMs);
      }
    };
    window.addEventListener("storage", onStorage);

    // listen for same-tab updates (storage doesn't fire in same tab)
    const onTokenExpiryUpdated = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent)?.detail || {};
        const keyOrg = detail.orgId || orgId;
        const mins = Number(detail.mins ?? (localStorage.getItem(`tokenExpiryMinutes_${keyOrg}`) || localStorage.getItem('tokenExpiryMinutes') || 5));
        idleMs = (Number.isFinite(mins) && mins > 0 ? mins : 5) * 60 * 1000;
        if (timeoutId.current) window.clearTimeout(timeoutId.current);
        timeoutId.current = window.setTimeout(onIdle, idleMs);
      } catch {}
    };
    window.addEventListener('tokenExpiryUpdated', onTokenExpiryUpdated as (event: Event) => void);

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetTimer));
      window.removeEventListener("visibilitychange", resetTimer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener('tokenExpiryUpdated', onTokenExpiryUpdated as (event: Event) => void);
      if (timeoutId.current) window.clearTimeout(timeoutId.current);
    };
  }, []);

  return null;
}
