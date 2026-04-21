"use client";

import { type Channel, formatChannelName } from "@/lib/social/channel-system";

type ChannelListProps = {
  channels: Channel[];
  activeChannelId: string | null;
  locale: string;
  onSelect: (channel: Channel) => void;
};

export function ChannelList({
  channels,
  activeChannelId,
  locale,
  onSelect,
}: ChannelListProps) {
  return (
    <nav
      aria-label="Channel list"
      className="w-full overflow-y-auto rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl"
    >
      <ul className="divide-y divide-white/[0.06]">
        {channels.map((channel) => {
          const isActive = channel.id === activeChannelId;
          return (
            <li key={channel.id}>
              <button
                type="button"
                onClick={() => onSelect(channel)}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                  isActive
                    ? "border-l-2 border-cyan-300/50 bg-cyan-400/10 text-white"
                    : "border-l-2 border-transparent text-white/80 hover:bg-white/[0.05]"
                }`}
              >
                {/* Icon */}
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-base">
                  {channel.icon}
                </span>

                {/* Name + description */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-medium ${
                      isActive ? "text-white" : "text-white/90"
                    }`}
                  >
                    {formatChannelName(channel, locale)}
                  </p>
                  <p className="mt-0.5 truncate text-xs leading-5 text-white/50">
                    {locale === "ko" || locale.startsWith("ko-")
                      ? channel.description.ko
                      : channel.description.en}
                  </p>
                </div>

                {/* Member count */}
                <span className="mt-1 shrink-0 text-xs tabular-nums text-white/35">
                  {channel.memberCount.toLocaleString()}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
