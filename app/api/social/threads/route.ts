import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/social/threads?postId=<uuid> — Get nested comments for a post.
 * Returns comments ordered by creation time with parent_id for threading.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const postId = url.searchParams.get("postId");
  if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });

  const authClient = await createServerSupabase();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: comments, error } = await service
    .from("social_comments")
    .select("id, content, user_id, parent_id, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: "Failed to load threads" }, { status: 500 });
  }

  // Build thread tree
  type Comment = {
    id: string;
    content: string;
    user_id: string;
    parent_id: string | null;
    created_at: string;
    replies: Comment[];
  };

  const commentMap = new Map<string, Comment>();
  const roots: Comment[] = [];

  for (const c of comments ?? []) {
    commentMap.set(c.id, { ...c, replies: [] });
  }

  for (const c of commentMap.values()) {
    if (c.parent_id && commentMap.has(c.parent_id)) {
      commentMap.get(c.parent_id)!.replies.push(c);
    } else {
      roots.push(c);
    }
  }

  return NextResponse.json({ threads: roots, totalComments: comments?.length ?? 0 });
}
