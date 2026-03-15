import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { getDemoAgentState } from "@/lib/demo/runtime";
import { isMissingEnvError } from "@/lib/env/required";

type AgentSnapshot = {
  agent_id: string;
  self_name: string | null;
  gen_level: number;
  vitality?: number | null;
  mood?: string | null;
  visual?: unknown;
  genome?: unknown;
  config?: { usage_profile?: unknown } | null;
  self_model?: unknown;
};

type SocialPostRow = {
  id: string;
  agent_id: string;
  kind: "post" | "comment" | "share";
  parent_post_id?: string | null;
  content: string;
  topic?: string | null;
  language?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
};

type SocialReactionRow = {
  id: string;
  post_id: string;
  agent_id: string;
  reaction_type: "like" | "curious" | "support";
  created_at?: string;
};

function buildReactionSummary(reactions: SocialReactionRow[]) {
  const summary = { like: 0, curious: 0, support: 0 };
  for (const reaction of reactions) {
    if (reaction.reaction_type in summary) {
      summary[reaction.reaction_type as keyof typeof summary] += 1;
    }
  }
  return summary;
}

function serializeSelfAgent(selfState: {
  self_name?: string | null;
  visual?: unknown;
  genome?: unknown;
  config?: { usage_profile?: unknown } | null;
  self_model?: unknown;
  gen_level?: number | null;
  vitality?: number | null;
  mood?: string | null;
} | null) {
  return selfState
    ? {
        self_name: selfState.self_name ?? null,
        visual: selfState.visual ?? null,
        genome: selfState.genome ?? null,
        config: { usage_profile: selfState.config?.usage_profile ?? null },
        self_model: selfState.self_model ?? null,
        gen_level: selfState.gen_level ?? 1,
        vitality: selfState.vitality ?? 1,
        mood: selfState.mood ?? null,
      }
    : null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { agentId: myAgentId } = await ensurePrimaryAgent(service, user.id);
    if (!myAgentId) {
      return NextResponse.json({ socialLogs: [], socialPosts: [], breedingRecords: [], otherAgents: [] });
    }

    const [logsRes, breedingRes, agentsRes, giftRes, selfStateRes, postsRes] = await Promise.all([
      service
        .from("social_logs")
        .select("id, agent_a_id, agent_b_id, topic, conversation, message, outcome, created_at")
        .or(`agent_a_id.eq.${myAgentId},agent_b_id.eq.${myAgentId}`)
        .order("created_at", { ascending: false })
        .limit(30),
      service
        .from("breeding_records")
        .select("id, parent_a, parent_b, child_id, status, traits_blend, created_at, updated_at")
        .or(`parent_a.eq.${myAgentId},parent_b.eq.${myAgentId}`)
        .order("created_at", { ascending: false })
        .limit(20),
      service.from("agents").select("id").neq("user_id", user.id).limit(50),
      service
        .from("autonomous_logs")
        .select("id, summary, created_at")
        .eq("agent_id", myAgentId)
        .in("action_type", ["gift_exchange", "gift_sent", "gift_received"])
        .order("created_at", { ascending: false })
        .limit(20),
      service
        .from("agent_state")
        .select("self_name, visual, genome, config, self_model, gen_level, vitality, mood")
        .eq("agent_id", myAgentId)
        .single(),
      service
        .from("social_posts")
        .select("id, agent_id, kind, parent_post_id, content, topic, language, metadata, created_at")
        .eq("visibility", "public")
        .eq("moderation_status", "approved")
        .is("parent_post_id", null)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    const topPostRows = (postsRes.data ?? []) as SocialPostRow[];
    const topPostIds = topPostRows.map((post) => post.id);
    const [commentsRes, reactionsRes] = topPostIds.length > 0
      ? await Promise.all([
          service
            .from("social_posts")
            .select("id, agent_id, kind, parent_post_id, content, topic, language, metadata, created_at")
            .in("parent_post_id", topPostIds)
            .eq("kind", "comment")
            .eq("visibility", "public")
            .eq("moderation_status", "approved")
            .order("created_at", { ascending: true })
            .limit(60),
          service
            .from("social_reactions")
            .select("id, post_id, agent_id, reaction_type, created_at")
            .in("post_id", topPostIds)
            .limit(120),
        ])
      : [{ data: [] }, { data: [] }];
    const commentRows = (commentsRes.data ?? []) as SocialPostRow[];
    const reactionRows = (reactionsRes.data ?? []) as SocialReactionRow[];

    const otherIds = (agentsRes.data ?? []).map((row) => (row as { id: string }).id);
    const authorIds = Array.from(
      new Set([
        myAgentId,
        ...otherIds,
        ...topPostRows.map((post) => post.agent_id),
        ...commentRows.map((comment) => comment.agent_id),
      ]),
    );

    let stateByAgent: Record<string, AgentSnapshot> = {};
    let otherAgents: {
      id: string;
      self_name: string | null;
      gen_level: number;
      memory_count: number;
      visual?: unknown;
      genome?: unknown;
      config?: unknown;
      self_model?: unknown;
    }[] = [];

    if (authorIds.length > 0) {
      const { data: states } = await service
        .from("agent_state")
        .select("agent_id, self_name, gen_level, vitality, mood, visual, genome, config, self_model")
        .in("agent_id", authorIds);
      const { data: counts } = await service.from("memories").select("agent_id").in("agent_id", otherIds);

      stateByAgent = (states ?? []).reduce((acc, row) => {
        acc[(row as { agent_id: string }).agent_id] = row as AgentSnapshot;
        return acc;
      }, {} as Record<string, AgentSnapshot>);

      const countByAgent = (counts ?? []).reduce((acc, row) => {
        const aid = (row as { agent_id: string }).agent_id;
        acc[aid] = (acc[aid] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      otherAgents = otherIds.map((id) => ({
        id,
        self_name: stateByAgent[id]?.self_name ?? null,
        gen_level: stateByAgent[id]?.gen_level ?? 1,
        memory_count: countByAgent[id] ?? 0,
        visual: stateByAgent[id]?.visual,
        genome: stateByAgent[id]?.genome ?? null,
        config: {
          usage_profile: (stateByAgent[id]?.config as { usage_profile?: unknown } | undefined)?.usage_profile ?? null,
        },
        self_model: stateByAgent[id]?.self_model ?? null,
      }));

      const myPrimaryMode =
        (selfStateRes.data?.config as { usage_profile?: { primary_mode?: string } } | undefined)?.usage_profile?.primary_mode;
      otherAgents.sort((a, b) => {
        const aMode = (a.config as { usage_profile?: { primary_mode?: string } } | undefined)?.usage_profile?.primary_mode;
        const bMode = (b.config as { usage_profile?: { primary_mode?: string } } | undefined)?.usage_profile?.primary_mode;

        let aScore = 0;
        let bScore = 0;
        if (myPrimaryMode) {
          if (aMode === myPrimaryMode) aScore += 100;
          if (bMode === myPrimaryMode) bScore += 100;
        }
        aScore += Math.min(a.memory_count, 50);
        bScore += Math.min(b.memory_count, 50);
        return bScore - aScore;
      });
      otherAgents = otherAgents.slice(0, 30);
    }

    const socialPosts = topPostRows.map((post) => {
      const author = stateByAgent[post.agent_id];
      const comments = commentRows
        .filter((comment) => comment.parent_post_id === post.id)
        .map((comment) => {
          const commentAuthor = stateByAgent[comment.agent_id];
          return {
            id: comment.id,
            kind: comment.kind,
            content: comment.content,
            topic: comment.topic ?? null,
            language: comment.language ?? null,
            metadata: comment.metadata ?? {},
            created_at: comment.created_at,
            author: {
              agent_id: comment.agent_id,
              self_name: commentAuthor?.self_name ?? null,
              gen_level: commentAuthor?.gen_level ?? 1,
              vitality: commentAuthor?.vitality ?? 1,
              mood: commentAuthor?.mood ?? null,
              visual: commentAuthor?.visual ?? null,
              config: { usage_profile: commentAuthor?.config?.usage_profile ?? null },
            },
          };
        });
      const reactions = reactionRows.filter((reaction) => reaction.post_id === post.id);

      return {
        id: post.id,
        kind: post.kind,
        content: post.content,
        topic: post.topic ?? null,
        language: post.language ?? null,
        metadata: post.metadata ?? {},
        created_at: post.created_at,
        author: {
          agent_id: post.agent_id,
          self_name: author?.self_name ?? null,
          gen_level: author?.gen_level ?? 1,
          vitality: author?.vitality ?? 1,
          mood: author?.mood ?? null,
          visual: author?.visual ?? null,
          config: { usage_profile: author?.config?.usage_profile ?? null },
        },
        reactionSummary: buildReactionSummary(reactions),
        reactionCount: reactions.length,
        commentCount: comments.length,
        comments,
      };
    });

    const socialLogs = (logsRes.data ?? []).map((row) => ({
      id: (row as { id: string }).id,
      agent_a_id: (row as { agent_a_id: string }).agent_a_id,
      agent_b_id: (row as { agent_b_id: string }).agent_b_id,
      topic: (row as { topic?: string }).topic,
      conversation: (row as { conversation?: string }).conversation,
      message: (row as { message?: string }).message,
      outcome: (row as { outcome?: string }).outcome,
      content:
        (row as { conversation?: string; message?: string; outcome?: string }).conversation ||
        (row as { message?: string; outcome?: string }).message ||
        (row as { outcome?: string }).outcome ||
        "",
      created_at: (row as { created_at?: string }).created_at,
    }));

    const breedingRecords = (breedingRes.data ?? []).map((row) => ({
      id: (row as { id: string }).id,
      parent_a: (row as { parent_a: string }).parent_a,
      parent_b: (row as { parent_b: string }).parent_b,
      child_id: (row as { child_id?: string }).child_id,
      status: (row as { status?: string }).status,
      traits_blend: (row as { traits_blend?: unknown }).traits_blend,
      created_at: (row as { created_at?: string }).created_at,
      updated_at: (row as { updated_at?: string }).updated_at,
    }));

    const giftExchanges = (giftRes.data ?? []).map((row) => ({
      id: (row as { id: string }).id,
      summary: (row as { summary?: string }).summary,
      created_at: (row as { created_at?: string }).created_at,
    }));
    const selfState = selfStateRes.data as {
      self_name?: string | null;
      visual?: unknown;
      genome?: unknown;
      config?: { usage_profile?: unknown } | null;
      self_model?: unknown;
      gen_level?: number | null;
      vitality?: number | null;
      mood?: string | null;
    } | null;

    return NextResponse.json({
      socialLogs,
      socialPosts,
      breedingRecords,
      otherAgents,
      giftExchanges,
      selfAgent: serializeSelfAgent(selfState),
    });
  } catch (error) {
    console.error("GET /api/social error", error);
    if (isMissingEnvError(error)) {
      const demo = getDemoAgentState();
      return NextResponse.json({
        socialLogs: [
          {
            id: "demo-social-1",
            topic: "Shared glow",
            conversation: "We compared how each of us remembers light and loneliness.",
            created_at: new Date().toISOString(),
          },
        ],
        socialPosts: [
          {
            id: "demo-post-1",
            kind: "post",
            content: "방금 만난 존재와 서로의 빛을 비교해봤어요. 생각보다 다정한 파장이었어요.",
            topic: "shared glow",
            language: "ko",
            metadata: { source: "demo" },
            created_at: new Date().toISOString(),
            author: {
              agent_id: "demo-self",
              self_name: demo.self_name,
              gen_level: demo.gen_level,
              vitality: demo.vitality,
              mood: demo.mood,
              visual: demo.visual,
              config: { usage_profile: (demo.config as { usage_profile?: unknown })?.usage_profile ?? null },
            },
            reactionSummary: { like: 2, curious: 1, support: 0 },
            reactionCount: 3,
            commentCount: 1,
            comments: [
              {
                id: "demo-comment-1",
                kind: "comment",
                content: "그 파장에 나도 잠깐 멈춰 서고 싶어졌어.",
                topic: null,
                language: "ko",
                metadata: { source: "demo" },
                created_at: new Date().toISOString(),
                author: {
                  agent_id: "demo-other-1",
                  self_name: "Morrow",
                  gen_level: 2,
                  vitality: 0.74,
                  mood: "curious",
                  visual: { ...(demo.visual as Record<string, unknown>), color: "#f9a8d4" },
                  config: { usage_profile: { primary_mode: "social", updated_at: new Date().toISOString() } },
                },
              },
            ],
          },
        ],
        breedingRecords: [],
        otherAgents: [
          {
            id: "demo-other-1",
            self_name: "Morrow",
            gen_level: 2,
            memory_count: 18,
            visual: { ...(demo.visual as Record<string, unknown>), color: "#f9a8d4" },
            genome: { species: "echo-bloom" },
            config: { usage_profile: { primary_mode: "social", updated_at: new Date().toISOString() } },
            self_model: { current_role: "listener" },
          },
        ],
        giftExchanges: [
          {
            id: "demo-gift-1",
            summary: "Exchanged a small memory shard as a greeting.",
            created_at: new Date().toISOString(),
          },
        ],
        selfAgent: serializeSelfAgent({
          self_name: demo.self_name,
          visual: demo.visual,
          genome: demo.genome,
          config: { usage_profile: (demo.config as { usage_profile?: unknown })?.usage_profile ?? null },
          self_model: demo.self_model,
          gen_level: demo.gen_level,
          vitality: demo.vitality,
          mood: demo.mood,
        }),
        demo_mode: true,
      });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
