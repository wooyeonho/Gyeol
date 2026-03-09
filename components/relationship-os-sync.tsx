"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isIncomingSnapshotNewer, normalizeRelationshipSnapshot } from "@/lib/relationship-os/snapshot";
import { useRelationshipOsStore } from "@/store/relationship-os-store";

export function RelationshipOsSync() {
  const hasHydrated = useRelationshipOsStore((state) => state.hasHydrated);
  const replaceSnapshot = useRelationshipOsStore((state) => state.replaceSnapshot);
  const profiles = useRelationshipOsStore((state) => state.profiles);
  const promises = useRelationshipOsStore((state) => state.promises);
  const approvals = useRelationshipOsStore((state) => state.approvals);
  const captures = useRelationshipOsStore((state) => state.captures);
  const stories = useRelationshipOsStore((state) => state.stories);
  const quests = useRelationshipOsStore((state) => state.quests);
  const autonomousMode = useRelationshipOsStore((state) => state.autonomousMode);

  const snapshot = useMemo(
    () => ({
      profiles,
      promises,
      approvals,
      captures,
      stories,
      quests,
      autonomousMode,
    }),
    [approvals, autonomousMode, captures, profiles, promises, quests, stories],
  );

  const [bootstrapped, setBootstrapped] = useState(false);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    if (!hasHydrated) return;
    let cancelled = false;

    async function bootstrap() {
      try {
        const supabase = supabaseRef.current;
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setBootstrapped(true);
          return;
        }

        const response = await fetch("/api/relationship-os");
        if (!response.ok) {
          if (!cancelled) setBootstrapped(true);
          return;
        }

        const json = (await response.json().catch(() => ({ snapshot: null }))) as { snapshot?: unknown };
        if (json.snapshot) {
          const incoming = normalizeRelationshipSnapshot(json.snapshot);
          const current = useRelationshipOsStore.getState();
          if (isIncomingSnapshotNewer(current, incoming)) {
            replaceSnapshot(incoming);
          }
        }
      } catch {
        // keep local state when sync bootstrap fails
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    }

    void bootstrap();

    const { data } = supabaseRef.current.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!session?.user) return;
      setBootstrapped(false);
      void bootstrap();
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [hasHydrated, replaceSnapshot]);

  useEffect(() => {
    if (!hasHydrated || !bootstrapped) return;

    const timer = window.setTimeout(async () => {
      try {
        const supabase = supabaseRef.current;
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        await fetch("/api/relationship-os", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshot }),
        });
      } catch {
        // ignore sync errors and keep local state alive
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [bootstrapped, hasHydrated, snapshot]);

  return null;
}
