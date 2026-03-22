import { createServiceClient } from "@/lib/supabase/service";

type AgeGroup = "under_13" | "teen" | "adult";

/**
 * Returns the age group stored in the agent's config.
 * Returns null if the field is missing — callers must handle the unset case
 * (default-deny: unset age_group should restrict sensitive features).
 */
export async function getAgentAgeGroup(agentId: string): Promise<AgeGroup | null> {
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

  return null; // age_group not set — callers should apply restrictions
}

/**
 * Returns true if the age group is allowed to access the feature.
 * null (unset) age group is treated as restricted — must complete age gate first.
 * "adult" features are blocked for under_13, teen, and null.
 * "teen" features are blocked for under_13 and null only.
 */
export function isAgeAllowed(
  ageGroup: AgeGroup | null,
  requiredAge: "teen" | "adult"
): boolean {
  if (!ageGroup) return false; // unset = restricted (default-deny)
  if (requiredAge === "adult") return ageGroup === "adult";
  if (requiredAge === "teen") return ageGroup === "teen" || ageGroup === "adult";
  return true;
}
