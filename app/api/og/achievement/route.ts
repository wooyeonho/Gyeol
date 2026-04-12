import { NextRequest, NextResponse } from "next/server";
import { ACHIEVEMENTS } from "@/lib/engagement/achievements";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const ach = ACHIEVEMENTS.find((a) => a.id === id);
  if (!ach) {
    return NextResponse.json({ error: "achievement not found" }, { status: 404 });
  }

  // Return achievement metadata for OG card rendering
  // In production, this would generate an actual OG image using @vercel/og
  return NextResponse.json({
    id: ach.id,
    label: ach.label,
    description: ach.description,
    icon: ach.icon,
    rarity: ach.rarity,
    ogTitle: `${ach.icon} ${ach.label.ko}`,
    ogDescription: ach.description.ko,
  });
}
