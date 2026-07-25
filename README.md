# CSS Sandbox

[![CSS Sandbox CI/CD](https://github.com/Baptiste-lg/css_sandbox/actions/workflows/ci.yml/badge.svg)](https://github.com/Baptiste-lg/css_sandbox/actions/workflows/ci.yml)
[![Docker Build & Push](https://github.com/Baptiste-lg/css_sandbox/actions/workflows/Docker.yml/badge.svg)](https://github.com/Baptiste-lg/css_sandbox/actions/workflows/Docker.yml)
[![Demo](https://img.shields.io/badge/demo-GitHub%20Pages-blue)](https://baptiste-lg.github.io/css_sandbox/)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

A minimal live coding sandbox for HTML, CSS, and JS. Write code, see it render instantly, and share your snippet via URL — no backend, no bundler, no sign-up.

**[Try it here](https://baptiste-lg.github.io/css_sandbox/)**

## Features

### Editor
- Three-pane editor for HTML, CSS, and JS with syntax highlighting
- Auto-run mode — preview updates as you type
- Find & replace across editors (Ctrl+F)
- Built-in code formatter
- Tab, indentation, and bracket auto-close support

### Layouts
- **Top/Bottom** — editors above, preview below
- **Left/Right** — editors beside preview
- **Tabs** — tabbed editors with preview below
- Draggable, resizable panels with snap-to-grid

### Sharing & Export
- **Share via URL** — code is LZ-compressed into the URL hash, no server needed
- **Download** — export your snippet as a standalone HTML file
- **Import** — load code from an external URL

### Templates & Snippets
- 6 built-in templates: Blank, Flexbox, CSS Grid, Animation, Form, Canvas
- Save and load personal snippets (stored in localStorage)

### External Resources
- Load external CSS/JS libraries via URL
- Quick presets: Bootstrap 5, Pico CSS, Normalize, jQuery, Alpine.js, Three.js

### Preview
- Sandboxed iframe preview with console output capture
- Viewport presets: Responsive, Phone (375x667), Tablet (768x1024), Desktop (1280x800)
- Performance indicator for large code payloads

### Theming
- Dark theme (Catppuccin Mocha) and Light theme toggle

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+S | Run |
| Ctrl+Shift+C | Share |
| Ctrl+1 / 2 / 3 | Focus HTML / CSS / JS editor |
| Ctrl+F | Find & replace |
| Ctrl+Tab | Cycle editors |

## Run Locally

No build step — the source *is* the artifact.

```sh
# Option 1: Python
python3 -m http.server 8080
# open http://localhost:8080

# Option 2: Docker
docker build -t css-sandbox .
docker run -p 8080:8080 css-sandbox
```

## Architecture

```
css_sandbox/
├── index.html       Entry point and markup
├── style.css        All styles (dark/light themes, layouts, modals)
├── app.js           Application logic (panels, sharing, templates, preview)
├── highlight.js     Lightweight syntax highlighter (textarea-over-pre technique)
├── lzstring.js      LZ-String compression library (vendored, MIT)
├── Dockerfile       Hardened nginx container with security headers
└── .github/
    └── workflows/
        ├── ci.yml       CI/CD: autoformat, lint, security, smoke test, deploy
        └── Docker.yml   Docker image build & push to GHCR
```

Zero dependencies. No node_modules, no bundler, no framework — just vanilla HTML, CSS, and JS.

## License

MIT
