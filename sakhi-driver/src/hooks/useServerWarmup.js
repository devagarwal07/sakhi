'use strict';
/**
 * useServerWarmup
 * ───────────────
 * Proactively pings the Render backend when the hook mounts so that by the
 * time the driver taps "Go Online" the server is already awake.
 *
 * Exposes:
 *   serverReady  — true once ping succeeds, null while pending, false after failure
 *   warmupMsg    — human-readable status string for the UI
 *   retryWarmup  — call to manually retry (e.g. after a failed go-online)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://sakhi-backend-pwej.onrender.com';
const PING_URL = `${BASE_URL}/ping`;

// Render cold start can take up to 50 s on free tier
const PING_TIMEOUT_MS  = 55_000;
const RETRY_DELAYS_MS  = [0, 6_000, 12_000]; // immediate + 2 retries

async function pingOnce(timeoutMs = PING_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await axios.get(PING_URL, {
      signal:  controller.signal,
      timeout: timeoutMs,
    });
    return res.status === 200;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function useServerWarmup() {
  // null = still checking | true = alive | false = unreachable
  const [serverReady, setServerReady] = useState(null);
  const [warmupMsg,   setWarmupMsg]   = useState('Connecting to server…');
  const mountedRef = useRef(true);

  const runWarmup = useCallback(async () => {
    if (!mountedRef.current) return;
    setServerReady(null);
    setWarmupMsg('Waking up server…');

    for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
      if (RETRY_DELAYS_MS[i] > 0) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[i]));
      }
      if (!mountedRef.current) return;

      const ok = await pingOnce();
      if (!mountedRef.current) return;

      if (ok) {
        setServerReady(true);
        setWarmupMsg('Server ready');
        return;
      }

      // Still waking up — give feedback
      if (i < RETRY_DELAYS_MS.length - 1) {
        setWarmupMsg(`Server starting up… (${i + 1}/${RETRY_DELAYS_MS.length - 1})`);
      }
    }

    // All retries exhausted
    setServerReady(false);
    setWarmupMsg('Server unreachable — tap to retry');
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    runWarmup();
    return () => { mountedRef.current = false; };
  }, [runWarmup]);

  return { serverReady, warmupMsg, retryWarmup: runWarmup };
}
