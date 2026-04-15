'use client';

import { useState, useCallback, useRef } from 'react';

export type CollisionType = 'intersection' | 'duplicate';

export interface ClashResultItem {
  guidA: string;
  nameA: string | null;
  guidB: string;
  nameB: string | null;
  clashPoint: [number, number, number] | null;
  type: 'intersection' | 'duplicate';
}

export interface ClashState {
  status: 'idle' | 'processing' | 'done' | 'error';
  results: ClashResultItem[];
  count: number;
}

export interface DetectParams {
  collisionType: CollisionType;
  toleranceMm: number;
  modelIdB?: string;
  excludedTypes: string[];
}

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_MS = 10 * 60 * 1000; // 10 minutes

export function useCollisions(projectId: string, modelId: string) {
  const [clashState, setClashState] = useState<ClashState>({
    status: 'idle',
    results: [],
    count: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const poll = useCallback(async () => {
    if (Date.now() - startedAtRef.current > MAX_POLL_MS) {
      stopPolling();
      setClashState(s => ({ ...s, status: 'error' }));
      return;
    }

    try {
      const res = await fetch(
        `/api/projects/${projectId}/bim/models/${modelId}/clash`
      );
      if (!res.ok) return;

      const json = await res.json() as {
        success: boolean;
        data: {
          clashStatus: string | null;
          clashResults: {
            count: number;
            results: ClashResultItem[];
          } | null;
        };
      };
      if (!json.success) return;

      const { clashStatus, clashResults } = json.data;

      if (clashStatus === 'DONE') {
        stopPolling();
        setClashState({
          status: 'done',
          results: clashResults?.results ?? [],
          count: clashResults?.count ?? 0,
        });
      } else if (clashStatus === 'ERROR') {
        stopPolling();
        setClashState(s => ({ ...s, status: 'error' }));
      }
    } catch {
      // Network error — keep polling
    }
  }, [projectId, modelId, stopPolling]);

  const detect = useCallback(
    async (params: DetectParams) => {
      stopPolling();
      setClashState({ status: 'processing', results: [], count: 0 });

      try {
        const res = await fetch(
          `/api/projects/${projectId}/bim/models/${modelId}/clash`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              modelIdB: params.modelIdB || undefined,
              tolerance: params.toleranceMm,
              checkDuplicates: params.collisionType === 'duplicate',
              excludedTypes: params.excludedTypes,
            }),
          }
        );

        if (!res.ok) {
          setClashState(s => ({ ...s, status: 'error' }));
          return;
        }

        startedAtRef.current = Date.now();
        intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
      } catch {
        setClashState(s => ({ ...s, status: 'error' }));
      }
    },
    [projectId, modelId, stopPolling, poll]
  );

  const clear = useCallback(() => {
    stopPolling();
    setClashState({ status: 'idle', results: [], count: 0 });
  }, [stopPolling]);

  return { clashState, detect, clear };
}
