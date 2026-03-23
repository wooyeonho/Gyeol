# GYEOL — Stitch AI 프롬프트 (5개 신규 페이지)

> DESIGN.md를 먼저 Stitch에 import한 뒤, 아래 프롬프트를 하나씩 사용하세요.
> 각 프롬프트의 출력물(HTML/CSS)을 저에게 공유해주시면 React + 데이터 바인딩을 붙여드립니다.

---

## Page 1: Daily Challenges (/challenges)

```
Design a mobile-first "Daily Challenges" page for a dark mystical creature-raising app.

Background: #0a0a0f. Glass-morphism cards. Pretendard font.

Layout:
- Top: Page title "오늘의 도전" with a streak fire icon and "Day 7" badge
- 3 challenge cards stacked vertically, each with:
  - Difficulty badge (Easy=green, Medium=amber, Hard=purple) top-left
  - Challenge icon (emoji) and title
  - Description text (1 line, subtle white)
  - Progress bar (filled portion glows with difficulty color)
  - Reward chips: coin icon + amount, star icon + amount
  - Completed state: checkmark overlay, muted card
- Bottom section: "Perfect Day" bonus card (appears when all 3 done)
  - Larger, golden glow border
  - "🎉 Perfect Day!" title
  - Bonus reward display

Card style: rgba(255,255,255,0.03) background, 1px rgba(255,255,255,0.08) border, 16px radius, backdrop-blur.
Progress bar: 4px height, rounded-full, colored glow on filled portion.
Touch targets: min 48px height.
Bottom nav space: 80px bottom padding.
```

---

## Page 2: Achievements (/achievements)

```
Design a mobile-first "Achievements" page for a dark mystical creature-raising app.

Background: #0a0a0f. Glass-morphism. Pretendard font.

Layout:
- Top: Page title "업적" with total count badge "12/34"
- Category filter: horizontal scrollable pill buttons (7 categories)
  - 대화, 연속, 진화, 소셜, 탐험, 감성, 비밀
  - Active pill: white bg, black text. Inactive: rgba(255,255,255,0.06)
- Achievement grid: 2 columns
  - Each cell is a square card with:
    - Large icon/emoji centered (32px)
    - Achievement name below (13px, white)
    - Rarity glow border:
      - Common: no glow, rgba(255,255,255,0.06) border
      - Rare: blue-400 glow, blue-tinted border
      - Epic: purple-400 glow, purple-tinted border
      - Legendary: amber-400 glow, golden border
      - Mythic: animated rainbow gradient border
    - Progress bar at bottom (if not yet unlocked)
    - Unlocked: full opacity. Locked: 40% opacity with "?" overlay
    - Hidden achievement: dark silhouette with "???" text
- Detail modal (when tapped):
  - Centered overlay card, backdrop-blur-xl
  - Large icon, name, rarity badge, description
  - Progress bar with fraction "45/100"
  - Unlock date if achieved
  - Reward display

Card style: rgba(255,255,255,0.03), 16px radius.
Modal: rgba(0,0,0,0.7) backdrop, centered 320px card.
```

---

## Page 3: Mystery Box Opening (overlay component)

```
Design a full-screen mystery box opening animation sequence for a dark mystical app.

Background: rgba(0,0,0,0.85) overlay with backdrop-blur-xl.

Sequence (design each frame as a separate screen):

Frame 1 - "Box Appears":
- Center: A glowing box (64x64px) with subtle wobble
- Box has glass-morphism style: rgba(255,255,255,0.08) with colored glow
- Rarity determines glow color: white(common), blue(rare), purple(epic), gold(legendary)
- Text below: "탭하여 열기" (Tap to open)
- Subtle particle dots floating around box

Frame 2 - "Box Opening":
- Box cracks open with light beams shooting out
- Bright center glow expanding
- Particles exploding outward from center

Frame 3 - "Item Revealed":
- Item icon rises from center (large, 80px)
- Rarity name badge above: "EPIC" in purple with glow
- Item name in white (18px, bold)
- Item description in subtle text
- Reward details: "+50 coins" or "Streak Freeze x1"
- "확인" (Confirm) button at bottom: white bg, black text, rounded-full

Common: simple fade-in. Rare: blue particles. Epic: purple explosion. Legendary: golden rain + screen flash.
```

---

## Page 4: Discover Hub (redesign to bento grid)

```
Redesign the Discover Hub page for a dark mystical creature-raising app.
Mobile-first, 2x2 bento grid layout.

Background: #0a0a0f. Glass-morphism cards. Pretendard font.

Layout:
- Top: "발견" title + creature name subtitle
- 2x2 bento grid with unequal card sizes:
  - Top-left (large, spans full width): "오늘의 도전" (Daily Challenges)
    - Shows 3 mini progress dots (green/amber/purple)
    - Progress text: "2/3 완료"
    - Tap → /challenges
  - Middle-left: "활동 기록" (Activity)
    - Mini number: "23 events"
    - Small timeline icon
    - Tap → /activity
  - Middle-right: "앨범" (Album)
    - Mini number: "7 milestones"
    - Photo icon
    - Tap → /album
  - Bottom-left: "소셜" (Social)
    - Mini avatar stack (3 overlapping circles)
    - "12 new posts"
    - Tap → /social
  - Bottom-right: "탐험" (Explore)
    - Globe icon with pulse
    - "8 creatures nearby"
    - Tap → /explore
- Below grid: Quick links row → Leaderboard, Compare (pill buttons)

Each bento card:
- rgba(255,255,255,0.03) bg, rgba(255,255,255,0.08) border
- 16px radius, backdrop-blur-md
- Subtle gradient overlay matching section color
- Hover/press: scale(0.98) with smooth transition
- Icon top-left, data bottom-left, arrow bottom-right
```

---

## Page 5: Share Card (enhanced visual)

```
Design an OG share card (1200x630px) for a mystical creature-raising app.

Background: Deep gradient from #0a0a0f to #1a1a2e.

Layout:
- Left 40%: Creature visual area
  - Large glowing orb/blob shape (procedurally colored)
  - Subtle particle dots around it
  - Glass circle frame with border glow
- Right 60%: Info area
  - Creature name: "루미아" (24px, bold, white)
  - Species name italic: "Luminara Whisperwind" (14px, white/50)
  - Gen level badge: "Gen 3" in pill shape
  - Rarity badge with glow: "Epic" in purple pill
  - Stats row: "💬 1,234 messages · 🔥 45 day streak"
  - DNA mini visualization: 4-5 small colored dots representing top traits
- Bottom bar:
  - GYEOL logo (small, left)
  - CTA text: "나만의 생명체를 키워보세요" (right, subtle)
  - URL: gyeol.app

Style: Cinematic feel. Dark base with warm accent glows.
The creature's accent color (from DNA) tints the entire card subtly.
```

---

## 사용 방법

1. [stitch.withgoogle.com](https://stitch.withgoogle.com) 접속
2. DESIGN.md 내용을 프로젝트 설정에 붙여넣기
3. 위 프롬프트를 하나씩 입력하여 디자인 생성
4. 마음에 드는 결과물의 HTML/CSS를 export
5. 저에게 공유 → React 컴포넌트 + API 바인딩 작업
