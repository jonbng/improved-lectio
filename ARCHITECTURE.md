# BetterLectio - Architecture & Project Documentation

## Overview

**BetterLectio** is a browser extension that enhances the user experience of [Lectio](https://www.lectio.dk/), a Danish educational management system widely used by schools in Denmark. The extension provides a modern, clean interface while preserving all original Lectio functionality.

### Key Goals
- Replace Lectio's outdated UI with a modern design
- Improve navigation with a custom sidebar
- Optimize performance with preloading/prefetching
- Maintain full compatibility with existing Lectio features
- Support both Chrome (Manifest V3) and Firefox (Manifest V2)

---

## Technology Stack

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| [WXT](https://wxt.dev/) | 0.20.6 | Modern browser extension framework |
| [Preact](https://preactjs.com/) | 10.28.0 | Lightweight React alternative (3KB) |
| [TypeScript](https://www.typescriptlang.org/) | 5.9.2 | Type safety |
| [Tailwind CSS](https://tailwindcss.com/) | 4.1.18 | Utility-first styling |
| [Vite](https://vitejs.dev/) | (via WXT) | Build tool |

### UI Components
| Library | Purpose |
|---------|---------|
| [shadcn/ui](https://ui.shadcn.com/) | Component system built on Radix UI |
| [Radix UI](https://www.radix-ui.com/) | Unstyled, accessible primitives |
| [Lucide Icons](https://lucide.dev/) | Icon library |
| [Tabler Icons](https://tabler.io/icons) | Additional icon set |

### Additional Libraries
- **@dnd-kit** - Drag-and-drop functionality
- **@tanstack/react-table** - Table components
- **recharts** - Charting library
- **sonner** - Toast notifications
- **zod** - Schema validation
- **next-themes** - Theme management
- **clsx + tailwind-merge** - Dynamic class utilities

### Development Tools
- **Bun** - Package manager and runtime
- **GitHub Actions** - CI/CD for automated builds

---

## Project Structure

```
betterlectio/
├── entrypoints/              # Extension entry points
│   ├── content.tsx           # Main content script
│   ├── hide-flash.content.ts # FOUC prevention script
│   ├── background.ts         # Background service worker
│   └── popup/                # Extension popup UI
│       ├── index.html
│       └── main.tsx
│
├── components/               # UI components
│   ├── AppSidebar.tsx        # Main sidebar navigation
│   ├── StudentSearch.tsx     # Universal search component
│   ├── ViewingScheduleHeader.tsx  # Header when viewing others
│   └── ui/                   # shadcn/ui components
│       ├── avatar.tsx
│       ├── button.tsx
│       ├── collapsible.tsx
│       ├── dropdown-menu.tsx
│       ├── sidebar.tsx
│       └── ... (20+ components)
│
├── lib/                      # Utility libraries
│   ├── preload.ts            # Speculation Rules & prefetching
│   ├── profile-cache.ts      # User profile caching for cross-page persistence
│   └── utils.ts              # Helper functions (cn())
│
├── hooks/                    # React/Preact hooks
│   └── use-mobile.ts         # Mobile detection hook
│
├── styles/
│   └── globals.css           # Main stylesheet (552 lines)
│
├── public/
│   └── icon/                 # Extension icons (16-128px)
│
├── lectio-scripts/           # Reference: Decompiled Lectio JS
│   └── LC/                   # Lectio client-side code
│
├── lectio-html/              # Reference: Original HTML snapshots
│   └── lectio/94/            # Sample pages from school ID 94
│
├── .github/workflows/
│   └── build.yml             # CI/CD automation
│
├── package.json              # Dependencies & scripts
├── wxt.config.ts             # WXT extension configuration
├── tsconfig.json             # TypeScript configuration
├── components.json           # shadcn/ui configuration
├── tailwind.config.ts        # Tailwind configuration
└── CLAUDE.md                 # AI assistant instructions
```

---

## Architecture

### Content Script Injection Model

The extension follows a **content script injection architecture** where custom UI is layered on top of the original Lectio DOM:

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Extension                         │
├─────────────────────────────────────────────────────────────┤
│  Content Scripts (inject into lectio.dk pages)              │
│  ├── hide-flash.content.ts  [document_start]                │
│  │   └── Injects skeleton, hides original UI                │
│  └── content.tsx            [document_idle]                 │
│      └── Renders custom UI wrapper, moves original DOM      │
├─────────────────────────────────────────────────────────────┤
│  Background Script (service worker)                         │
│  └── Minimal - room for future features                     │
├─────────────────────────────────────────────────────────────┤
│  Popup                                                      │
│  └── Simple status display                                  │
└─────────────────────────────────────────────────────────────┘
```

### Execution Flow

```
1. User navigates to lectio.dk
         │
         ▼
2. hide-flash.content.ts runs at document_start
   ├── Injects CSS (body opacity: 0)
   └── Creates skeleton sidebar placeholder
         │
         ▼
3. content.tsx runs after DOM ready
   ├── Checks for main app page (.ls-master-header)
   ├── Extracts user data (name, class, profile pic)
   ├── Injects Geist font
   ├── Removes original body children (preserving nodes)
   ├── Creates #il-root container
   ├── Renders <DashboardLayout> with <AppSidebar>
   ├── Moves original DOM into #il-lectio-content
   ├── Fades out skeleton, fades in content
   └── Initializes preloading system
         │
         ▼
4. User interaction
   ├── Sidebar navigation → Native Lectio links
   ├── Hover on links → Prefetch in background
   └── Original forms/scripts → Work normally (DOM preserved)
```

---

## Key Components

### 1. Hide Flash Script (`entrypoints/hide-flash.content.ts`)

**Purpose:** Prevent Flash of Unstyled Content (FOUC)

- Runs at `document_start` (earliest possible moment)
- Hides the body with `opacity: 0`
- Injects a skeleton sidebar placeholder
- Supports prerendering optimization
- Creates smooth transition experience

```typescript
// Runs before any Lectio content renders
export default defineContentScript({
  matches: ["*://*.lectio.dk/*"],
  runAt: "document_start",
  // ...
});
```

### 2. Main Content Script (`entrypoints/content.tsx`)

**Purpose:** Primary entry point that transforms the UI

Key responsibilities:
- Detects main app pages (vs login, etc.)
- Extracts profile picture URL before DOM manipulation
- Redirects messages page to "Nyeste" folder by default
- Renders the custom `<DashboardLayout>`
- Moves (not clones) original DOM to preserve event handlers
- Initializes the preloading system

### 3. App Sidebar (`components/AppSidebar.tsx`)

**Purpose:** Custom navigation replacing Lectio's header

Features:
- Dynamic school name extraction
- User profile display with dropdown menu
- Profile picture click-to-enlarge with fullscreen overlay
- Navigation groups:
  - **Main:** Forside, Skema, Elever, Opgaver, Lektier, Beskeder
  - **Secondary:** Karakterer, Fravær, Studieplan, Dokumenter, Spørgeskema, UV-beskrivelser
  - **Skemaer:** Collapsible "Find Skema" (Elev, Lærer, Klasse, Lokale, etc.) and "Ændringer" (Dagsændringer, Ugeændringer, Månedskalender)
- Profile dropdown includes: Profil, Studiekort, SPS, Bøger, Kontakt, Hjælp, Log ud
- Active page detection and highlighting
- Uses cached profile data when viewing other students' schedules
- Collapsible sidebar support
- Mobile-responsive design

### 4. Student Search (`components/StudentSearch.tsx`)

**Purpose:** Fast search on FindSkema pages

Features:
- Fetches autocomplete data from Lectio's cache API
- Adapts to page type (elev, lærer, lokale, hold, etc.)
- Type-specific filtering and URL generation
- Recent searches stored in localStorage
- Keyboard shortcut (Cmd/Ctrl+K) to focus
- Color-coded badges for different entity types
- Includes rooms in student/teacher search for convenience

### 5. Viewing Schedule Header (`components/ViewingScheduleHeader.tsx`)

**Purpose:** Shows whose schedule you're viewing when not on your own

Features:
- Displays viewed person's name, class, and profile picture
- Click-to-enlarge profile picture
- "Back to your schedule" link
- Color-coded badge (Elev/Lærer)
- Only shown when viewing another student/teacher's schedule

### 6. Profile Cache (`lib/profile-cache.ts`)

**Purpose:** Persist user profile data across pages

Features:
- Caches user name, class, and profile picture in localStorage
- Distinguishes between logged-in user and viewed user
- Uses meta tags and mobile menu links to identify logged-in user
- Prevents caching viewed student's data as logged-in user's data
- Enables profile display when viewing other students' schedules

### 7. Preload System (`lib/preload.ts`)

**Purpose:** Performance optimization through speculative loading

Implementation:
- Uses Speculation Rules API for instant navigation
- Prerenders the "skema" (schedule) page conservatively
- Hover-based prefetching with 65ms delay
- Tracks prefetched URLs to avoid duplicates
- Falls back gracefully for unsupported browsers

```typescript
// Speculation Rules for modern browsers
{
  "prerender": [{
    "urls": [skemaUrl],
    "eagerness": "conservative"
  }]
}
```

### 8. Global Styles (`styles/globals.css`)

**Purpose:** Complete visual overhaul

Key styling areas:
- CSS custom properties for theming (dark mode ready)
- Hides original Lectio navigation, header, footer
- Messages page two-column layout with folder tree
- UV beskrivelser page - converts table to modern grid of pills
- Sidebar positioning (fixed, 16rem width)
- Geist font application
- Smooth transitions and animations
- Print page exclusion

---

## Configuration Files

### `wxt.config.ts`
```typescript
export default defineConfig({
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "BetterLectio",
    permissions: ["storage"],
    // React aliased to Preact for smaller bundle
  },
  runner: {
    startUrls: ["https://www.lectio.dk/lectio/94/SkemaNy.aspx"],
  },
});
```

### `package.json` Scripts
```json
{
  "scripts": {
    "dev": "wxt",                    // Development mode
    "dev:firefox": "wxt -b firefox", // Firefox development
    "build": "wxt build",            // Production build (Chrome)
    "build:firefox": "wxt build -b firefox",
    "zip": "wxt zip",                // Package for Chrome
    "zip:firefox": "wxt zip -b firefox"
  }
}
```

### `components.json` (shadcn/ui)
```json
{
  "style": "new-york",
  "tailwind": { "cssVariables": true },
  "iconLibrary": "lucide"
}
```

---

## Browser Compatibility

| Browser | Manifest Version | Status |
|---------|------------------|--------|
| Chrome | V3 | Supported |
| Firefox | V2 | Supported |
| Edge | V3 | Should work (untested) |

The WXT framework handles manifest differences automatically.

---

## Development

### Prerequisites
- [Bun](https://bun.sh/) (recommended) or npm/pnpm
- Chrome or Firefox for testing

### Getting Started

```bash
# Install dependencies
bun install

# Start development mode (Chrome)
bun run dev

# Start development mode (Firefox)
bun run dev:firefox

# Build for production
bun run build
bun run build:firefox

# Package extension
bun run zip
bun run zip:firefox
```

### Development URL
The extension opens to `https://www.lectio.dk/lectio/94/SkemaNy.aspx` by default (school ID 94 - Sorø Akademis Skole).

---

## Reference Materials

### `/lectio-scripts/`
Decompiled Lectio JavaScript source code. Useful for understanding:
- Internal Lectio behavior
- Event handlers and form submissions
- Client-side validation logic

### `/lectio-html/`
HTML snapshots of Lectio pages before extension modification:
- Original DOM structure reference
- CSS class names and IDs
- Server-rendered content patterns

---

## Features Summary

### Implemented
- Modern sidebar navigation with collapsible sections
- Visual redesign with Geist font
- Skeleton loading (FOUC prevention)
- Speculation Rules prerendering
- Hover-based prefetching
- Messages page two-column layout with folder tree
- Auto-redirect to "Nyeste" folder
- User profile display with click-to-enlarge pictures
- Profile caching for cross-page persistence
- Student/Teacher/Room search on FindSkema pages
- Type-adaptive search (elev, lærer, lokale, hold, etc.)
- Recent searches with localStorage persistence
- "Viewing schedule" header when on another person's page
- UV beskrivelser page styling (grid of pills)
- Print page support (sidebar hidden)
- Dark mode CSS variables (ready for implementation)

### Preserved from Original Lectio
- All form submissions
- JavaScript event handlers
- Navigation links
- Search functionality
- All original features

---

## Performance Optimizations

1. **Preact over React** - 3KB vs 40KB+ bundle size
2. **Skeleton loading** - Perceived instant load
3. **Speculation Rules API** - Browser-level prerendering
4. **Conservative prerendering** - Only schedule page prerendered
5. **Hover prefetching** - Links prefetched on hover (65ms delay)
6. **Font preconnect** - Google Fonts loaded early

---

## Contributing

The codebase is well-structured for contributions:
- TypeScript for type safety
- Component-based architecture
- shadcn/ui for consistent styling
- Clear separation of concerns
- Reference materials included

---

## License

See LICENSE file in repository root.
