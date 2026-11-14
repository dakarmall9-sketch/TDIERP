import { useEffect, useRef, useState, useCallback } from 'react';

interface UseRealtimeAutoSaveOptions<T> {
  enabled: boolean;
  data: T;
  resetKey: string;
  delayMs?: number;
  onSave: (value: T) => void | Promise<void>;
}

/**
 * Debounced real-time Firestore auto-save hook.
 * - Skips initial baseline when opening/switching a record (via resetKey).
 * - Flushes pending changes automatically on unmount / tab hide / beforeunload.
 * - Exposes cancelPending() for explicit cancel actions.
 */
export function useRealtimeAutoSave<T>({
  enabled,
  data,
  resetKey,
  delayMs = 600,
  onSave,
}: UseRealtimeAutoSaveOptions<T>) {
  const baselineHashRef = useRef<string>('');
  const lastResetKeyRef = useRef<string>('');
  const wasEnabledRef = useRef<boolean>(false);
  const isDirtyRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDataRef = useRef<T>(data);
  const latestOnSaveRef = useRef(onSave);
  const latestEnabledRef = useRef(enabled);

  latestDataRef.current = data;
  latestOnSaveRef.current = onSave;
  latestEnabledRef.current = enabled;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flushNow = useCallback(() => {
    clearTimer();
    if (!isDirtyRef.current) return;
    const payload = latestDataRef.current;
    const nextHash = JSON.stringify(payload);
    baselineHashRef.current = nextHash;
    isDirtyRef.current = false;
    try {
      void latestOnSaveRef.current(payload);
    } catch {
      // Safe guard: errors handled by caller / persistDoc
    }
  }, [clearTimer]);

  const cancelPending = useCallback(() => {
    clearTimer();
    isDirtyRef.current = false;
    baselineHashRef.current = JSON.stringify(latestDataRef.current);
  }, [clearTimer]);

  useEffect(() => {
    const serialized = JSON.stringify(data);

    // Establish new baseline when enabling or switching to another record
    if (!enabled) {
      if (wasEnabledRef.current && isDirtyRef.current) {
        flushNow();
      }
      wasEnabledRef.current = false;
      lastResetKeyRef.current = resetKey;
      isDirtyRef.current = false;
      clearTimer();
      return;
    }

    if (!wasEnabledRef.current || lastResetKeyRef.current !== resetKey) {
      if (wasEnabledRef.current && lastResetKeyRef.current !== resetKey && isDirtyRef.current) {
        flushNow();
      }
      wasEnabledRef.current = true;
      lastResetKeyRef.current = resetKey;
      baselineHashRef.current = serialized;
      isDirtyRef.current = false;
      clearTimer();
      return;
    }

    if (serialized === baselineHashRef.current) {
      isDirtyRef.current = false;
      clearTimer();
      return;
    }

    isDirtyRef.current = true;
    clearTimer();
    timerRef.current = setTimeout(() => {
      flushNow();
    }, delayMs);
  }, [enabled, data, resetKey, delayMs, clearTimer, flushNow]);

  // Flush on unmount or page hide / unload so no keystroke is lost
  useEffect(() => {
    const handleVisibilityOrUnload = () => {
      if (latestEnabledRef.current && isDirtyRef.current) {
        flushNow();
      }
    };

    window.addEventListener('beforeunload', handleVisibilityOrUnload);
    document.addEventListener('visibilitychange', handleVisibilityOrUnload);

    return () => {
      window.removeEventListener('beforeunload', handleVisibilityOrUnload);
      document.removeEventListener('visibilitychange', handleVisibilityOrUnload);
      if (isDirtyRef.current) {
        flushNow();
      } else {
        clearTimer();
      }
    };
  }, [clearTimer, flushNow]);

  return { flushNow, cancelPending };
}

export function loadDraftFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveDraftToStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearDraftFromStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

/**
 * Instant real-time localStorage draft persistence hook for new-record modals/forms.
 */
export function useLocalDraft<T>(storageKey: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => loadDraftFromStorage<T>(storageKey, initialValue));

  useEffect(() => {
    saveDraftToStorage(storageKey, value);
  }, [storageKey, value]);

  const clearDraft = useCallback(() => {
    clearDraftFromStorage(storageKey);
    setValue(initialValue);
  }, [storageKey, initialValue]);

  return [value, setValue, clearDraft] as const;
}
