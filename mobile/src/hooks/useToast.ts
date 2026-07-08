import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * 轻量 Toast Hook：自动按时清除，连续调用会重置计时器。
 * @param durationMs 显示时长，默认 2500ms
 */
export function useToast(durationMs: number = 2500) {
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setToast(null), durationMs);
  }, [durationMs]);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { toast, showToast, hideToast };
}
