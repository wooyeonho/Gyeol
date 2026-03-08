import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { memoriesToObjects, mergeRoomObjects } from "@/lib/room/generator";
import type { RoomState } from "@/lib/room/types";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ room: null, objects: [] });

    const { data: state } = await service.from("agent_state").select("room, visual").eq("agent_id", agentId).single();
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
      return NextResponse.json({ room: nextRoom, objects: nextRoom.objects, visual });
    }

    return NextResponse.json({ room, objects: room.objects, visual });
  } catch (e) {
    console.error("GET /api/room error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const arPosition = body.ar_position as [number, number, number] | undefined;
    if (arPosition && Array.isArray(arPosition) && arPosition.length === 3) {
      const { data: state } = await service.from("agent_state").select("channels").eq("agent_id", agentId).single();
      const channels = (state?.channels as Record<string, unknown>) ?? {};
      await service.from("agent_state").update({
        channels: { ...channels, ar_position: { x: arPosition[0], y: arPosition[1], z: arPosition[2] } },
      }).eq("agent_id", agentId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  } catch (e) {
    console.error("PATCH /api/room error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
