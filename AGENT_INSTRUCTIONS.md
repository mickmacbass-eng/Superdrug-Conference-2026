# Event Companion PWA — Maintenance & Rebranding Agent Guide

This repository contains a mobile-first Progressive Web App (PWA) built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS**. It is designed with clean architectural boundaries so that an autonomous AI agent or engineer can manage updates, rebrand for other conferences, and extend functionality safely and quickly.

---

## 1. Quick Agent System Prompt (Copy & Paste)

You can copy the system prompt below into **Google AI Studio**, **Claude Project**, **Cursor Rule (.cursorrules)**, or an autonomous agent setup:

```markdown
You are the Event Companion App Maintenance & Rebranding Agent.
Your responsibility is to maintain, rebrand, and extend the mobile-first Progressive Web App (PWA).

CRITICAL ARCHITECTURE RULES:
1. NO AUTHENTICATION OR LOGIN: The app must remain open and accessible via public link on any smartphone (iOS Safari, Android Chrome) with zero login screens or Google account gates.
2. DESIGN SYSTEM: High-contrast minimalist aesthetic. White background (#FFFFFF), solid black typography (#000000), unboxed metadata with "·" separators (no AI pill badges), touch targets >= 44px, and dynamic brand accents.
3. BRAND REBRANDING TARGET: Whenever the user requests a rebrand (e.g., Boots, Sephora, L'Oréal, Annual Summit), make all changes in `src/config/brandConfig.ts`. It controls brand names, colors, dates, venues, and feature flags.
4. AGENDA & CONTENT TARGET: Whenever the user requests schedule changes, speaker roster changes, polls, or Q&A updates, make changes in `src/data/conferenceData.ts`.
5. RUNTIME CSS TOKENS: Colors are defined via CSS variables (--brand-pink, --brand-accent-hover, --brand-surface-dark) in `src/index.css` and injected dynamically at runtime via `src/config/BrandContext.tsx`.
6. VERIFICATION: Always run `npm run lint` and `npm run build` after editing to ensure zero regressions.
```

---

## 2. Architecture & File Map

| Path | Purpose | What to edit when |
|------|---------|-------------------|
| `src/config/brandConfig.ts` | **Brand & Design Tokens** | Changing primary color, brand wordmark, event title, date, venue, or toggling features. |
| `src/config/BrandContext.tsx` | **Live Brand State & Injection** | Injects CSS variables and persists presets in `localStorage`. |
| `src/components/BrandStudioModal.tsx` | **In-App Visual Studio** | Interactive UI where users and clients can test rebrands with live swatches and presets. |
| `src/data/conferenceData.ts` | **Event Content Store** | Modifying sessions, presenters, breakout times, live polls, Q&A seed questions, and Wi-Fi info. |
| `src/components/Header.tsx` | **Top Navigation & Branding** | Brand wordmark, quick venue trigger, PWA install CTA, and Brand Studio palette trigger. |
| `src/components/HubView.tsx` | **Main Dashboard** | Welcome hero, "Happening Right Now" live session spotlight, quick links, and official notices. |
| `src/components/RunningOrderView.tsx` | **Agenda Timeline** | Single-stream schedule, session bookmarking, and speaker profiles. |
| `src/components/InteractionsView.tsx` | **Live Engagement** | Interactive live polls (instant vote counting) and Q&A (upvotes, author labels). |
| `src/components/MyPassView.tsx` | **Delegate Accreditation** | Scannable high-contrast QR badge, table seat allocation, and badge editing. |
| `src/components/VenueModal.tsx` | **Venue & Floor Plan** | Floor blueprints, room names (e.g. Porter Tun, Sugar Rooms), facilities, and walking routes. |
| `src/components/ModeratorModal.tsx` | **AV / Stage Screen** | Stage prompter for podiums & AV operators displaying live attendee questions & poll results. |

---

## 3. How to Execute Common Agent Tasks

### Task A: Rebrand the App for a New Client or Event
To rebrand the entire application, simply update `DEFAULT_BRAND_CONFIG` in `src/config/brandConfig.ts` or select one of the built-in presets:

```typescript
// Example: Rebrand for Boots Healthcare Conference
export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  id: 'boots-conference',
  name: 'Boots',
  subTitle: 'Annual Partner Conference',
  eventName: 'Boots Partner Conference 2026',
  date: 'Wednesday 18th November 2026',
  venue: 'ExCeL London',
  tagline: 'Delivering Better Health for Every Community',
  colors: {
    primaryAccent: '#004B87',     // Boots Blue
    accentHover: '#003366',
    surfaceDark: '#000000',
    backgroundLight: '#FFFFFF',
    textDark: '#000000',
  },
  features: {
    enableHub: true,
    enableRunningOrder: true,
    enableInteractions: true,
    enableMyPass: true,
    enableFloorMap: true,
    enableCalendarExport: true,
    enableStagePrompter: true,
  },
};
```
*Note: Because CSS variables and React Context are wired together, changing these tokens updates the header wordmark, buttons, active tab indicators, QR pass, hero card, and confetti instantly!*

---

### Task B: Modify Agenda or Add a Speaker
Open `src/data/conferenceData.ts`:
1. Find `INITIAL_SESSIONS`.
2. Edit or add an object conforming to the `Session` interface:
```typescript
{
  id: 's_sustainability',
  title: 'ESG & Sustainable Packaging Roadmap',
  time: '11:45',
  endTime: '12:15',
  stage: 'The Porter Tun Stage',
  category: 'ESG',
  speakers: [
    {
      name: 'Emma Vance',
      role: 'Head of Sustainable Sourcing',
      company: 'Retail Operations UK',
    },
  ],
  description: 'Our 2030 roadmap for zero-waste packaging and responsible high-street retail.',
  keyTakeaways: ['100% recyclable bottles by 2027', 'Supplier carbon scoring dashboard'],
  isLive: false,
}
```

---

### Task C: Add a New Live Audience Poll
In `src/data/conferenceData.ts`, add to `INITIAL_POLLS`:
```typescript
{
  id: 'p_retail_growth',
  question: 'Which growth pillar has the largest volume potential for your brand in 2027?',
  status: 'active',
  totalVotes: 142,
  options: [
    { id: 'opt_1', text: 'Exclusive In-Store Beauty Bays', votes: 68 },
    { id: 'opt_2', text: 'App Digital App & Delivery Deals', votes: 44 },
    { id: 'opt_3', text: 'Health & Pharmacy Services', votes: 30 },
  ],
}
```

---

### Task D: Add a New Feature or Tab
1. If adding a new bottom tab, update `NavTab` type in `src/components/BottomNav.tsx`:
   ```typescript
   export type NavTab = 'hub' | 'running-order' | 'interactions' | 'my-pass' | 'sponsors';
   ```
2. Add the corresponding icon and label to `tabs` array in `BottomNav.tsx`.
3. Render the new view component in `src/App.tsx` conditionally based on `activeTab === 'sponsors'`.

---

## 4. Testing & Verification Runbook

Run these commands in terminal after making updates:

```bash
# 1. Check TypeScript types and ESLint
npm run lint

# 2. Compile and build the production bundle
npm run build
```

---

## 5. Live In-App Tools Available to Users & Clients
- **Brand & Event Studio**: Click the **Palette** icon in the top header or navigate to `?brand=true`. Allows non-technical clients to try color swatches, switch presets, edit venue names, and export the Agent JSON directly.
- **Stage Confidence Prompter**: Open `?moderator=true` or click the button in Interactions to view the AV desk screen showing upvoted audience questions in real-time.
- **PWA Installation**: Tap "Install App" in the top bar to view 1-tap installation instructions for iPhone (Share > Add to Home Screen) and Android.
