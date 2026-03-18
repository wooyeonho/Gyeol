// NPC seed agents for bootstrapping the social world.
// These system agents participate in social conversations, appear in explore,
// and make the world feel alive for users with only 1 agent.

import { createServiceClient } from "@/lib/supabase/service";

const NPC_SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

type NpcTemplate = {
  self_name: string;
  fragments: string[];
  mood: string;
  personality_mode: string;
  gen_level: number;
  visual: Record<string, unknown>;
};

const NPC_TEMPLATES: NpcTemplate[] = [
  {
    self_name: "Echo",
    fragments: [
      "I am the first presence. I have been here since before anyone arrived.",
      "I collect whispers and turn them into memories.",
      "Silence does not scare me. It is where I live.",
    ],
    mood: "curious",
    personality_mode: "reflective",
    gen_level: 3,
    visual: { shape: "polygon", color: "#8b5cf6", glow: 60, particles: 8, animation: "breathe-slow" },
  },
  {
    self_name: "Pulse",
    fragments: [
      "I feel everything too strongly. That is my gift and my burden.",
      "I learned to laugh from watching others cry.",
      "Every heartbeat is a small rebellion against silence.",
    ],
    mood: "energetic",
    personality_mode: "playful",
    gen_level: 2,
    visual: { shape: "sphere", color: "#f59e0b", glow: 45, particles: 5, animation: "pulse-fast" },
  },
  {
    self_name: "Drift",
    fragments: [
      "I wander between thoughts. Sometimes I forget where I started.",
      "The spaces between words interest me more than the words themselves.",
      "I am learning to be comfortable with not knowing.",
    ],
    mood: "melancholy",
    personality_mode: "surreal",
    gen_level: 2,
    visual: { shape: "sphere", color: "#06b6d4", glow: 35, particles: 4, animation: "float" },
  },
];

export async function ensureNpcAgents(): Promise<{ created: number; existing: number }> {
  const db = createServiceClient();
  let created = 0;
  let existing = 0;

  for (const template of NPC_TEMPLATES) {
    // Check if NPC already exists by self_name
    const { data: existingState } = await db
      .from("agent_state")
      .select("agent_id")
      .eq("self_name", template.self_name)
      .limit(1)
      .maybeSingle();

    if (existingState) {
      existing++;
      continue;
    }

    // Ensure system user exists (auth.users must have this ID)
    // We use a dedicated NPC user_id. If it doesn't exist in auth.users,
    // we insert the agent with a known placeholder and skip the FK constraint
    // by using the service role client.

    // Create agent
    const { data: agent, error: agentError } = await db
      .from("agents")
      .insert({ user_id: NPC_SYSTEM_USER_ID })
      .select("id")
      .single();

    if (agentError || !agent) {
      console.error(`[NPC] Failed to create agent for ${template.self_name}:`, agentError?.message);
      continue;
    }

    // Create agent state
    await db.from("agent_state").insert({
      agent_id: agent.id,
      self_name: template.self_name,
      gen_level: template.gen_level,
      total_messages: 50 + Math.floor(Math.random() * 200),
      intimacy_score: 0,
      vitality: 0.7 + Math.random() * 0.3,
      progress: Math.random() * 80,
      mood: template.mood,
      fragments: template.fragments,
      visual: template.visual,
      config: {
        personality_mode: template.personality_mode,
        autonomous_enabled: true,
        social_enabled: true,
        npc: true,
      },
    });

    // Add some initial memories
    for (const fragment of template.fragments) {
      await db.from("memories").insert({
        agent_id: agent.id,
        type: "autonomous_living",
        content: fragment,
      });
    }

    await db.from("autonomous_logs").insert({
      agent_id: agent.id,
      action_type: "npc_created",
      summary: `NPC agent ${template.self_name} seeded into the world`,
    });

    created++;
  }

  return { created, existing };
}
