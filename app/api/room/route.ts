import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { memoriesToObjects, mergeRoomObjects } from "@/lib/room/generator";
import type { RoomState } from "@/lib/room/types";
import { NextRequest, NextResponse } from "next/server";
import { getDemoAgentState, getDemoRoomObjects } from "@/lib/demo/runtime";
import { isMissingEnvError } from "@/lib/env/required";
import { logRouteError } from "@/lib/ops/logger";
import { parseBody, roomPatchBodySchema } from "@/lib/validation/schemas";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ room: null, objects: [] });

    const { data: state } = await service.from("agent_state").select("room, visual, config").eq("agent_id", agentId).single();
    const room = (state?.room as RoomState) ?? { objects: [], layout: "default", theme: "dark" };
    const visual = (state as { visual?: { color?: string } })?.visual;
    const existingObjects = Array.isArray(room.objects) ? room.objects : [];

    if (existingObjects.length < 3) {
      const { data: mems } = await service
        .from("memories")
        .select("id, type, content")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(15);
      const memories = (mems ?? []) as { id?: string; type?: string; content?: string }[];
      const generated = memoriesToObjects(memories, room.layout as "default");
      const merged = mergeRoomObjects(existingObjects, generated);
      const nextRoom: RoomState = { ...room, objects: merged };
      await service.from("agent_state").update({ room: nextRoom }).eq("agent_id", agentId);
      return NextResponse.json({
        room: nextRoom,
        objects: nextRoom.objects,
        visual,
        config: {
          usage_profile:
            ((state as { config?: { usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } } | null)?.config?.usage_profile) ?? null,
        },
      });
    }

    return NextResponse.json({
      room,
      objects: room.objects,
      visual,
      config: {
        usage_profile:
          ((state as { config?: { usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } } | null)?.config?.usage_profile) ?? null,
      },
    });
  } catch (e) {
    logRouteError("GET /api/room error", e);
    if (isMissingEnvError(e)) {
      const demoState = getDemoAgentState();
      return NextResponse.json({
        room: { objects: getDemoRoomObjects(), layout: "default", theme: "dark" },
        objects: getDemoRoomObjects(),
        visual: demoState.visual,
        config: {
          usage_profile: (demoState.config as { usage_profile?: { primary_mode?: string | null; updated_at?: string | null } })?.usage_profile ?? null,
        },
        demo_mode: true,
      });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json({ error: "CSRF origin check failed" }, { status: 403 });
  }
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await checkRateLimit(`room-patch:${user.id}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const parsed = await parseBody(req, roomPatchBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const arPosition = parsed.data.ar_position;
    const { data: state } = await service.from("agent_state").select("channels").eq("agent_id", agentId).single();
    const channels = (state?.channels as Record<string, unknown>) ?? {};
    await service.from("agent_state").update({
      channels: { ...channels, ar_position: { x: arPosition[0], y: arPosition[1], z: arPosition[2] } },
    }).eq("agent_id", agentId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    logRouteError("PATCH /api/room error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
