import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { narrativeChoiceBodySchema, parseBody } from "@/lib/validation/schemas";
import {
  STORY_EVENTS,
  type NarrativeState,
  type StoryChoice,
} from "@/lib/game/narrative-system";

/**
 * GET /api/narrative — Load narrative state from server.
 */
 

export async function GET(_req: Request) {
  const authClient = await createServerSupabase();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data } = await service
    .from("narrative_history")
    .select("event_id, choice_id, consequence_type, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const completedEvents: string[] = [];
  const choiceHistory: { eventId: string; choiceId: string; timestamp: string }[] = [];
  const personalityTendency: Record<string, number> = {
    kind: 0, bold: 0, curious: 0, playful: 0, serious: 0, rebellious: 0,
  };

  for (const row of data ?? []) {
    if (!completedEvents.includes(row.event_id)) {
      completedEvents.push(row.event_id);
    }
    choiceHistory.push({
      eventId: row.event_id,
      choiceId: row.choice_id,
      timestamp: row.created_at,
    });

    // Reconstruct personality tendency from choices
    const event = STORY_EVENTS.find((e) => e.id === row.event_id);
    const choice = event?.choices.find((c: StoryChoice) => c.id === row.choice_id);
    if (choice) {
      personalityTendency[choice.type] = (personalityTendency[choice.type] ?? 0) + 1;
    }
  }

  const state: NarrativeState = { completedEvents, choiceHistory, personalityTendency };
  return NextResponse.json({ state, totalChoices: choiceHistory.length });
}

/**
 * POST /api/narrative — Save a narrative choice to the server.
 * Body: { eventId, choiceId }
 */
export async function POST(req: NextRequest) {
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const authClient = await createServerSupabase();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(`narrative:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = await parseBody(req, narrativeChoiceBodySchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { eventId, choiceId } = parsed.data;

  // Validate event and choice exist
  const event = STORY_EVENTS.find((e) => e.id === eventId);
  if (!event) return NextResponse.json({ error: "Unknown event" }, { status: 400 });

  const choice = event.choices.find((c: StoryChoice) => c.id === choiceId);
  if (!choice) return NextResponse.json({ error: "Unknown choice" }, { status: 400 });

  const service = createServiceClient();

  // Check if non-repeatable event was already completed
  if (!event.repeatable) {
    const { data: existing } = await service
      .from("narrative_history")
      .select("id")
      .eq("user_id", user.id)
      .eq("event_id", eventId)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Event already completed" }, { status: 409 });
    }
  }

  // Save choice
  const { error } = await service.from("narrative_history").insert({
    user_id: user.id,
    event_id: eventId,
    choice_id: choiceId,
    choice_type: choice.type,
    consequence_type: choice.consequenceType,
    dna_effects: choice.dnaEffects,
    affinity_delta: choice.affinityDelta,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to save choice" }, { status: 500 });
  }

  return NextResponse.json({
    saved: true,
    consequenceType: choice.consequenceType,
    dnaEffects: choice.dnaEffects,
    affinityDelta: choice.affinityDelta,
  });
}
