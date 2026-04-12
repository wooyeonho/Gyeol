"use client";

import { useCallback, useRef, useState } from "react";

/**
 * useOptimisticMutation — generic hook for optimistic UI updates.
 *
 * Immediately applies a mutation to local state, fires the API call
 * in the background, and rolls back if it fails.
 *
 * Inspired by: Instagram's like button, Linear's instant actions,
 * Twitter's optimistic follow/unfollow.
 *
 * Usage:
 *   const { mutate, isPending, error } = useOptimisticMutation({
 *     current: isFollowing,
 *     onMutate: (next) => setIsFollowing(next),
 *     action: (next) => fetch(`/api/follow`, { method: next ? "POST" : "DELETE" }),
 *   });
 *   <button onClick={() => mutate(!isFollowing)}>Follow</button>
 */

interface OptimisticMutationOptions<T> {
  /** Current value before mutation */
  current: T;
  /** Optimistically apply the new value (setState callback) */
  onMutate: (value: T) => void;
  /** Async action to persist the change. Throw to trigger rollback. */
  action: (value: T) => Promise<unknown>;
  /** Optional callback on successful commit */
  onSuccess?: (value: T) => void;
  /** Optional callback on rollback */
  onError?: (error: unknown, rolledBackTo: T) => void;
}

export function useOptimisticMutation<T>(opts: OptimisticMutationOptions<T>) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const rollbackRef = useRef<T>(opts.current);

  const mutate = useCallback(
    async (nextValue: T) => {
      // Save rollback point
      rollbackRef.current = opts.current;

      // Optimistic update
      opts.onMutate(nextValue);
      setIsPending(true);
      setError(null);

      try {
        await opts.action(nextValue);
        opts.onSuccess?.(nextValue);
      } catch (err) {
        // Rollback
        opts.onMutate(rollbackRef.current);
        setError(err);
        opts.onError?.(err, rollbackRef.current);
      } finally {
        setIsPending(false);
      }
    },
    [opts],
  );

  return { mutate, isPending, error };
}
