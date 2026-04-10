import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MemoriesTimeline } from "@/components/memories-timeline";

export const metadata = {
  title: "메모리 타임라인 | GYEOL",
  description: "크리처와 나눈 소중한 순간들",
};

export default async function MemoriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch memories
  const { data: memories } = await supabase
    .from("memories")
    .select("id, content, created_at, emotion, importance")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-4 pt-8 pb-24">
      <div className="mx-auto max-w-lg">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">메모리 타임라인</h1>
          <p className="mt-1 text-sm text-white/40">크리처와 나눈 소중한 순간들</p>
        </div>
        <MemoriesTimeline memories={memories ?? []} />
      </div>
    </main>
  );
}
