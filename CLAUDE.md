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
- `components/AppSidebar.tsx` - Custom sidebar navigation
- `lib/preload.ts` - Speculation Rules API & hover prefetching
- `styles/globals.css` - Main styles, hides original Lectio UI

## Architecture
Content scripts inject a custom Preact UI that wraps the original Lectio DOM. The original DOM is **moved** (not cloned) to preserve event handlers and functionality.

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