import { NextResponse } from "next/server";
import {
  getScheduledEvent,
  isEventActive,
  getEventTimeRemaining,
  type WorldEvent,
} from "@/lib/world/events";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/world-events — Get current active world event (if any).
 */
export async function GET() {
  const supabase = createServiceClient();

  // Check if there's a stored active event in world_state
  const { data: worldState } = await supabase
    .from("world_state")
    .select("config")
    .limit(1)
    .single();

  const config = (worldState?.config ?? {}) as Record<string, unknown>;
  const storedEvent = config.active_event as WorldEvent | undefined;

  // If stored event is still active, return it
  if (storedEvent && isEventActive(storedEvent)) {
    const remaining = getEventTimeRemaining(storedEvent);
    return NextResponse.json({
      active: true,
      event: storedEvent,
      remaining,
    });
  }

  // Check if a new event should be triggered
  const newEvent = getScheduledEvent();
  if (newEvent) {
    // Store the new event
    await supabase
      .from("world_state")
      .update({ config: { ...config, active_event: newEvent } })
      .not("id", "is", null); // update the single row

    const remaining = getEventTimeRemaining(newEvent);
    return NextResponse.json({
      active: true,
      event: newEvent,
      remaining,
    });
  }

  return NextResponse.json({ active: false, event: null, remaining: null });
}
