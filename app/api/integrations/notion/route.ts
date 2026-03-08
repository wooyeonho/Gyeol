import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateEmbedding } from "@/lib/ai/embedding";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const accessToken = typeof body?.access_token === "string" ? body.access_token : null;
    if (!accessToken) return NextResponse.json({ error: "access_token required" }, { status: 400 });

    const service = createServiceClient();
    await service.from("user_connections").upsert(
      {
        user_id: user.id,
        service: "notion",
        token_encrypted: accessToken,
        metadata: {},
      },
      { onConflict: "user_id,service" }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("integrations/notion POST", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// GET: Fetch recent Notion pages and inject into agent memory
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: conn } = await service
      .from("user_connections")
      .select("token_encrypted")
      .eq("user_id", user.id)
      .eq("service", "notion")
      .single();
    if (!conn) return NextResponse.json({ error: "Notion not connected" }, { status: 404 });

    const token = (conn as { token_encrypted: string }).token_encrypted;

    // Search recently edited pages
    const searchRes = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({ sort: { direction: "descending", timestamp: "last_edited_time" }, page_size: 10 }),
    });
    if (!searchRes.ok) return NextResponse.json({ error: "Notion API error", status: searchRes.status }, { status: 502 });

    type NotionPage = { object: string; properties?: { title?: { title?: { plain_text?: string }[] }; Name?: { title?: { plain_text?: string }[] } }; title?: { plain_text?: string }[] };
    const data = (await searchRes.json()) as { results?: NotionPage[] };

    const { data: agents } = await service.from("agents").select("id").eq("user_id", user.id).limit(1);
    const agentId = agents?.[0]?.id;
    if (!agentId) return NextResponse.json({ synced: 0 });

    let synced = 0;
    for (const page of (data.results ?? []).slice(0, 5)) {
      if (page.object !== "page") continue;
      const titleArr =
        page.properties?.title?.title ??
        page.properties?.Name?.title ??
        page.title ??
        [];
      const title = titleArr.map((t) => t.plain_text ?? "").join("").trim();
      if (!title) continue;
      const content = `Notion page: "${title}"`;
      const embedding = await generateEmbedding(content).catch(() => [] as number[]);
      await service.from("memories").insert({
        agent_id: agentId,
        type: "notion_page",
        content,
        embedding: embedding.length > 0 ? embedding : null,
      });
      synced++;
    }

    return NextResponse.json({ synced });
  } catch (e) {
    console.error("integrations/notion GET", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
