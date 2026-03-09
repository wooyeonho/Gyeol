import { AuthGuard } from "@/components/auth-guard";

export const dynamic = "force-dynamic";

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
