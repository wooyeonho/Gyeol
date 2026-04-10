"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Menu, X, Search } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from "@/components/i18n-provider";
import { FocusTrap } from "@/components/focus-trap";
import { haptic } from "@/lib/micro-interactions";

type NavItem = {
  href: string;
  emoji: string;
  label: string;
  desc: string;
};

type NavGroup = {
  id: string;
  title: string;
  eyebrow: string;
  items: NavItem[];
};

/**
 * Global app directory — hamburger menu that surfaces EVERY feature page.
 * Before this rewrite, only 5 pages were reachable, so dozens of built
 * features were invisible to the user. Now every page lives in a
 * categorized, searchable grid.
 */
export function NavigationHub() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { locale, t } = useTranslations();
  const isKo = locale === "ko";

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const groups: NavGroup[] = useMemo(() => [
    {
      id: "core",
      eyebrow: isKo ? "핵심" : "Core",
      title: isKo ? "매일 쓰는 화면" : "Everyday screens",
      items: [
        { href: "/",            emoji: "💬", label: isKo ? "대화"       : "Chat",       desc: isKo ? "크리처와 실시간 대화" : "Live chat with your creature" },
        { href: "/discover",    emoji: "🧭", label: isKo ? "디스커버"   : "Discover",   desc: isKo ? "모든 피처의 관문"     : "Hub of every feature" },
        { href: "/settings",    emoji: "⚙️", label: isKo ? "설정"       : "Settings",   desc: isKo ? "테마 · 언어 · 계정"   : "Theme · language · account" },
        { href: "/dashboard",   emoji: "📊", label: isKo ? "대시보드"   : "Dashboard",  desc: isKo ? "전체 현황 한눈에"     : "Everything at a glance" },
        { href: "/profile/customize", emoji: "👤", label: isKo ? "프로필 꾸미기" : "Profile", desc: isKo ? "배경 · 배지 · 핀" : "Backgrounds · badges · pins" },
      ],
    },
    {
      id: "creature",
      eyebrow: isKo ? "크리처" : "Creature",
      title: isKo ? "돌봄과 진화" : "Care & evolution",
      items: [
        { href: "/care",        emoji: "🍖", label: isKo ? "돌보기"     : "Care",       desc: isKo ? "먹이·휴식·놀이"       : "Feed · rest · play" },
        { href: "/room",        emoji: "🏡", label: isKo ? "크리처 룸"  : "Creature Room", desc: isKo ? "3D 공간 꾸미기"    : "3D room designer" },
        { href: "/dna",         emoji: "🧬", label: isKo ? "DNA 뷰어"   : "DNA Viewer", desc: isKo ? "16축 유전자 분석"     : "16-axis genome map" },
        { href: "/dna-edit",    emoji: "✂️", label: isKo ? "DNA 편집"   : "DNA Edit",   desc: isKo ? "유전자 리믹스"        : "Remix the genome" },
        { href: "/breeding",    emoji: "💞", label: isKo ? "브리딩"     : "Breeding",   desc: isKo ? "크로스 진화 실험"     : "Cross-evolution lab" },
        { href: "/adopt",       emoji: "🤝", label: isKo ? "분양"       : "Adopt",      desc: isKo ? "다른 존재 맞이하기"   : "Welcome another being" },
        { href: "/crisis",      emoji: "🆘", label: isKo ? "위기"       : "Crisis",     desc: isKo ? "살리기 모드"          : "Revival mode" },
      ],
    },
    {
      id: "play",
      eyebrow: isKo ? "플레이" : "Play",
      title: isKo ? "챌린지 · 게임" : "Challenges & games",
      items: [
        { href: "/challenges",  emoji: "⚡", label: isKo ? "챌린지"     : "Challenges", desc: isKo ? "일일 · 주간 미션"     : "Daily & weekly missions" },
        { href: "/gacha",       emoji: "🎰", label: isKo ? "가챠"       : "Gacha",      desc: isKo ? "스크래치 · 스핀 휠"   : "Scratch · spin wheel" },
        { href: "/quiz",        emoji: "❓", label: isKo ? "퀴즈"       : "Quiz",       desc: isKo ? "지식 챌린지"          : "Knowledge challenge" },
        { href: "/compare",     emoji: "⚔️", label: isKo ? "배틀 비교"  : "Compare",    desc: isKo ? "크리처 스탯 비교"     : "Stat-by-stat head to head" },
        { href: "/events",      emoji: "🎪", label: isKo ? "이벤트"     : "Events",     desc: isKo ? "시즌 이벤트 모음"     : "Seasonal events" },
        { href: "/events/war",  emoji: "⚔️", label: isKo ? "워 이벤트"  : "War Event",  desc: isKo ? "라이브 전투"          : "Live warfare" },
        { href: "/world-events",emoji: "🌍", label: isKo ? "월드 이벤트": "World Events", desc: isKo ? "글로벌 동시 이벤트" : "Global simultaneous events" },
      ],
    },
    {
      id: "memory",
      eyebrow: isKo ? "기억" : "Memory",
      title: isKo ? "추억과 기록" : "Memories & records",
      items: [
        { href: "/memories",     emoji: "⭐", label: isKo ? "메모리 타임라인" : "Memories", desc: isKo ? "날짜별 기억 흐름" : "Timeline of memories" },
        { href: "/constellation",emoji: "🌌", label: isKo ? "별자리"          : "Constellation", desc: isKo ? "기억 별자리"   : "Memory constellation" },
        { href: "/diary",        emoji: "📓", label: isKo ? "다이어리"        : "Diary",      desc: isKo ? "크리처가 쓴 일기" : "Creature's diary" },
        { href: "/album",        emoji: "🖼", label: isKo ? "앨범"            : "Album",      desc: isKo ? "마일스톤 컬렉션"  : "Milestone collection" },
        { href: "/journey",      emoji: "🛤", label: isKo ? "여정"            : "Journey",    desc: isKo ? "성장 스토리보드"  : "Growth storyboard" },
        { href: "/time-travel",  emoji: "⏳", label: isKo ? "타임 트래블"     : "Time Travel", desc: isKo ? "과거의 결과 대화" : "Chat with past self" },
        { href: "/wrapped",      emoji: "🎁", label: isKo ? "연간 요약"       : "Wrapped",    desc: isKo ? "올해의 결"        : "Your year with GYEOL" },
      ],
    },
    {
      id: "wellness",
      eyebrow: isKo ? "웰빙" : "Wellness",
      title: isKo ? "마음과 몸" : "Mind & body",
      items: [
        { href: "/wellness",    emoji: "💚", label: isKo ? "웰니스"     : "Wellness",   desc: isKo ? "일일 감정 체크인"     : "Daily mood check-in" },
        { href: "/creature-conversation", emoji: "🗣", label: isKo ? "크리처 대화" : "Creature Talk", desc: isKo ? "음성 세션" : "Voice session" },
      ],
    },
    {
      id: "social",
      eyebrow: isKo ? "소셜" : "Social",
      title: isKo ? "커뮤니티" : "Community",
      items: [
        { href: "/feed",             emoji: "📰", label: isKo ? "피드"     : "Feed",      desc: isKo ? "전체 · 친구 · AI 추천" : "All · Friends · AI" },
        { href: "/social",           emoji: "🫂", label: isKo ? "소셜"     : "Social",    desc: isKo ? "포스트와 리액션"        : "Posts & reactions" },
        { href: "/community",        emoji: "🏛", label: isKo ? "커뮤니티" : "Community", desc: isKo ? "공개 라운지"            : "Public lounges" },
        { href: "/community/spaces", emoji: "🌐", label: isKo ? "스페이스" : "Spaces",    desc: isKo ? "니치 커뮤니티"         : "Niche communities" },
        { href: "/leaderboard",      emoji: "🏆", label: isKo ? "리더보드" : "Leaderboard", desc: isKo ? "주간 · 월간 랭킹"    : "Weekly / monthly rank" },
        { href: "/explore",          emoji: "🔭", label: isKo ? "탐색"     : "Explore",   desc: isKo ? "다른 크리처 둘러보기"   : "Browse other creatures" },
        { href: "/invite",           emoji: "💌", label: isKo ? "초대"     : "Invite",    desc: isKo ? "친구 초대 링크"         : "Invite friends" },
      ],
    },
    {
      id: "rewards",
      eyebrow: isKo ? "경제" : "Economy",
      title: isKo ? "코인과 상점" : "Coins & shop",
      items: [
        { href: "/market",    emoji: "🛒", label: isKo ? "마켓"   : "Market",   desc: isKo ? "아이템 · 스킨 · 쉴드" : "Items · skins · shields" },
        { href: "/plans",     emoji: "💎", label: isKo ? "플랜"   : "Plans",    desc: isKo ? "구독 · 배틀패스"       : "Subscription · battle pass" },
        { href: "/moltbook",  emoji: "📗", label: isKo ? "몰트북" : "Moltbook", desc: isKo ? "환생 기록"             : "Rebirth history" },
        { href: "/molthub",   emoji: "🌐", label: isKo ? "몰트허브": "Molthub", desc: isKo ? "커뮤니티 환생 피드"    : "Rebirth community feed" },
      ],
    },
    {
      id: "immersive",
      eyebrow: isKo ? "몰입" : "Immersive",
      title: isKo ? "AR · 생성형" : "AR & generative",
      items: [
        { href: "/ar",                emoji: "📱", label: isKo ? "AR 모드"    : "AR Mode",    desc: isKo ? "현실 속 크리처"     : "Creature in the real world" },
        { href: "/generate",          emoji: "🎨", label: isKo ? "이미지 생성": "Generate",   desc: isKo ? "AI 초상화"          : "AI portraits" },
        { href: "/share/evolution",   emoji: "📣", label: isKo ? "진화 공유"  : "Share Evo",  desc: isKo ? "진화 순간 공유"     : "Share evolution moments" },
        { href: "/features",          emoji: "✨", label: isKo ? "피처 쇼케이스": "Features", desc: isKo ? "전체 기능 소개"     : "Full feature showcase" },
      ],
    },
    {
      id: "trust",
      eyebrow: isKo ? "안전" : "Trust",
      title: isKo ? "데이터 · 법적 고지" : "Data & legal",
      items: [
        { href: "/achievements",        emoji: "🎖", label: isKo ? "업적"      : "Achievements", desc: isKo ? "수집한 배지"    : "Collected badges" },
        { href: "/activity",            emoji: "📈", label: isKo ? "활동 로그" : "Activity",     desc: isKo ? "최근 활동"     : "Recent activity" },
        { href: "/privacy",             emoji: "🔒", label: isKo ? "개인정보"  : "Privacy",      desc: isKo ? "프라이버시 정책" : "Privacy policy" },
        { href: "/privacy/data-dashboard", emoji: "🗂", label: isKo ? "데이터 대시보드" : "Data Dashboard", desc: isKo ? "내 데이터 관리" : "Manage your data" },
        { href: "/terms",               emoji: "📜", label: isKo ? "이용약관"  : "Terms",        desc: isKo ? "서비스 약관"    : "Terms of service" },
        { href: "/ops",                 emoji: "🛠", label: isKo ? "운영"     : "Ops",          desc: isKo ? "운영자 콘솔"   : "Operator console" },
      ],
    },
  ], [isKo]);

  const totalItems = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) =>
          i.label.toLowerCase().includes(q) ||
          i.desc.toLowerCase().includes(q) ||
          i.href.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  const handleOpen = () => {
    haptic("tap");
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery("");
  };

  return (
    <>
      <nav aria-label={t("common.openMenu")} role="navigation">
        <button
          onClick={handleOpen}
          className="fixed top-4 right-4 z-50 flex min-h-12 min-w-12 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/85 shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-black/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          aria-label={isKo ? "전체 메뉴 열기" : "Open full menu"}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          <Menu className="h-5 w-5" />
        </button>
      </nav>

      {isOpen && (
        <FocusTrap active onEscape={handleClose}>
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-start px-4 pt-[6vh] sm:pt-[10vh]">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
              onClick={handleClose}
              aria-hidden="true"
            />

            <div
              className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/12 bg-[#0b0b12]/95 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label={isKo ? "전체 기능 메뉴" : "All features menu"}
              style={{ maxHeight: "min(88vh, 900px)" }}
            >
              {/* Header */}
              <div className="border-b border-white/10 bg-white/[0.02] px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
                      {isKo ? "전체 기능" : "All features"}
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-white">
                      {isKo ? `GYEOL · ${totalItems}개 화면` : `GYEOL · ${totalItems} screens`}
                    </h2>
                    <p className="mt-0.5 text-xs text-white/50">
                      {isKo ? "모든 피처를 한 곳에서 탐색하세요" : "Every feature, one place"}
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="flex min-h-10 min-w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    aria-label={isKo ? "닫기" : "Close"}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Search */}
                <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 focus-within:border-cyan-400/40">
                  <Search className="h-4 w-4 text-white/40" aria-hidden="true" />
                  <input
                    type="search"
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={isKo ? "페이지 검색…" : "Search pages…"}
                    className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
                    aria-label={isKo ? "페이지 검색" : "Search pages"}
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="text-xs text-white/40 hover:text-white/70"
                    >
                      {isKo ? "지우기" : "Clear"}
                    </button>
                  )}
                </div>
              </div>

              {/* Body — categorized grid */}
              <div className="flex-1 overflow-y-auto px-5 py-5">
                {filteredGroups.length === 0 ? (
                  <div className="py-14 text-center text-sm text-white/40">
                    {isKo ? "결과가 없어요" : "No matching pages"}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredGroups.map((group) => (
                      <section key={group.id} aria-labelledby={`nav-group-${group.id}`}>
                        <div className="mb-2 flex items-baseline gap-2">
                          <h3
                            id={`nav-group-${group.id}`}
                            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40"
                          >
                            {group.eyebrow}
                          </h3>
                          <span className="text-[11px] text-white/25">· {group.title}</span>
                        </div>
                        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {group.items.map((item) => (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                onClick={() => {
                                  haptic("tap");
                                  handleClose();
                                }}
                                className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-3 transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                              >
                                <span
                                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-lg transition-colors group-hover:bg-white/[0.12]"
                                  aria-hidden="true"
                                >
                                  {item.emoji}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-white">{item.label}</p>
                                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/45">
                                    {item.desc}
                                  </p>
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer hint */}
              <div className="border-t border-white/10 bg-white/[0.02] px-5 py-2.5 text-center">
                <p className="text-[10px] text-white/30">
                  {isKo ? "⌘K 로도 빠르게 열 수 있어요" : "Tip: press ⌘K for command palette"}
                </p>
              </div>
            </div>
          </div>
        </FocusTrap>
      )}
    </>
  );
}
