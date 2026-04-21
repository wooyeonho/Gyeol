1. **Task A: The Celestial Roster (app/dna/page.tsx & components/team-manager.tsx)**
   - Modify `components/team-manager.tsx` to use a 2x3 or 3x2 responsive grid for the team roster.
   - Apply `.glass-card-deep` to each card.
   - Add a `.mesh-organic` small sphere at the top of each card.
   - Add 'Sync Rate' and 'Stability' gradient progress bars at the bottom.
   - Use `.text-section` (Noto Serif KR) for the agent name.
   - Add `breathe-glow` on hover/active, and `type: "spring", stiffness: 320, damping: 26` for animations.
   - Modify `app/dna/page.tsx` to prominently feature this section (update section title).

2. **Task B: Editorial Conversation (app/chat/page.tsx -> components/chat/message-list.tsx & components/chat-panel.tsx)**
   - In `components/chat/message-list.tsx`:
     - Remove message bubbles (`bg-white/12`, `bg-black/40`, borders) and make text appear directly.
     - Add `.mesh-organic` and `.noise-strong` to the background of the chat container.
     - Use `.font-display-serif` or `.text-section` / `font-serif` for AI responses.
     - Use Pretendard (sans-serif) for user text.
   - In `components/chat/message-input.tsx`:
     - Wrap the input area in `.glass-card-deep` and make it float at the bottom.

3. **Interaction Logic (유기적 모션)**
   - Ensure hover/active states use `.breathe-glow`.
   - Use `stiffness: 320, damping: 26` for motion components.

4. **Pre-commit checks & Submission**
   - Run linter and typecheck.
   - Submit changes.
