"use client";

import React, { useEffect, useState } from 'react';
import { Menu, X, MessageCircle, Compass, Settings, Trophy, Users, Sparkles, BookOpen, HeartPulse, Medal, UserCircle2, Gift, Cat, Dna, Map, Brain, ShoppingBag, CreditCard, Shield, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from "@/components/i18n-provider";
import { FocusTrap } from "@/components/focus-trap";

export function NavigationHub() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslations();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const links = [
    { href: "/", icon: <MessageCircle />, label: t("nav.chat") },
    { href: "/discover", icon: <Compass />, label: t("nav.discover") },
    // Core existence surfaces
    { href: "/dna", icon: <Dna />, label: "DNA" },
    { href: "/journey", icon: <Map />, label: "여정" },
    { href: "/memories", icon: <Brain />, label: "기억" },
    { href: "/dashboard", icon: <LayoutDashboard />, label: "대시보드" },
    // Social & engagement
    { href: "/social", icon: <Users />, label: t("socialPage.title") },
    { href: "/leaderboard", icon: <Trophy />, label: t("leaderboard.title") },
    { href: "/achievements", icon: <Medal />, label: t("achievements.title") || "업적" },
    { href: "/emotion", icon: <Sparkles />, label: "감정 대시보드" },
    { href: "/diary", icon: <BookOpen />, label: "일기" },
    { href: "/wellness", icon: <HeartPulse />, label: "웰니스" },
    { href: "/community/species", icon: <Cat />, label: "종족 커뮤니티" },
    { href: "/invites", icon: <Gift />, label: "친구 초대" },
    { href: "/market", icon: <ShoppingBag />, label: "상점" },
    // Account
    { href: "/profile/customize", icon: <UserCircle2 />, label: "프로필 꾸미기" },
    { href: "/plans", icon: <CreditCard />, label: "플랜" },
    { href: "/settings/security", icon: <Shield />, label: "보안 센터" },
    { href: "/settings", icon: <Settings />, label: t("nav.settings") },
  ];

  return (
    <>
      <nav aria-label={t("common.openMenu")} role="navigation">
        <button
          onClick={() => setIsOpen(true)}
          className="theme-panel fixed top-4 right-4 z-50 flex min-h-12 min-w-12 items-center justify-center rounded-full shadow-lg theme-text-subtle transition-colors hover:brightness-105"
          aria-label={t("common.openMenu")}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          <Menu className="h-5 w-5" />
        </button>
      </nav>

      {isOpen && (
        <FocusTrap active onEscape={() => setIsOpen(false)}>
        <div className="fixed inset-0 z-50 flex flex-col items-center pt-[10vh] px-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="theme-panel relative w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col" role="dialog" aria-modal="true" aria-label={t("common.openMenu")}>
            <div className="theme-subpanel flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider theme-text-faint">
                  {t("common.openMenu")}
                </p>
                <p className="mt-1 text-sm theme-text-subtle">
                  {t("discover.moreWays")}
                </p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="min-h-10 min-w-10 p-1 theme-text-faint hover:text-[color:var(--foreground)] transition-colors"
                aria-label={t("common.close")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="p-2 py-4 flex flex-col gap-1 overflow-y-auto max-h-[60vh]" aria-label="Main navigation">
              {links.map((link) => (
                <NavLink key={link.href} href={link.href} icon={link.icon} label={link.label} onClick={() => setIsOpen(false)} />
              ))}
            </nav>
          </div>
        </div>
        </FocusTrap>
      )}
    </>
  );
}

function NavLink({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link 
      href={href}
      onClick={onClick}
      className="theme-text-subtle flex items-center px-3 py-3 hover:bg-[color:var(--theme-panel-soft)] rounded-lg group transition-colors"
    >
      <span className="theme-text-faint w-5 h-5 mr-3 group-hover:text-[color:var(--foreground)] transition-colors">
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-full h-full' })}
      </span>
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}
