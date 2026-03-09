import { AuthGuard } from "@/components/auth-guard";

export const dynamic = "force-dynamic";

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
