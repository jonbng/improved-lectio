# Improved Lectio

Browser extension that modernizes [Lectio](https://www.lectio.dk/), a Danish school management system.

## Tech Stack
- **WXT** - Browser extension framework
- **Preact** - Lightweight React alternative (aliased from React)
- **TypeScript** + **Tailwind CSS**
- **shadcn/ui** + **Radix UI** - UI components

## Key Files
- `entrypoints/content.tsx` - Main content script, renders custom UI wrapper
- `entrypoints/hide-flash.content.ts` - Prevents FOUC with skeleton loader
- `components/AppSidebar.tsx` - Custom sidebar navigation with collapsible sections
- `components/StudentSearch.tsx` - Universal search for students, teachers, rooms, etc.
- `components/ViewingScheduleHeader.tsx` - Header shown when viewing another person's schedule
- `lib/preload.ts` - Speculation Rules API & hover prefetching
- `lib/profile-cache.ts` - Caches user profile data for cross-page persistence
- `styles/globals.css` - Main styles, hides original Lectio UI, page-specific styling

## Architecture
Content scripts inject a custom Preact UI that wraps the original Lectio DOM. The original DOM is **moved** (not cloned) to preserve event handlers and functionality.

## Features
- **Custom Sidebar** - Modern navigation with collapsible "Find Skema" and "Ændringer" sections
- **Student Search** - Fast search on FindSkema pages, adapts to type (elev, lærer, lokale, etc.)
- **Profile Caching** - User profile persists when viewing other students' schedules
- **Viewing Header** - Shows whose schedule you're viewing with their picture
- **Profile Picture Enlargement** - Click on profile pictures to view full size
- **Page-Specific Styling** - Messages page two-column layout, UV beskrivelser grid
- **Print Page Support** - Sidebar hidden on print pages

## Commands
```bash
bun run dev          # Development (Chrome)
bun run dev:firefox  # Development (Firefox)
bun run build        # Production build
bun run zip          # Package extension
```

## Reference Materials
- `@lectio-scripts/` - Decompiled Lectio source code
- `@lectio-html/lectio/` - Original HTML snapshots (before extension modifies them)
- `@ARCHITECTURE.md` - Full project documentation