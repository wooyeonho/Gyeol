import type { ReactNode } from "react";
import { LegalFooter } from "@/components/legal-footer";
import { LoginParticles } from "@/components/auth/login-particles";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen aurora-bg text-foreground flex flex-col items-center justify-center p-4 overflow-hidden">
      <div className="aurora-accent absolute inset-0 pointer-events-none" aria-hidden="true" />
      <LoginParticles />
      {children}
      <LegalFooter />
    </div>
  );
}
