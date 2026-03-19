import { createServiceClient } from "@/lib/supabase/service";

type AgeGroup = "under_13" | "teen" | "adult";

/**
 * Returns the age group stored in the agent's config.
 * Defaults to "adult" if the field is missing (backwards-compatible).
 */
export async function getAgentAgeGroup(agentId: string): Promise<AgeGroup> {
  const service = createServiceClient();
  const { data } = await service
    .from("agent_state")
    .select("config")
    .eq("agent_id", agentId)
    .maybeSingle();

  const config = data?.config as { age_group?: string } | null;
  const group = config?.age_group;

  if (group === "under_13" || group === "teen" || group === "adult") {
    return group;
  }

  return "adult";
}

/**
 * Returns true if the age group is allowed to access the feature.
 * "adult" features are blocked for under_13 and teen.
 * "teen" features are blocked for under_13 only.
 */
export function isAgeAllowed(
  ageGroup: AgeGroup,
  requiredAge: "teen" | "adult"
): boolean {
  if (requiredAge === "adult") return ageGroup === "adult";
  if (requiredAge === "teen") return ageGroup === "teen" || ageGroup === "adult";
  return true;
}
