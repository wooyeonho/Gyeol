import re

with open("components/chat/message-list.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update user bubble
content = re.sub(
    r'className=\{`max-w-\[80%\] break-words rounded-2xl px-4 py-3 text-base leading-7 text-white \$\{m\.error \? "bg-red-400/10 border border-red-400/20" : "bg-white/12"\}\`\}',
    r'className={`max-w-[75%] break-words px-4 py-1 text-base leading-7 text-white font-sans opacity-90 ${m.error ? "text-red-400" : ""}`}',
    content
)

# 2. Update flex alignment for user bubble row
content = re.sub(
    r'className=\{`flex \$\{m\.role === "user" \? "justify-end" : "justify-start"\}\`\}',
    r'className={`flex w-full ${m.role === "user" ? "justify-end" : "justify-start"}`}',
    content
)

# 3. Update assistant bubble
content = re.sub(
    r'className=\{`rounded-2xl border bg-black/40 \$\{assistantBubbleExtra\}\`\}',
    r'className={`text-section ${assistantBubbleExtra}`}',
    content
)

# 4. Remove assistant bubble inline styles
content = re.sub(
    r'style=\{\{\n\s*borderColor: `\$\{appearance\.palette\.primary\}35`,\n\s*boxShadow: `0 0 0 1px \$\{appearance\.palette\.primary\}12 inset`,\n\s*\}\}\n\s*initial=\{\{ opacity: 0, x: -8 \}\}',
    r'initial={{ opacity: 0, x: -8 }}\n              style={{ color: "rgba(255, 255, 255, 0.95)" }}',
    content
)

# 5. Update assistantBubbleExtra mapping
content = re.sub(
    r'const assistantBubbleExtra = v < 0\.15\n\s*\? "max-w-\[50%\] px-3 py-2 font-mono text-xs tracking-widest text-center opacity-80 italic"\n\s*\: v < 0\.35\n\s*\? "max-w-\[60%\] px-3 py-2 text-sm tracking-wide text-center opacity-90"\n\s*\: v < 0\.55\n\s*\? "max-w-\[70%\] px-4 py-3 text-sm leading-6"\n\s*\: v >= 0\.75\n\s*\? "max-w-\[90%\] px-5 py-4 text-base leading-8 font-light tracking-wide"\n\s*\: "max-w-\[80%\] px-4 py-3 text-base leading-7";',
    r'''const assistantBubbleExtra = v < 0.15
    ? "max-w-[70%] font-mono text-sm tracking-widest opacity-80 italic pb-6"
    : v < 0.35
      ? "max-w-[80%] text-base tracking-wide opacity-90 pb-6"
      : v < 0.55
        ? "max-w-[90%] text-lg leading-7 pb-8"
        : v >= 0.75
          ? "max-w-full text-xl leading-8 font-light tracking-wide pb-10"
          : "max-w-[90%] text-lg leading-7 pb-8";''',
    content
)

# 6. Update container padding and spacing
content = re.sub(
    r'className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-4 pr-1"',
    r'className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto py-8 px-2 space-y-12"',
    content
)

# 7. Update editorial buttons (listen, copy) to hover opacity and hide styling
content = re.sub(
    r'className="mt-2 flex justify-end gap-2"',
    r'className="mt-3 flex justify-start gap-3 opacity-0 group-hover:opacity-100 transition-opacity"',
    content
)

content = re.sub(
    r'className="min-h-10 rounded-xl px-3 text-sm text-white/78 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"',
    r'className="text-[10px] uppercase tracking-widest font-mono text-white/30 hover:text-white/80 transition-colors"',
    content
)

with open("components/chat/message-list.tsx", "w", encoding="utf-8") as f:
    f.write(content)
