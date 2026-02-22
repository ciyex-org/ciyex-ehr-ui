"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useRef, useState, useCallback } from "react";
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

// Warning timeout: show warning 2 minutes before session expires
const WARNING_BEFORE_MS = 2 * 60 * 1000;

export default function SessionManager() {
  const timeoutId = useRef<number | null>(null);
  const warningTimeoutId = useRef<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(120);
  const countdownRef = useRef<number | null>(null);

  const dismissWarning = useCallback(async () => {
    setShowWarning(false);
    setCountdown(120);
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    // Try to refresh the session
    await tryRefreshSession();
  }, []);

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
        const refreshed = await tryRefreshSession();
        if (!refreshed) {
          // Show warning if refresh fails and JWT is about to expire
          const secsLeft = payload.exp - nowSec;
          if (secsLeft > 0 && secsLeft < 120) {
            setShowWarning(true);
            setCountdown(secsLeft);
            if (countdownRef.current) window.clearInterval(countdownRef.current);
            countdownRef.current = window.setInterval(() => {
              setCountdown((prev) => {
                if (prev <= 1) {
                  if (countdownRef.current) window.clearInterval(countdownRef.current);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }
        }
      }

      // Dismiss warning on activity if it's showing
      if (showWarning) {
        // Don't dismiss - let the modal handle it
      }

      if (timeoutId.current) {
        window.clearTimeout(timeoutId.current);
      }
      if (warningTimeoutId.current) {
        window.clearTimeout(warningTimeoutId.current);
      }

      // Set warning timeout (fires before idle timeout)
      const warningMs = Math.max(idleMs - WARNING_BEFORE_MS, 0);
      if (warningMs > 0) {
        warningTimeoutId.current = window.setTimeout(() => {
          setShowWarning(true);
          setCountdown(Math.floor(WARNING_BEFORE_MS / 1000));
          if (countdownRef.current) window.clearInterval(countdownRef.current);
          countdownRef.current = window.setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                if (countdownRef.current) window.clearInterval(countdownRef.current);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }, warningMs);
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
      setShowWarning(false);
      if (countdownRef.current) window.clearInterval(countdownRef.current);
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
      if (warningTimeoutId.current) window.clearTimeout(warningTimeoutId.current);
      if (countdownRef.current) window.clearInterval(countdownRef.current);
    };
  }, []);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Session Expiring</h3>
        </div>
        <p className="mb-1 text-sm text-gray-600">
          Your session will expire in{" "}
          <span className="font-bold text-amber-600">
            {countdown > 60 ? `${Math.floor(countdown / 60)}m ${countdown % 60}s` : `${countdown}s`}
          </span>
        </p>
        <p className="mb-5 text-sm text-gray-500">
          Click below to stay logged in, or you will be signed out automatically.
        </p>
        <div className="flex gap-3">
          <button
            onClick={dismissWarning}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Stay Logged In
          </button>
          <button
            onClick={() => {
              setShowWarning(false);
              clearAuth();
              window.location.href = "/signin";
            }}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
