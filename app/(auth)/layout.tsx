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
    <div className="relative min-h-screen text-foreground flex flex-col items-center justify-center p-4 overflow-hidden bg-background">
      <div className="mesh-organic absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div
        className="breathe-glow pointer-events-none absolute left-1/2 top-1/2 h-[min(80vw,460px)] w-[min(80vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-full"
        aria-hidden="true"
      />
      <LoginParticles />
      {children}
      <LegalFooter />
    </div>
  );
}
