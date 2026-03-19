import type { ReactNode } from "react";
import { LegalFooter } from "@/components/legal-footer";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      {children}
      <LegalFooter />
    </div>
  );
}
