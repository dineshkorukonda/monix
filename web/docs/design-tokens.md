# Monix Design Tokens & Editorial UI System

## Philosophy & Direction
- **Restrained & Editorial**: Inspired by *thinkingmachines.ai* — quiet typography-led hierarchy, generous whitespace, near-white background, near-black text.
- **Flat Surfaces & Hairline Borders**: No heavy card drop shadows, no SaaS-dashboard gradients. Separation is achieved through subtle `#E8E6E1` hairline dividers and clear spacing.
- **Single Accent Color**: A muted copper/amber (`#B5622C`) used strictly for interactive highlights (the Analyze button, link underlines, active/hover indicators, category badges). Never used as a large background fill.

---

## Palette Tokens

| Token | Hex Value | Role |
|---|---|---|
| `--background` | `#FAFAF8` | Softer near-white page background |
| `--foreground` | `#161513` | Near-black primary text color |
| `--muted-foreground` | `#6B6862` | Mid-gray secondary & description text |
| `--accent` | `#B5622C` | Muted copper/amber accent (CTA, underlines, badges) |
| `--accent-foreground` | `#FFFFFF` | Text on top of accent badges/buttons |
| `--border` / `--input` | `#E8E6E1` | Hairline border & input divider |
| `--card` / `--popover` | `#FFFFFF` | Clean flat surface for cards and dropdowns |
| `--secondary` / `--muted` | `#F4F2ED` | Subtle warm off-white for tags and badges |

---

## Typography

| Role | Font Family | Tailwind Class | Usage |
|---|---|---|---|
| **Headings** | Newsreader / Serif | `font-serif` | Editorial hero headlines, section headers |
| **Body** | Inter / Sans-serif | `font-sans` | Body copy, descriptions, navigation, buttons |
| **Metrics & Code** | JetBrains Mono / Monospace | `font-mono` | Scores (e.g. `94/100`), URLs, headers, timestamps |

---

## Component Guidelines
1. **Buttons**:
   - Primary: `#B5622C` accent background with white text, flat border, no shadow.
   - Secondary / Ghost: Near-black text or underline decoration, transparent background.
2. **Cards / Panels**:
   - `.panel-flat`: `border border-[#E8E6E1] bg-white` with sharp/micro radius, zero shadow.
3. **Badges**:
   - Muted tags: `bg-[#F4F2ED] text-[#161513] border border-[#E8E6E1] font-mono text-xs`.
