/**
 * Command palette registry.
 *
 * Inspired by Linear (⌘K), Notion (⌘P), Arc Browser (⌘T), Raycast. Every
 * action the user can take from keyboard gets registered here. The palette
 * component consumes this list and ranks candidates via a simple fuzzy match.
 */

export type CommandIcon =
  | "home"
  | "chat"
  | "memory"
  | "settings"
  | "security"
  | "search"
  | "plus"
  | "sparkles"
  | "heart"
  | "shield"
  | "leaf"
  | "moon"
  | "sun"
  | "key"
  | "lock"
  | "compass"
  | "gift"
  | "star";

export type CommandGroup =
  | "Navigation"
  | "Actions"
  | "AI"
  | "Security"
  | "Appearance"
  | "Account";

export type Command = {
  id: string;
  title: string;
  subtitle?: string;
  group: CommandGroup;
  icon?: CommandIcon;
  keywords?: string[];
  shortcut?: string[]; // e.g. ["⌘", "K"]
  /** Pure navigation: the palette will push this href. */
  href?: string;
  /** Imperative action: the palette will call this. */
  perform?: () => void | Promise<void>;
};

const registry = new Map<string, Command>();

export function registerCommand(cmd: Command): () => void {
  registry.set(cmd.id, cmd);
  return () => {
    registry.delete(cmd.id);
  };
}

export function registerCommands(cmds: Command[]): () => void {
  cmds.forEach((c) => registry.set(c.id, c));
  return () => {
    cmds.forEach((c) => registry.delete(c.id));
  };
}

export function listCommands(): Command[] {
  return Array.from(registry.values());
}

/** Default bundled commands — registered once at app bootstrap. */
export const DEFAULT_COMMANDS: Command[] = [
  // Navigation
  { id: "nav.home", title: "Home", group: "Navigation", icon: "home", href: "/", keywords: ["main", "start"] },
  { id: "nav.chat", title: "Chat with your Gyeol", group: "Navigation", icon: "chat", href: "/chat", keywords: ["talk", "message", "ai"] },
  { id: "nav.memories", title: "Memories", group: "Navigation", icon: "memory", href: "/memories", keywords: ["recall", "diary", "album"] },
  { id: "nav.album", title: "Growth album", group: "Navigation", icon: "sparkles", href: "/album" },
  { id: "nav.constellation", title: "Memory constellation", group: "Navigation", icon: "star", href: "/constellation" },
  { id: "nav.timetravel", title: "Time travel", group: "Navigation", icon: "compass", href: "/time-travel", keywords: ["history", "past"] },
  { id: "nav.social", title: "Social", group: "Navigation", icon: "heart", href: "/social", keywords: ["friends", "community"] },
  { id: "nav.market", title: "Market", group: "Navigation", icon: "gift", href: "/market" },
  { id: "nav.plans", title: "Plans & billing", group: "Account", icon: "gift", href: "/plans", keywords: ["subscription", "pro", "premium"] },
  { id: "nav.settings", title: "Settings", group: "Navigation", icon: "settings", href: "/settings" },

  // Security
  { id: "security.center", title: "Open Security Center", group: "Security", icon: "shield", href: "/settings/security", keywords: ["passkey", "2fa", "lock", "privacy"] },
  { id: "security.lock", title: "Lock the vault now", group: "Security", icon: "lock", keywords: ["logout", "signout"] },
  { id: "security.passkey", title: "Register a passkey", group: "Security", icon: "key", href: "/settings/security#passkey" },

  // AI actions
  { id: "ai.newmemory", title: "Capture a new memory", group: "AI", icon: "plus", keywords: ["note", "journal"] },
  { id: "ai.aura", title: "Show emotional aura", group: "AI", icon: "sparkles", keywords: ["mood", "feeling", "state"] },
  { id: "ai.proactive", title: "What's on your mind?", group: "AI", icon: "chat", keywords: ["starter", "suggest", "proactive"] },
  { id: "ai.deepsearch", title: "Deep memory search", group: "AI", icon: "search", keywords: ["find", "semantic", "recall"] },

  // Appearance
  { id: "appearance.dark", title: "Switch to dark theme", group: "Appearance", icon: "moon" },
  { id: "appearance.light", title: "Switch to light theme", group: "Appearance", icon: "sun" },
];

/** Score a command against a fuzzy query. Higher = better match. */
export function scoreCommand(cmd: Command, query: string): number {
  if (!query) return 1;
  const q = query.toLowerCase().trim();
  const haystacks = [
    cmd.title.toLowerCase(),
    cmd.subtitle?.toLowerCase() ?? "",
    cmd.group.toLowerCase(),
    ...(cmd.keywords ?? []).map((k) => k.toLowerCase()),
  ];

  let best = 0;
  for (const h of haystacks) {
    if (!h) continue;
    if (h === q) return 1000;
    if (h.startsWith(q)) best = Math.max(best, 800);
    else if (h.includes(q)) best = Math.max(best, 500);
    else {
      // fuzzy subsequence — every char of q appears in h, in order
      let hi = 0;
      let matched = 0;
      for (let qi = 0; qi < q.length; qi++) {
        while (hi < h.length && h[hi] !== q[qi]) hi++;
        if (hi === h.length) break;
        matched++;
        hi++;
      }
      if (matched === q.length) {
        best = Math.max(best, 200 + Math.floor((matched / h.length) * 100));
      }
    }
  }
  return best;
}

export function searchCommands(query: string, commands?: Command[]): Command[] {
  const pool = commands ?? DEFAULT_COMMANDS.concat(listCommands());
  const scored = pool
    .map((cmd) => ({ cmd, score: scoreCommand(cmd, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((x) => x.cmd);
}
