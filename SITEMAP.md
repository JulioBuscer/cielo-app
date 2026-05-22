# SITEMAP — Cielo App

## Navigation Diagram

```mermaid
flowchart TB
  classDef entry fill:#FF8AB3,color:#fff,stroke:#FF5C9A,font-weight:bold
  classDef screen fill:#FFF0F5,color:#333,stroke:#FFB7D5
  classDef log fill:#FFE4EE,color:#333,stroke:#FFB7D5
  classDef settings fill:#E8F4FD,color:#333,stroke:#90CAF9
  classDef leaf fill:#F5F5F5,color:#666,stroke:#DDD,stroke-dasharray:5

  Index["/ (index.tsx)<br/>Entry Point"]:::entry
  Dashboard["/dashboard<br/>Main Timeline"]:::screen
  Stats["/stats<br/>Statistics"]:::leaf
  Timeline["/timeline<br/>Full Timeline (Phase 3)"]:::leaf

  subgraph Onboarding
    Welcome["/onboarding/welcome"]:::screen
    Role["/onboarding/role"]:::screen
    Baby["/onboarding/baby"]:::screen
  end

  subgraph Logs
    DiaperNew["/logs/diaper/new"]:::log
    EventNew["/logs/event/new"]:::log
    EventDetail["/logs/event/:id"]:::log
    FeedingDetail["/logs/feeding/:id"]:::log
    FeedingRetro["/logs/feeding/retro"]:::log
    SleepDetail["/logs/sleep/:id"]:::log
    GrowthHistory["/logs/growth/history"]:::log
    GrowthNew["/logs/growth/new"]:::log
  end

  subgraph Settings
    SettingsIndex["/settings"]:::settings
    BabyProfile["/baby/profile"]:::settings
    Catalogs["/settings/catalogs"]:::settings
    ThemeIndex["/settings/theme"]:::settings
    ThemeEditor["/settings/theme/editor"]:::settings
  end

  subgraph Reports
    Report["/report/generate"]:::leaf
  end

  %% Entry / Routing
  Index -->|onboarding_done=false| Welcome
  Index -->|onboarding_done=true| Dashboard

  %% Onboarding flow
  Welcome -->|router.push| Role
  Role -->|router.push| Baby
  Baby -->|router.replace| Dashboard

  %% Dashboard → Logs
  Dashboard -->|tap bubble (id)| EventDetail
  Dashboard -->|tap feeding bubble| FeedingDetail
  Dashboard -->|tap sleep bubble| SleepDetail
  Dashboard -->|quick button 📸🧪🍑| DiaperNew
  Dashboard -->|event picker + preselect| EventNew
  Dashboard -->|⏱ Rezagada| FeedingRetro

  %% Dashboard → Other
  Dashboard -->|📊 stats| Stats
  Dashboard -->|⋮ menu| SettingsIndex
  Dashboard -->|tap avatar/name| BabyProfile
  Dashboard -.->|planned| Timeline

  %% Detail screens (mostly leaf nodes)
  DiaperNew -.->|router.back| Dashboard
  EventNew -.->|router.back| Dashboard
  EventDetail -.->|router.back| Dashboard
  FeedingDetail -.->|router.back| Dashboard
  FeedingRetro -.->|router.back| Dashboard
  SleepDetail -.->|router.back| Dashboard
  Stats -.->|router.back| Dashboard
  Timeline -.->|router.back| Dashboard

  %% Growth flow
  GrowthHistory -.->|router.back| Dashboard
  GrowthHistory -->|📝 Nuevo Registro| GrowthNew
  GrowthNew -.->|router.back| GrowthHistory

  %% Settings navigation
  SettingsIndex -->|tap baby card| BabyProfile
  SettingsIndex -->|Catálogos| Catalogs
  SettingsIndex -->|Tema| ThemeIndex

  BabyProfile -->|Personalizar Catálogos| Catalogs
  BabyProfile -.->|borrar datos → replace| Welcome

  ThemeIndex -->|+ Nuevo| ThemeEditor
  ThemeIndex -->|Editar (themeId)| ThemeEditor
  ThemeEditor -.->|router.back| ThemeIndex

  Catalogs -.->|router.back| SettingsIndex

  %% Reports
  Dashboard -->|📊 share| Report
  Report -.->|native share| Dashboard
```

## Route Table

### Entry & Onboarding

| Route | Component | Purpose | Navigates To | Navigated From |
|-------|-----------|---------|-------------|----------------|
| `/` | `Index` | Entry point; checks `onboarding_done` flag, redirects accordingly | `/dashboard` or `/onboarding/welcome` | — |
| `/onboarding/welcome` | `Welcome` | Feature highlights + "Comenzar" button | `/onboarding/role` | `/` (fresh install) |
| `/onboarding/role` | `RoleSelection` | Enter name + select caregiver role | `/onboarding/baby` | `/onboarding/welcome` |
| `/onboarding/baby` | `BabySetup` | Enter baby name, nickname, sex, birth date, avatar | `/dashboard` (replace) | `/onboarding/role` |

### Core: Dashboard

| Route | Component | Purpose | Navigates To | Navigated From |
|-------|-----------|---------|-------------|----------------|
| `/dashboard` | `TimelineScreen` | Main timeline + quick actions + active sessions | Baby profile, stats, all logs, settings | `/` (onboarding done), `/onboarding/baby` (replace) |

### Logs / Detail screens

| Route | Component | Purpose | Navigates To | Navigated From |
|-------|-----------|---------|-------------|----------------|
| `/logs/diaper/new` | `DiaperNewScreen` | Record pee/poop intensity, health, weight, photo | `router.back()` | `/dashboard` |
| `/logs/event/new` | `EventNewScreen` | Create custom event (select type + notes) | `router.back()` | `/dashboard` (with `preselect` param) |
| `/logs/event/:id` | `EventDetailScreen` | View/edit event details, metadata, notes | `router.back()` | `/dashboard` (tap event bubble) |
| `/logs/feeding/:id` | `FeedingDetailScreen` | View/edit feeding session times, notes | `router.back()` | `/dashboard` (tap feeding bubble) |
| `/logs/feeding/retro` | `FeedingRetroScreen` | Retroactive feeding log (type + duration) | `router.back()` | `/dashboard` (⏱ Rezagada) |
| `/logs/sleep/:id` | `SleepDetailScreen` | View/edit sleep session, status timeline | `router.back()` | `/dashboard` (tap sleep bubble) |
| `/logs/growth/history` | `GrowthHistoryScreen` | Table of growth measurements with deltas | `/logs/growth/new` | Dashboard (from stats or ?) |
| `/logs/growth/new` | `GrowthNewScreen` | New weight/height/head circumference entry | `router.back()` | `/logs/growth/history` |

### Settings

| Route | Component | Purpose | Navigates To | Navigated From |
|-------|-----------|---------|-------------|----------------|
| `/baby/profile` | `BabyProfile` | Edit baby info, growth cards, danger zone (reset) | `/settings/catalogs`, `/onboarding/welcome` | `/dashboard`, `/settings` |
| `/settings` | `SettingsScreen` | Main settings: Catalogs, Theme, Baby Profile, Version | `/baby/profile`, `/settings/catalogs`, `/settings/theme` | `/dashboard` (⋮ menu) |
| `/settings/catalogs` | `CatalogsScreen` | Customize event types, pee/poop scales, observations | `router.back()` | `/settings`, `/baby/profile` |
| `/settings/theme` | `ThemeSelectorScreen` | Theme list (built-in + custom), preview, edit/delete | `/settings/theme/editor` | `/settings` |
| `/settings/theme/editor` | `ThemeEditorScreen` | Create/edit custom theme (all color fields) | `router.back()` | `/settings/theme` |

### Analytics & Reports

| Route | Component | Purpose | Navigates To | Navigated From |
|-------|-----------|---------|-------------|----------------|
| `/stats` | `StatsScreen` | Charts + summaries: feeding, sleep, diaper, growth | `router.back()` | `/dashboard` |
| `/report/generate` | `GenerateReport` | Share reports via WhatsApp (native share) | (native share) | `/dashboard` |

### Placeholder

| Route | Component | Purpose | Navigates To | Navigated From |
|-------|-----------|---------|-------------|----------------|
| `/timeline` | `TimelineScreen` | "Próximamente — Fase 3" placeholder | `router.back()` | `/dashboard` (planned) |

## Layout

`/_layout.tsx` → `RootLayout`
- Runs DB migrations before mounting anything
- Wraps app in `QueryClientProvider` → `ThemeProvider` → `<Slot />`
- All routes render inside `<Slot />`

## Key Navigation Patterns

- **Back navigation**: Most detail/log screens use `router.back()` exclusively (no forward navigation). They push data and return.
- **Dynamic segments**: `:id` params used for feeding, sleep, event details.
- **Query params**: `preselect` (event new), `themeId` (theme editor).
- **Replace**: Only used for onboarding completion and data reset.
- **Dashboard is the hub**: 10+ navigation targets from the main screen.

## Auto-generation

A script at `scripts/gen-sitemap.mjs` can partially regenerate this file
from the `app/` directory structure and static `router.push()` calls:

```bash
npm run gen:sitemap
# or
node scripts/gen-sitemap.mjs
```

> **Note**: The auto-generator detects static routes and `router.push("...")`
> calls. Dynamic template literals (e.g. \`/logs/feeding/${id}\`) and
> dynamic `item.route` patterns are not captured. Use the hand-crafted
> diagram above for the complete picture. Run the script and merge its
> output into this file when adding new screens.
