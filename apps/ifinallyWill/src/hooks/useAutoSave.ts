/**
 * Auto-save hook — debounced tRPC mutations
 *
 * Saves will section data after the user stops typing for a configurable delay.
 * Shows save status indicator (saving / saved / error).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { trpc } from '../utils/trpc';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  estateDocId: string;
  section: string;
  debounceMs?: number;
}

export function useAutoSave({ estateDocId, section, debounceMs = 1500 }: UseAutoSaveOptions) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const latestDataRef = useRef<unknown>(null);

  const mutation = trpc.willData.updateSection.useMutation({
    onSuccess: () => {
      setStatus('saved');
      // Reset to idle after 2s
      setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
    },
    onError: () => {
      setStatus('error');
    },
  });

  const save = useCallback(
    (data: unknown) => {
      latestDataRef.current = data;

      // Clear existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setStatus('saving');
        mutation.mutate({
          estateDocId,
          section: section as 'personalInfo',
          data: latestDataRef.current,
        });
      }, debounceMs);
    },
    [estateDocId, section, debounceMs, mutation],
  );

  /** Save immediately without debounce */
  const saveNow = useCallback(
    (data: unknown) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setStatus('saving');
      mutation.mutate({
        estateDocId,
        section: section as 'personalInfo',
        data,
      });
    },
    [estateDocId, section, mutation],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { save, saveNow, status, isPending: mutation.isPending };
}
