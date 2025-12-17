# Improved Lectio!

A browser extension that provides better styling and improved functionality for [Lectio](https://www.lectio.dk/).

## Features

- Modern UI with improved styling
- Enhanced user experience

## Development

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js

### Setup

```bash
bun install
```

### Development

```bash
# Chrome
bun run dev

# Firefox
bun run dev:firefox
```

### Build

```bash
# Chrome
bun run build

# Firefox
bun run build:firefox
```

### Package for distribution

```bash
# Chrome
bun run zip

# Firefox
bun run zip:firefox
```

## Installation

### From source

1. Run `bun run build`
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `.output/chrome-mv3` directory

## Tech Stack

- [WXT](https://wxt.dev/) - Browser extension framework
- [Preact](https://preactjs.com/) - Fast 3kB alternative to React
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Radix UI](https://www.radix-ui.com/) - Unstyled, accessible UI components

## License

MIT
