import { createServiceClient } from "@/lib/supabase/service";
import { generateImage } from "@/lib/artifacts/image-gen";

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export type VideoFrame = { image: string; text: string; duration: number };

/**
 * Dream video: sequence of images + text overlay (stored as frame list; client plays as slideshow).
 */
export async function generateDreamVideo(agentId: string, dreamText: string): Promise<{ frames: VideoFrame[] } | null> {
  const service = createServiceClient();
  const parts = dreamText.split(/[.!?]\s+/).filter(Boolean).slice(0, 5);
  const frames: VideoFrame[] = [];
  for (let i = 0; i < parts.length; i++) {
    const text = parts[i] ?? "";
    const image = await generateImage(agentId, "dream", text.slice(0, 150));
    if (image) frames.push({ image, text, duration: 2 });
  }
  if (frames.length === 0) return null;
  return { frames };
}

/**
 * Memory montage: "100 days with you" - key memories as image sequence.
 */
export async function generateMemoryMontage(agentId: string, title: string, memorySummaries: string[]): Promise<{ frames: VideoFrame[] } | null> {
  const frames: VideoFrame[] = [];
  for (const summary of memorySummaries.slice(0, 10)) {
    const image = await generateImage(agentId, "mood", summary.slice(0, 150));
    if (image) frames.push({ image, text: summary.slice(0, 80), duration: 3 });
  }
  if (frames.length === 0) return null;
  return { frames };
}

export async function saveVideoArtifact(agentId: string, videoType: "dream" | "montage", content: { frames: VideoFrame[] }, title?: string): Promise<void> {
  const service = createServiceClient();
  const expiresAt = new Date(Date.now() + FORTY_EIGHT_HOURS_MS).toISOString();
  await service.from("artifacts").insert({
    agent_id: agentId,
    type: "video",
    content: JSON.stringify({ kind: videoType, title: title ?? videoType, frames: content.frames }),
    expires_at: expiresAt,
    is_preserved: false,
  });
  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "video_creation",
    summary: title ?? videoType,
  });
}
