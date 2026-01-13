# Source Code Review Instructions

This document explains how to build the BetterLectio Firefox extension from source.

## Prerequisites

- [Bun](https://bun.sh/) (v1.0 or later)

## Build Instructions

1. Install dependencies:
   ```bash
   bun install
   ```

2. Build the Firefox extension:
   ```bash
   bun run build:firefox
   ```

3. The built extension will be in `.output/firefox-mv2/`

## Project Structure

- `entrypoints/` - Extension entry points (content scripts, background, etc.)
- `components/` - Preact UI components
- `lib/` - Utility functions
- `styles/` - CSS styles
- `wxt.config.ts` - WXT configuration
